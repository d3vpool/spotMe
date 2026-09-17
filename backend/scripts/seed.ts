#!/usr/bin/env tsx
/**
 * Seed script for benchmarking — generates synthetic FaceEmbedding data.
 *
 * Usage:
 *   npm run seed -- --embeddings=1000    # seed 1000 embeddings
 *   npm run seed:clean                    # delete seeded rows only
 *
 * Creates a test User, a test Event, and N Image + FaceEmbedding rows.
 * Vectors are random 128-D floats normalized to unit length.
 *
 * NOTE: These are uniformly distributed on a hypersphere. Real face-api.js
 * descriptors cluster more tightly (all faces resemble each other more than
 * random noise). This is fine for raw query latency benchmarking — pgvector
 * doesn't care about semantic clustering. Do NOT use these synthetic vectors
 * for accuracy or threshold calibration.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const isClean = args.includes("--clean");

const embedArg = args.find((a) => a.startsWith("--embeddings="));
const EMBEDDING_COUNT = embedArg ? parseInt(embedArg.split("=")[1], 10) : 1000;

const BENCH_USER_EMAIL = "__BENCH_USER__@bench.local";
const BENCH_EVENT_TITLE = "__BENCH_SEED__";

// ---------------------------------------------------------------------------
// DB client
// ---------------------------------------------------------------------------
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unit-normalized 128-D random vector.
 *  Uses Box-Muller to approximate a Gaussian per component, then normalizes.
 *  Result is a point uniformly distributed on the unit hypersphere — close
 *  enough to face-api.js descriptor statistics for latency benchmarking. */
function randomVector128(): number[] {
  const vec: number[] = [];
  for (let i = 0; i < 128; i++) {
    // Box-Muller transform for a standard normal
    const u1 = Math.random() || 1e-10; // avoid log(0)
    const u2 = Math.random();
    vec.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
  }
  // Normalize to unit length
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ---------------------------------------------------------------------------
// Clean
// ---------------------------------------------------------------------------
async function clean() {
  console.log("Cleaning seeded benchmark data...");

  // Delete FaceEmbeddings linked to images in bench events
  const benchImages = await prisma.image.findMany({
    where: { event: { title: BENCH_EVENT_TITLE } },
    select: { id: true },
  });
  const imageIds = benchImages.map((i) => i.id);

  if (imageIds.length > 0) {
    const deleted = await prisma.faceEmbedding.deleteMany({
      where: { imageId: { in: imageIds } },
    });
    console.log(`  Deleted ${deleted.count} FaceEmbedding rows`);
  }

  // Delete images
  const deletedImages = await prisma.image.deleteMany({
    where: { event: { title: BENCH_EVENT_TITLE } },
  });
  console.log(`  Deleted ${deletedImages.count} image rows`);

  // Delete events
  const deletedEvents = await prisma.event.deleteMany({
    where: { title: BENCH_EVENT_TITLE },
  });
  console.log(`  Deleted ${deletedEvents.count} event rows`);

  // Delete user
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: BENCH_USER_EMAIL },
  });
  console.log(`  Deleted ${deletedUsers.count} user rows`);

  console.log("Done.");
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  const start = performance.now();
  console.log(`Seeding ${EMBEDDING_COUNT.toLocaleString()} embeddings...\n`);

  // 1. Upsert bench user
  const user = await prisma.user.upsert({
    where: { email: BENCH_USER_EMAIL },
    update: {},
    create: {
      email: BENCH_USER_EMAIL,
      firstName: "Bench",
      password: "bench_password_hash_not_real",
    },
  });
  console.log(`  User: id=${user.id} (${user.email})`);

  // 2. Upsert bench event
  const event = await prisma.event.upsert({
    where: { shareToken: "__BENCH_SEED_TOKEN__" },
    update: {},
    create: {
      title: BENCH_EVENT_TITLE,
      description: "Synthetic benchmark event",
      createdBy: user.id,
      shareToken: "__BENCH_SEED_TOKEN__",
      isPublic: true,
    },
  });
  console.log(`  Event: id=${event.id} ("${event.title}")`);

  // 3. Create images (1 embedding per image)
  const CHUNK_SIZE = 500;
  let imagesCreated = 0;

  // Insert images in chunks
  for (let i = 0; i < EMBEDDING_COUNT; i += CHUNK_SIZE) {
    const chunk = Math.min(CHUNK_SIZE, EMBEDDING_COUNT - i);
    const imageValues = Array.from({ length: chunk }, (_, j) => {
      const idx = i + j;
      return `(${event.id}, '__BENCH_IMG_${idx}__', NOW())`;
    }).join(",");

    await prisma.$executeRawUnsafe(
      `INSERT INTO "image" ("eventId", "imageUrl", "createdAt") VALUES ${imageValues}`
    );
    imagesCreated += chunk;
    process.stdout.write(`\r  Images: ${imagesCreated}/${EMBEDDING_COUNT}`);
  }
  console.log("");

  // 4. Get back image IDs (they are sequential after the bulk insert)
  const images = await prisma.image.findMany({
    where: { eventId: event.id },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (images.length !== EMBEDDING_COUNT) {
    console.error(
      `  Warning: expected ${EMBEDDING_COUNT} images, got ${images.length}`
    );
  }

  // 5. Insert face embeddings in chunks
  let embeddingsCreated = 0;

  for (let i = 0; i < images.length; i += CHUNK_SIZE) {
    const chunk = images.slice(i, i + CHUNK_SIZE);
    const values = chunk.map((img) => {
      const vec = randomVector128();
      const vecStr = `[${vec.join(",")}]`;
      return `(${img.id}, '${vecStr}'::vector, '{"x":0,"y":0,"width":100,"height":100}', NOW())`;
    }).join(",");

    await prisma.$executeRawUnsafe(
      `INSERT INTO "FaceEmbedding" ("imageId", "vector", "boundingBox", "createdAt") VALUES ${values}`
    );
    embeddingsCreated += chunk.length;
    process.stdout.write(`\r  Embeddings: ${embeddingsCreated}/${EMBEDDING_COUNT}`);
  }
  console.log("");

  // 6. Summary
  const elapsed = performance.now() - start;
  console.log("\n--- Seed Summary ---");
  console.log(`  Embeddings:  ${EMBEDDING_COUNT.toLocaleString()}`);
  console.log(`  Images:      ${imagesCreated}`);
  console.log(`  User:        ${user.id} (${user.email})`);
  console.log(`  Event:       ${event.id} ("${event.title}")`);
  console.log(`  Time:        ${formatDuration(elapsed)}`);
  console.log("--------------------\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  try {
    if (isClean) {
      await clean();
    } else {
      await seed();
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
