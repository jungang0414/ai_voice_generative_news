import express from "express";
import { crawler_anue } from "../controllers/newsController.js";

const newsRouter = express.Router();

newsRouter.get('/news/anue', crawler_anue);

export default newsRouter;