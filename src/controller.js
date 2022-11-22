export const startGoogleLogin = (req, res) => {

};

export const finishGoogleLogin = (req, res) => {

};


export const postHome = (req, res) => {
    const { roomName, nickName } = req.body;

    return res.redirect(`chat/${roomName}/${nickName}`);
};

export const getHome = (req, res) => {
    return res.render("home");
};

export const getChat = (req, res) => {
    const {
        params: { roomName, nickName }
    } = req;

    res.locals.roomName = roomName;
    res.locals.nickName = nickName;

    return res.render("chatroom");
};