import express, { type Request, type Response } from "express";
import { authCheck } from "../middlewares/authMiddleware.js";
import {
  createEvent,
  deleteEventFromId,
  getAllEvents,
  getEventFromId,
  getEventFromShareToken,
  searchFaces,
  searchFacesPublic,
  toggleEventVisibility,
  updateEventFromId,
  uploadImage,
  deleteImage,
  importFromDrive,
  getUploadStatus,
} from "../controllers/event.controllers.js";
import { upload } from "../middlewares/upload.middleware.js";
import {
  validateInput,
  validateParams,
  createEventSchema,
  updateEventSchema,
  visibilitySchema,
  importDriveSchema,
  eventIdParamSchema,
  imageIdParamSchema,
  shareTokenParamSchema,
  batchIdParamSchema,
} from "../middlewares/inputValidation.js";
import { searchLimiter, uploadLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// ── Create event ──────────────────────────────────────────────────────────
router.post(
  "/",
  authCheck,
  upload.single("coverImage"),
  validateInput(createEventSchema),
  createEvent,
);

// ── List events ───────────────────────────────────────────────────────────
router.get("/", authCheck, getAllEvents);

// ── Get single event ──────────────────────────────────────────────────────
router.get("/:eventId", authCheck, validateParams(eventIdParamSchema), getEventFromId);

// ── Delete event ──────────────────────────────────────────────────────────
router.delete("/:eventId", authCheck, validateParams(eventIdParamSchema), deleteEventFromId);

// ── Update event ──────────────────────────────────────────────────────────
router.patch(
  "/:eventId",
  authCheck,
  validateParams(eventIdParamSchema),
  validateInput(updateEventSchema),
  updateEventFromId,
);

// ── Toggle visibility ─────────────────────────────────────────────────────
router.patch(
  "/:eventId/visibility",
  authCheck,
  validateParams(eventIdParamSchema),
  validateInput(visibilitySchema),
  toggleEventVisibility,
);

// ── Upload images ─────────────────────────────────────────────────────────
router.post(
  "/:eventId/images",
  authCheck,
  validateParams(eventIdParamSchema),
  uploadLimiter,
  upload.array("EventImages"),
  uploadImage,
);

// ── Import from Google Drive ──────────────────────────────────────────────
router.post(
  "/:eventId/images/import-drive",
  authCheck,
  validateParams(eventIdParamSchema),
  uploadLimiter,
  validateInput(importDriveSchema),
  importFromDrive,
);

// ── Upload batch status ───────────────────────────────────────────────────
router.get(
  "/:eventId/upload-status/:batchId",
  authCheck,
  validateParams(batchIdParamSchema),
  getUploadStatus,
);

// ── Delete individual image ───────────────────────────────────────────────
router.delete(
  "/:eventId/images/:imageId",
  authCheck,
  validateParams(imageIdParamSchema),
  deleteImage,
);

// ── Search (authenticated) ────────────────────────────────────────────────
router.post(
  "/:eventId/search",
  authCheck,
  validateParams(eventIdParamSchema),
  searchLimiter,
  upload.single("Selfie"),
  searchFaces,
);

// ── Public share ──────────────────────────────────────────────────────────
router.get("/share/:shareToken", validateParams(shareTokenParamSchema), getEventFromShareToken);

router.post(
  "/share/:shareToken/search",
  validateParams(shareTokenParamSchema),
  searchLimiter,
  upload.single("Selfie"),
  searchFacesPublic,
);

export default router;
