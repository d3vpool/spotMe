import express from 'express';
import dotenv from "dotenv"
dotenv.config();
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());


app.get("/", (req, res) => {
    res.send("Hello Ji!");
})

export default app