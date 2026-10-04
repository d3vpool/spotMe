import { describe, it, expect } from "vitest";
import { FACE_MATCH_DISTANCE_THRESHOLD } from "../src/config/constants.js";

describe("Face match threshold constant", () => {
  it("is set to a reasonable value (0.3–0.7)", () => {
    expect(FACE_MATCH_DISTANCE_THRESHOLD).toBeGreaterThanOrEqual(0.3);
    expect(FACE_MATCH_DISTANCE_THRESHOLD).toBeLessThanOrEqual(0.7);
  });

  it("is a documented choice, not an arbitrary magic number", () => {
    // This test exists to protect against someone silently changing the
    // threshold without understanding the accuracy tradeoffs.
    // 0.55 is a deliberate zero-false-positive choice from the measured
    // sweep in `npm run bench:accuracy` (2026-10-04, LFW fixture): at 0.55
    // the confusion matrix is 0 FP / 6 FN (precision 1.000, recall 0.940,
    // F1 0.969); the F1-optimal 0.60 was rejected (4 FP / 2 FN) because a
    // false positive — showing a guest a stranger's photo — is materially
    // worse than a missed match. See ACCURACY.md for the full sweep.
    expect(FACE_MATCH_DISTANCE_THRESHOLD).toBe(0.55);
  });

  it("filtering logic: matches below threshold are accepted", () => {
    const distances = [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7];
    const matches = distances.filter((d) => d < FACE_MATCH_DISTANCE_THRESHOLD);

    // Distances 0.3–0.5 accepted (below 0.55); 0.55 itself rejected (strict <)
    expect(matches).toEqual([0.3, 0.4, 0.45, 0.5]);
  });

  it("filtering logic: distances at or above threshold are rejected", () => {
    const distances = [0.55, 0.6, 0.7];
    const matches = distances.filter((d) => d < FACE_MATCH_DISTANCE_THRESHOLD);

    // All rejected: at (0.55) or above the threshold — the strict-<
    // comparison is what yields 0 FP for same/different pairs at exactly t
    expect(matches).toEqual([]);
  });
});
