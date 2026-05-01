import express, { type NextFunction } from 'express';
import type { Request, Response } from "express";
import dotenv from "dotenv"
dotenv.config();
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import eventRouter from './routes/event.routes.js';
import path from 'path';
import multer from 'multer';
import { success } from 'zod';

const app = express();

app.use(express.json());
app.use(cors());


app.get("/", (req, res) => {
    res.send("Hello Ji!");

})
app.use("/uploads", express.static(path.join(__dirname, "../../..", "uploads")));

app.use("/user", userRouter);

app.use("/events", eventRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    if(err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if(err.message === "Only image files are allowed") {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    return res.status(500).json({
        success: false,
        message: "Something went wrong"
    });
});

export default app