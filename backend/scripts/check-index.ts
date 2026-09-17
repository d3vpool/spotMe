#!/usr/bin/env tsx
/**
 * Verify HNSW index exists and run EXPLAIN ANALYZE on the search query.
 *
 * Usage: npx tsx scripts/check-index.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Check index exists
  const indexes = await prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'FaceEmbedding'
  `;

  console.log("=== Indexes on FaceEmbedding ===\n");
  for (const idx of indexes) {
    console.log(`  ${idx.indexname}`);
    console.log(`  ${idx.indexdef}\n`);
  }

  if (indexes.length === 0) {
    console.log("  (no indexes found)\n");
  }

  // 2. Find a bench event to EXPLAIN against
  const eventIds = await prisma.$queryRaw<{ eventId: number }[]>`
    SELECT DISTINCT "image"."eventId"
    FROM "FaceEmbedding"
    JOIN "image" ON "FaceEmbedding"."imageId" = "image"."id"
    WHERE "image"."imageUrl" LIKE '%__BENCH_IMG_%'
    LIMIT 1
  `;

  if (eventIds.length === 0) {
    console.log("No bench data found. Run `npm run seed -- --embeddings=1000` first.");
    await prisma.$disconnect();
    return;
  }

  const eventId = eventIds[0].eventId;

  // Get a random vector for the EXPLAIN
  const randomVec = await prisma.$queryRaw<{ vector: string }[]>`
    SELECT "vector"::text AS vector FROM "FaceEmbedding" ORDER BY RANDOM() LIMIT 1
  `;

  if (randomVec.length === 0) {
    console.log("No embeddings found.");
    await prisma.$disconnect();
    return;
  }

  const queryVector = randomVec[0].vector;

  // 3. Run EXPLAIN ANALYZE
  console.log("=== EXPLAIN ANALYZE (search query) ===\n");

  const explainResult = await prisma.$queryRaw<{ QUERY PLAN: string }[]>`
    EXPLAIN ANALYZE
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

  for (const row of explainResult) {
    console.log(`  ${row["QUERY PLAN"]}`);
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
