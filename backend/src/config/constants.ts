/**
 * Application-wide constants.
 *
 * The face match threshold determines how similar two face embeddings must
 * be (L2 distance) to be considered a match. A lower threshold is stricter
 * (fewer false positives, more false negatives); a higher threshold is
 * more permissive.
 *
 * 0.55 — deliberate zero-false-positive choice, NOT the F1-optimal point.
 * Measured by `npm run bench:accuracy` on 2026-10-04 (LFW fixture: 8
 * identities × 6 photos → 44 embeddings, 946 pairs = 100 same-person +
 * 846 different-person). The F1-optimal threshold was 0.60 (F1 0.970,
 * precision 0.961, recall 0.980 — 4 FP / 2 FN), but 0.55 measured F1 0.969
 * with precision 1.000 / recall 0.940 — zero false positives across all
 * 846 different-person pairs (0 FP / 6 FN). Chosen deliberately: for this
 * product a false positive (showing a guest a stranger's photo, claiming
 * it's them) is materially worse than a false negative (a missed match the
 * guest can still find by browsing), and the F1 gap (0.001) is within noise
 * at N=100 same-person pairs. Full sweep, tradeoff table, and caveats in
 * ACCURACY.md.
 */
export const FACE_MATCH_DISTANCE_THRESHOLD = 0.55;

/**
 * Maximum number of face matches to return per search.
 * Matches are ordered by distance (most similar first).
 */
export const MAX_FACE_MATCHES = 10;
