#!/usr/bin/env tsx
/**
 * Upload benchmark — measures image upload + face indexing latency.
 *
 * Two modes:
 *   1. Response latency: time for the upload endpoint to return (async queue)
 *   2. End-to-end latency: time until all images finish face detection (polls batch status)
 *
 * REQUIRES THE SERVER AND WORKER TO BE RUNNING:
 *   npm run dev     (API server on port 3000)
 *   npm run worker  (background worker)
 *
 * Usage:
 *   npm run bench:upload
 *
 * Prerequisites:
 *   1. Start the server: `npm run dev` (in backend/)
 *   2. Start the worker: `npm run worker` (in backend/)
 *   3. Run seed first: `npm run seed -- --embeddings=100` (to get a bench user)
 *   4. Place a test image in `benchmarks/fixtures/test-upload.jpg`
 *      (or the script will create a tiny synthetic one)
 *
 * Tests batch sizes: 1, 10, 50 images per upload.
 * Reports response latency and end-to-end processing time.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import {
  computePercentiles,
  printMarkdownTable,
  printEnvironmentPreamble,
} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost:3000";
const BATCH_SIZES = [1, 10, 50];
const ITERATIONS = 3; // repeat each batch size for stability
const WARMUP_COUNT = 1;
const BENCH_USER_EMAIL = "__BENCH_USER__@bench.local";
const BENCH_PASSWORD = "bench_password_hash_not_real";
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_WAIT_MS = 120_000; // 2 minutes max wait

// ---------------------------------------------------------------------------
// Test image
// ---------------------------------------------------------------------------
function getTestImagePath(): string {
  const fixturePath = path.join(__dirname, "fixtures", "test-upload.jpg");
  if (fs.existsSync(fixturePath)) {
    return fixturePath;
  }

  // Create a minimal JPEG file (smallest valid JPEG)
  const minimalJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);

  const fixturesDir = path.join(__dirname, "fixtures");
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  fs.writeFileSync(fixturePath, minimalJpeg);
  console.log(`  (Created synthetic test image at ${fixturePath})`);
  return fixturePath;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: BENCH_USER_EMAIL, password: BENCH_PASSWORD }),
  });

  if (!res.ok) {
    console.error(`Login failed: ${res.status} ${await res.text()}`);
    console.error(
      "Make sure the server is running (npm run dev) and seed data exists."
    );
    process.exit(1);
  }

  const envelope = (await res.json()) as { data: { token: string } };
  return envelope.data.token;
}

async function createEvent(token: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `__BENCH_UPLOAD__${Date.now()}`,
      description: "Benchmark upload event",
    }),
  });

  if (!res.ok) {
    console.error(`Create event failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const envelope = (await res.json()) as { data: { id: number } };
  return envelope.data.id;
}

async function cleanupEvent(token: string, eventId: number): Promise<void> {
  try {
    await fetch(`${BASE_URL}/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort cleanup
  }
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------

interface BenchResult {
  responseLatencies: number[];   // time for endpoint to return
  e2eLatencies: number[];       // time until all images finish processing
}

async function benchBatch(
  token: string,
  eventId: number,
  batchSize: number,
  imagePath: string
): Promise<BenchResult> {
  const responseLatencies: number[] = [];
  const e2eLatencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(imagePath);

    for (let j = 0; j < batchSize; j++) {
      formData.append(
        "EventImages",
        new Blob([imageBuffer], { type: "image/jpeg" }),
        `test-${j}.jpg`
      );
    }

    // Measure response latency (how fast the endpoint returns)
    const responseStart = performance.now();
    const res = await fetch(`${BASE_URL}/events/${eventId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      console.error(
        `  Upload failed (batch=${batchSize}, iter=${i}): ${res.status}`
      );
      continue;
    }

    const envelope = (await res.json()) as {
      data: { batchId: string; totalImages: number };
    };
    const responseLatency = performance.now() - responseStart;
    responseLatencies.push(responseLatency);

    // Poll for completion to measure end-to-end latency
    const { batchId, totalImages } = envelope.data;
    const pollStart = performance.now();
    let completed = false;

    while (performance.now() - pollStart < MAX_POLL_WAIT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const statusRes = await fetch(
        `${BASE_URL}/events/${eventId}/upload-status/${batchId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (statusRes.ok) {
        const statusEnvelope = (await statusRes.json()) as {
          data: { completed: number; failed: number; status: string };
        };
        const { data: status } = statusEnvelope;
        if (status.status === "completed" || status.status === "completed_with_errors") {
          const e2eLatency = performance.now() - pollStart + responseLatency;
          e2eLatencies.push(e2eLatency);
          completed = true;
          break;
        }
      }
    }

    if (!completed) {
      console.error(
        `  Warning: batch ${batchSize} iter ${i} timed out waiting for completion`
      );
    }
  }

  return { responseLatencies, e2eLatencies };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Bench Upload ===\n");

  printEnvironmentPreamble(
    `batch sizes: ${BATCH_SIZES.join(", ")}`,
    `${ITERATIONS} iterations per batch (${WARMUP_COUNT} warm-up discarded)`
  );

  console.log("Server + worker required — ensure `npm run dev` and `npm run worker` are running.\n");

  const imagePath = getTestImagePath();
  const token = await login();
  const eventId = await createEvent(token);
  console.log(`  Created bench event: id=${eventId}\n`);

  const results: {
    batchSize: number;
    responseLatencies: number[];
    e2eLatencies: number[];
  }[] = [];

  for (const batchSize of BATCH_SIZES) {
    process.stdout.write(`  Benchmarking batch size ${batchSize}...`);
    const raw = await benchBatch(token, eventId, batchSize, imagePath);

    const responseLats = discardWarmup(raw.responseLatencies, WARMUP_COUNT);
    const e2eLats = discardWarmup(raw.e2eLatencies, WARMUP_COUNT);

    const responseStats = computePercentiles(responseLats);
    const e2eStats = computePercentiles(e2eLats);

    results.push({
      batchSize,
      responseLatencies: responseLats,
      e2eLatencies: e2eLats,
    });

    console.log(
      ` response p50=${responseStats.p50}ms, e2e p50=${e2eStats.p50}ms`
    );
  }

  // Print results table
  console.log("\nResults:\n");

  const headers = ["Metric", ...BATCH_SIZES.map((b) => `Batch ${b}`)];
  const rows: (string | number)[][] = [];

  rows.push([
    "Response p50",
    ...results.map((r) => `${computePercentiles(r.responseLatencies).p50}ms`),
  ]);
  rows.push([
    "Response p95",
    ...results.map((r) => `${computePercentiles(r.responseLatencies).p95}ms`),
  ]);
  rows.push([
    "Response p99",
    ...results.map((r) => `${computePercentiles(r.responseLatencies).p99}ms`),
  ]);
  rows.push([
    "E2E p50",
    ...results.map((r) => `${computePercentiles(r.e2eLatencies).p50}ms`),
  ]);
  rows.push([
    "E2E p95",
    ...results.map((r) => `${computePercentiles(r.e2eLatencies).p95}ms`),
  ]);
  rows.push([
    "E2E p99",
    ...results.map((r) => `${computePercentiles(r.e2eLatencies).p99}ms`),
  ]);
  rows.push(["iterations", ...BATCH_SIZES.map(() => ITERATIONS)]);
  rows.push([
    "test image",
    ...BATCH_SIZES.map(() =>
      imagePath.includes("test-upload.jpg") ? "real fixture" : "synthetic"
    ),
  ]);

  printMarkdownTable(headers, rows);

  // Cleanup
  console.log("\nCleaning up bench event...");
  await cleanupEvent(token, eventId);
  console.log("Done.\n");
}

function discardWarmup(latencies: number[], warmupCount: number): number[] {
  if (latencies.length <= warmupCount * 2) {
    console.warn(
      `  Warning: only ${latencies.length} iterations — keeping all`
    );
    return latencies;
  }
  return latencies.slice(warmupCount);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
