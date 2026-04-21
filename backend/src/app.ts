import express from 'express';
import dotenv from "dotenv"
dotenv.config();
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import eventRouter from './routes/event.routes.js';
import path from 'path';

const app = express();

app.use(express.json());
app.use(cors());


app.get("/", (req, res) => {
    res.send("Hello Ji!");

})





// console.log("Filepath: "+path.join(__dirname, "../../..", "uploads"))
app.use("/uploads", express.static(path.join(__dirname, "../../..", "uploads")));

app.use("/user", userRouter);

app.use("/events", eventRouter);

export default app