# Resume Bullets — DRAFT

Every number below is copied from `METRICS.md` or actual test output; the
source is cited under each bullet. Numbers that don't exist as measurements
are deliberately left out and listed at the bottom instead — don't add them
from memory or estimate them into a resume.

---

**1.** Cut p95 face-search latency at 100K face embeddings from **46.27ms to
1.71ms (27× faster)** — p50 from 40.97ms to 1.15ms **(35.6×)** — by adding a
pgvector **HNSW index** (L2 operator class) with zero application-layer
changes; confirmed via `EXPLAIN ANALYZE` that the planner uses the index,
not a sequential scan.

> Source: `METRICS.md` → "Vector Search Latency — HNSW Index Impact":
> `| 100,000 | none | 40.97ms | 46.27ms | 50.72ms |` ,
> `| 100,000 | HNSW | 1.15ms | 1.71ms | 2.68ms |`,
> "**35.6× faster at p50**", and the Latency table row
> "Search p95 100K (no index) 46.27ms → (HNSW) 1.71ms **27× faster**".
> Secondary numbers from the same table: 10K p50 5.23ms → 1.09ms (4.8×);
> index build 0.94s @10K, 47.75s @100K.

**2.** Built the project's first automated test suite — **48 tests** across
auth, event CRUD, **cross-user ownership enforcement**, cascade delete,
input validation, and security (rate-limit 429s, magic-byte file rejection)
— which immediately caught a real production bug: `PATCH /events/:eventId`
had been **silently failing since validation was added** (schema/controller
field-name mismatch), fixed across 4 files (backend controller → frontend
service → UI form → tests).

> Source: `npm test` output (backend), Post-Day-7 audit run: "Test Files 9
> passed (9) / Tests 48 passed (48)" (1 additional test skipped without a
> local face fixture). Bug story: `PROGRESS.md` entries "Day 4 … bug
> discovered" and "Day 5 … updateEventFromId field-name mismatch".

**3.** Re-architected photo ingestion from a blocking, per-request ML loop
into an **async BullMQ pipeline** (API inserts rows + enqueues → separate
worker process runs face detection at concurrency 2 → clients poll batch
status): bulk uploads now return in **16ms / 37ms / 153ms p50** for 1 / 10 /
50 images instead of blocking for the full ML pass; jobs survive worker
restarts and batch counters update atomically under concurrency.

> Source: `METRICS.md` → "Upload latency — bench:upload":
> `| 1 | 16.42ms | ...`, `| 10 | 36.54ms | ...`, `| 50 | 152.92ms | ...`
> (response p50, local dev stack, 2026-09-23). Behavioral sources:
> `PROGRESS.md` "2026-09-12 Async Upload Architecture" (atomic increments,
> retries with exponential backoff, graceful shutdown, status endpoint).
> Do NOT pair this with the bench E2E column — that measures the
> decode-failure/retry path (METRICS.md caveat).

(Container memory, previously missing here, is now measured: API peak 381 MB /
worker peak 371 MB VmHWM — `METRICS.md` → Scale.)

**4.** Hardened a demo destined for a public URL: tiered IP **rate limits**
(auth 5/15min, search 10/min, upload 20/hr with a standardized 429
envelope), **magic-byte file validation** (spoofed `.jpg` rejected before
the queue), **helmet** + a scoped `Cross-Origin-Resource-Policy` fix so
cross-origin image serving keeps working, fail-fast env validation
(≥32-char JWT; production refuses placeholder secrets), and a
**non-root container** with a `/health` probe supervising API + worker.

> Source: config comments in `backend/src/middlewares/rateLimiter.ts`
> (the 5/15min, 10/min, 20/hr figures); `PROGRESS.md` Day 5 + Day 7
> entries; the 40-test count above includes the rate-limit and
> fake-file rejection tests.

**5.** Empirically validated the face-match threshold instead of shipping a
literature guess: swept distance thresholds over a labeled LFW fixture
(8 identities × 6 photos → 44 embeddings → 946 labeled pairs) and set
`FACE_MATCH_DISTANCE_THRESHOLD` to **0.55 — precision 1.000 / recall 0.940 /
F1 0.969, zero false positives across all 846 different-person pairs** —
deliberately one notch below the F1-optimal 0.60 (F1 0.970, precision
0.961, 4 FP) because a false positive (claiming a guest is a stranger) is
worse than a missed match and the ΔF1 of 0.001 is within noise; vs F1
0.895 at the previous literature 0.5. Full sweep, tradeoff table, and
small-N caveats in `ACCURACY.md`.

> Source: `METRICS.md` → "Accuracy" (full L2 + cosine sweeps, run
> 2026-10-04), `ACCURACY.md` → "Threshold Decision" / "Results". Keep the
> caveat attached: 8 identities under LFW's curated conditions — measured,
> but small-N, not production-grade validation.

---

## Numbers still missing (do NOT put these on a resume yet)

| Claim someone might want | Why it's missing | How to get it |
|---|---|---|
| Face-match precision / recall / F1, "validated threshold" | ~~Accuracy benchmark never ran~~ — **now measured 2026-10-04, see bullet 5** | — |
| CI pass rate / build time numbers | The workflow exists and passes `actionlint` but has never run on GitHub (repo not pushed) | Push to `main`, read the first green run |
| Face-processing throughput / real-face upload E2E | `bench:upload`'s fixture can't decode → its E2E column is the retry-backoff path (documented in METRICS.md) | Drop a licensed single-face JPEG at `benchmarks/fixtures/test-upload.jpg`, re-run `npm run bench:upload` |
| "X images/second ingestion throughput" | Never measured end-to-end | Extend `bench:upload` to report completed-batch throughput |
