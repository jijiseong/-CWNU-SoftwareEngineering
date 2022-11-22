import { Router } from "express";
import { getHome, getInvite } from "./controller";

const globalRouter = Router();

globalRouter.get("/", getHome);
globalRouter.get("/chat/:roomName/:nickName", getInvite);


export default globalRouter;