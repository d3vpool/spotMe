/**
 * Regression tests for the face-embedding batch INSERT — the exact bug the
 * Day 7 container pipeline test caught:
 *
 *   `detectEveryFace` had interpolated BARE NUMBERS instead of `$n`
 *   placeholders (`(1, 2::vector, 3, NOW())`), so Postgres rejected every
 *   insert with `cannot cast type integer to vector`. The core feature
 *   (face embeddings) had never worked — no test had ever executed the
 *   insert path.
 *
 * These tests pin (1) the generated SQL shape and (2) a real execution
 * against Postgres/pgvector — the combination that was missing.
 *
 * Scope note: the ML detection step itself is NOT covered here (there is no
 * committed face fixture — see PROGRESS.md "what's not covered").
 */
import { describe, it, expect } from "vitest";
import { buildEmbeddingInsert } from "../src/services/face.service.js";
import { testPrisma, seedTestUser, seedTestEvent, seedTestImage } from "./setup.js";

function unitVector128(seed = 7): number[] {
  // Deterministic pseudo-random unit vector — pgvector doesn't care about
  // values for this test, only dimensionality and type.
  const v = Array.from({ length: 128 }, (_, i) => Math.sin(seed * (i + 1)) / 10);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / norm);
}

describe("buildEmbeddingInsert — SQL generation", () => {
  it("emits $-prefixed placeholders, never bare integer literals", () => {
    const { sql } = buildEmbeddingInsert([
      { imageId: 42, vector: unitVector128(), boundingBox: { x: 0, y: 0, width: 1, height: 1 } },
    ]);

    // The regression: `(1, 2::vector, 3, NOW())` — must never come back.
    expect(sql).toContain("($1, $2::vector, $3, NOW())");
    expect(sql).not.toMatch(/\(\d+, \d+::vector/);
    expect(sql).toContain('"FaceEmbedding"');
  });

  it("keeps param alignment across multiple faces", () => {
    const box = { x: 1, y: 2, width: 3, height: 4 };
    const { sql, params } = buildEmbeddingInsert([
      { imageId: 42, vector: unitVector128(1), boundingBox: box },
      { imageId: 42, vector: unitVector128(2), boundingBox: box },
      { imageId: 42, vector: unitVector128(3), boundingBox: box },
    ]);

    expect(sql).toContain("($1, $2::vector, $3, NOW())");
    expect(sql).toContain("($4, $5::vector, $6, NOW())");
    expect(sql).toContain("($7, $8::vector, $9, NOW())");

    // 3 params per row: [imageId, vectorText, boundingBoxJson]
    expect(params).toHaveLength(9);
    expect(params[0]).toBe(42);
    expect(params[3]).toBe(42);
    expect(String(params[1])).toMatch(/^\[.*\]$/);
    expect(JSON.parse(String(params[2]))).toEqual(box);
  });
});

describe("embedding insert — executes against Postgres/pgvector", () => {
  it("inserts a row whose vector column is a real 128-D vector", async () => {
    const userId = (await seedTestUser()).id;
    const eventId = (await seedTestEvent(userId)).id;
    const imageId = (await seedTestImage(eventId)).id;

    const rows = [
      { imageId, vector: unitVector128(11), boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
      { imageId, vector: unitVector128(22), boundingBox: { x: 5, y: 5, width: 10, height: 10 } },
    ];
    const { sql, params } = buildEmbeddingInsert(rows);

    // This is the call that failed with `cannot cast type integer to vector`
    // before the fix — run it exactly as the worker does.
    await testPrisma.$executeRawUnsafe(sql, ...(params as never[]));

    const count = await testPrisma.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n
      FROM "FaceEmbedding" WHERE "imageId" = ${imageId}`;
    expect(count[0]!.n).toBe(2);

    const dims = await testPrisma.$queryRaw<{ d: number }[]>`SELECT vector_dims("vector") AS d
      FROM "FaceEmbedding" WHERE "imageId" = ${imageId} LIMIT 1`;
    expect(dims[0]!.d).toBe(128);
  });
});
