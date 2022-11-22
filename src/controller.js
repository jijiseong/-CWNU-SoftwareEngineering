export const startGoogleLogin = (req, res) => {

};

export const finishGoogleLogin = (req, res) => {

};


export const getHome = (req, res) => {
    return res.render("home");
}

export const getInvite = (req, res) => {
    const {
        params: { roomName, nickName }
    } = req;

    return res.render("home", { invite: "1", iroomName: roomName, inickName: nickName });
}