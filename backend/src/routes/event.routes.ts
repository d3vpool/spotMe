import express, { type Request, type Response } from "express";
import { authCheck } from "../middlewares/authMiddleware.js";
import { createEvent, getAllEvents, getEventFromId } from "../controllers/event.controllers.js";

const router = express.Router();

router.post("/", authCheck, createEvent);

router.get("/", authCheck, getAllEvents);

router.get("/:eventId", authCheck, getEventFromId);

export default router;