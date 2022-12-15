# 실시간 번역 화상 채팅 시스템

실시간 화상 채팅 시스템입니다.  
papago API를 이용하여 실시간 번역이 가능합니다.  
예약 기능을 이용하여 회의 시작 시간에 메일을 자동으로 발송할 수 있습니다.


## 1. Setting

### git clone
```bash
git clone https://github.com/jijiseong/CWNU_SoftwareEngineering.git
```


### file create

#### .env 
papago API 사용을 위한  Client ID, Client Secret 코드가 필요합니다.
```json
PAPAGO_CLIENT_ID={PAPAGO CLIENT ID}
PAPAGO_CLIENT_SECRET={PAPAGO CLIENT SECRET} 
```

#### senderInfo.json 
예약 메일 발송 기능을 위한 gmail 계정이 필요합니다.  
google에서 앱 사용을 위한 비밀번호를 발급 받은후 정보를 입력해야합니다.  

```json
{
    "user": "example@gmail.com",
    "pass": "examplepassword"
}
```

### src/server.js
SERVER_URL과 PORT를 지정합니다.
```js 
...

const SERVER_URL = "example.com";
const PORT = process.env.PORT || 4000;

...
```


## 2. Server Start
### npm start
```bash
npm run start
```
