import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

// ---------------------------------------------------------------------------
// User schemas
// ---------------------------------------------------------------------------

export const userSignUpSchema = z.object({
  email: z.email(),
  firstName: z.string(),
  password: z.string().min(6),
});

export const userLogInSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

// ---------------------------------------------------------------------------
// Shared param schemas
// ---------------------------------------------------------------------------

/** eventId must be a positive integer (the DB uses Int PKs). */
export const eventIdParamSchema = z.object({
  eventId: z.string().regex(/^\d+$/, "eventId must be a numeric string"),
});

/** imageId must be a positive integer. */
export const imageIdParamSchema = z.object({
  eventId: z.string().regex(/^\d+$/, "eventId must be a numeric string"),
  imageId: z.string().regex(/^\d+$/, "imageId must be a numeric string"),
});

/** shareToken is a UUID produced by crypto.randomUUID(). */
export const shareTokenParamSchema = z.object({
  shareToken: z.string().uuid("shareToken must be a valid UUID"),
});

/** batchId is a UUID. */
export const batchIdParamSchema = z.object({
  eventId: z.string().regex(/^\d+$/, "eventId must be a numeric string"),
  batchId: z.string().uuid("batchId must be a valid UUID"),
});

// ---------------------------------------------------------------------------
// Event body schemas
// ---------------------------------------------------------------------------

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  description: z.string().max(2000, "Description must be at most 2000 characters").optional(),
});

export const updateEventSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((data) => data.title !== undefined || data.description !== undefined, {
    message: "At least one of title or description must be provided",
  });

export const visibilitySchema = z.object({
  isPublic: z.boolean({ message: "isPublic must be a boolean" }),
});

export const importDriveSchema = z.object({
  driveUrl: z.string().min(1, "driveUrl is required").url("driveUrl must be a valid URL"),
});

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

function formatErrors(issues: z.ZodIssue[]): string {
  return issues.map((i) => i.message).join(", ");
}

/** Validate req.body against a schema. */
export function validateInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 400, formatErrors(result.error.issues));
    }
    req.body = result.data;
    next();
  };
}

/** Validate req.params against a schema. */
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return sendError(res, 400, formatErrors(result.error.issues));
    }
    req.params = result.data as typeof req.params;
    next();
  };
}

/** Validate req.query against a schema. */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return sendError(res, 400, formatErrors(result.error.issues));
    }
    next();
  };
}
