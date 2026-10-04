# Face-Match Accuracy

This document describes how face-matching accuracy is measured and the
threshold decision for the SpotMe face recognition pipeline.

**Status: MEASURED (2026-10-04).** The threshold below comes from a real
benchmark run's measured tradeoff — 0.55, chosen for zero false positives
(it is *not* the F1-optimal 0.60; see the decision below) — not a
literature estimate.

## How It Works

SpotMe uses [face-api.js](https://github.com/justadudewhohacks/face-api.js)
with SSD MobileNet for face detection, 68-point landmarks for alignment,
and a 128-dimensional face recognition descriptor for matching.

The pipeline:
1. Detect faces in both the event photo and the guest's selfie
2. Extract 128-D descriptors for each face
3. Compute L2 distance (`<->` operator in pgvector) between the selfie's
   descriptor and all event photo descriptors
4. Filter results where `distance < threshold`
5. Return matches ordered by similarity (lowest distance first)

## Threshold Decision

**Current threshold:** `FACE_MATCH_DISTANCE_THRESHOLD = 0.55`
(defined in `backend/src/config/constants.ts`)

This is a **deliberate product/safety choice, not the F1-optimal point.**
Both candidates were measured by `npm run bench:accuracy` on 2026-10-04
(see Results below; LFW fixture, 44 embeddings, 946 pairs):

- **0.55 (chosen): F1 = 0.969, precision = 1.000, recall = 0.940 —
  zero false positives** across all 846 different-person pairs (0 FP / 6 FN)
- **0.60 (measured F1-optimal, deliberately not chosen): F1 = 0.970,
  precision = 0.961, recall = 0.980** (4 FP / 2 FN)
- Rationale: for this product a false positive (showing a guest a
  stranger's photo, claiming it's them) is a materially worse failure than
  a false negative (a missed match the guest can still find by browsing
  the gallery manually). Precision is the binding constraint, and the F1
  difference (0.001 — 4 pairs out of 946) is within noise given only 100
  same-person pairs.
- The 0.60 optimum is a real interior peak, not a sweep-boundary artifact:
  the sweep was extended to 0.90 specifically to verify this (0.50 → F1
  0.895, 0.55 → F1 0.969, 0.60 → F1 0.970, 0.65 → F1 0.843).
- The previous literature-based value (0.50) measured F1 = 0.895
  (precision 1.000, recall 0.810) — needlessly strict, missing 19% of
  true matches while adding no precision over 0.55.

### Tradeoff Analysis (measured, not literature)

| Threshold | Precision | Recall | F1 | Note |
|-----------|-----------|--------|-----|------|
| 0.40 | 1.000 | 0.400 | 0.571 | High-confidence matches only |
| 0.50 | 1.000 | 0.810 | 0.895 | Previous (literature) choice |
| **0.55** | **1.000** | **0.940** | **0.969** | **Current choice — 0 false positives (identity-match safety)** |
| 0.60 | 0.961 | 0.980 | 0.970 | Measured best-F1 alternative — deliberately not chosen (4 FP) |
| 0.65 | 0.733 | 0.990 | 0.843 | Precision collapses (36 FP) |

Decision narrative: the Day 6 acceptance criterion asked for the best-F1
value, and the benchmark found that to be 0.60. After reviewing the
measured tradeoff, the shipped threshold was lowered to **0.55 for zero
false positives** — a deliberate product/safety tradeoff (0.001 F1
sacrificed), not a correction of the 0.60 measurement. At 0.60 the
measured cost is 4 false positives out of 102 returned matches; at 0.55
the measured cost is 6 missed matches out of 100 true pairs — every one
recoverable by the guest browsing the gallery manually.

## Benchmark Methodology

The accuracy benchmark (`npm run bench:accuracy`,
`backend/benchmarks/bench-accuracy.ts`) measures:

1. **Pairwise distances**: For every pair of photos in the labeled dataset,
   compute L2 and cosine distances between their face descriptors

2. **Ground truth**: Pairs are labeled "same person" if they come from the
   same folder, "different person" otherwise

3. **Threshold sweep**: Per metric — L2 0.30–0.90 in 0.05 steps, cosine
   0.02–0.30 in 0.02 steps — computing precision/recall/F1 at each point.
   The ranges bracket the observed distance distributions (verified by
   printing min/max per class); the sweep is widened if best F1 lands on a
   boundary

4. **Optimal threshold**: The threshold that maximizes F1 score

### Fixture

```
backend/benchmarks/fixtures/faces/
├── Ariel_Sharon/          (6 photos, …)
├── Colin_Powell/          (6 photos, …)
├── Donald_Rumsfeld/
├── George_W_Bush/
├── Gerhard_Schroeder/
├── Hugo_Chavez/
├── Junichiro_Koizumi/
└── Tony_Blair/
```

> **Fixture source:** Photos are a subset of **LFW (Labeled Faces in the
> Wild)**, deep-funneled release — obtained via the Kaggle mirror
> (`jessicali9530/lfw-dataset`, research-use license), original at
> <https://vis-www.cs.umass.edu/lfw/>. The folder is gitignored and not
> committed to the repository.

### Running the Benchmark

```bash
cd backend
# fixture expected at benchmarks/fixtures/faces/<person_name>/*.jpg (see above)
npm run bench:accuracy
```

(An LFW fetch helper from Day 6 exists at `backend/scripts/download-lfw-subset.ts`,
but network-restricted environments may need to source the fixture manually —
as was done here via the Kaggle mirror.)

### Results (2026-10-04)

Conditions: Node v22, face-api.js SSD MobileNet v1 + 68 landmarks +
recognition net on the pure-JS tfjs backend. 48 photos → **44 embeddings**
(4 photos had no detectable face and were skipped: Ariel_Sharon #4,
Donald_Rumsfeld #5, Hugo_Chavez #3, Junichiro_Koizumi #2) → **946 pairs**
(100 same-person, 846 different-person).

Distance distributions:

| Metric | Same-person | Different-person |
|--------|-------------|------------------|
| L2 | 0.2841 – 0.6758 | 0.5677 – 0.9562 |
| Cosine | 0.0216 – 0.1077 | 0.0803 – 0.2376 |

**L2 sweep (production metric — pgvector `<->`):**

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 |
|-----------|----|----|----|----|-----------|--------|----|
| 0.30 | 2 | 0 | 98 | 846 | 1.000 | 0.020 | 0.039 |
| 0.35 | 14 | 0 | 86 | 846 | 1.000 | 0.140 | 0.246 |
| 0.40 | 40 | 0 | 60 | 846 | 1.000 | 0.400 | 0.571 |
| 0.45 | 65 | 0 | 35 | 846 | 1.000 | 0.650 | 0.788 |
| 0.50 | 81 | 0 | 19 | 846 | 1.000 | 0.810 | 0.895 |
| 0.55 | 94 | 0 | 6 | 846 | 1.000 | 0.940 | 0.969 |
| **0.60** | **98** | **4** | **2** | **842** | **0.961** | **0.980** | **0.970** |
| 0.65 | 99 | 36 | 1 | 810 | 0.733 | 0.990 | 0.843 |
| 0.70 | 100 | 165 | 0 | 681 | 0.377 | 1.000 | 0.548 |
| 0.75 | 100 | 371 | 0 | 475 | 0.212 | 1.000 | 0.350 |
| 0.80 | 100 | 575 | 0 | 271 | 0.148 | 1.000 | 0.258 |
| 0.85 | 100 | 747 | 0 | 99 | 0.118 | 1.000 | 0.211 |
| 0.90 | 100 | 833 | 0 | 13 | 0.107 | 1.000 | 0.194 |

**Best F1: 0.970 at threshold 0.60** (precision 0.961, recall 0.980).
This is the F1-optimal point, but the shipped threshold is **0.55** (row
above: precision 1.000, recall 0.940, F1 0.969 — ΔF1 0.001, within noise;
see Threshold Decision for why the zero-false-positive point was chosen).

**Cosine sweep (informational — not used in production):**

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 |
|-----------|----|----|----|----|-----------|--------|----|
| 0.02 | 0 | 0 | 100 | 846 | 0.000 | 0.000 | 0.000 |
| 0.04 | 39 | 0 | 61 | 846 | 1.000 | 0.390 | 0.561 |
| 0.06 | 80 | 0 | 20 | 846 | 1.000 | 0.800 | 0.889 |
| 0.08 | 95 | 0 | 5 | 846 | 1.000 | 0.950 | **0.974** |
| 0.10 | 99 | 16 | 1 | 830 | 0.861 | 0.990 | 0.921 |
| 0.12 | 100 | 129 | 0 | 717 | 0.437 | 1.000 | 0.608 |
| 0.14+ | 100 | 327+ | 0 | … | ≤0.234 | 1.000 | ≤0.380 |

Best cosine F1: 0.974 at 0.08. Search uses pgvector `<->` (L2), so the
production threshold comes from the **L2** sweep. Note the original
0.30–0.70 cosine sweep was degenerate: face-api descriptors are not
unit-normalized, so every cosine distance is < 0.24 and every pair passed
every threshold — the sweep range was corrected to 0.02–0.30.

## Limitations

This benchmark has real limitations that should be understood:

### Dataset Size
- **Actual**: 8 identities × 6 photos = 48 photos (44 embeddings, 946 pairs)
- **Recommended for rigor**: 50+ identities, 10+ photos each

With 100 same-person pairs, one reclassified pair moves recall by 0.01 and
F1 by ~0.005 — the 0.55-vs-0.60 gap (ΔF1 = 0.001) is within noise. The
large-scale shape of the curve (precision holds at 1.000 through 0.55, then
collapses after 0.60) is the robust finding.

LFW also only covers the demographics overrepresented in its source
collection; a small N cannot capture the full variance of real-world face
recognition (lighting, poses, occlusions like glasses/masks).

### Conditions
The benchmark measures accuracy under LFW's curated conditions:
- Single near-frontal face per photo (deep-funneled for detection success)
- Reasonable lighting, no occlusions

Real-world performance will be lower due to:
- Varying camera quality (phone cameras vs. DSLR)
- Extreme angles or partial faces
- Poor lighting conditions
- Similar-looking people (false positives more likely)
- People who look significantly different across photos (false negatives)

### What Would Be Needed for Rigorous Validation

To claim production-grade accuracy, you would need:

1. **Larger dataset**: 1000+ identities, 20+ photos each, diverse demographics

2. **Diverse conditions**: Multiple cameras, lighting scenarios, angles,
   occlusions (masks, glasses, hats)

3. **Real usage monitoring**: Track false positive/negative reports from
   actual users

4. **A/B testing**: Test different threshold values in production with
   real traffic to measure user satisfaction

5. **Regular validation**: Re-run benchmarks as face-api.js or TensorFlow
   models are updated

## References

- [face-api.js documentation](https://github.com/justadudewhohacks/face-api.js)
- [LFW (Labeled Faces in the Wild)](https://vis-www.cs.umass.edu/lfw/)
- [Deep Face Recognition: A Survey](https://arxiv.org/abs/1804.06655)

## Changelog

| Date | Threshold | Reason |
|------|-----------|--------|
| 2026-09-18 | 0.50 | Initial choice based on literature values; to be validated with benchmark |
| 2026-10-04 | 0.60 | First empirical measurement (LFW fixture): best F1 0.970 vs 0.895 at 0.50 |
| 2026-10-04 | 0.55 | Prioritized zero false-positives for identity-match safety over marginal F1 gain (0.969 vs 0.970, within noise) — deliberate product tradeoff, not an error in the 0.60 measurement |
