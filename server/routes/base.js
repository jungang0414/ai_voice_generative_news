import express from "express";
import { get_anue_news, get_anue_voice } from "../controllers/baseController.js";

const baseRouter = express.Router();

baseRouter.get("/database/anue", get_anue_news);
baseRouter.get("/database/anue_voice", get_anue_voice);

export default baseRouter;