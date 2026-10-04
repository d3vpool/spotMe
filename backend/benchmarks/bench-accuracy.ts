#!/usr/bin/env tsx
/**
 * Accuracy benchmark — sweeps distance thresholds and computes precision/recall/F1.
 *
 * REQUIRES THE SERVER TO BE RUNNING (for ML model loading via face-api.js).
 * Actually, it loads models directly — no server needed.
 *
 * Usage:
 *   npm run bench:accuracy
 *
 * Prerequisites:
 *   1. Place labeled face photos in `fixtures/faces/<person_name>/*.jpg`
 *   2. See fixtures/README.md for the expected structure
 *
 * The script:
 *   - Extracts 128-D embeddings for all fixture photos via face-api.js
 *   - Computes all pairwise L2 (<->) and cosine (<=>) distances
 *   - Labels each pair as same-person or different-person (from folder names)
 *   - Sweeps metric-appropriate thresholds (L2 0.30–0.90, Cosine 0.02–0.30)
 *   - Reports precision/recall/F1 at each threshold
 *   - Prints optimal threshold (max F1) for each distance metric
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as faceapi from "face-api.js";
import * as canvas from "canvas";
import {
  printMarkdownTable,
  printEnvironmentPreamble,
} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Setup face-api.js
// ---------------------------------------------------------------------------
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LabeledEmbedding {
  person: string;
  filePath: string;
  embedding: Float32Array;
}

interface PairResult {
  personA: string;
  personB: string;
  isSamePerson: boolean;
  l2Distance: number;
  cosineDistance: number;
}

interface ThresholdResult {
  threshold: number;
  metric: "L2" | "Cosine";
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Bench Accuracy ===\n");

  // 1. Load models
  const modelPath = path.join(__dirname, "../models");
  console.log("Loading face-api.js models...");

  try {
    await faceapi.nets.faceLandmark68Net.loadFromDisk(
      path.join(modelPath, "face_landmark_68")
    );
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(
      path.join(modelPath, "ssd_mobilenetv1")
    );
    await faceapi.nets.faceRecognitionNet.loadFromDisk(
      path.join(modelPath, "face_recognition")
    );
  } catch (err) {
    console.error(
      "Failed to load face-api.js models. Ensure backend/models/ directory exists."
    );
    console.error(err);
    process.exit(1);
  }

  console.log("Models loaded.\n");

  // 2. Discover fixture photos
  const facesDir = path.join(__dirname, "fixtures", "faces");

  if (!fs.existsSync(facesDir)) {
    console.error("fixtures/faces/ directory not found.");
    printInstructions();
    process.exit(1);
  }

  const persons = fs
    .readdirSync(facesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (persons.length < 2) {
    console.error(
      `Found ${persons.length} person folder(s) — need at least 2 for accuracy benchmark.`
    );
    printInstructions();
    process.exit(1);
  }

  console.log(`Found ${persons.length} identities: ${persons.join(", ")}`);

  // 3. Extract embeddings
  console.log("\nExtracting embeddings...");
  const labeledEmbeddings: LabeledEmbedding[] = [];
  let totalPhotos = 0;
  let failedPhotos = 0;

  for (const person of persons) {
    const personDir = path.join(facesDir, person);
    const files = fs
      .readdirSync(personDir)
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

    for (const file of files) {
      totalPhotos++;
      const filePath = path.join(personDir, file);

      try {
        const img = await canvas.loadImage(filePath);
        const detection = await faceapi
          .detectSingleFace(img as any)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          labeledEmbeddings.push({
            person,
            filePath: `${person}/${file}`,
            embedding: detection.descriptor,
          });
        } else {
          failedPhotos++;
          console.warn(`  No face detected: ${person}/${file}`);
        }
      } catch (err) {
        failedPhotos++;
        console.warn(`  Failed to process ${person}/${file}: ${err}`);
      }
    }
  }

  console.log(
    `\nProcessed: ${totalPhotos} photos, ${labeledEmbeddings.length} embeddings, ${failedPhotos} failed\n`
  );

  if (labeledEmbeddings.length < 2) {
    console.error("Not enough embeddings to compute pairs. Need at least 2.");
    process.exit(1);
  }

  // 4. Compute pairwise distances
  console.log("Computing pairwise distances...");
  const pairs: PairResult[] = [];

  for (let i = 0; i < labeledEmbeddings.length; i++) {
    for (let j = i + 1; j < labeledEmbeddings.length; j++) {
      const a = labeledEmbeddings[i];
      const b = labeledEmbeddings[j];

      // L2 distance
      let l2Sum = 0;
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let k = 0; k < 128; k++) {
        const diff = a.embedding[k] - b.embedding[k];
        l2Sum += diff * diff;
        dotProduct += a.embedding[k] * b.embedding[k];
        normA += a.embedding[k] * a.embedding[k];
        normB += b.embedding[k] * b.embedding[k];
      }

      const l2Distance = Math.sqrt(l2Sum);
      const cosineDistance =
        1 - dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

      pairs.push({
        personA: a.person,
        personB: b.person,
        isSamePerson: a.person === b.person,
        l2Distance,
        cosineDistance,
      });
    }
  }

  const samePairs = pairs.filter((p) => p.isSamePerson);
  const diffPairs = pairs.filter((p) => !p.isSamePerson);

  console.log(
    `Pairs: ${pairs.length} total (${samePairs.length} same-person, ${diffPairs.length} different-person)\n`
  );

  // 5. Sweep thresholds
  // Ranges are metric-specific: L2 distances between face-api.js descriptors
  // span roughly 0.3–0.9, while cosine distances sit an order of magnitude
  // smaller (descriptors are not unit-normalized), so a 0.30–0.70 cosine sweep
  // is degenerate — every pair passes every threshold.
  const sweepSpec = {
    L2: { start: 0.3, end: 0.9, step: 0.05 },
    Cosine: { start: 0.02, end: 0.3, step: 0.02 },
  } as const;

  const results: ThresholdResult[] = [];

  for (const metric of ["L2", "Cosine"] as const) {
    const distKey = metric === "L2" ? "l2Distance" : "cosineDistance";

    // Distance distribution per class — verifies the sweep brackets the
    // decision boundary (best F1 not at an artifact of a truncated range).
    for (const [label, group] of [
      ["same-person", samePairs],
      ["different-person", diffPairs],
    ] as const) {
      const dists = group.map((p) => p[distKey]);
      console.log(
        `${metric} ${label}: min=${Math.min(...dists).toFixed(4)} max=${Math.max(...dists).toFixed(4)}`
      );
    }
    console.log("");

    const spec = sweepSpec[metric];
    const thresholds: number[] = [];
    for (let t = spec.start; t <= spec.end + 1e-9; t += spec.step) {
      thresholds.push(Math.round(t * 100) / 100);
    }

    for (const threshold of thresholds) {
      let tp = 0,
        fp = 0,
        fn = 0,
        tn = 0;

      for (const pair of pairs) {
        const predicted = pair[distKey] < threshold;

        if (predicted && pair.isSamePerson) tp++;
        else if (predicted && !pair.isSamePerson) fp++;
        else if (!predicted && pair.isSamePerson) fn++;
        else tn++;
      }

      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1 = (2 * precision * recall) / (precision + recall) || 0;

      results.push({
        threshold,
        metric,
        tp,
        fp,
        fn,
        tn,
        precision: Math.round(precision * 1000) / 1000,
        recall: Math.round(recall * 1000) / 1000,
        f1: Math.round(f1 * 1000) / 1000,
      });
    }
  }

  // 6. Print results
  printEnvironmentPreamble(
    `${labeledEmbeddings.length} embeddings from ${persons.length} identities`,
    `${pairs.length} pairs, sweep L2 0.30–0.90 / Cosine 0.02–0.30`
  );

  for (const metric of ["L2", "Cosine"] as const) {
    const metricResults = results.filter((r) => r.metric === metric);
    console.log(`\n--- ${metric} Distance ---\n`);

    printMarkdownTable(
      ["Threshold", "TP", "FP", "FN", "TN", "Precision", "Recall", "F1"],
      metricResults.map((r) => [
        r.threshold.toFixed(2),
        r.tp,
        r.fp,
        r.fn,
        r.tn,
        r.precision.toFixed(3),
        r.recall.toFixed(3),
        r.f1.toFixed(3),
      ])
    );

    // Find best F1
    const best = metricResults.reduce((a, b) => (a.f1 > b.f1 ? a : b));
    console.log(`\n  Best F1: ${best.f1.toFixed(3)} at threshold ${best.threshold.toFixed(2)}`);
    console.log(
      `  (precision=${best.precision.toFixed(3)}, recall=${best.recall.toFixed(3)})`
    );
  }

  console.log("");
}

function printInstructions() {
  console.log(`
To run the accuracy benchmark:

1. Create the fixtures directory:
   mkdir -p backend/benchmarks/fixtures/faces

2. Add labeled face photos organized by person:
   backend/benchmarks/fixtures/faces/
   ├── alice/
   │   ├── alice_01.jpg
   │   ├── alice_02.jpg
   │   └── alice_03.jpg
   └── bob/
       ├── bob_01.jpg
       └── bob_02.jpg

3. Each subfolder name = one person identity.
   At least 2 people, 2+ photos each.

4. Recommended: Use a subset of LFW (Labeled Faces in the Wild)
   Download: https://vis-www.cs.umass.edu/lfw/

5. Then run: npm run bench:accuracy
`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
