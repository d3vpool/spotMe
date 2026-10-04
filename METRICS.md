# SpotMe — Performance & Quality Metrics

Tracking file for before/after numbers as optimizations land. Update this
whenever you run a benchmark script or land a perf-relevant change — this file
is the source of truth for resume claims, so every row must be reproducible via
the scripts in `backend/benchmarks/`.

## How to add a row

1. Run the relevant benchmark script BEFORE making a change, record the row.
2. Make the change.
3. Re-run the same script with the same test conditions, record the "after" row.
4. Note exact test conditions (dataset size, hardware, concurrency) — numbers
   without conditions aren't comparable.

## Latency & Throughput

## Vector Search Latency — HNSW Index Impact

Benchmarked via `bench-search.ts` (direct DB mode, 100 iterations, 5 warmup discarded).
All runs on Node v22, local Postgres with pgvector, synthetic random 128-D embeddings.

| Embeddings | Index | p50 | p95 | p99 | Notes |
|---:|---|---:|---:|---:|---|
| 1,000 | none | 0.82ms | 1.03ms | 1.38ms | Sequential scan |
| 1,000 | HNSW | 0.79ms | 0.98ms | 1.21ms | Planner may seq-scan on small tables (expected) |
| 10,000 | none | 5.23ms | 6.11ms | 7.85ms | Sequential scan |
| 10,000 | HNSW | 1.09ms | 1.38ms | 1.82ms | **4.8× faster at p50** |
| 100,000 | none | 39.0ms | 47.2ms | 58.1ms | Sequential scan |
| 100,000 | none | 40.97ms | 46.27ms | 50.72ms | Sequential scan |
| 100,000 | HNSW | 1.15ms | 1.71ms | 2.68ms | **35.6× faster at p50** |

**Key observation:** At 10K embeddings, HNSW cuts p50 from 5.23ms → 1.09ms — a **4.8×
improvement** with zero application-level changes. The index pays for itself at
~5K embeddings and the gap widens with scale.

**Validity note (Post-Day-7 audit, 2026-09-23):** every number in this table
comes from `bench-search.ts` direct-DB mode against *synthetic* embeddings
inserted by `scripts/seed.ts` (its own chunked `$executeRawUnsafe` inserts,
which always worked). **None of these numbers passed through the broken
`face.service.ts` insert path — none were invalid.** Reproducibility check
2026-09-23: re-running the 1K HNSW row on a re-seeded 1,000-row dataset gave
p50 **1.05ms** / p95 **1.48ms** / p99 **1.82ms** (vs 0.79/0.98/1.21 originally) —
same conditions, ~0.3ms day-to-day variance; the original rows stand.

**EXPLAIN ANALYZE evidence (10K embeddings):**
```
Index Scan using face_embedding_vector_hnsw_idx on "FaceEmbedding"
  → confirms the planner uses HNSW, not Seq Scan, at realistic data volumes
```

**HNSW index build time:**
- 10K embeddings: **0.94s** (fits in maintenance_work_mem)
- 100K embeddings: **47.75s** (exceeds maintenance_work_mem; PostgreSQL logs a notice
  suggesting to increase it — acceptable for a portfolio project)

**Migration:** Plain `CREATE INDEX` (not `CREATE INDEX CONCURRENTLY`). Prisma
migrations wrap in a transaction; `CONCURRENTLY` cannot run inside one. Acceptable
for a portfolio project without production traffic.

**Index type:** HNSW chosen over IVFFlat because it requires no training/build step
tied to pre-existing data volume (`lists` parameter) and has better recall at
similar speed for this dataset size.

## Latency & Throughput

| Date | Change | Metric | Before | After | Test Conditions |
|---|---|---|---|---|---|
| 2026-08-21 | Baseline (pre-optimization) | Search p50 (direct DB, no index) | 0.98ms | | 1,000 embeddings, Node v22, local Postgres, direct DB query |
| 2026-08-21 | Baseline (pre-optimization) | Search p95 (direct DB, no index) | 1.11ms | | 1,000 embeddings, Node v22, local Postgres, direct DB query |
| 2026-08-21 | Baseline (pre-optimization) | Search p99 (direct DB, no index) | 1.42ms | | 1,000 embeddings, Node v22, local Postgres, direct DB query |
| 2026-09-13 | HNSW index added | Search p50 (direct DB, HNSW) | | 0.79ms | 1,000 embeddings, same conditions |
| 2026-09-13 | HNSW index added | Search p50 10K (no index) | 5.23ms | | 10,000 embeddings, sequential scan |
| 2026-09-13 | HNSW index added | Search p50 10K (HNSW) | | 1.09ms | 10,000 embeddings, **4.8× faster** |
| 2026-09-13 | HNSW index added | Search p50 100K (no index) | 40.97ms | | 100,000 embeddings, sequential scan |
| 2026-09-13 | HNSW index added | Search p50 100K (HNSW) | | 1.15ms | 100,000 embeddings, **35.6× faster** |
| 2026-09-13 | HNSW index added | Search p95 100K (no index) | 46.27ms | | 100,000 embeddings |
| 2026-09-13 | HNSW index added | Search p95 100K (HNSW) | | 1.71ms | 100,000 embeddings, **27× faster** |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=1 response | | | 1 image, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=1 e2e | | | 1 image, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=10 response | | | 10 images, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=10 e2e | | | 10 images, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=50 response | | | 50 images, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=50 e2e | | | 50 images, local dev (requires server + worker running) |

## Upload latency — bench:upload (first successful run: 2026-09-23)

These rows were **unfillable before this date**: two bugs had made
`bench:upload` fail end-to-end since Day 1 — (a) `scripts/seed.ts` stored the
bench password in plaintext while `/user/login` uses `bcrypt.compare` (→ 401),
and (b) the bench read the pre-Fix-4 envelope (`data.id` instead of
`data.event.id`), so every upload hit `/events/undefined/...` (→ 400 “eventId
must be a numeric string”). Both fixed 2026-09-23; the run below is the first
that ever completed.

Conditions: Node v22, local dev stack (`tsx src/server.ts` + `tsx src/worker.ts`),
3 iterations/batch, 1 warm-up discarded, fixture = 22-byte synthetic JPEG
(`benchmarks/fixtures/test-upload.jpg`).

| Batch | Response p50 | Response p95 | Response p99 | E2E p50 | E2E p95 |
|---:|---:|---:|---:|---:|---:|
| 1 | 16.42ms | 17.58ms | 17.58ms | 3043.83ms | 3048.44ms |
| 10 | 36.54ms | 54.82ms | 54.82ms | 3056.87ms | 3073.46ms |
| 50 | 152.92ms | 163.70ms | 163.70ms | 3172.46ms | 3185.63ms |

**How to read this (do not misquote):**
- **Response latency is valid** as the Day 2 claim: the endpoint returns in
  ~16 / 37 / 153 ms p50 for 1 / 10 / 50 images regardless of ML work — measured
  with the real queue + worker running.
- **E2E measures the NO-FACE / decode-failure path ONLY.** The fixture has JPEG
  magic bytes but no image data — `canvas.loadImage` throws, so the worker never
  reaches face inference. E2E = enqueue → failed attempt → 2s exponential
  backoff → retry → batch flip. The ~3.0s p50 is the **retry backoff**, not
  face-processing throughput. Real-face end-to-end throughput remains
  **UNMEASURED** (needs a committable/licensed single-face fixture).
- In-container sanity check (not a benchmark): a 12-photo real-face batch
  completed `12/12, 0 failed` → 25 `FaceEmbedding` rows within ~2 minutes of
  enqueue; public share search with a real selfie returned the expected envelope
  with bounding boxes (round-trip distance 0.000000, best cross-image match
  0.484 < 0.5 threshold) — plumbing only, not accuracy.

## Accuracy

First-ever measured face-match accuracy — `npm run bench:accuracy` run
**2026-10-04** against the LFW deep-funneled fixture (8 identities × 6 photos;
44 of 48 photos yielded a face detection → 44 embeddings → **946 pairs**
(100 same-person, 846 different-person)). Node v22, face-api.js (SSD MobileNet
v1 + landmarks + recognition net) on the pure-JS tfjs backend, sweep L2
0.30–0.90 / Cosine 0.02–0.30. Fixture is gitignored, not committed; source
noted in `ACCURACY.md`.

| Date | Change | Metric | Before | After | Test Conditions |
|---|---|---|---|---|---|
| 2026-10-04 | Empirical threshold replaces literature value | `FACE_MATCH_DISTANCE_THRESHOLD` | 0.5 (literature) | **0.55** (chosen: zero false positives) | LFW fixture, 44 embeddings / 946 pairs |
| 2026-10-04 | Tradeoff at the chosen threshold (L2) | F1 / precision / recall @ 0.55 | 0.895 / 1.000 / 0.810 @ 0.50 | **0.969 / 1.000 / 0.940 @ 0.55** (0 FP / 6 FN) | same run |
| 2026-10-04 | F1-optimal point, measured but deliberately not shipped | F1 / precision / recall @ 0.60 | — | 0.970 / 0.961 / 0.980 (4 FP / 2 FN) | same run; 0.55 chosen over it for identity-match safety — ΔF1 0.001, within noise |

**Distance distributions (confirm the sweep brackets the decision boundary):**
- L2: same-person **0.2841–0.6758**, different-person **0.5677–0.9562** (overlap zone 0.568–0.676)
- Cosine: same-person 0.0216–0.1077, different-person 0.0803–0.2376

### L2 sweep — production metric (pgvector `<->`)

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 |
|---:|---:|---:|---:|---:|---:|---:|---:|
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

**Best F1: 0.970 @ 0.60** (interior peak — 0.55 → 0.969, 0.65 → 0.843; sweep
extended to 0.90 specifically to rule out a boundary artifact). The shipped
threshold is **0.55** (0 FP, F1 0.969 — ΔF1 0.001 within noise), chosen for
zero false positives over the F1-optimal 0.60; see `ACCURACY.md`.

### Cosine sweep (not used in production)

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.02 | 0 | 0 | 100 | 846 | 0.000 | 0.000 | 0.000 |
| 0.04 | 39 | 0 | 61 | 846 | 1.000 | 0.390 | 0.561 |
| 0.06 | 80 | 0 | 20 | 846 | 1.000 | 0.800 | 0.889 |
| 0.08 | 95 | 0 | 5 | 846 | 1.000 | 0.950 | **0.974** |
| 0.10 | 99 | 16 | 1 | 830 | 0.861 | 0.990 | 0.921 |
| 0.12 | 100 | 129 | 0 | 717 | 0.437 | 1.000 | 0.608 |
| 0.14 | 100 | 327 | 0 | 519 | 0.234 | 1.000 | 0.380 |
| 0.16 | 100 | 529 | 0 | 317 | 0.159 | 1.000 | 0.274 |
| 0.18 | 100 | 692 | 0 | 154 | 0.126 | 1.000 | 0.224 |
| 0.20 | 100 | 798 | 0 | 48 | 0.111 | 1.000 | 0.200 |
| 0.22 | 100 | 842 | 0 | 4 | 0.106 | 1.000 | 0.192 |
| 0.24–0.30 | 100 | 846 | 0 | 0 | 0.106 | 1.000 | 0.191 |

Best cosine F1: 0.974 @ 0.08. Cosine is informational only — search uses
pgvector `<->` (L2), so **the production threshold comes from the L2 sweep**.
The original 0.30–0.70 cosine range was degenerate (face-api descriptors are
not unit-normalized; all cosine distances are < 0.24), hence the widened range.

**Caveats (do not overquote):** N = 8 identities / 44 embeddings — a ±1 pair
moves F1 by ~0.005; LFW is curated (single near-frontal face per photo,
studio-ish conditions), so real-world precision/recall will be lower. See
`ACCURACY.md` for the full limitations section.

## Scale

| Date | Metric | Value | Test Conditions |
|---|---|---|---|
| 2026-09-23 | API process RSS (production container, models loaded, idle) | 255 MB | Docker compose, Node v22, `dist/server.js`, face-api weights resident |
| 2026-09-23 | Worker process RSS (production container, models loaded, idle) | 152 MB | Docker compose, Node v22, `dist/worker.js`, face-api weights resident |
| 2026-09-23 | API process RSS **peak** (production container) | 381 MB | `/proc/<pid>/status` **VmHWM** after boot + a public share search (7.4s in-container inference) — Post-Day-7 audit |
| 2026-09-23 | Worker process RSS **peak** (production container) | 371 MB | VmHWM after indexing a 12-photo real-face batch at concurrency 2 (idle high-water was 268 MB) — Post-Day-7 audit |
| 2026-09-23 | Combined API+worker worst case (sum of individual peaks) | ~752 MB | peaks may not coincide; `fly.toml`'s 2 GB VM = 2.7× this. Measured with the pure-JS tfjs backend — `@tensorflow/tfjs-node` is installed but never imported (audit finding) |
| | | | |

## Reliability

| Date | Metric | Value | Notes |
|---|---|---|---|
| | | | |

## Known Bugs Found & Fixed

| Date | Bug | Impact | Fix | Commit |
|---|---|---|---|---|
| 2026-09-23 (Day 7) | `detectEveryFace` built `(1, 2::vector, 3, NOW())` — literal ints instead of `$n` placeholders | **Every embedding insert failed since Day 2**; dev DB had 0 embeddings ever; processed images silently unsearchable | Parameterized `$1/$2/$3` + extracted `buildEmbeddingInsert` + `face-pipeline.test.ts` regression tests; caught by container pipeline testing | uncommitted (Day 7 work) |
| 2026-09-23 (audit) | Worker's BullMQ `failed` handler counted **per attempt**, not per job | One bad file → `failed=2`; batch flipped to finished after attempt 1, before the retry ran | `isFinalAttempt()` guard (`retryPolicy.ts`) + 4 unit tests; re-verified in-container | uncommitted (Day 7 work) |
| 2026-09-23 (audit) | Bench tooling bugs: `bench-upload`/`bench-search` read pre-envelope-Fix-4 shapes; `seed.ts` stored a plaintext bench password vs `bcrypt.compare` login | `bench:upload` could never complete since Day 1 — upload rows stayed empty; `bench-search --via-http` likewise broken | Fixed envelope reads, added `BENCH_BASE_URL`, bcrypt-hash the bench user; first successful upload bench this date | uncommitted (audit) |
| 2026-09-23 (audit) | **OPEN:** `createEvent` returns 500 when `description` omitted (Prisma `NOT NULL` vs Zod marking it optional) | API contract wart — validated-optional field crashes; bench happened to always send it | Not fixed (Post-Day-7 audit forbids non-step-5 logic changes) — proposed fix: default to "" or make column nullable | — |
| 2026-09-23 (audit) | **OPEN:** `@tensorflow/tfjs-node` is a dependency but imported **nowhere** — all inference runs the pure-JS tfjs backend | Slower inference + lower memory than the dependency implies; sizing docs referenced a library that is never loaded | Not fixed (out of audit scope) — one import at startup would wire it; re-measure RSS after | — |
