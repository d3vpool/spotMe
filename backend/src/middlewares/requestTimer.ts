import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve logs relative to the working directory (backend/ for all npm
// scripts and the container's WORKDIR) — NOT relative to this module. The
// old module-relative path (../../../logs) escaped the backend directory
// entirely (repo root in dev, root-owned /app/logs in the container) and
// crashed the process with EACCES at startup — request logging must never
// take the server down.
const logDir = path.join(process.cwd(), "logs");
const logFile = path.join(logDir, "requests.log");

// Ensure logs directory exists (best-effort — never crash at import time)
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.warn(`[requestTimer] Could not create log dir ${logDir}:`, (err as Error).message);
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

    // Write to log file (best-effort — a logging failure must not fail the request)
    try {
      fs.appendFileSync(logFile, line + "\n");
    } catch (err) {
      console.warn("[requestTimer] Failed to write log line:", (err as Error).message);
    }

    // Console in development
    if (env.NODE_ENV !== "production") {
      console.log(`[REQ] ${entry.method} ${entry.route} ${entry.statusCode} ${entry.durationMs}ms`);
    }
  });

  next();
}
