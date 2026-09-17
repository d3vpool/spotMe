import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, "../../../logs");
const logFile = path.join(logDir, "requests.log");

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Request timing middleware.
 * Logs structured JSON lines for every request:
 * { method, route, statusCode, durationMs, timestamp }
 *
 * Uses performance.now() for high-resolution timing.
 * Writes to backend/logs/requests.log (JSON lines format).
 * Also logs to console in development.
 */
export function requestTimer(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const entry = {
      method: req.method,
      route: req.route?.path ?? req.path,
      statusCode: res.statusCode,
      durationMs,
      timestamp,
    };

    const line = JSON.stringify(entry);

    // Write to log file
    fs.appendFileSync(logFile, line + "\n");

    // Console in development
    if (env.NODE_ENV !== "production") {
      console.log(`[REQ] ${entry.method} ${entry.route} ${entry.statusCode} ${entry.durationMs}ms`);
    }
  });

  next();
}
