import express from 'express';
import dotenv from "dotenv"
dotenv.config();
import cors from "cors";
import userRouter from "./routes/user.routes.js";

const app = express();

app.use(express.json());
app.use(cors());


app.get("/", (req, res) => {
    res.send("Hello Ji!");
})

app.use("/user", userRouter);

export default app