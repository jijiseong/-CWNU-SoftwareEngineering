import express from "express";
import {getHome, getRoom} from "./controller"

const router = express.Router();

router.get('/', getHome);
router.get('/room', getRoom);

export default router;