import * as dotenv from 'dotenv'
dotenv.config();
import express from "express";
import SocketIO from "socket.io";
import http from "http";
import bodyParser from "body-parser";
import schedule from "node-schedule";
import mailSender from "./mailSender";
const session = require('express-session');
const fileStore = require('session-file-store')(session);
const passport = require('passport')
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy

const SERVER_URL = "http://localhost";
const PORT = process.env.PORT || 4000;
const app = express();

app.set("view engine", "pug");
app.set("views", process.cwd() + "/src/views");
app.use(express.urlencoded({ extended: false }));
app.use("/public", express.static("assets"));
app.use(bodyParser.json());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: new fileStore()
}));
app.use(passport.initialize());
app.use(passport.session());

let db = [{
  id: '1',
  email: 'goodmemory@tistory.com',
  password: 'goodmemory',
  name: 'goodmemory',
  provider: '',
  token: '',
  providerId: ''
}];

//구글 api ID, Secret 정보 저장 (구글 개발자 웹 내 앱ID, 시크릿 입력)
const googleCredentials = {
  "web": {
    "client_id": "832440413694-15midan99opv19j7nrocr79dndcnplg8.apps.googleusercontent.com",
    "client_secret": "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",
    "redirect_uris": [
      "http://localhost:4000/login/callback",
      "http://localhost:4000/login/invited"
    ]
  }
}

//PASSPORT - 직렬화 
//serializeUser : 로그인 / 회원가입 후 1회 실행
//deserializeUser : 페이지 전환시 마다 실행 
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

//PASSPORT (Google) - 구글 로그인시 정보 GET
passport.use(new GoogleStrategy({
  clientID: googleCredentials.web.client_id,
  clientSecret: googleCredentials.web.client_secret,
  callbackURL: googleCredentials.web.redirect_uris[0]
},
  function (accessToken, refreshToken, profile, done) {
    console.log(profile);
    let user = db.find(userInfo => userInfo.email === profile.emails[0].value);
    if (user) {
      user.provider = profile.provider;
      user.providerId = profile.id;
      user.token = accessToken;
      user.name = profile.displayName;
    } else {
      user = {
        id: 2,  //랜덤값 필요시, npm shortid 설치 후 shortid.generate() 활용
        provider: profile.provider,
        providerId: profile.id,
        token: accessToken,
        name: profile.displayName,
        email: profile.emails[0].value
      }
      db.push(user);
    }
    return done(null, user);
  }
));

//구글 로그인 버튼 클릭시 구글 페이지로 이동하는 역할
app.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] }));

//구글 로그인 후 자신의 웹사이트로 돌아오게될 주소 (콜백 url)
app.get('/login/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {

    return res.redirect('/');
  }
);

//기본 홈페이지 (req.user는 passport의 serialize를 통해 user 정보 저장되어있음)
app.get('/', (req, res) => {
  const email = getEmail(req.user);
  const name = getUserName(req.user);

  return res.render("home", { name, email, invite: false });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  return res.redirect("/");
})

app.use((err, req, res, next) => {
  if (err) console.log(err);
  res.send(err);
});

//사용자 이메일 가져오는 함수 ** 비로그인시 undefined 이므로 로그인/비로그인 구분 가능
const getEmail = (user) => {
  return user !== undefined ? `${user.email}` : "비회원";
}

//사용자 이름 가져오는 함수 ** 비로그인시 undefined 이므로 로그인/비로그인 구분 가능
const getUserName = (user) => {
  return user !== undefined ? `${user.name}` : "비회원";
}

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
  const { email1, email2, email3, email4, email5, date, time } = req.body;
  const dateArr = date.split('-');
  const timeArr = time.split(':');
  const year = dateArr[0];
  const month = String(Number(dateArr[1]) - 1);
  const day = dateArr[2];
  const hour = timeArr[0];
  const minute = timeArr[1];
  const emails = [email1, email2, email3, email4, email5];
  const reserveDate = new Date(year, month, day, hour, minute);

  console.log("current Server Time: ", new Date());
  console.log("reservation Time: ", reserveDate);

  const _reserveDate = new Date(reserveDate.getTime() - koreaTimeDiff);

  // Todo: 초대 url 파라미터 변경
  emails.forEach(email => {
    if (email) {
      job = schedule.scheduleJob(_reserveDate, () => {
        let emailParam = {
          toEmail: email,
          subject: "회의가 곧 시작 합니다.",
          text: `${SERVER_URL}:${PORT}/chat?iroomName=test`
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


const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

let roomObjArr = [];
const MAXIMUM = 5;

wsServer.on("connection", (socket) => {
  let myRoomName = null;
  let myNickname = null;
  let myEmail = null;

  socket.on("join_room", (roomName, nickname, email) => {
    myRoomName = roomName;
    myNickname = nickname;
    myEmail = email;

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
      email
    });
    ++targetRoomObj.currentNum;

    socket.join(roomName);
    socket.emit("accept_join", targetRoomObj.users);
  });

  socket.on("offer", (offer, remoteSocketId, localNickname, localEmail) => {
    socket.to(remoteSocketId).emit("offer", offer, socket.id, localNickname, localEmail);
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
  console.log(`✅ Listening on ${SERVER_URL}:${PORT}`);
httpServer.listen(PORT, handleListen);
