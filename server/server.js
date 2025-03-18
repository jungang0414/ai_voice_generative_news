import express from "express";
import cors from "cors";
// routes
import ttsRouter from "./routes/tts.js";
import newsRouter from "./routes/news.js";
import baseRouter from "./routes/base.js";

const app = express();
const PORT = process.env.PORT

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => res.send("This API Is Working!"));

app.use("/api/v1", ttsRouter);
app.use("/api/v1", newsRouter);
app.use("/api/v1", baseRouter);

app.listen(PORT, () => {
    console.log(`tts 伺服器已啟動, PORT ${PORT}`);
});

module.exports = app