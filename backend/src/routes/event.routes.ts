import express, { type Request, type Response } from "express";
import { authCheck } from "../middlewares/authMiddleware.js";
import { createEvent, deleteEventFromId, getAllEvents, getEventFromId, getEventFromShareToken, updateEventFromId, uploadImage } from "../controllers/event.controllers.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/", authCheck, createEvent);

router.get("/", authCheck, getAllEvents);

router.get("/:eventId", authCheck, getEventFromId);

router.delete("/:eventId", authCheck, deleteEventFromId)

router.patch("/:eventId", authCheck, updateEventFromId)

router.post("/:eventId/images", authCheck, upload.array('EventImages'), uploadImage)

router.get("/share/:shareToken", getEventFromShareToken)

export default router;