#!/usr/bin/env tsx
/**
 * Download a small subset of LFW (Labeled Faces in the Wild) for accuracy benchmarking.
 *
 * LFW License: "This data is available for non-commercial research purposes only."
 * https://vis-www.cs.umass.edu/lfw/
 *
 * Usage:
 *   npx tsx scripts/download-lfw-subset.ts
 *
 * Downloads 5 identities × 4-5 photos each = 20-25 images total.
 * Places them in ../benchmarks/fixtures/faces/<person_name>/
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FACES_DIR = path.join(__dirname, "..", "benchmarks", "fixtures", "faces");

// 5 well-known LFW identities with multiple photos
const IDENTITIES = [
  { name: "George_W_Bush", count: 5 },
  { name: "Colin_Powell", count: 5 },
  { name: "Tony_Blair", count: 5 },
  { name: "John_Kerry", count: 5 },
  { name: "Donald_Rumsfeld", count: 5 },
];

const LFW_BASE_URL = "https://vis-www.cs.umass.edu/lfw/lfw";

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith("https") ? https : http;

    client
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(response.headers.location!, destPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

async function main() {
  console.log("=== Download LFW Subset for Accuracy Benchmark ===\n");
  console.log("Source: LFW (Labeled Faces in the Wild)");
  console.log("License: Non-commercial research purposes only");
  console.log("URL: https://vis-www.cs.umass.edu/lfw/\n");

  // Create directory structure
  if (!fs.existsSync(FACES_DIR)) {
    fs.mkdirSync(FACES_DIR, { recursive: true });
  }

  let downloaded = 0;
  let failed = 0;

  for (const identity of IDENTITIES) {
    console.log(`Downloading ${identity.name}...`);
    const personDir = path.join(FACES_DIR, identity.name);

    if (!fs.existsSync(personDir)) {
      fs.mkdirSync(personDir, { recursive: true });
    }

    for (let i = 1; i <= identity.count; i++) {
      const padded = String(i).padStart(4, "0");
      const filename = `${identity.name}_${padded}.jpg`;
      const destPath = path.join(personDir, filename);

      if (fs.existsSync(destPath)) {
        console.log(`  ${filename} already exists, skipping`);
        downloaded++;
        continue;
      }

      // LFW URL format: lfw/lfw/George_W_Bush/George_W_Bush_0001.jpg
      const url = `${LFW_BASE_URL}/${identity.name}/${filename}`;

      try {
        await downloadFile(url, destPath);
        downloaded++;
        console.log(`  ✓ ${filename}`);
      } catch (err) {
        failed++;
        console.warn(`  ✗ ${filename}: ${err}`);
      }
    }
  }

  console.log(`\nDone: ${downloaded} downloaded, ${failed} failed`);
  console.log(`\nRun accuracy benchmark: npm run bench:accuracy`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
