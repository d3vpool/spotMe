import express from 'express';
import dotenv from "dotenv"
dotenv.config();
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import eventRouter from './routes/event.routes.js';

const app = express();

app.use(express.json());
app.use(cors());


app.get("/", (req, res) => {
    res.send("Hello Ji!");
})

app.use("/user", userRouter);

app.use("/events", eventRouter);

export default app