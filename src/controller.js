export const getHome = (req, res) =>{
    
    res.render("home");
};

export const getRoom = (req, res) => {
    res.render("room");
}

export const postRoom = async (req, res) => {
    const {chat} = req.body;
    console.log(chat);
}