#!/usr/bin/env bash
# SpotMe container entrypoint.
#
#   1. (as root)  fix uploads-volume ownership if the platform mounted it root-owned
#   2. (as root)  wait for Postgres, then `prisma migrate deploy`
#   3.           drop to the unprivileged `node` user (gosu) and supervise
#                 BOTH the API and the worker — if either process dies, this
#                 script exits non-zero so the platform restarts the container.
#
# SIGTERM/SIGINT are forwarded to both children; the worker (Day 2) and the
# server (Day 7) each shut down their in-flight work gracefully.
#
# Why one container: uploads live on local disk and both processes need the
# same files — splitting API/worker across services requires shared storage.
# This is a documented demo tradeoff (see DEPLOY.md / README Limitations).
set -euo pipefail

if [ "$(id -u)" = "0" ]; then
  # Some platforms (e.g. Fly.io volume mounts) attach volumes root-owned.
  if ! gosu node test -w /app/backend/uploads; then
    echo "[entrypoint] Fixing uploads volume ownership..."
    chown -R node:node /app/backend/uploads
  fi

  echo "[entrypoint] Waiting for Postgres..."
  node <<'PGWAIT'
const { Client } = require("pg");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (let i = 1; i <= 60; i++) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log("[entrypoint] Postgres is ready");
      process.exit(0);
    } catch {
      try { await client.end(); } catch { /* ignore */ }
      await sleep(2000);
    }
  }
  console.error("[entrypoint] Postgres did not become ready within 120s");
  process.exit(1);
})();
PGWAIT

  echo "[entrypoint] Running migrations (prisma migrate deploy)..."
  npx prisma migrate deploy

  # Re-exec this same script as the unprivileged node user.
  exec gosu node "$0"
fi

# ---------- runs as the unprivileged "node" user from here on ----------

# LOCAL COMPOSE ONLY convenience: generate an ephemeral JWT secret when none
# was provided (DEV_AUTO_GENERATE_SECRETS is set in docker-compose.yml and
# must never be set on a real deployment — see DEPLOY.md).
if [ -z "${JWT_SECRET:-}" ] && [ "${DEV_AUTO_GENERATE_SECRETS:-false}" = "true" ]; then
  JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  export JWT_SECRET
  echo "[entrypoint] Generated an ephemeral dev JWT_SECRET (existing sessions reset on container restart)."
fi

echo "[entrypoint] Starting API (node dist/server.js) + worker (node dist/worker.js)..."
node dist/server.js &
API_PID=$!
node dist/worker.js &
WORKER_PID=$!

shutdown() {
  echo "[entrypoint] Signal received — stopping API and worker..."
  kill -TERM "$API_PID" "$WORKER_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
  wait "$WORKER_PID" 2>/dev/null || true
  exit 0
}
trap shutdown TERM INT

# If EITHER supervised process dies, take the whole container down so the
# platform restarts it — no half-alive containers where only one of the two
# processes is running.
set +e
wait -n "$API_PID" "$WORKER_PID"
STATUS=$?
set -e
echo "[entrypoint] A supervised process exited (status ${STATUS}) — stopping container."
kill -TERM "$API_PID" "$WORKER_PID" 2>/dev/null || true
wait 2>/dev/null || true
if [ "$STATUS" -eq 0 ]; then
  exit 1
else
  exit "$STATUS"
fi
