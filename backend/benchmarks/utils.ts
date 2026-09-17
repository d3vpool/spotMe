/**
 * Shared benchmark utilities.
 *
 * Percentile calculation and Markdown table output.
 */

import os from "os";

export interface LatencyStats {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Compute percentile statistics from an array of latency values.
 *
 * IMPORTANT: The input array is sorted internally — callers do NOT need
 * to sort beforehand.
 */
export function computePercentiles(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { mean: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0, count: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = sorted.reduce((s, v) => s + v, 0) / n;

  function percentile(p: number): number {
    const idx = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, idx)];
  }

  return {
    mean: Math.round(mean * 100) / 100,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
    min: sorted[0],
    max: sorted[n - 1],
    count: n,
  };
}

/**
 * Print a Markdown table to stdout.
 * @param headers Column headers
 * @param rows Array of row arrays
 */
export function printMarkdownTable(
  headers: string[],
  rows: (string | number)[][]
): void {
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const colMax = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    return colMax;
  });

  // Header row
  const headerLine = headers
    .map((h, i) => h.padEnd(widths[i]))
    .join(" | ");
  const separator = widths.map((w) => "-".repeat(w)).join(" | ");

  console.log(headerLine);
  console.log(separator);

  // Data rows
  for (const row of rows) {
    const line = row
      .map((cell, i) => String(cell ?? "").padEnd(widths[i]))
      .join(" | ");
    console.log(line);
  }
}

function hostname(): string {
  return os.hostname() || "unknown";
}

/**
 * Print environment preamble before benchmark results.
 */
export function printEnvironmentPreamble(
  datasetInfo: string,
  iterationInfo: string
): void {
  console.log(`Environment: Node ${process.version}, ${hostname()}, ${new Date().toISOString()}`);
  console.log(`Dataset: ${datasetInfo}`);
  console.log(`Iterations: ${iterationInfo}`);
  console.log("");
}

/**
 * Discard warm-up iterations from a latency array.
 * If remaining iterations would be too few (< warmupCount), return all.
 */
export function discardWarmup(
  latencies: number[],
  warmupCount: number = 5
): number[] {
  if (latencies.length <= warmupCount * 2) {
    console.warn(
      `  Warning: only ${latencies.length} iterations — keeping all (would discard ${warmupCount})`
    );
    return latencies;
  }
  return latencies.slice(warmupCount);
}
