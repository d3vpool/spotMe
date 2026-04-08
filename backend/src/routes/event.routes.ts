import express, { type Request, type Response } from "express";
import { authCheck } from "../middlewares/authMiddleware.js";
import { createEvent, deleteEventFromId, getAllEvents, getEventFromId, updateEventFromId } from "../controllers/event.controllers.js";

const router = express.Router();

router.post("/", authCheck, createEvent);

router.get("/", authCheck, getAllEvents);

router.get("/:eventId", authCheck, getEventFromId);

router.delete("/:eventId", authCheck, deleteEventFromId)

router.patch("/:eventId", authCheck, updateEventFromId)

export default router;