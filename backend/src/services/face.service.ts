import * as faceapi from "face-api.js";
import * as canvas from "canvas";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../db/db.js";

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
});

let isModelLoaded = false;

export async function loadModels() {
  if (isModelLoaded) return;

  try {
    // <backend>/<src|dist>/services → ../../models = backend/models
    // (explicit import.meta — do NOT rely on bare __dirname, which doesn't
    // exist in ESM scope; it only works today via Prisma's generated-client
    // globalThis.__dirname side effect, which is a landmine.)
    const modelPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../models");

    await faceapi.nets.faceLandmark68Net.loadFromDisk(path.join(modelPath, "face_landmark_68"));

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(path.join(modelPath, "ssd_mobilenetv1"));

    await faceapi.nets.faceRecognitionNet.loadFromDisk(path.join(modelPath, "face_recognition"));

    isModelLoaded = true;
    console.log("Face-api models loaded successfully");
  } catch (error) {
    console.error("Error loading models: error");
    throw error;
  }
}

// ── FaceEmbedding batch insert ────────────────────────────────────────────
/**
 * Build the multi-row INSERT for face embeddings and its bound parameters.
 *
 * Exported so tests can pin the generated SQL. The `$` prefixes are
 * load-bearing: interpolating bare numbers yields `(1, 2::vector, 3, NOW())`
 * — literal integers — and Postgres rejects the batch with
 * `cannot cast type integer to vector`. That bug silently broke EVERY
 * embedding insert from Day 2 until caught by the Day 7 container pipeline
 * test (no test had ever executed this path). See face-pipeline.test.ts.
 */
export function buildEmbeddingInsert(
  rows: Array<{ imageId: number; vector: number[]; boundingBox: unknown }>,
): { sql: string; params: unknown[] } {
  const values: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const row of rows) {
    values.push(`($${paramIndex}, $${paramIndex + 1}::vector, $${paramIndex + 2}, NOW())`);
    params.push(row.imageId, `[${row.vector.join(",")}]`, JSON.stringify(row.boundingBox));
    paramIndex += 3;
  }

  const sql =
    `INSERT INTO "FaceEmbedding" ("imageId", "vector", "boundingBox", "createdAt") ` +
    `VALUES ${values.join(", ")}`;

  return { sql, params };
}

export async function detectEveryFace(imagePath: string, imageId: number) {
  const img = await canvas.loadImage(imagePath);

  const detections = await faceapi
    .detectAllFaces(img as any)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) return;

  // Batch insert all of this image's embeddings in a single multi-row INSERT
  const rows = detections.map((detection) => {
    const box = detection.detection.box;
    return {
      imageId,
      vector: Array.from(detection.descriptor),
      boundingBox: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  });

  const { sql, params } = buildEmbeddingInsert(rows);

  // Use $executeRawUnsafe for parameterized multi-row insert
  // (FaceEmbedding.vector is an unmapped type)
  await prisma.$executeRawUnsafe(sql, ...params);

  console.log(`Inserted ${detections.length} face embeddings for image ${imageId}`);
}

// export async function detectOneFace(imagePath: string, imageId: number) {
