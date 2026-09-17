import express, { type NextFunction } from 'express';
import type { Request, Response } from "express";
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import eventRouter from './routes/event.routes.js';
import path from 'path';
import multer from 'multer';
import { requestTimer } from './middlewares/requestTimer.js';
import { sendError } from './utils/response.js';
import { env } from './config/env.js';

const app = express();

// Request timing — must be first to wrap everything
app.use(requestTimer);

app.use(express.json());
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
}));


app.get("/", (req, res) => {
    res.send("Hello Ji!");

})
app.use("/uploads", express.static(path.join(__dirname, "../../..", "uploads")));

app.use("/user", userRouter);

app.use("/events", eventRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    if (err instanceof multer.MulterError) {
        return sendError(res, 400, err.message);
    }

    if (err.message === "Only image files are allowed") {
        return sendError(res, 400, err.message);
    }

    return sendError(res, 500, "Something went wrong");
});

export default app
