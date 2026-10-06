import express, { type NextFunction } from "express";
import type { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import eventRouter from "./routes/event.routes.js";
import path from "path";
import multer from "multer";
import { requestTimer } from "./middlewares/requestTimer.js";
import { sendError, sendSuccess } from "./utils/response.js";
import { env } from "./config/env.js";
import { prisma } from "./db/db.js";
import { Redis } from "ioredis";

const app = express();

// Directory of this module (src/ when run via tsx, dist/ when compiled) —
// used to resolve paths that live NEXT to the code (frontend build output).
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// Request timing — must be first to wrap everything
app.use(requestTimer);

// Security headers via Helmet
app.use(helmet());

app.use(express.json());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

// Lazily-created Redis client used ONLY by /health (BullMQ keeps its own
// connections). Self-healing: a dead client is replaced on the next probe.
let healthRedis: Redis | null = null;

async function redisHealthy(): Promise<boolean> {
  try {
    if (!healthRedis || healthRedis.status === "end") {
      healthRedis?.disconnect();
      healthRedis = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) => (times > 2 ? null : times * 300),
      });
      // Errors are surfaced through ping()/connect() rejections below.
      healthRedis.on("error", () => {});
    }
    if (healthRedis.status === "wait") {
      await healthRedis.connect();
    }
    await healthRedis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Health check for the deploy platform and the Docker HEALTHCHECK.
 * Verifies both dependencies the app can't work without: Postgres and Redis.
 */
app.get("/health", async (req, res) => {
  const checks: Record<string, "ok" | "down"> = { database: "ok", redis: "ok" };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    checks.database = "down";
  }

  if (!(await redisHealthy())) {
    checks.redis = "down";
  }

  const down = Object.entries(checks)
    .filter(([, status]) => status === "down")
    .map(([name]) => name);

  if (down.length > 0) {
    return sendError(res, 503, `Service unhealthy — unreachable: ${down.join(", ")}`);
  }
  return sendSuccess(res, { status: "ok", ...checks });
});

// Dev-only smoke route — in production the SPA served below owns "/".
if (env.NODE_ENV !== "production") {
  app.get("/", (req, res) => {
    res.send("Hello Ji!");
  });
}

// Serve uploaded images with cross-origin access for frontend.
// NOTE: Multer's diskStorage destination is the CWD-relative "uploads/" — both
// resolve to backend/uploads as long as the server runs from backend/ (all npm
// scripts and the Docker container's WORKDIR do).
app.use(
  "/uploads",
  (req, res, next) => {
    // Override helmet's default CORP: same-origin to allow cross-origin
    // image loading from the frontend (different origin/ports)
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve("uploads")),
);

app.use("/user", userRouter);

app.use("/events", eventRouter);

// ── Production: serve the built React app from this same origin ───────────────
// Same-origin means no CORS/cookie split in production; the frontend is built
// without VITE_API_URL so Axios uses a relative base URL and hits this server.
if (env.NODE_ENV === "production") {
  // src/ or dist/ → <repo>/frontend/dist (identical layout in both modes)
  const frontendDist = path.join(moduleDir, "../../frontend/dist");
  app.use(express.static(frontendDist));
  // SPA fallback: unknown GETs return index.html so React Router handles deep
  // links (e.g. /share/:token). API prefixes fall through to normal 404s.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (
      req.path.startsWith("/user") ||
      req.path.startsWith("/events") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/health")
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

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

export default app;
