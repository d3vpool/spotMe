# PROGRESS.md

Cross-agent progress log. Read the latest entry first to pick up where work left off.

## 2026-10-04b - Buffy (Freebuff) — Threshold decision: 0.55 (zero-FP) over F1-optimal 0.60

> **Status: COMPLETE — `FACE_MATCH_DISTANCE_THRESHOLD` is now 0.55.** After
> reviewing the measured tradeoff in `ACCURACY.md`, the threshold moved
> **0.60 → 0.55** as a deliberate product/safety decision: at 0.55 the
> benchmark shows **precision 1.000 — 0 false positives across all 846
> different-person pairs** (recall 0.940, F1 0.969), vs 0.60's F1 0.970
> (precision 0.961, 4 FP / 2 FN). The ΔF1 of 0.001 is within noise at
> N=100 same-person pairs, and for this product a false positive (showing
> a guest a stranger's photo, claiming it's them) is materially worse than
> a missed match (the guest can still browse the gallery manually). This
> is NOT a correction of the 0.60 measurement — 0.60 remains the measured
> F1-optimal point and stays labeled as such in `ACCURACY.md`.

- Changed:
  - `backend/src/config/constants.ts`: `FACE_MATCH_DISTANCE_THRESHOLD = 0.55`; doc comment rewritten to carry the zero-FP rationale (why the F1-optimal 0.60 was rejected), not just the number.
  - `backend/test/face-match-threshold.test.ts`: pins `toBe(0.55)`; filter cases re-derived (0.3–0.5 accepted, 0.55 rejected under strict `<`) with the confusion-matrix reasoning in comments (0 FP / 6 FN at 0.55 vs 4 FP / 2 FN at 0.60).
  - `ACCURACY.md`: "Threshold Decision" swapped — **0.55 is the current choice** (privacy/trust-motivated, explicitly not pure F1-max); 0.60 kept in the tradeoff table as the measured best-F1 alternative deliberately not chosen; Results section now says shipped ≠ F1-optimal; changelog row added for the 0.55 decision.
  - `METRICS.md`: headline rows show chosen 0.55 (0.969 / 1.000 / 0.940, 0 FP) plus a separate row for the measured-but-not-shipped 0.60; full sweep tables unchanged (they are measurements).
  - `README.md` / `RESUME_BULLETS.md`: every threshold mention updated to 0.55 with the zero-FP reasoning where the rationale is summarized.

## 2026-10-04a - Buffy (Freebuff) — Day 6 (completion): accuracy benchmark RUN, threshold empirically set

> **Status: COMPLETE — threshold now measured.** The Day 6 blocker (no
> labeled fixture photos) was cleared: the LFW fixture is populated and
> `npm run bench:accuracy` ran for real. `FACE_MATCH_DISTANCE_THRESHOLD`
> moved **0.5 → 0.6** (measured best F1). This closes the blocker declared
> in the 2026-09-18d (Day 6) entry below.
>
> **Same-day update:** the shipped value is **0.55**, not 0.60 — a
> deliberate zero-false-positive product decision over the F1-optimal
> 0.60 (ΔF1 0.001, within noise). See 2026-10-04b above; numbers in this
> entry remain the accurate measurement record of the run.

- Done:
  - **Fixture**: 8 LFW identities × 6 photos (deep-funneled, sourced via the
    Kaggle mirror, research-use license) at
    `backend/benchmarks/fixtures/faces/` — folder gitignored, not committed;
    source cited in `ACCURACY.md`.
  - **Benchmark run** (2026-10-04, `bench-accuracy.ts`): 48 photos → **44
    embeddings** (4 no-face skips) → **946 pairs** (100 same / 846 diff).
    L2: best **F1 0.970 @ 0.60** (precision 0.961, recall 0.980); the old
    0.50 measured F1 0.895 (precision 1.000, recall 0.810). Cosine: best
    F1 0.974 @ 0.08 (informational only — search uses pgvector `<->` L2).
  - **Sweep correctness fixes**: original cosine range 0.30–0.70 was
    degenerate (face-api descriptors aren't unit-normalized — all cosine
    distances < 0.24, every pair passed every threshold). Sweep is now
    per-metric (L2 0.30–0.90, cosine 0.02–0.30) with min/max distance
    distribution checks printed; the extended L2 sweep confirms 0.60 is an
    **interior** optimum (0.55 → 0.969, 0.65 → 0.843), not a boundary
    artifact, per the original "widen if best lands at boundary" criterion.
  - **Production constant updated**: `FACE_MATCH_DISTANCE_THRESHOLD = 0.6`
    (set to 0.6 in this entry; **shipped value is 0.55 as of 2026-10-04b
    above**) in `backend/src/config/constants.ts`, comment citing the measurement.
    Both `searchFaces`/`searchFacesPublic` already consumed the constant
    (no controller changes needed). `face-match-threshold.test.ts` updated
    to pin the value with the measurement rationale + re-derived filter cases.
  - **Docs**: `ACCURACY.md` rewritten (measured tables, threshold decision,
    LFW citation line, honest limitations); `METRICS.md` Accuracy section
    filled with both full sweeps + distribution stats; README accuracy
    section + known-limitations updated; `RESUME_BULLETS.md` gains bullet 5
    and retires the corresponding "numbers missing" row.
  - **Verification**: full battery (`npx tsc --noEmit && npm run lint &&
    npm run format:check && npm test`) — backend **48 passed, 1 skipped
    (49 total)** (the skip is `pipeline-e2e`'s optional local fixture,
    unrelated), lint 0 errors and Prettier clean; frontend `tsc` + lint
    clean.
- Known limitations:
  - **Small N**: 8 identities / 44 embeddings — one pair moves F1 ~0.005;
    LFW's curated near-frontal conditions mean real-world numbers will be
    lower. 0.55 (F1 0.969, zero FP) is the measured privacy-conservative
    fallback. Documented in `ACCURACY.md` → Limitations.
  - CI still has **never run on GitHub** (repo not pushed; workflow
    actionlint-validated only) — unchanged by this step.

## 2026-09-23b - Buffy (Freebuff) — Post-Day-7 Audit: blast radius of the dead insert

> **Headline: no published number was invalid.** Every number in `METRICS.md`,
> README, and `RESUME_BULLETS.md` was produced either through `bench-search.ts`
> direct-DB mode against **synthetic seed rows** (`scripts/seed.ts`'s own chunked
> inserts, which always worked) or through measurements that never touched SQL
> at all (index build times, RSS, test counts). The blast radius of the Day 2
> insert bug was **absence of evidence, not wrong evidence**: the upload-latency
> rows were *empty* because the bench itself was broken (see below), and no
> end-to-end search/embedding number existed to be wrong. Nothing needed an
> “INVALID” mark; `METRICS.md` now carries an explicit validity note saying so.

- Bench validity audit + reruns:
  - `bench-upload.ts` reads embeddings via the **real queue → worker →
    `detectEveryFace` path** (not synthetic SQL). It had **never completed once
    since Day 1** — two tooling bugs: `scripts/seed.ts` stored the bench password
    in *plaintext* while `/user/login` uses `bcrypt.compare` (401), and the bench
    read the pre-Fix-4 envelope (`data.id` instead of `data.event.id`), so every
    upload hit `/events/undefined/...` → 400 “eventId must be a numeric string”.
    `bench-search --via-http` had the same envelope bug (`{ token }` vs
    `data.token`). All fixed; **first successful `bench:upload` run 2026-09-23**:
    response p50 **16.42 / 36.54 / 152.92 ms** for 1 / 10 / 50 images. The E2E
    column (~3.0s) is the **decode-failure + retry-backoff path only** — the
    22-byte fixture can't decode, so worker inference never runs; documented in
    `METRICS.md`, not presented as face-processing throughput. Also added
    `BENCH_BASE_URL` (port was hardcoded to 3000).
  - `bench-search` data path (synthetic seed) **unaffected** by the insert bug →
    rows stand. Reproducibility re-run of the 1K HNSW row: p50 **1.05ms** vs
    published 0.79ms (same conditions, ~0.3ms day variance) — recorded in
    `METRICS.md`.
- New end-to-end regression test for this bug class: `test/pipeline-e2e.test.ts`
  drives a real photo **API → queue → in-process worker → FaceEmbedding rows →
  search hit with bounding box**. Reads `backend/test/fixtures-local/selfie.jpg`
  (gitignored) and SKIPs with instructions when absent, so CI stays green.
  Local run: **PASS**. Plumbing, not accuracy (commented as such in the file).
- Container search plumbing check: public share search with a real selfie →
  HTTP 200 (7.4s in-container inference), envelope shape `data.matches[]` with
  `imageId/imageUrl/faces[boundingBox]` exactly as the frontend consumes;
  round-trip distance **0.000000** (same photo) and best cross-image match
  **0.484 < 0.5** at the SQL level. Reported as plumbing only.
- Real memory sizing (replaces estimates): API peak **381 MB**, worker peak
  **371 MB** RSS (`/proc/<pid>/status` **VmHWM** in the production container;
  12-photo batch, concurrency 2; idle 255/152 MB). Worst-case sum ≈ 752 MB →
  `fly.toml`'s 2 GB = 2.7× peak, **no raise needed**; comments in `fly.toml`
  and `DEPLOY.md` now cite the measured peaks instead of a “~1 GB idle
  estimate”.
- Same-bug-class raw-SQL sweep — **every site executed against a real DB this
  session** (not just read): `buildEmbeddingInsert` (E2E test + 25 in-container
  inserts), both `$queryRaw` search queries (E2E + container share search + a
  direct tagged-template call), `deleteFaceEmbeddingsForImages`'s unsafe IN-list
  (executes with numeric IDs; an injected `1); DROP TABLE…` payload is rejected
  by PG's int parsing with the `User` table intact — not exploitable in an int
  context, but still worth parameterizing), `app.ts` `SELECT 1` (/health),
  `seed.ts` chunks (a real 1,000-row seed ran this session), `check-index.ts`
  and `bench-search` (both executed), `setup.ts seedTestEmbedding` (runs in
  every suite). **No new raw-SQL bug found.**
- Untested code paths (read-only survey; top-3 test proposals): **Google Drive
  import — zero tests, never executed against a real folder (highest risk: SSRF
  guard, mime filtering, pagination all unproven)**; **search zero-face/
  multi-face validation — zero tests** (only the local pipeline E2E touches
  search); **cover-image upload branch + `deleteImage` single-image endpoint —
  no tests**. Lower: share-page visibility rules (manually verified today),
  worker failure path (unit + in-container empirical ✓), Redis-down /health.
- **New bugs found (2 open, not fixed — audit forbids non-step-5 logic changes):**
  1. `POST /events` **without `description` → 500** (Prisma column NOT NULL vs
     Zod marking it optional). The bench masked this by always sending one.
  2. **`@tensorflow/tfjs-node` is imported nowhere** — all inference runs the
     pure-JS tfjs backend (the startup banner in the logs says so); sizing docs
     had referenced a library that is never loaded. One import would wire it;
     memory must be re-measured after. Fixed-in-audit tooling bugs: bench
     envelope reads ×3, plaintext bench password, vitest `skipIf` inversion,
     `BENCH_BASE_URL`.
- Hygiene: `.gitignore` extended (`test/fixtures-local/`, `seed-photos/`,
  `benchmarks/fixtures/faces/` — LFW dirs were already empty but unignored);
  all 8 sensitive-path probes report IGNORED; **no secrets/photos/logs/db dumps
  among untracked or modified files** (29 real personal photos live in
  `backend/uploads/` — ignored, 0 tracked); tracked images = 2 pre-existing
  frontend marketing PNGs + the 22-byte synthetic fixture (eyeball carImage/hero
  if concerned). **Generated-client decision: keep `backend/src/generated`
  tracked and ALWAYS regenerate** — CI already ran `npx prisma generate`;
  Dockerfile now does too (added), and `backend/.gitignore`'s stale
  `/generated/prisma` line was corrected to document the intent. Workflow YAML
  validated with **actionlint 1.7.7 → 0 errors** (shellcheck/pyflakes sub-rules
  unavailable in sandbox). CI has still never run on GitHub — unverifiable from
  here until pushed.
- Docs honesty: README performance/test/limitations sections updated with the
  rerun numbers + caveats; `RESUME_BULLETS.md` bullet 2 (test count 40 → 48 with
  new citation), bullet 3 now cites measured response latencies, missing-numbers
  table pruned (upload-response + memory rows now exist; real-face E2E and CI
  rows remain); fixtures README corrected (test-upload.jpg has **no image
  data**); Day 6 entry below now carries an explicit status line.

### Lessons learned — the insert that was dead for five days

- **The bug:** Day 2's batch-INSERT builder interpolated bare numbers —
  `(1, 2::vector, 3, NOW())` — instead of `$1, $2, $3` placeholders. Postgres
  rejected every embedding insert with `cannot cast type integer to vector`.
  Face search (the product's core feature) silently returned nothing for any
  processed image, **from Day 2 until Day 7**.
- **Why the suite stayed green:** no test ever executed `detectEveryFace`'s
  insert path. Unit tests pinned endpoint contracts; the cascade-delete test
  wrote embeddings through a *different, correct* helper (`seedTestEmbedding`);
  nothing started the worker. The suite read 40/40 while the product did
  nothing — a green suite proves only what it actually executes, and tables
  written by test-only helpers prove nothing about production writers.
- **What caught it:** treating the fresh container like a user — seed photos →
  worker log → `cannot cast type integer to vector`. Out-of-band processes
  (workers) need at least one test that really runs them; that now exists
  (`test/pipeline-e2e.test.ts`).
- **Secondary lesson:** the bench tooling rotted silently for the same reason —
  nobody had run `bench:upload` end-to-end since the Day 1 envelope change, so
  its upload rows sat empty while every doc said “will fill when the stack is
  up”. A benchmark you haven't run recently isn't a pending number; it's an
  unverified one.

## 2026-09-23 - Buffy (Freebuff) — Day 7: Containerize, Deploy-Ready, Document, Package

- Done:
  - **Container**: multi-stage `Dockerfile` (node:22-slim; frontend build + backend tsc emit; runtime = prod deps only, non-root `node` user, face weights baked in, tfjs-node prebuilt binary smoke-tested in final image), `.dockerignore`, `docker/entrypoint.sh` (wait-for-postgres → `prisma migrate deploy` → supervise API + worker; exits if either dies; SIGTERM → graceful shutdown of both). Single container for API+worker because uploads are local disk and both processes touch the same files — documented demo tradeoff.
  - **Same-origin production serving**: `app.ts` serves `frontend/dist` + SPA fallback, gated on `NODE_ENV=production`; frontend built with `VITE_API_URL=""` calls relative `/api` (no CORS/cookie surprises). Small, isolated change as allowed by the spec.
  - **`GET /health`**: DB ping + Redis ping (lazy ioredis client) — used by compose healthcheck and platform health checks.
  - **`docker-compose.yml`**: app + postgres (pgvector) + redis, named uploads volume, healthchecks, `depends_on` conditions, parameterized host ports (`POSTGRES_HOST_PORT` etc. so it can coexist with a local dev Postgres). Dev workflow (infra-only compose + local `npm run dev` / `npm run worker`) preserved and documented.
  - **Deploy config**: `fly.toml` + `DEPLOY.md` (Fly.io chosen: plain Dockerfile needs no platform-specific buildpack; Neon/Upstash for managed pgvector Postgres + Redis, no Docker-in-Docker), `backend/.env.example` + `frontend/.env.example`, Zod fail-fast already covers missing/short secrets (unchanged). `npm run seed:demo` creates demo account + public event, accepts `--photos=<dir>`; **no face photos are shipped** — user supplies their own. Privacy notices added to upload/search UI and README.
  - **Docs**: `README.md` rewritten (Mermaid architecture, metrics copied verbatim from `METRICS.md`, accuracy explicitly unvalidated, security, specific Known Limitations); `RESUME_BULLETS.md` draft with per-bullet source citations; CI gained a build-only Docker job.
- **Bugs found by container testing (all pre-existing; fixed because they block a fresh deploy or make the product silently broken):**
  1. **Fresh-DB migration drift**: `event.isPublic` existed only via `prisma db push` — never in any migration (dev DB has no `_prisma_migrations`), so `migrate deploy` died on a fresh database. Added repair migration `20260910000000_add_event_is_public` (sorts before the Day 1 default-change migration). Verified: full chain applies clean on a fresh DB and is schema-parity clean.
  2. **`face.service.ts` embedding insert had NEVER worked (since Day 2)**: the batch-insert built `(1, 2::vector, 3, NOW())` — literal integers instead of `$1,$2,$3` placeholders → `cannot cast type integer to vector` on every insert. Dev DB had **0 embeddings ever**; any processed image would have returned zero search results. Fixed to real placeholders, extracted `buildEmbeddingInsert`, added `test/face-pipeline.test.ts` (3 regression tests). Verified: real photo → 5 `FaceEmbedding` rows, locally and in-container.
  3. **`requestTimer.ts` broke non-root containers**: unguarded `mkdirSync` at import time with a `../../../logs` path that escapes `/app` → root-owned dir as `node` user. Now cwd-based `logs/requests.log`, mkdir+append both try/caught; `logs/` gitignored.
  4. **Dockerfile initially omitted `prisma.config.ts`** (Prisma 7 CLI requires it) and `openssl` — without them `migrate deploy` fails in-container only.
  5. **Frontend `tsc -b` had 5 pre-existing strict-mode errors** (would have failed the CI build job): fixed in `event.service.ts`, `auth.service.ts`, `EventDetails.tsx`, `FindMyPhotos.tsx`, `PublicEvent.tsx` (types only, no behavior change).
  6. **`seed:demo` queue lacked `defaultJobOptions`** — seed-enqueued jobs silently got `attempts: 1` while API-enqueued jobs get `attempts: 2`. Fixed to mirror `imageProcessing.queue.ts`.
- **Worker failed-counter bug — found by container test, then fixed (user approved the queue touch)**: BullMQ's `failed` event fires on **every** attempt, not after exhaustion — with `attempts: 2`, one bad file incremented `UploadBatch.failed` twice (row `1|0|2`) and `checkBatchComplete` flipped the batch to finished after attempt 1, before the retry ran. The Day 2 spec's assumption ("failed fires only after retries are exhausted") was wrong for BullMQ v6. Fix: `isFinalAttempt()` guard in `backend/src/queues/retryPolicy.ts` (`attemptsMade >= attempts`), applied in the worker's failed handler before incrementing/checking, plus a `will be retried` log line. 4 unit tests in `test/worker-retry.test.ts`. Re-verified in-container with the identical repro: attempt 1 logs `will be retried (attempt 1 of 2)` and does not count, attempt 2 counts once, batch ends `1|0|1|completed_with_errors`, finish log fires exactly once after exhaustion.
- **Verified in the running container** (docker compose full stack): healthy app/postgres/redis; migrations 11/11; processes run as uid 1000; `/health` ok; SPA at `/` and deep links; API envelope intact; `seed:demo` end-to-end → 5 embeddings in-container; fake image file fails cleanly without killing the worker (and retry visibly re-runs after the fix above); share page renders with privacy notice; zero browser console errors; uploads serve under the Day 5 scoped CORP header. **Measured memory: API 255 MB RSS, worker 152 MB RSS** (idle, models resident) → `METRICS.md` Scale section.
- Unverified / not done here (no network in this environment): actual Fly.io deploy, live URL, demo GIF, CI green on GitHub Actions after these changes (nothing pushed). Day 6 accuracy benchmark was blocked on fixture data at the time — **it ran 2026-10-04, see the top entry**. Note: the sandbox only has EOL `docker-compose` v1 which is incompatible with Docker Engine 29; testing used compose **v2** binary — normal machines with compose v2 are unaffected.
- Remaining manual steps: (1) deploy per `DEPLOY.md`, (2) live URL into README, (3) record demo GIF (placeholder comment in README), ~~(4) Day 6 accuracy benchmark with real labeled photos~~ — **done 2026-10-04**, (5) fill `RESUME_BULLETS.md` gaps.

## 2026-09-18d - Buffy (Freebuff) — Day 6: Face-Match Accuracy Infrastructure

> **Status: COMPLETE (2026-10-04) — threshold EMPIRICALLY VALIDATED.** When
> written, this day was PARTIAL/BLOCKED: no licensed fixture photos could be
> sourced in this environment, so `FACE_MATCH_DISTANCE_THRESHOLD = 0.5` was a
> literature value with no precision/recall/F1 behind it. On 2026-10-04 the
> fixture was populated (LFW, 8 identities × 6 photos) and the benchmark ran:
> best **F1 0.970 @ L2 0.60** (precision 0.961, recall 0.980) → constant moved
> 0.5 → 0.6, then to **0.55 the same day** as a deliberate zero-FP product
> choice (measured F1 0.969, precision 1.000). See the 2026-10-04a/b entries
> above and `ACCURACY.md` for the
> measured numbers; the bullets below describe the state when written.

- Done:
  - **Threshold extraction**: Hardcoded `0.5` threshold in `searchFaces`/`searchFacesPublic` controllers replaced with named constant `FACE_MATCH_DISTANCE_THRESHOLD` (defined in `backend/src/config/constants.ts`). Both controllers now import and use this constant, eliminating magic numbers.
  - **Threshold test**: Added `face-match-threshold.test.ts` with 4 tests: validates threshold is in reasonable range (0.3–0.7), documents it's a deliberate choice (currently 0.5), and verifies filtering logic works correctly (distances below threshold accepted, at/above rejected).
  - **Accuracy documentation**: Created `ACCURACY.md` with comprehensive coverage of: how the matching pipeline works, threshold decision rationale, tradeoff analysis table, benchmark methodology, limitations (dataset size, conditions), and what rigorous validation would require.
  - **Benchmark infrastructure**: Created `backend/scripts/download-lfw-subset.ts` to download labeled face data from LFW (Labeled Faces in the Wild) dataset. Script downloads 5 identities × 5 photos each for benchmarking. Could not execute due to network restrictions in current environment.
  - **Test suite**: 40 tests pass (up from 36), all threshold-related tests included.
- Files created/modified:
  - Created: `backend/src/config/constants.ts`, `backend/test/face-match-threshold.test.ts`, `ACCURACY.md`, `backend/scripts/download-lfw-subset.ts`
  - Modified: `backend/src/controllers/event.controllers.ts` (import constant, replace hardcoded values)
- Known limitations:
  - **Accuracy not yet measured**: Benchmark requires labeled face photos which couldn't be downloaded (network restricted). Threshold is based on literature values, not empirical measurement. This is the single biggest evidence gap in the project.
  - **Dataset will be small**: Even when downloadable, 25 images (5 people × 5 photos) is insufficient for rigorous validation. Production deployment would need 1000+ diverse face images.
  - **Threshold may need adjustment**: Literature suggests 0.5 is reasonable, but actual measurements could show optimal F1 at 0.4 or 0.6. Update `FACE_MATCH_DISTANCE_THRESHOLD` once benchmark results are available.
  - **Resolved 2026-10-04**: the benchmark ran — optimal F1 was indeed at **0.60** (F1 0.970), and the constant was set to 0.6 that day, then shipped at **0.55** (zero-FP product decision, ΔF1 0.001 within noise — top entries). The dataset-size limitation above still applies (8 identities, not 1000+).

## 2026-09-18c - Buffy (Freebuff) — Day 5: Security Hardening

- Done:
  - **Rate limiting** (`express-rate-limit`): Three tiers applied — auth endpoints (5 req/15min per IP) for brute-force protection, search endpoints (10 req/min per IP) for ML inference cost control, upload/import endpoints (20 req/hour per IP) matching a photographer's realistic session usage. Custom handler returns standardized `sendError` envelope with 429 status. Rate limiting is bypassed in test environment (`NODE_ENV=test`) to avoid breaking test suites. Limiters extracted to `backend/src/middlewares/rateLimiter.ts` to avoid circular dependency with `app.ts`.
  - **Real file-type validation** (`file-type` package): Upload middleware now validates actual file content via magic bytes after Multer writes to disk. Rejects files with wrong content (e.g., `.txt` renamed to `.jpg`) with 400 and deletes the invalid file from disk. Applied to direct upload, cover image upload, and Google Drive import (validates after download, before enqueuing). Files that fail validation never reach the processing queue.
  - **Security headers** (`helmet`): Added as global middleware in `app.ts`. Default CSP is strict but doesn't break image serving from `/uploads` static route. CORS remains single explicit origin from `env.FRONTEND_URL` with `credentials: true` — not a wildcard.
  - **JWT expiry decision**: Kept at 7 days. Documented as accepted tradeoff — shortening to 1 day would degrade UX significantly without a refresh-token flow to smooth re-authentication. A refresh-token mechanism is the correct fix but out of scope for current development. The 7-day expiry is appropriate for a portfolio project with no sensitive financial data.
  - **Secrets hygiene scan**: Verified no real secrets in git history (only test/benchmark placeholder values). `.env` is gitignored in both root and backend. `.env.example` contains only placeholder values. Generated Prisma client has no embedded connection strings or secrets.
  - **Tests**: Added `security.test.ts` with 2 tests — rate limiter wiring verification and file content validation (fake .jpg rejection). Full suite now **36 passed, 0 skipped**. Test script updated to set `NODE_ENV=test` automatically.
- Files created/modified:
  - Created: `backend/src/middlewares/rateLimiter.ts`, `backend/test/security.test.ts`
  - Modified: `backend/src/app.ts` (helmet), `backend/src/routes/user.routes.ts` (auth limiter), `backend/src/routes/event.routes.ts` (search/upload limiters), `backend/src/middlewares/upload.middleware.ts` (file-type validation), `backend/src/controllers/event.controllers.ts` (content validation calls), `backend/package.json` (dependencies, test script)
- Known limitations:
  - IP-based rate limiting affects all users behind the same NAT/corporate network identically — acceptable for portfolio, noted as known limitation.
  - JWT 7-day expiry without refresh-token flow is a documented tradeoff, not a security oversight.
  - File-type validation only checks first bytes — extremely sophisticated file polyglots could theoretically bypass, but this is well beyond portfolio-project threat model.

## 2026-09-18b - Buffy (Freebuff) — Fix updateEventFromId field-name mismatch

- Done:
  - **Bug fixed**: `updateEventFromId` controller read `req.body.newTitle`/`newDescription`, but the Zod validation schema (`updateEventSchema`) validates `title`/`description`. Since Zod strips unknown keys, the controller always received `undefined` — every PATCH update was silently failing since Day 3's validation was added. Standardized on `title`/`description` (matching Zod schema + REST conventions) across all 4 touch points: controller, frontend service type signature, frontend edit form, and route middleware.
  - **Tests un-skipped and expanded**: The 2 previously-skipped PATCH tests were replaced with 4 real tests: update title (DB verified), update description, cross-user block (verifies unchanged), and empty body → 400. Full suite now **34 passed, 0 skipped**.
  - **Why this bug existed**: Day 3's Zod validation was added as middleware, but the controller was written against the pre-validation contract (`newTitle`/`newDescription`). Zod's `stripUnknown` (default) silently ate the fields, so the controller got `undefined` for both. The bug was invisible because no tests exercised PATCH before Day 4 added them — a textbook case of "tests found the bug they were designed to find."
- Files modified:
  - `backend/src/controllers/event.controllers.ts` — `newTitle`/`newDescription` → `title`/`description`
  - `frontend/src/services/event.service.ts` — type signature updated
  - `frontend/src/pages/EventDetails.tsx` — edit form sends correct field names
  - `backend/test/events.test.ts` — 2 skipped → 4 real tests

## 2026-09-18 - Buffy (Freebuff) — Testing Infrastructure, Linting, and CI

- Done:
  - **Test infrastructure**: Vitest + Supertest for backend integration tests. Separate test database (`spotme_test`) with pgvector extension enabled. Global setup drops/recreates DB, pushes schema via `prisma db push`, truncates all tables between tests. Fixture helpers (`seedTestUser`, `seedTestEvent`, `seedTestImage`, `seedTestEmbedding`, `seedTestBatch`) for reusable test data.
  - **Auth flow tests** (10 tests): signup creates user + returns token; duplicate email → 500; missing/short password → 400; login returns token for valid credentials; wrong password → 401; nonexistent email → same 401 (no email enumeration); auth middleware rejects missing/invalid tokens, allows valid tokens.
  - **Event CRUD + ownership tests** (13 tests): create event with auth; requires auth; rejects empty title; GET returns event for owner; GET returns 404 for other user's event; DELETE allows owner, blocks other user; visibility defaults to private; toggle makes public, share endpoint works. PATCH tests now cover title update, description update, cross-user block, and empty body rejection (expanded from 2 skipped to 4 passing).
  - **Cascade delete regression test** (2 tests): creates event with images + FaceEmbeddings + UploadBatch, deletes event, asserts ALL dependent rows are gone with no FK errors. Also tests zero-image edge case.
  - **Input validation regression tests** (9 tests): malformed eventId/imageId/batchId/shareToken params → 400 (not Prisma error); missing title → 400; empty PATCH body → 400; non-boolean isPublic → 400; full HTTP round-trip for create and share routes confirms middleware is wired.
  - **Bug discovered**: `updateEventFromId` controller reads `req.body.newTitle`/`newDescription` but Zod validation schema validates `title`/`description`. The Zod middleware strips unknown fields, so updates always fail. Fixed in the follow-up session above — tests un-skipped and expanded.
  - **ESLint + Prettier**: Backend ESLint flat config with `@typescript-eslint`, Prettier with standard rules. `npm run lint` / `npm run format` / `npm run format:check` scripts added. `no-explicit-any` set to warn (not error) for fast-moving codebase. Frontend already had ESLint from Vite scaffold; adjusted rules for consistency. All errors resolved (0 errors on both frontend and backend).
  - **GitHub Actions CI** (`.github/workflows/ci.yml`): Runs on push/PR to `main`. Two parallel jobs: (1) Backend — Postgres+pgvector service, Redis service, `npm ci`, `prisma generate`, `prisma db push`, `npm run lint`, `npm test`. (2) Frontend — `npm ci`, `npm run lint`, `npm run build`. CI badge added to README.
  - **README updates**: CI badge, "Running Tests" section with test DB setup instructions, coverage summary, and "not yet covered" note for transparency.
- Why:
  - Zero automated tests, no linting, no CI was the single biggest credibility gap. A fast-moving AI-assisted codebase without safety nets is a red flag. These tests cover the flows that would break silently: auth, ownership enforcement, cascade deletes, input validation.
- What's NOT covered (honesty, not failure):
  - Frontend has no automated tests yet (component tests explicitly deferred per scope decision).
  - Face detection accuracy is covered by the separate `bench-accuracy` script, not unit tests.
  - Async upload polling integration test not yet written (would require running the BullMQ worker in the test process).
- Files created/modified:
  - Created: `backend/vitest.config.ts`, `backend/test/setup.ts`, `backend/test/helpers.ts`, `backend/test/auth.test.ts`, `backend/test/events.test.ts`, `backend/test/cascade-delete.test.ts`, `backend/test/validation.test.ts`, `backend/test/fixtures/test.jpg`, `backend/eslint.config.js`, `backend/.prettierrc`, `.github/workflows/ci.yml`
  - Modified: `backend/package.json`, `frontend/eslint.config.js`, `frontend/src/contexts/ToastContext.tsx`, `README.md`, `backend/src/controllers/event.controllers.ts`

## 2026-09-13 - Buffy (Freebuff) — HNSW Index, Benchmarking, Input Validation

- Done:
  - **HNSW vector index on `FaceEmbedding.vector`**: Created via plain `CREATE INDEX` (not `CONCURRENTLY` — Prisma migrations wrap in transactions, `CONCURRENTLY` cannot run inside one; acceptable for portfolio scale). Operator class `vector_l2_ops` matched to the `<->` (L2 distance) operator used in queries — using the wrong operator class would silently prevent index usage. HNSW chosen over IVFFlat because it requires no training step tied to data volume (`lists` parameter) and has better recall at this dataset size.
  - **Benchmark before/after at scale**: Captured search latency with and without index at 1K, 10K, and 100K embeddings. Key results: **p50 at 10K: 5.23ms → 1.09ms (4.8× faster)**; **p50 at 100K: 40.97ms → 1.15ms (35.6× faster)**. Full comparison table in `METRICS.md`. EXPLAIN ANALYZE confirms `Index Scan using face_embedding_vector_hnsw_idx` at realistic data volumes.
  - **Seed timeout root cause identified and fixed**: The original 100K seed taking 579s was caused by HNSW index maintenance on every INSERT — each new vector triggered graph rebalancing. Fix: drop the index before bulk seeding, then rebuild afterward. With the index dropped, 100K seeds in **6.58 seconds** (88× faster). Chunk size also increased from 500 → 2000 to reduce round-trips.
  - **HNSW build times captured**: 10K embeddings: 0.94s; 100K embeddings: 47.75s (exceeds default maintenance_work_mem — PostgreSQL logs a notice but completes successfully).
  - **Input validation on all event routes**: Extended `validateInput()` with sibling `validateParams()` and `validateQuery()` factories. Added Zod schemas for: `POST /events` (title required, description optional), `PATCH /events/:eventId` (at-least-one field required via `.refine()`), `PATCH /events/:eventId/visibility` (isPublic must be boolean), `POST /events/:eventId/images/import-drive` (driveUrl must be valid URL). All route params (`:eventId`, `:imageId`, `:shareToken`, `:batchId`) now validated — malformed IDs return 400 instead of hitting Prisma with garbage.
  - **Param validation type audit**: Verified all param schemas match actual Prisma PK types. `eventId`/`imageId` use `Int @default(autoincrement())` → numeric regex ✅. `batchId` uses `String @default(uuid())` → UUID validator ✅. `shareToken` uses `String @unique` (UUID from `crypto.randomUUID()`) → UUID validator ✅. No bug found — the schemas were correct all along.
  - **Migration tracking**: Created `backend/prisma/migrations/20260913000000_add_hnsw_index_face_embedding/migration.sql`.
- Why:
  - The face search query was doing a sequential scan over every embedding — fast at 1K, unusable at 100K. The HNSW index makes it sub-2ms at 10K. Input validation closes a deferred Day 1 gap where every event route accepted unvalidated request bodies/params.
- Left to do:
  - Capture 100K-with-index benchmark number (seed timing out at scale; extrapolated from 10K trend).
  - Rate limiting/abuse protection on public selfie-search endpoint.
  - Automated tests, CI, backend linting, formatter.
  - Roadmap items: cloud storage (S3/R2), multiple face matches per search, email/SMS share delivery, admin dashboard, Google Drive OAuth for private folders.
- Files created/modified:
  - Created: `backend/prisma/migrations/20260913000000_add_hnsw_index_face_embedding/migration.sql`
  - Modified: `backend/src/middlewares/inputValidation.ts`, `backend/src/routes/event.routes.ts`, `METRICS.md`

## 2026-09-12 - Buffy (Freebuff) — Async Upload Architecture

- Done:
  - **BullMQ job queue for face detection**: Added `bullmq` + `ioredis` dependencies. Created `backend/src/queues/imageProcessing.queue.ts` (Queue) and `backend/src/queues/imageProcessing.worker.ts` (Worker with concurrency 2). Worker calls existing `detectEveryFace()` — no ML logic rewritten. Worker runs as separate process via `npm run worker`.
  - **UploadBatch model**: New Prisma model tracks batch processing progress (totalImages, completed, failed, status). Status updates use atomic `UPDATE ... SET completed = completed + 1` to avoid race conditions across concurrent workers.
  - **Async upload endpoint**: `POST /events/:eventId/images` now inserts image rows synchronously, enqueues face detection jobs, and returns immediately with `{ batchId, totalImages }`. No more blocking the HTTP request for tens of seconds.
  - **Batch status endpoint**: `GET /events/:eventId/upload-status/:batchId` returns current processing progress. Auth required, verifies batch belongs to caller's event.
  - **Drive import routed through queue**: `POST /events/:eventId/images/import-drive` now downloads files, creates image rows, and enqueues jobs via the same queue — returns batch info for polling.
  - **Batch insert optimization**: `detectEveryFace()` now does a single multi-row INSERT for all face embeddings per image instead of N sequential single-row inserts.
  - **Frontend processing progress**: `UploadPhotos` page now shows a progress bar and polling indicator during background processing. Polls every 2 seconds, shows completed/total count, stops on completion.
  - **docker-compose.yml**: Created at repo root with `postgres` (pgvector/pgvector:pg16) and `redis` (redis:7-alpine) services. Three processes now needed: docker-compose, `npm run dev`, `npm run worker`.
  - **bench-upload.ts updated**: Now measures both response latency (time-to-return) and end-to-end latency (polls batch status until completion). Updated for new response envelope format.
- Why:
  - The upload endpoint was blocking the HTTP request for the full face-detection processing time (tens of seconds for large batches). Moving to a background queue means the upload returns immediately and the client can poll for progress.
- Left to do:
  - Run `bench:upload` with server + worker running to fill in before/after numbers in METRICS.md.
  - pgvector HNSW/IVFFlat index on `FaceEmbedding.vector`.
  - Rate limiting/abuse protection on public selfie-search endpoint.
  - Automated tests, CI, backend linting, formatter.
  - Roadmap items: cloud storage (S3/R2), multiple face matches per search, email/SMS share delivery, admin dashboard.
- Files created/modified:
  - Created: `docker-compose.yml`, `backend/src/queues/imageProcessing.queue.ts`, `backend/src/queues/imageProcessing.worker.ts`, `backend/src/worker.ts`, `backend/prisma/migrations/20260912000000_add_upload_batch/migration.sql`
  - Modified: `backend/prisma/schema.prisma`, `backend/package.json`, `backend/src/config/env.ts`, `backend/.env.example`, `backend/src/controllers/event.controllers.ts`, `backend/src/routes/event.routes.ts`, `backend/src/services/face.service.ts`, `backend/benchmarks/bench-upload.ts`, `frontend/src/types/index.ts`, `frontend/src/services/event.service.ts`, `frontend/src/pages/UploadPhotos.tsx`, `PROGRESS.md`, `README.md`, `METRICS.md`

## 2026-09-11 - Buffy (Freebuff) — Google Drive Import

- Done:
  - **Google Drive folder import**: New `POST /events/:eventId/images/import-drive` endpoint that imports images from a publicly-shared Google Drive folder. Uses the `googleapis` SDK with an API key (no OAuth). Only public folders supported; private/inaccessible folders return a clear 400 error. Limits: max 200 images per import, max 10 MB per file. Each imported image goes through the same `detectEveryFace` pipeline as manual uploads. On-disk files use the same `Date.now()-name` convention as Multer uploads.
  - **Frontend Drive import tab**: `UploadPhotos` page now has two tabs — "Upload Files" (existing drag-and-drop) and "Import from Google Drive" (paste link + import button with loading state). Success toast shows imported/skipped/totalFound counts.
  - **Env config**: Added `GOOGLE_DRIVE_API_KEY` to Zod schema in `backend/src/config/env.ts` (required, validated at startup). Updated `backend/.env.example` with instructions on obtaining a key from Google Cloud Console.
  - **Known limitations**: No dedup on repeated imports of the same folder (documented here). Synchronous per-file processing — should be revisited once BullMQ queue exists.
- Why:
  - Photographers often already have event photos in Google Drive folders. This avoids the manual download-and-reupload workflow.
- Left to do:
  - End-to-end manual test with a real public Drive folder.
  - Run `bench:upload` with server running to fill in upload baseline numbers.
  - Add labeled face fixtures to `benchmarks/fixtures/faces/` and run `bench:accuracy`.
  - Background/async face processing (BullMQ job queue).
  - pgvector HNSW/IVFFlat index on `FaceEmbedding.vector`.
  - Rate limiting/abuse protection on public selfie-search endpoint.
  - Automated tests, CI, backend linting, formatter.
  - Roadmap items: cloud storage (S3/R2), multiple face matches per search, email/SMS share delivery, admin dashboard.
- Files created/modified:
  - Created: `backend/src/controllers/importDrive.ts`
  - Modified: `backend/src/routes/event.routes.ts`, `backend/src/config/env.ts`, `backend/.env.example`, `frontend/src/services/event.service.ts`, `frontend/src/pages/UploadPhotos.tsx`, `README.md`

## 2026-09-11 - Buffy (Freebuff)

- Done:
  - **Fix 1 — Cascade cleanup on event deletion**: `DELETE /events/:eventId` now runs a Prisma transaction (embeddings → images → event) and deletes on-disk files after commit. Shared helpers `deleteFaceEmbeddingsForImages()` and `deleteFilesFromDisk()` extracted and reused by `deleteImage`.
  - **Fix 2 — `isPublic` default to `false`**: Schema changed from `@default(true)` to `@default(false)`. Migration applied. Events are now private by default; photographers must toggle visibility to share. README already said "Private by Default" — now the code matches.
  - **Fix 3 — Remove duplicate ML inference in face search**: Extracted `extractSingleFaceDescriptor()` helper that runs ONE forward pass (`detectAllFaces().withFaceLandmarks().withFaceDescriptors()`). Both `searchFaces` and `searchFacesPublic` now use it. Zero-face and multi-face cases both return 400.
  - **Fix 4 — Standardized API response envelope**: Created `backend/src/utils/response.ts` with `sendSuccess(res, data, message?)` and `sendError(res, statusCode, message, code?)`. All backend endpoints now return `{ success, data, message? }` or `{ success, false, error: { message } }`. Frontend Axios interceptor unwraps the envelope automatically. All service files and pages updated.
  - **Fix 5 — `.env.example` and startup validation**: Created `backend/src/config/env.ts` with Zod schema validating `DATABASE_URL` (required), `JWT_SECRET` (≥32 chars), `PORT` (default 3000), `FRONTEND_URL` (default localhost:5173), `NODE_ENV` (optional). Validation runs at the top of `server.ts` before `loadModels()`. On failure, prints which vars are missing/invalid and exits. All raw `process.env.X` reads replaced with typed `env.X` imports. Created `backend/.env.example`.
- Why:
  - Day 1 stabilization pass: five specific defects undermining correctness and professionalism, addressed in order.
- Left to do:
  - Run `bench:upload` with server running to fill in upload baseline numbers.
  - Add labeled face fixtures to `benchmarks/fixtures/faces/` and run `bench:accuracy`.
  - Background/async face processing (BullMQ job queue).
  - pgvector HNSW/IVFFlat index on `FaceEmbedding.vector`.
  - Rate limiting/abuse protection on public selfie-search endpoint.
  - Automated tests, CI, backend linting, formatter.
  - Roadmap items: cloud storage (S3/R2), multiple face matches per search, email/SMS share delivery, admin dashboard.
- Files created/modified:
  - Created: `backend/src/utils/response.ts`, `backend/src/config/env.ts`, `backend/.env.example`, `backend/prisma/migrations/20260911000000_set_isPublic_default_false/migration.sql`
  - Modified: `backend/src/controllers/event.controllers.ts`, `backend/src/controllers/user.controllers.ts`, `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/db/db.ts`, `backend/src/middlewares/authMiddleware.ts`, `backend/src/middlewares/requestTimer.ts`, `backend/src/middlewares/inputValidation.ts`, `backend/prisma/schema.prisma`, `frontend/src/services/api.ts`, `frontend/src/services/auth.service.ts`, `frontend/src/services/event.service.ts`, `frontend/src/pages/PublicEvent.tsx`

## 2026-08-01 - Kilo

- Done:
  - Initial state capture at the start of the cross-agent context setup.
  - Repository inspected: git history available (18 commits, latest `9e36859` "Improve frontend UI"); no AGENTS.md, PROGRESS.md, or DECISIONS.md existed before this session.
  - Feature set present: JWT signup/login, event CRUD + cover photos + visibility toggle, bulk image upload with server-side face indexing (face-api.js, 128-D embeddings via pgvector), selfie face search (private + public share-token), public share gallery, image deletion, frontend UI pages (MyEvents, EventDetails, CreateEvent, UploadPhotos, FindMyPhotos, PublicEvent, auth pages).
  - Tooling detected: ESLint (frontend only), npm as package manager, TypeScript strict in both projects. No tests, no CI, no formatter, no backend linting.
- Why:
  - Capture an accurate baseline of the project state so future agents can continue work without re-deriving context.
- Left to do:
  - Background/async face processing (current upload handler blocks on sequential detection).
  - pgvector HNSW/IVFFlat index on `FaceEmbedding.vector`.
  - Event delete cleanup (cascade images/embeddings/files; schema has no `onDelete` cascade and deletes can 500 on FK constraints).
  - Resolve `isPublic` default vs README "private by default" contradiction (share endpoints require `isPublic: true`).
  - Add `.env.example` files (README references them but none exist).
  - Align CORS default (`http://localhost:5174`) with the README's `5173`/actual Vite port.
  - Rate limiting/abuse protection on public selfie-search endpoint.
  - Automated tests (none exist); backend linting/config.
  - Roadmap items from README: cloud storage (S3/R2), BullMQ job queue, multiple face matches per event per search, email/SMS share delivery, admin dashboard with analytics.
- Open questions:
  - Is `isPublic` defaulting to `true` intentional, or should events default to private?
  - Should tooling (CI, tests, formatter, backend ESLint) be added? None was introduced in this session.

## 2026-08-01 - Kilo

- Done:
  - Created `AGENTS.md` at repo root: project overview, tech stack, key architecture decisions, coding conventions, folder structure, error handling style, testing approach, known gotchas, and tooling detection (frontend-only ESLint; no tests/CI/formatting/commit tooling detected).
  - Created `PROGRESS.md` at repo root (this file) with an initial state entry and this session entry.
  - Created `DECISIONS.md` at repo root documenting only decisions observable in the repository plus the decision made this session.
  - Verified no pre-existing context files or CI/formatting configs before writing.
- Why:
  - Set up a lightweight cross-agent context system so agents in separate sessions/tools can seamlessly continue each other's work.
- Left to do:
  - None for this task. All three files created; no source code changed.
- Open questions:
  - Whether to add any of the missing tooling (tests, CI, formatter, backend lint). Not added per instructions; ask before introducing.

## 2026-08-21 - Buffy (Freebuff)

- Done:
  - **Request timing middleware** (`backend/src/middlewares/requestTimer.ts`): logs structured JSON lines `{ method, route, statusCode, durationMs, timestamp }` to `backend/logs/requests.log`. Wired as first middleware in `app.ts`.
  - **Seed script** (`backend/scripts/seed.ts`): generates synthetic 128-D face embeddings at controlled scale. Supports `--embeddings=N` (100/1000/10000/100000) and `--clean`. Idempotent via `__BENCH_*__` prefixed records. Batch inserts in 500-row chunks.
  - **Benchmark suite** (`backend/benchmarks/`):
    - `utils.ts`: percentile calculation (sorted internally), Markdown table output, warmup discard, environment preamble.
    - `bench-search.ts`: pgvector distance query latency. Direct DB mode (default) and `--via-http` mode (real auth flow). Discards first 5 warm-up iterations.
    - `bench-upload.ts`: end-to-end image upload latency via HTTP (server required). Tests batch sizes 1/10/50. Upserts bench user to avoid junk accumulation.
    - `bench-accuracy.ts`: threshold sweep (0.3-0.7) computing precision/recall/F1 for L2 and cosine distance. Requires manual face fixture dataset in `fixtures/faces/<person>/*.jpg`.
  - **METRICS.md**: baseline template with search latency numbers filled in.
  - **npm scripts added**: `seed`, `seed:clean`, `bench:search`, `bench:upload`, `bench:accuracy`.
  - **Gitignore**: `backend/logs/` added.
- Baseline numbers captured:
  - Search p50 (direct DB, 1K embeddings): **0.98ms**
  - Search p95: **1.11ms**
  - Search p99: **1.42ms**
  - Upload benchmarks: pending (need server running)
- Why:
  - Need baseline measurement infrastructure before optimizing known bottlenecks (sequential processing, missing HNSW index, redundant ML passes, untuned threshold).
- Left to do:
  - Run `bench:upload` with server running to fill in upload baseline numbers.
  - Add labeled face fixtures to `benchmarks/fixtures/faces/` and run `bench:accuracy`.
  - All the optimization items from the original Kilo entry (HNSW index, background job queue, cascade deletes, etc.) — now measurable before/after.
- Files created/modified:
  - Created: `backend/src/middlewares/requestTimer.ts`, `backend/scripts/seed.ts`, `backend/benchmarks/utils.ts`, `backend/benchmarks/bench-search.ts`, `backend/benchmarks/bench-upload.ts`, `backend/benchmarks/bench-accuracy.ts`, `backend/benchmarks/fixtures/README.md`, `backend/benchmarks/fixtures/test-upload.jpg`, `METRICS.md`, `backend/logs/` (dir)
  - Modified: `backend/src/app.ts`, `backend/package.json`, `backend/.gitignore`
