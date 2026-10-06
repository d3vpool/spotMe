/**
 * Global test setup — runs before the entire test suite.
 *
 * Sets env vars BEFORE any app modules are imported (the Zod schema in
 * config/env.ts validates at import time), then connects to a test database
 * and runs Prisma migrations.
 */
import { execSync } from "child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

// ── 1. Set env vars BEFORE any app imports ────────────────────────────────
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || "postgresql://postgres:9470@localhost:5432/spotme_test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.PORT = "0";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.GOOGLE_DRIVE_API_KEY = "test-key-not-real";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.NODE_ENV = "test";

// ── 2. Create Prisma client for test management ──────────────────────────
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const testPrisma = new PrismaClient({ adapter });

// ── 3. Run migrations on the test DB ──────────────────────────────────────
const PGPASSWORD = "9470";
const PSQL = `PGPASSWORD=${PGPASSWORD} psql -h localhost -p 5432 -U postgres`;

function run(cmd: string) {
  try {
    execSync(cmd, { cwd: process.cwd(), stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function setupDatabase() {
  // Terminate existing connections, then drop and recreate
  run(
    `${PSQL} -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'spotme_test' AND pid <> pg_backend_pid();"`,
  );
  run(`${PSQL} -c "DROP DATABASE IF EXISTS spotme_test;"`);
  run(`${PSQL} -c "CREATE DATABASE spotme_test;"`);

  // Enable pgvector extension
  run(`${PSQL} -d spotme_test -c "CREATE EXTENSION IF NOT EXISTS vector;"`);

  // Push schema to the clean DB
  execSync("npx prisma db push 2>&1", {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
}

// ── 4. Truncate all tables ────────────────────────────────────────────────
export async function truncateAll() {
  await testPrisma.$executeRawUnsafe(
    `TRUNCATE TABLE "FaceEmbedding", "UploadBatch", image, event, "User" CASCADE`,
  );
}

// ── 5. Seed helpers ───────────────────────────────────────────────────────
let userCounter = 0;
let eventCounter = 0;

export async function seedTestUser(overrides?: { email?: string }) {
  userCounter++;
  const email = overrides?.email || `testuser${userCounter}@test.com`;
  return testPrisma.user.create({
    data: {
      email,
      firstName: `TestUser${userCounter}`,
      password: "hashedpassword123", // not real hash — tests that need auth use bcrypt
    },
  });
}

export async function seedTestEvent(createdBy: number, overrides?: { isPublic?: boolean }) {
  eventCounter++;
  // shareToken must be a valid UUID (validated by shareTokenParamSchema)
  const shareToken = crypto.randomUUID();
  return testPrisma.event.create({
    data: {
      title: `TestEvent${eventCounter}`,
      description: "Test event description",
      createdBy,
      shareToken,
      isPublic: overrides?.isPublic ?? false,
    },
  });
}

export async function seedTestImage(eventId: number, imageUrl?: string) {
  return testPrisma.image.create({
    data: {
      eventId,
      imageUrl: imageUrl || `http://localhost:3000/uploads/test-${Date.now()}.jpg`,
    },
  });
}

export async function seedTestEmbedding(imageId: number) {
  // Generate a random 128-D vector
  const vec = Array.from({ length: 128 }, () => Math.random());
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  const normalized = vec.map((v) => v / norm);
  const vecStr = `[${normalized.join(",")}]`;

  await testPrisma.$executeRawUnsafe(
    `INSERT INTO "FaceEmbedding" ("imageId", "vector", "boundingBox", "createdAt")
     VALUES ($1, $2::vector, $3, NOW())`,
    imageId,
    vecStr,
    JSON.stringify({ x: 0, y: 0, width: 100, height: 100 }),
  );
}

export async function seedTestBatch(eventId: number, totalImages: number) {
  return testPrisma.uploadBatch.create({
    data: {
      eventId,
      totalImages,
      completed: 0,
      failed: 0,
      status: "processing",
    },
  });
}

// ── 6. Global setup/teardown hooks ────────────────────────────────────────
beforeAll(async () => {
  await setupDatabase();
});

afterEach(async () => {
  await truncateAll();
  // Reset counters
  userCounter = 0;
  eventCounter = 0;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
