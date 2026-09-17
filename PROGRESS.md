# PROGRESS.md

Cross-agent progress log. Read the latest entry first to pick up where work left off.

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
