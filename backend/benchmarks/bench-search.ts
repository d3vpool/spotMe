#!/usr/bin/env tsx
/**
 * Search benchmark — measures pgvector distance query latency.
 *
 * Modes:
 *   Default (direct): Connects directly to DB via Prisma, no server needed.
 *   --via-http:       Sends HTTP requests through Express (server must be running).
 *
 * Usage:
 *   npm run bench:search -- --embeddings=1000 --iterations=100
 *   npm run bench:search -- --embeddings=1000 --iterations=100 --via-http
 *
 * Prerequisites:
 *   1. Run `npm run seed -- --embeddings=N` first
 *   2. For --via-http mode, start the server with `npm run dev`
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import "dotenv/config";
import {
  computePercentiles,
  printMarkdownTable,
  printEnvironmentPreamble,
  discardWarmup,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const embedArg = args.find((a) => a.startsWith("--embeddings="));
const iterArg = args.find((a) => a.startsWith("--iterations="));
const viaHttp = args.includes("--via-http");

const EMBEDDING_COUNT = embedArg ? parseInt(embedArg.split("=")[1], 10) : 1000;
const ITERATIONS = iterArg ? parseInt(iterArg.split("=")[1], 10) : 100;
const WARMUP_COUNT = 5;

// ---------------------------------------------------------------------------
// DB client
// ---------------------------------------------------------------------------
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type FaceMatch = {
  id: number;
  imageId: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  imageUrl: string;
  distance: number;
};

// ---------------------------------------------------------------------------
// Benchmark: Direct DB query
// ---------------------------------------------------------------------------
async function benchDirect(): Promise<number[]> {
  // Pick a random embedding from the seeded dataset
  const randomEmbedding = await prisma.$queryRaw<{ vector: string }[]>`
    SELECT "vector"::text AS vector
    FROM "FaceEmbedding"
    ORDER BY RANDOM()
    LIMIT 1
  `;

  if (randomEmbedding.length === 0) {
    console.error("No embeddings found. Run `npm run seed -- --embeddings=N` first.");
    process.exit(1);
  }

  const queryVector = randomEmbedding[0].vector;
  // Get the event ID from the seeded images
  const eventIds = await prisma.$queryRaw<{ eventId: number }[]>`
    SELECT DISTINCT "image"."eventId"
    FROM "FaceEmbedding"
    JOIN "image" ON "FaceEmbedding"."imageId" = "image"."id"
    WHERE "image"."imageUrl" LIKE '%__BENCH_IMG_%'
    LIMIT 1
  `;

  if (eventIds.length === 0) {
    console.error("No bench event found. Run `npm run seed -- --embeddings=N` first.");
    process.exit(1);
  }

  const eventId = eventIds[0].eventId;
  const latencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();

    await prisma.$queryRaw<FaceMatch[]>`
      SELECT
        "FaceEmbedding"."id",
        "FaceEmbedding"."imageId",
        "FaceEmbedding"."boundingBox",
        "image"."imageUrl",
        "FaceEmbedding"."vector" <-> ${queryVector}::vector AS distance
      FROM "FaceEmbedding"
      JOIN "image"
        ON "FaceEmbedding"."imageId" = "image"."id"
      WHERE "image"."eventId" = ${eventId}
      ORDER BY distance
      LIMIT 10
    `;

    const elapsed = performance.now() - start;
    latencies.push(elapsed);
  }

  return latencies;
}

// ---------------------------------------------------------------------------
// Benchmark: HTTP request
// ---------------------------------------------------------------------------
async function benchHttp(): Promise<number[]> {
  // Step 1: Login to get JWT
  const loginRes = await fetch("http://localhost:3000/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "__BENCH_USER__@bench.local",
      password: "bench_password_hash_not_real",
    }),
  });

  if (!loginRes.ok) {
    console.error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    console.error("Make sure the server is running (npm run dev) and seed data exists.");
    process.exit(1);
  }

  // Day 1 envelope standardization: responses are { success, data: {...} }.
  const { token } = (await loginRes.json()) as { data: { token: string } };

  // Step 2: Get bench event ID
  const eventsRes = await fetch("http://localhost:3000/events", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!eventsRes.ok) {
    console.error(`Failed to list events: ${eventsRes.status}`);
    process.exit(1);
  }

  const { events } = (await eventsRes.json()) as {
    data: { events: { id: number; title: string }[] };
  };

  const benchEvent = events.find((e) => e.title === "__BENCH_SEED__");
  if (!benchEvent) {
    console.error("Bench event not found. Run `npm run seed` first.");
    process.exit(1);
  }

  // Step 3: Create a small test selfie image (1x1 pixel PNG)
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xd8, 0xab, 0xfb, 0xcf,
    0xc0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  // NOTE: The search endpoint expects a real face photo — a 1x1 pixel will
  // fail face detection. For HTTP benchmarking we measure the time to get a
  // response (even if it's a 400 "no face detected"). The point is to measure
  // the Express/Multer/face-detection pipeline latency, not accuracy.
  //
  // If you want true end-to-end search latency with actual matches, provide
  // a real selfie in benchmarks/fixtures/selfie.jpg and use that file.

  const latencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();

    const formData = new FormData();
    formData.append(
      "Selfie",
      new Blob([pngHeader], { type: "image/png" }),
      "selfie.png"
    );

    await fetch(
      `http://localhost:3000/events/${benchEvent.id}/search`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );

    const elapsed = performance.now() - start;
    latencies.push(elapsed);
  }

  return latencies;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Bench Search ===\n");

  printEnvironmentPreamble(
    `${EMBEDDING_COUNT.toLocaleString()} embeddings (seeded)`,
    `${ITERATIONS} iterations (${WARMUP_COUNT} warm-up discarded)`
  );

  console.log(`Mode: ${viaHttp ? "HTTP (server required)" : "Direct DB (no server needed)"}`);
  console.log("Running...\n");

  const rawLatencies = viaHttp ? await benchHttp() : await benchDirect();
  const latencies = discardWarmup(rawLatencies, WARMUP_COUNT);
  const stats = computePercentiles(latencies);

  console.log("\nResults:\n");
  printMarkdownTable(["Metric", "Value"], [
    ["p50", `${stats.p50}ms`],
    ["p95", `${stats.p95}ms`],
    ["p99", `${stats.p99}ms`],
    ["mean", `${stats.mean}ms`],
    ["min", `${stats.min}ms`],
    ["max", `${stats.max}ms`],
    ["count", stats.count],
    ["dataset", `${EMBEDDING_COUNT.toLocaleString()} embeddings`],
    ["mode", viaHttp ? "HTTP (end-to-end)" : "Direct DB"],
  ]);

  console.log("");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
