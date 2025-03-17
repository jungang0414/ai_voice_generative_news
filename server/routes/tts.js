import express from "express";
import { tts_generativeVoice } from "../controllers/ttsController.js";

const ttsRouter = express.Router();

ttsRouter.post('/tts', tts_generativeVoice);

export default ttsRouter;