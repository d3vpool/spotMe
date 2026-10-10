# AGENTS.md

## Before Making Changes

- Read PROGRESS.md.
- Run git log --oneline -10.
- Search for existing implementations before creating new ones.
- Prefer extending existing patterns over introducing new ones.
- If architecture is unclear, state "Not yet determined" instead of assuming.

## Project Overview

SpotMe is an AI-powered event photo platform: photographers create event galleries and bulk-upload photos, and guests use a share link to upload a selfie and instantly find every photo they appear in — no guest account required. Uploaded photos are processed with face-api.js to extract 128-D face embeddings stored in PostgreSQL via pgvector, and a selfie search runs a pgvector distance query to return matched photos with face bounding boxes. The project is in active development (started March 2026) and consists of a Node.js/Express backend and a React frontend in a single repository.

## Tech Stack

Backend (`backend/`):
- Node.js ≥ 20, TypeScript 5 (strict), ESM (`"type": "module"`, `nodenext` module resolution)
- Express 5, Multer (file uploads)
- Prisma 7 with `@prisma/adapter-pg` (generated client committed at `backend/src/generated/prisma`), PostgreSQL + pgvector
- face-api.js + @tensorflow/tfjs-node + node-canvas; ML weights bundled in `backend/models/`
- JWT (jsonwebtoken) + bcrypt auth, Zod validation (auth routes), dotenv

Frontend (`frontend/`):
- React 19 + TypeScript, Vite 7, React Router 7
- Tailwind CSS v4, Axios, Lucide icons
- Path aliases `@components`, `@pages`, `@services`, `@utils`, `@config`, `@hooks`, `@types`, `@layouts` (configured in `vite.config.ts` and `tsconfig.app.json`)

Package manager: npm (lockfiles in both `backend/` and `frontend/`).

## Key Architecture Decisions

See DECISIONS.md for full records. Observable from the repository:

- Face embeddings are stored in the same PostgreSQL database via the pgvector extension; Prisma cannot type `vector(128)` (schema uses `Unsupported("vector(128)")`), so all vector writes/searches use raw SQL (`prisma.$executeRaw` / `$queryRaw`).
- Face detection runs server-side with face-api.js + node-canvas, using models bundled in `backend/models/`; models load once at server startup.
- Guests access galleries without an account via unique share tokens on unauthenticated routes; private routes are protected by a JWT middleware.
- Uploaded files are stored on local disk (`uploads/`) and served statically at `/uploads`; the DB stores absolute URLs built from the request host.
- Request-body validation uses a Zod middleware factory, currently applied only to the auth routes.

## Coding Conventions

- Backend is ESM; relative imports use the `.js` extension (e.g. `from "./db/db.js"`).
- Frontend uses `@alias` imports for cross-folder imports (see aliases above).
- TypeScript `strict` mode enabled in both projects.
- Express route handlers stay thin; business logic lives in `backend/src/controllers/`, shared ML logic in `backend/src/services/`.
- Response envelopes are inconsistent across endpoints — many return `{ message, ... }` or bare objects; do not assume a shared envelope.
- Backend endpoints validate event ownership by querying `event.createdBy === res.locals.userId` before acting.
- Commit messages are a single line. Never add Co-Authored-By or any other attribution trailer.

## Folder Structure Overview

```
spotMe/
├── backend/
│   ├── models/            # face-api.js model weights (ssd_mobilenetv1, face_landmark_68, face_recognition)
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── controllers/   # user & event controllers
│   │   ├── db/            # Prisma client singleton
│   │   ├── generated/prisma/  # committed Prisma-generated client
│   │   ├── middlewares/   # auth, upload, zod validation
│   │   ├── routes/        # Express routers (user.routes, event.routes)
│   │   ├── services/      # face.service.ts (model loading + detection)
│   │   └── app.ts, server.ts
│   └── uploads/           # uploaded images (gitignored? see gotchas)
└── frontend/
    └── src/
        ├── components/    # layout/ and ui/ components
        ├── contexts/      # ToastContext
        ├── mock/          # axios-mock-adapter dev mock (imported only in main.tsx)
        ├── pages/         # all route pages
        ├── services/      # Axios API service layer
        ├── types/, utils/, config/
        └── App.tsx, main.tsx
```

## Error Handling

- Centralized Express error middleware in `backend/src/app.ts`: handles Multer errors and the "Only image files are allowed" case explicitly; everything else returns a generic 500 `{ message: "Something went wrong" }`.
- Controllers use try/catch and return `{ message }` with 4xx/5xx statuses; Zod validation failures return the raw `response.error`.
- Logging is `console.error`/`console.log` only — no logging framework.

## Testing Approach

- No automated tests exist. The backend `test` script is a stub (`echo "Error: no test specified"`); the frontend has no test script.
- Verification is manual: run `npm run dev` in `backend/` and `frontend/` and exercise endpoints/UI.

## Known Gotchas / Things to Avoid

- `event.isPublic` defaults to `true` in the schema, but README claims "private by default"; share-token gallery/search endpoints require `isPublic: true`, so toggling an event private makes its share link unusable.
- Deleting an event does not clean up its images, face embeddings, or files on disk and can fail on FK constraints (no `onDelete` cascade in the schema).
- `JWT_SECRET`/`DATABASE_URL` are read from env with no startup validation; `.env` files are gitignored and no `.env.example` exists despite README referencing one.
- Backend CORS default origin is `http://localhost:5174` while README documents `5173`; set `FRONTEND_URL` to match the actual Vite port.
- Face indexing runs synchronously, sequentially per image, inside the upload request handler — large batches block and are slow.
- The `FaceEmbedding.vector` column has no pgvector index (no HNSW/IVFFlat); search performance at scale is unaddressed.
- ML models load at server startup; the server refuses to start if loading fails.
- `backend/src/generated/prisma/` is committed — regenerate with Prisma whenever the schema changes.
- Face search runs `detectAllFaces` and then `detectSingleFace` again (double ML work); distance threshold is hardcoded to `0.5`.

## Tooling Detected

- Linting: ESLint configured for the frontend only (`frontend/eslint.config.js`; `npm run lint` in `frontend/`). No ESLint config or lint script in `backend/`.
- Formatting: none detected (no Prettier or equivalent).
- Testing: none detected.
- CI/CD: none detected (no `.github/` or workflow files).
- Commit conventions: none enforced; recent history uses conventional prefixes (e.g. `feat:`, `fix:`, `chore:`) as a de facto style.
- Contribution guidelines: none detected.

No new tooling was added as part of setting up this context system. Ask the user before introducing any.
