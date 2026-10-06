import type { Response } from "express";

/** Send a success response with the standard envelope. */
export function sendSuccess(
  res: Response,
  data: unknown,
  message?: string,
  statusCode = 200,
): void {
  const body: Record<string, unknown> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

/** Send an error response with the standard envelope. */
export function sendError(res: Response, statusCode: number, message: string, code?: string): void {
  const body: Record<string, unknown> = {
    success: false,
    error: { message, ...(code ? { code } : {}) },
  };
  res.status(statusCode).json(body);
}
