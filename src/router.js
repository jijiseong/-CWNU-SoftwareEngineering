import { Router } from "express";
import { postHome, getHome, getChat } from "./controller";

const globalRouter = Router();

globalRouter.get("/", getHome);
globalRouter.post("/", postHome);
globalRouter.get("/chat/:roomName/:nickName", getChat);


export default globalRouter;