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

| Date | Change | Metric | Before | After | Test Conditions |
|---|---|---|---|---|---|
| 2026-08-21 | Baseline (pre-optimization) | Search p50 (direct DB) | 0.98ms | | 1,000 embeddings, Node v22, local Postgres, direct DB query |
| 2026-08-21 | Baseline (pre-optimization) | Search p95 (direct DB) | 1.11ms | | 1,000 embeddings, Node v22, local Postgres, direct DB query |
| 2026-08-21 | Baseline (pre-optimization) | Search p99 (direct DB) | 1.42ms | | 1,000 embeddings, Node v22, local Postgres, direct DB query |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=1 response | | | 1 image, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=1 e2e | | | 1 image, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=10 response | | | 10 images, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=10 e2e | | | 10 images, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=50 response | | | 50 images, local dev (requires server + worker running) |
| 2026-08-21 | Baseline (pre-optimization) | Upload batch=50 e2e | | | 50 images, local dev (requires server + worker running) |

## Accuracy

| Date | Change | Metric | Before | After | Test Conditions |
|---|---|---|---|---|---|
| | | | | | |

## Scale

| Date | Metric | Value | Test Conditions |
|---|---|---|---|
| | | | |

## Reliability

| Date | Metric | Value | Notes |
|---|---|---|---|
| | | | |

## Known Bugs Found & Fixed

| Date | Bug | Impact | Fix | Commit |
|---|---|---|---|---|
| | | | | |
