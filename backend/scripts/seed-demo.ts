#!/usr/bin/env tsx
/**
 * seed:demo — create a demo photographer account + one PUBLIC event so a
 * fresh deploy isn't empty.
 *
 * Usage:
 *   npm run seed:demo                          # account + empty public event
 *   npm run seed:demo -- --photos=/path/dir    # + import images
 *   npm run seed:demo -- --password=supersecret
 *
 * Password resolution: --password → $DEMO_PASSWORD → random (printed once).
 *
 * Photos passed via --photos MUST be images you have the right to use —
 * your own photos, or a source whose license clearly permits this use.
 * This script deliberately downloads NOTHING from the internet.
 *
 * Imported photos go through the SAME queue pipeline as real uploads
 * (image row + UploadBatch + BullMQ job), so the running worker picks them
 * up exactly like a manual upload. Re-running is idempotent for photos:
 * deterministic file names make `imageUrl` stable, so already-imported
 * files are skipped (this is the same no-dedup-by-content caveat as Drive
 * import — see PROGRESS.md — but stable names keep re-runs from piling up
 * duplicates).
 *
 * Note: this script does NOT import src/config/env.ts (full env validation)
 * on purpose — it only needs DATABASE_URL/REDIS_URL so it can run inside the
 * container via `docker compose exec` where JWT_SECRET may only exist in the
 * API process's environment. It still fails fast if DATABASE_URL is missing.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Queue } from "bullmq";
import type { ImageProcessingJobData } from "../src/queues/imageProcessing.queue.js";

const DEMO_EMAIL = "demo@spotme.local";
const DEMO_EVENT_TITLE = "SpotMe Demo";
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const args = process.argv.slice(2);
const photosArg = args.find((a) => a.startsWith("--photos="))?.slice("--photos=".length);
const passwordArg = args.find((a) => a.startsWith("--password="))?.slice("--password=".length);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — run this from backend/ with a valid .env");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const queue = new Queue<ImageProcessingJobData>("image-processing", {
  connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
  // Mirror backend/src/queues/imageProcessing.queue.ts defaultJobOptions so
  // seed-enqueued jobs retry/back off exactly like API-enqueued jobs.
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

/** Deterministic, filesystem-safe name so re-running the seed skips existing photos. */
function demoFileName(index: number, original: string): string {
  const safe = original.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `demo-${index}-${safe}`;
}

async function main() {
  // --- Password -------------------------------------------------------
  let password = passwordArg ?? process.env.DEMO_PASSWORD;
  let printPassword = false;
  if (!password) {
    password = crypto.randomBytes(12).toString("base64url");
    printPassword = true;
  }

  // --- Demo photographer ---------------------------------------------
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { password: hashed }, // keep password in sync with what we print
    create: { email: DEMO_EMAIL, firstName: "Demo", password: hashed },
  });
  console.log(`Demo user ready: ${DEMO_EMAIL} (id ${user.id})`);

  // --- Public event ---------------------------------------------------
  let event = await prisma.event.findFirst({
    where: { createdBy: user.id, title: DEMO_EVENT_TITLE },
  });
  if (!event) {
    event = await prisma.event.create({
      data: {
        title: DEMO_EVENT_TITLE,
        description: "Public demo event — paste a selfie to find yourself.",
        createdBy: user.id,
        shareToken: crypto.randomUUID(),
        isPublic: true, // demo must be reachable via share link without login
      },
    });
    console.log(`Created public event "${event.title}" (id ${event.id})`);
  } else if (!event.isPublic) {
    event = await prisma.event.update({ where: { id: event.id }, data: { isPublic: true } });
    console.log(`Existing event "${event.title}" re-marked public`);
  } else {
    console.log(`Event "${event.title}" already exists (id ${event.id})`);
  }

  // --- Optional photos through the real pipeline ----------------------
  let imported = 0;
  let skipped = 0;

  if (photosArg) {
    const sourceDir = path.resolve(photosArg);
    if (!fs.existsSync(sourceDir)) {
      console.error(`Photos directory not found: ${sourceDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(sourceDir).filter((f) => IMAGE_EXTENSIONS.test(f));
    if (files.length === 0) {
      console.log(`No image files (.jpg/.jpeg/.png/.webp) found in ${sourceDir}`);
    }

    const uploadsDir = path.resolve("uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    // base URL baked into imageUrl — must match where the app is served.
    const publicUrl = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

    const batch = await prisma.uploadBatch.create({
      data: { eventId: event.id, totalImages: files.length },
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const fileName = demoFileName(i, file);
      const imageUrl = `${publicUrl}/uploads/${fileName}`;
      const dest = path.join(uploadsDir, fileName);

      try {
        const exists = await prisma.image.findFirst({ where: { imageUrl } });
        if (exists && fs.existsSync(dest)) {
          skipped++;
          continue;
        }

        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(sourceDir, file), dest);
        }

        const image = await prisma.image.create({
          data: { imageUrl, eventId: event.id },
        });

        await queue.add(
          "process-image",
          { imageId: image.id, filePath: `uploads/${fileName}`, batchId: batch.id },
          { jobId: `img-${image.id}-${batch.id}` },
        );
        imported++;
      } catch (err) {
        skipped++;
        console.warn(`Skipped ${file}: ${(err as Error).message}`);
      }
    }

    console.log(
      `Photos: ${imported} queued for face indexing, ${skipped} skipped (already present or failed)` +
        ` — worker will process them like a normal upload.`,
    );
  } else {
    console.log("No --photos= dir given — event starts empty (that's fine).");
  }

  const publicUrl = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  console.log("\n─── Demo seed summary ───");
  console.log(`  Login:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${printPassword ? password : "(the one you passed)"}${printPassword ? "  ← printed only once" : ""}`);
  console.log(`  Event:    ${DEMO_EVENT_TITLE} (public)`);
  console.log(`  Share:    ${publicUrl}/share/${event.shareToken}`);
  console.log("  Upload only photos you have the right to use — see README privacy note.");
  console.log("──────────────────────────\n");
}

main()
  .catch((err) => {
    console.error("seed:demo failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await queue.close();
  });
