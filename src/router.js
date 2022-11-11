import express from "express";
import {getHome, getRoom, postRoom} from "./controller"

const router = express.Router();

router.get('/', getHome);
router.get('/room', getRoom);

router.post('/room', postRoom);
export default router;