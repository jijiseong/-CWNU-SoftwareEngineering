import "../css/style.css"
import fetch from "cross-fetch"
const socket = io();
const speechsdk = require('microsoft-cognitiveservices-speech-sdk');

//버튼 객체참조
const startbtn = document.querySelector("#startSpeech"); //pug 파일의 버튼 id와 같은걸로
const myFace = document.querySelector("#myFace");
const muteBtn = document.querySelector("#mute");
const muteIcon = muteBtn.querySelector(".muteIcon");
const unMuteIcon = muteBtn.querySelector(".unMuteIcon");
const cameraBtn = document.querySelector("#camera");
const cameraIcon = cameraBtn.querySelector(".cameraIcon");
const unCameraIcon = cameraBtn.querySelector(".unCameraIcon");
const camerasSelect = document.querySelector("#cameras");
const call = document.querySelector("#call");
const welcome = document.querySelector("#welcome");
const HIDDEN_CN = "hidden";

let myStream;
let muted = true;
unMuteIcon.classList.add(HIDDEN_CN);
let cameraOff = false;
unCameraIcon.classList.add(HIDDEN_CN);
let roomName = "";
let nickname = "";
let email = "";
let peopleInRoom = 1;

let pcObj = {
  // remoteSocketId: pc
};

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    let currentCamera;
    try {
      currentCamera = myStream.getVideoTracks();
    } catch (error) {
      console.log(error);
    }

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;

      if (currentCamera.label == camera.label) {
        option.selected = true;
      }

      camerasSelect.appendChild(option);
    });
  } catch (error) {
    console.log(error);
  }
}

async function getMedia(deviceId) {
  const initialConstraints = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );

    // stream을 mute하는 것이 아니라 HTML video element를 mute한다.
    myFace.srcObject = myStream;
    myFace.muted = true;

    if (!deviceId) {
      // mute default
      myStream //
        .getAudioTracks()
        .forEach((track) => (track.enabled = false));

      await getCameras();
    }
  } catch (error) {
    console.log(error);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (muted) {
    unMuteIcon.classList.remove(HIDDEN_CN);
    muteIcon.classList.add(HIDDEN_CN);
    muted = false;
  } else {
    muteIcon.classList.remove(HIDDEN_CN);
    unMuteIcon.classList.add(HIDDEN_CN);
    muted = true;
  }
}

function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraIcon.classList.remove(HIDDEN_CN);
    unCameraIcon.classList.add(HIDDEN_CN);
    cameraOff = false;
  } else {
    unCameraIcon.classList.remove(HIDDEN_CN);
    cameraIcon.classList.add(HIDDEN_CN);
    cameraOff = true;
  }
}

async function handleCameraChange() {
  try {
    await getMedia(camerasSelect.value);
    if (peerConnectionObjArr.length > 0) {
      const newVideoTrack = myStream.getVideoTracks()[0];
      peerConnectionObjArr.forEach((peerConnectionObj) => {
        const peerConnection = peerConnectionObj.connection;
        const peerVideoSender = peerConnection
          .getSenders()
          .find((sender) => sender.track.kind == "video");
        peerVideoSender.replaceTrack(newVideoTrack);
      });
    }
  } catch (error) {
    console.log(error);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

/*------------------  Welcome Form (choose room) -----------------*/
call.classList.add(HIDDEN_CN);
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.classList.remove(HIDDEN_CN);
  await getMedia();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();

  if (socket.disconnected) {
    socket.connect();
  }

  const welcomeRoomName = welcomeForm.querySelector("#roomName");
  const welcomeNickname = welcomeForm.querySelector("#nickname");
  const welcomeEmail = welcomeForm.querySelector("#userEmail");
  const nicknameContainer = document.querySelector("#userNickname");

  roomName = welcomeRoomName.value;
  nickname = welcomeNickname.value;
  if (welcomeEmail) {
    email = welcomeEmail.innerText;
  } else {
    alert("로그인을 진행해 주세요.");
    return;
  }


  welcomeRoomName.value = "";
  welcomeNickname.value = "";

  nicknameContainer.innerText = nickname;

  socket.emit("join_room", roomName, nickname, email);
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);


/*------------------  Chat Form -----------------*/
const chatForm = document.querySelector("#chatForm");
const chatBox = document.querySelector("#chatBox");
const MYCHAT_CN = "myChat";
const NOTICE_CN = "noticeChat";

function handleChatSubmit(event) {
  event.preventDefault();
  const chatInput = chatForm.querySelector("input");
  const message = chatInput.value;
  chatInput.value = "";
  socket.emit("chat", `${nickname}: ${message}`, roomName);
  writeChat(`You: ${message}`, MYCHAT_CN);
}

function writeChat(message, className = null) {
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.innerText = message;
  li.appendChild(span);
  li.classList.add(className);
  chatBox.prepend(li);
}

chatForm.addEventListener("submit", handleChatSubmit);

/*---------------- Leave Room ---------------*/
const leaveBtn = document.querySelector("#leave");

function leaveRoom() {
  socket.disconnect();

  call.classList.add(HIDDEN_CN);
  welcome.hidden = false;

  peerConnectionObjArr = [];
  peopleInRoom = 1;
  nickname = "";

  myStream.getTracks().forEach((track) => track.stop());
  const nicknameContainer = document.querySelector("#userNickname");
  nicknameContainer.innerText = "";

  myFace.srcObject = null;
  clearAllVideos();
  clearAllChat();
}

function removeVideo(leavedSocketId) {
  const streams = document.querySelector("#streams");
  const streamArr = streams.querySelectorAll("div");
  streamArr.forEach((streamElement) => {
    if (streamElement.id === leavedSocketId) {
      streams.removeChild(streamElement);
    }
  });
}

function clearAllVideos() {
  const streams = document.querySelector("#streams");
  const streamArr = streams.querySelectorAll("div");
  streamArr.forEach((streamElement) => {
    if (streamElement.id != "myStream") {
      streams.removeChild(streamElement);
    }
  });
}

function clearAllChat() {
  const chatArr = chatBox.querySelectorAll("li");
  chatArr.forEach((chat) => chatBox.removeChild(chat));
}

leaveBtn.addEventListener("click", leaveRoom);

/* --------------- Modal code ----------------------*/
const modal = document.querySelector(".modal");
const modalText = modal.querySelector(".modal__text");
const modalBtn = modal.querySelector(".modal__btn");

function paintModal(text) {
  modalText.innerText = text;
  modal.classList.remove(HIDDEN_CN);

  modal.addEventListener("click", removeModal);
  modalBtn.addEventListener("click", removeModal);
  document.addEventListener("keydown", handleKeydown);
}

function removeModal() {
  modal.classList.add(HIDDEN_CN);
  modalText.innerText = "";
}

function handleKeydown(event) {
  if (event.code === "Escape" || event.code === "Enter") {
    removeModal();
  }
}

/*------------------ Socket code --------------------*/

socket.on("reject_join", () => {
  // Paint modal
  paintModal("Sorry, The room is already full.");

  // Erase names
  const nicknameContainer = document.querySelector("#userNickname");
  nicknameContainer.innerText = "";
  roomName = "";
  nickname = "";
});

socket.on("accept_join", async (userObjArr) => {
  console.log(userObjArr);
  console.log(userObjArr[0].nickname);
  console.log(userObjArr[0].email);

  await initCall();

  const length = userObjArr.length;
  if (length === 1) {
    return;
  }

  writeChat("Notice!", NOTICE_CN);
  for (let i = 0; i < length - 1; ++i) {
    try {
      const newPC = createConnection(
        userObjArr[i].socketId,
        userObjArr[i].nickname,
        userObjArr[i].email
      );
      const offer = await newPC.createOffer();
      await newPC.setLocalDescription(offer);
      socket.emit("offer", offer, userObjArr[i].socketId, nickname, email);
      writeChat(`__${userObjArr[i].nickname}__`, NOTICE_CN);
    } catch (err) {
      console.error(err);
    }
  }
  writeChat("is in the room.", NOTICE_CN);
});

socket.on("offer", async (offer, remoteSocketId, remoteNickname, remoteEmail) => {
  try {
    const newPC = createConnection(remoteSocketId, remoteNickname, remoteEmail);
    await newPC.setRemoteDescription(offer);
    const answer = await newPC.createAnswer();
    await newPC.setLocalDescription(answer);
    socket.emit("answer", answer, remoteSocketId);
    writeChat(`notice! __${remoteNickname}__ joined the room`, NOTICE_CN);
  } catch (err) {
    console.error(err);
  }
});

socket.on("answer", async (answer, remoteSocketId) => {
  await pcObj[remoteSocketId].setRemoteDescription(answer);
});

socket.on("ice", async (ice, remoteSocketId) => {
  await pcObj[remoteSocketId].addIceCandidate(ice);
});

socket.on("chat", (message) => {
  writeChat(message);
});

socket.on("leave_room", (leavedSocketId, nickname) => {
  removeVideo(leavedSocketId);
  writeChat(`notice! ${nickname} leaved the room.`, NOTICE_CN);
  --peopleInRoom;
  sortStreams();
});

/*-------------------- RTC code ---------------------*/

function createConnection(remoteSocketId, remoteNickname, remoteEmail) {
  const myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", (event) => {
    handleIce(event, remoteSocketId);
  });
  myPeerConnection.addEventListener("addstream", (event) => {
    handleAddStream(event, remoteSocketId, remoteNickname, remoteEmail);
  });
  // myPeerConnection.addEventListener(
  //   "iceconnectionstatechange",
  //   handleConnectionStateChange
  // );
  myStream //
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));

  pcObj[remoteSocketId] = myPeerConnection;

  ++peopleInRoom;
  sortStreams();
  return myPeerConnection;
}

function handleIce(event, remoteSocketId) {
  if (event.candidate) {
    socket.emit("ice", event.candidate, remoteSocketId);
  }
}

function handleAddStream(event, remoteSocketId, remoteNickname, remoteEmail) {
  const peerStream = event.stream;
  paintPeerFace(peerStream, remoteSocketId, remoteNickname, remoteEmail);
}

function paintPeerFace(peerStream, id, remoteNickname, remoteEmail) {
  const streams = document.querySelector("#streams");
  const div = document.createElement("div");
  div.id = id;
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.width = "400";
  video.height = "400";
  video.srcObject = peerStream;
  const nicknameContainer = document.createElement("h3");
  nicknameContainer.id = "userNickname";
  nicknameContainer.innerText = remoteNickname;
  const emailContainer = document.createElement("h3");
  emailContainer.id = "callUserEmail";
  emailContainer.innerText = remoteEmail;

  div.appendChild(video);
  div.appendChild(nicknameContainer);
  div.appendChild(emailContainer);
  streams.appendChild(div);
  sortStreams();
}

function sortStreams() {
  const streams = document.querySelector("#streams");
  const streamArr = streams.querySelectorAll("div");
  streamArr.forEach((stream) => (stream.className = `people${peopleInRoom}`));
}

/*--------------- 음성 인식  ---------------------*/
async function handleSpeechClick() {
  let selectedLang = parseInt(document.querySelector("#languages").value)
  let src;
  let dst;
  let speechSrc;

  // 사용자 선택 (ko -> en, en -> ko)
  switch (selectedLang) {
    case 1:
      src = "ko"
      speechSrc = "ko-KR"
      dst = "en"
      break;
    case 2:
      src = "en"
      speechSrc = "en-US"
      dst = "ko"
      break;
  }

  // 음성인식 interface 설정
  const speechConfig = speechsdk.SpeechConfig.fromSubscription("6b56e306d60644f1b2563bc8dbf26cd1", "koreacentral");
  speechConfig.speechRecognitionLanguage = speechSrc;
  const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

  // 음성 인식
  recognizer.recognizeOnceAsync(async result => {
    let displayText;
    if (result.reason === speechsdk.ResultReason.RecognizedSpeech) {
      displayText = result.text
      writeChat(displayText);

      // GET reqeust to '/translate' 
      const res = await (await fetch(`/translate?str=${displayText}&src=${src}&dst=${dst}`)).json();
      const { translatedText } = res.message.result;
      chatForm.querySelector("input").value = translatedText;

    } else {
      displayText = 'ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.';
      writeChat(displayText);
    }
  });
}

startbtn.addEventListener("click", handleSpeechClick);

/*--------------------- 초대 받은 경우 ------------------*/
if (invite === "true") {
  document.querySelector("#roomName").value = iroomName;
  document.querySelector("#nickname").value = inickName;
  document.querySelector("#enterbtn").click();
}