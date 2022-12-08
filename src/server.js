import * as dotenv from 'dotenv'
dotenv.config();
import express from "express";
import SocketIO from "socket.io";
import http from "http";
import bodyParser from "body-parser";
import schedule from "node-schedule";
import mailSender from "./mailSender";

const PORT = process.env.PORT || 4000;
const app = express();

app.set("view engine", "pug");
app.set("views", process.cwd() + "/src/views");
app.use(express.urlencoded({ extended: false }));
app.use("/public", express.static("assets"));
app.use(bodyParser.json());

// papago API
app.get('/translate', (req, res) => {
  const { str, src, dst } = req.query;
  const client_id = process.env.PAPAGO_CLIENT_ID
  const client_secret = process.env.PAPAGO_CLIENT_SECRET

  const api_url = 'https://openapi.naver.com/v1/papago/n2mt';
  const request = require('request');
  const options = {
    url: api_url,
    form: { 'source': src, 'target': dst, 'text': str },
    headers: { 'X-Naver-Client-Id': client_id, 'X-Naver-Client-Secret': client_secret }
  };
  request.post(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.writeHead(200, { 'Content-Type': 'text/json;charset=utf-8' });
      res.end(body);
    } else {
      res.status(response.statusCode).end();
      console.log('error = ' + response.statusCode);
    }
  });
});

// GET reservation 
app.get("/reservation", (req, res) => {
  return res.render("reservation");
});

// POST reservation
let job;
const koreaTimeDiff = 9 * 60 * 60 * 1000;

app.post("/reservation", async (req, res) => {
  const { email1, email2, email3, email4, eamil5, date, time } = req.body;
  const dateArr = date.split('-');
  const timeArr = time.split(':');
  const year = dateArr[0];
  const month = String(Number(dateArr[1]) - 1);
  const day = dateArr[2];
  const hour = timeArr[0];
  const minute = timeArr[1];
  const emails = [email1, email2, email3, email4, eamil5];
  const reserveDate = new Date(year, month, day, hour, minute);

  console.log("current Server Time: ", new Date());
  console.log("reservation Time: ", reserveDate);

  const _reserveDate = new Date(reserveDate.getTime() - koreaTimeDiff);

  emails.forEach(email => {
    if (email) {
      job = schedule.scheduleJob(_reserveDate, () => {
        let emailParam = {
          toEmail: email,
          subject: "회의가 곧 시작 합니다.",
          text: "https://jijiseong-symmetrical-space-engine-qxpvgx96pw9c69gx-4000.preview.app.github.dev/chat?iroomName=test"
        };
        mailSender.sendGmail(emailParam);
      });
    }
  });

  return res.end();
});

app.get("/chat", (req, res) => {
  const { iroomName, inickName } = req.query;
  const invite = true;
  return res.render("home", { iroomName, inickName, invite });
});

app.get("/", (req, res) => {
  return res.render("home");
});

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

let roomObjArr = [];
const MAXIMUM = 5;

wsServer.on("connection", (socket) => {
  let myRoomName = null;
  let myNickname = null;


  socket.on("join_room", (roomName, nickname) => {
    myRoomName = roomName;
    myNickname = nickname;

    let isRoomExist = false;
    let targetRoomObj = null;

    // forEach를 사용하지 않는 이유: callback함수를 사용하기 때문에 return이 효용없음.
    for (let i = 0; i < roomObjArr.length; ++i) {
      if (roomObjArr[i].roomName === roomName) {
        // Reject join the room
        if (roomObjArr[i].currentNum >= MAXIMUM) {
          socket.emit("reject_join");
          return;
        }

        isRoomExist = true;
        targetRoomObj = roomObjArr[i];
        break;
      }
    }

    // Create room
    if (!isRoomExist) {
      targetRoomObj = {
        roomName,
        currentNum: 0,
        users: [],
      };
      roomObjArr.push(targetRoomObj);
    }

    //Join the room
    targetRoomObj.users.push({
      socketId: socket.id,
      nickname,
    });
    ++targetRoomObj.currentNum;

    socket.join(roomName);
    socket.emit("accept_join", targetRoomObj.users);
  });

  socket.on("offer", (offer, remoteSocketId, localNickname) => {
    socket.to(remoteSocketId).emit("offer", offer, socket.id, localNickname);
  });

  socket.on("answer", (answer, remoteSocketId) => {
    socket.to(remoteSocketId).emit("answer", answer, socket.id);
  });

  socket.on("ice", (ice, remoteSocketId) => {
    socket.to(remoteSocketId).emit("ice", ice, socket.id);
  });

  socket.on("chat", (message, roomName) => {
    socket.to(roomName).emit("chat", message);
  });

  socket.on("disconnecting", () => {
    socket.to(myRoomName).emit("leave_room", socket.id, myNickname);

    let isRoomEmpty = false;
    for (let i = 0; i < roomObjArr.length; ++i) {
      if (roomObjArr[i].roomName === myRoomName) {
        const newUsers = roomObjArr[i].users.filter(
          (user) => user.socketId != socket.id
        );
        roomObjArr[i].users = newUsers;
        --roomObjArr[i].currentNum;

        if (roomObjArr[i].currentNum == 0) {
          isRoomEmpty = true;
        }
      }
    }

    // Delete room
    if (isRoomEmpty) {
      const newRoomObjArr = roomObjArr.filter(
        (roomObj) => roomObj.currentNum != 0
      );
      roomObjArr = newRoomObjArr;
    }
  });
});

const handleListen = () =>
  console.log(`✅ Listening on https://localhost:${PORT}`);
httpServer.listen(PORT, handleListen);
