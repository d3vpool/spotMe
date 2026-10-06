# Deploying SpotMe

One recommended path, copy-pasteable end to end.

**Why Fly.io:** it deploys straight from this repo's Dockerfile and its
`[[mounts]]` volume config maps directly onto the app's local-disk upload
directory — which this app requires (no object-storage backend), and where
Railway needs more configuration to get a persistent disk right.

## What gets deployed

```
Fly app (ONE container — see "Why one container" below)
 ├─ entrypoint: wait for Postgres → prisma migrate deploy →
 │              start API (node dist/server.js) + worker (node dist/worker.js)
 │              (if either dies, the container exits and Fly restarts it)
 ├─ volume mounted at /app/backend/uploads   ← image files live HERE
 │
Neon Postgres (managed, pgvector extension)
Upstash Redis   (managed, BullMQ queue backend)
```

**Why one container:** uploads are stored on local disk and both the API and
the worker touch those files. Splitting them across machines would require
shared storage (S3 etc.), which is deliberately out of scope. This is a
demo-deployment tradeoff, not a recommendation for production scale — see
README → Known Limitations.

**Resources (honest sizing — PEAKS MEASURED 2026-09-23, see `METRICS.md` →
Scale):** in the built container (Docker compose, Node v22, models resident):
API peak **381 MB RSS** (`/proc` VmHWM after boot + a 7.4s in-container selfie
search), worker peak **371 MB RSS** (VmHWM while indexing a 12-photo batch at
concurrency 2); idle was 255/152 MB. Worst-case sum ≈ **752 MB**; `fly.toml`
ships a 2 GB shared VM = 2.7× measured peak. Caveat: measured with the pure-JS
tfjs backend — `@tensorflow/tfjs-node` is installed but **never imported**
(audit finding); wiring it in changes the memory profile, so re-measure. The
smallest free tiers (256–512 MB)
will likely OOM the first time a search runs during an upload. `fly.toml`
ships configured for a 2 GB shared VM. A demo that idles to zero
(`auto_stop_machines`) plus Neon/Upstash free tiers should land in the low
single-digit dollars per month — but budget a few dollars/month, don't
assume free.

---

## Step 0 — Prerequisites

```bash
# flyctl installed and logged in
brew install flyctl && flyctl auth login        # or see https://fly.io/docs/flyctl/install/

# a repo clone
git clone https://github.com/d3vpool/grabPic.git && cd grabPic
```

Edit `fly.toml`: set `app` to a globally-unique name and `primary_region`
to a region near you.

## Step 1 — Managed Postgres with pgvector: Neon

1. Create a free project at <https://neon.tech>.
2. In the Neon SQL editor, run (migrations also do this automatically, but
   run it once to confirm your role can):

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. Copy the **pooled connection string** (looks like
   `postgres://user:pass@ep-xxx.pooler.neon.tech/neondb?sslmode=require`).

## Step 2 — Managed Redis: Upstash

1. Create a free/low-tier Redis database at <https://upstash.com>.
   - BullMQ polls Redis even when idle, which burns per-request quota on
     Upstash's pay-as-you-go plan — their own docs recommend a **Fixed
     plan** for BullMQ workloads. A couple of dollars/month.
2. Copy the `rediss://...` connection URL.

(Alternative: a tiny `redis:7` Fly app with a volume works too and avoids
per-command billing — Upstash is recommended only because it's zero-ops.)

## Step 3 — Launch the app

```bash
flyctl launch --copy-config
#   - Dockerfile at repo root is detected automatically
#   - answer "No" to Postgres/Redis prompts — you already have Neon/Upstash
#   - do NOT deploy yet (we need secrets first) — decline if asked
```

Create the persistent uploads volume (region must match `primary_region`):

```bash
flyctl volumes create uploads --region <your-region> --size 1
```

`fly.toml` already maps it to `/app/backend/uploads`.

## Step 4 — Secrets

```bash
flyctl secrets set \
  DATABASE_URL="postgres://...pooler.neon.tech/neondb?sslmode=require" \
  REDIS_URL="rediss://default:...@...upstash.io:6379" \
  JWT_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" \
  FRONTEND_URL="https://<your-app>.fly.dev" \
  PUBLIC_URL="https://<your-app>.fly.dev" \
  GOOGLE_DRIVE_API_KEY="<your-drive-api-key>"
```

- `GOOGLE_DRIVE_API_KEY` is **required to boot** (Zod startup validation).
  You need a real one only if you'll use Drive import (Google Cloud Console
  → enable *Google Drive API* → create API key, restricted to Drive API);
  any non-empty value passes validation if you won't use the feature.
- Startup **fails fast** if `JWT_SECRET`/`DATABASE_URL` are missing, shorter
  than 32 chars, or still look like placeholders (`replace-with…`,
  `change-me`, `example`, …) when `NODE_ENV=production`. That gate is
  intentional — don't work around it with a fake secret.

## Step 5 — Deploy

```bash
flyctl deploy
```

On boot the container: waits for Postgres (up to 120 s) → runs
`prisma migrate deploy` (creates tables, pgvector extension, HNSW index) →
drops to the unprivileged `node` user → starts API + worker.

Verify:

```bash
curl https://<your-app>.fly.dev/health
# {"success":true,"data":{"status":"ok","database":"ok","redis":"ok"}}
```

Open `https://<your-app>.fly.dev` — the React SPA is served by the same
container (same origin, so no CORS setup is involved).

## Step 6 — Seed the demo account

```bash
flyctl ssh console -C "cd /app/backend && npx tsx scripts/seed-demo.ts"
```

Prints demo credentials + a public share URL (`/share/<uuid>`).

**Photos:** this script deliberately downloads nothing. Put photos into the
event by either:

- logging in as the demo user and uploading through the UI (files land on
  the volume), or
- pasting a **public** Google Drive folder link into *Import from Google
  Drive* (server downloads onto the volume), or
- copying a local dir in and running the seed with `--photos`:
  `flyctl ssh console -C "… seed-demo.ts --photos=/tmp/photos"` after
  placing files (only practical for a handful of files).

Only use photos you have the right to use — yours, or a source whose
license clearly permits it. Don't upload photos of people without consent.

## Step 7 — Post-deploy checklist

- [ ] `curl /health` returns `ok` for database + redis
- [ ] SPA loads at the root URL; deep link (`/share/<token>`) works
- [ ] Upload a photo → batch progresses to `completed` (worker alive)
- [ ] Selfie search returns results (end-to-end ML path works in-container)
- [ ] Paste the real live URL into README's demo-link placeholder
- [ ] Record the demo GIF into README's `<!-- TODO: demo GIF -->` slot

## CI note

`.github/workflows/ci.yml` runs lint + tests + frontend build + a
**build-only** Docker image build (no push) on every push/PR to `main`.
Nothing is ever pushed to a registry from CI.

## Local one-command equivalent

```bash
docker compose up --build      # app + Postgres + Redis, seeded volume for uploads
# demo seed:
docker compose cp ./my-photos app:/tmp/photos
docker compose exec -w /app/backend app npx tsx scripts/seed-demo.ts --photos=/tmp/photos
```

See README → Quick Start for the split dev workflow (compose for infra only,
`npm run dev` / `npm run worker` on the host).
