import rateLimit from "express-rate-limit";
import { sendError } from "../utils/response.js";

// ── Rate limiters ───────────────────────────────────────────────────────────
// These limits are calibrated for a portfolio demo with no real traffic data.
// Real production would need Redis-backed distributed rate limiting and
// limits tuned to actual usage patterns.
//
// IP-based limiting affects all users behind the same NAT/corporate network
// identically — acceptable for a portfolio project, but a known limitation.
//
// In test environment (NODE_ENV=test), rate limiting is disabled entirely
// so that test suites can hit endpoints repeatedly without 429s.

const isTest = process.env.NODE_ENV === "test";

/**
 * Auth endpoints: stricter to slow brute-force / credential stuffing.
 * 5 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, "Too many requests, please try again later");
  },
});

/**
 * Search endpoints: expensive ML inference + unauthenticated public path.
 * 10 requests per minute per IP.
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, "Too many search requests, please try again later");
  },
});

/**
 * Upload / import endpoints: expensive downstream processing (queue + ML).
 * 20 requests per hour per IP — a photographer's realistic single-session
 * usage pattern, not restrictive enough to break legitimate bulk uploads.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, "Too many upload requests, please try again later");
  },
});
