/**
 * End-to-end pipeline plumbing test (added during the Post-Day-7 audit).
 *
 * WHY THIS EXISTS: the face-embedding INSERT was broken from Day 2 until
 * Day 7 (literal integers instead of `$1` placeholders), yet the suite stayed
 * green because no test ever executed `detectEveryFace`'s insert path. This
 * test closes that gap: it drives a real photo through upload → queue →
 * worker → embeddings → search, exactly the path that was silently dead.
 *
 * PLUMBING, NOT ACCURACY: searching with the photo you just uploaded proves
 * the pipeline persists and retrieves embeddings (distance ≈ 0 by
 * construction). It says NOTHING about whether face matching is accurate —
 * see ACCURACY.md for the still-unrun accuracy benchmark.
 *
 * FIXTURE (not committed): drop a real, single-face JPEG at
 *   backend/test/fixtures-local/selfie.jpg   (gitignored — see .gitignore)
 * then run:
 *   cd backend && npm test -- pipeline-e2e
 * When the file is absent the test SKIPs with that instruction, so CI (which
 * cannot ship real face photos) stays green.
 *
 * The worker runs IN-PROCESS for the duration of the test: test/setup.ts
 * points process.env.DATABASE_URL at the test DB before any app module is
 * imported, so the worker writes embeddings to the test DB and
 * upload-status polls resolve there too. (A separately running `npm run
 * worker` from local dev would race for the same Redis jobs and write to the
 * dev DB — stop it before running this file locally.)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import app from "../src/app.js";
import { loadModels } from "../src/services/face.service.js";
import { startImageProcessingWorker } from "../src/queues/imageProcessing.worker.js";
import type { Worker } from "bullmq";
import { testPrisma } from "./setup.js";
import { createUserAndToken } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTO = path.join(__dirname, "fixtures-local", "selfie.jpg");
const photoAvailable = fs.existsSync(PHOTO);

const SKIP_HELP =
  "E2E pipeline test skipped: no real face photo found. " +
  "Copy a single-face JPEG to backend/test/fixtures-local/selfie.jpg " +
  "(gitignored) and re-run `npm test -- pipeline-e2e` to enable it.";

describe.skipIf(!photoAvailable)("pipeline E2E (enabled — fixture present)", () => {
  let worker: Worker;
  let token: string;
  let eventId: number;
  let batchId: string;
  let processedImageId: number;

  beforeAll(async () => {
    // Models are loaded by server.ts/worker.ts entrypoints, not by app import —
    // tests must do it explicitly or inference fails on uninitialized nets.
    await loadModels();
    // In-process worker: consumes the real BullMQ queue against the test DB.
    worker = startImageProcessingWorker();
    const created = await createUserAndToken();
    token = created.token;
    const ev = await request(app)
      .post("/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "e2e-pipeline", description: "plumbing check" });
    // NOTE: description is required in practice — createEvent 500s without it
    // (Prisma column NOT NULL vs Zod marking it optional; reported in the audit).
    expect(ev.status).toBe(201);
    eventId = ev.body.data.event.id;
  });

  afterAll(async () => {
    await worker?.close();
  });

  it("upload → worker → FaceEmbedding rows → search returns the photo with a bounding box", async () => {
    // 1. Upload through the real API.
    const upload = await request(app)
      .post(`/events/${eventId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .attach("EventImages", PHOTO);
    expect(upload.status).toBe(200);
    batchId = upload.body.data.batchId;
    expect(upload.body.data.totalImages).toBe(1);

    // 2. Poll batch status until the in-process worker finishes indexing.
    let status = "";
    let completed = 0;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const res = await request(app)
        .get(`/events/${eventId}/upload-status/${batchId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      status = res.body.data.status;
      completed = res.body.data.completed;
      if (status !== "processing") break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(status).toBe("completed"); // completed_with_errors here would mean the insert path broke again
    expect(completed).toBe(1);

    // 3. The embeddings actually exist in the DB (the Day 7 bug's blast radius).
    const images = await testPrisma.image.findMany({ where: { eventId } });
    expect(images).toHaveLength(1);
    processedImageId = images[0]!.id;
    const embeddings = await testPrisma.faceEmbedding.findMany({
      where: { imageId: processedImageId },
    });
    expect(embeddings.length).toBeGreaterThanOrEqual(1);

    // 4. Search with the SAME photo — plumbing check: the descriptor round-trips
    //    through insert → pgvector → nearest-neighbour query and matches.
    const search = await request(app)
      .post(`/events/${eventId}/search`)
      .set("Authorization", `Bearer ${token}`)
      .attach("Selfie", PHOTO);
    expect(search.status).toBe(200);
    const matches = search.body.data.matches as {
      imageId: number;
      imageUrl: string;
      faces: unknown[];
    }[];
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const hit = matches.find((m) => m.imageId === processedImageId);
    expect(hit).toBeDefined();
    expect(hit!.imageUrl).toContain("/uploads/");
    expect(Array.isArray(hit!.faces)).toBe(true);
    expect(hit!.faces.length).toBeGreaterThanOrEqual(1);
  }, 60_000);
});

describe.skipIf(photoAvailable)("pipeline E2E — fixture instructions", () => {
  it("prints how to enable the skipped pipeline test", () => {
    // Runs only when the fixture is ABSENT (CI): keep the skip reason visible.
    console.log(`\n  ⚠ ${SKIP_HELP}\n`);
    expect(photoAvailable).toBe(false);
  });
});
