# SpotMe — multi-stage build: frontend + backend → ONE runtime image.
# Debian slim (glibc) is required: @tensorflow/tfjs-node ships glibc binaries
# and node-canvas prebuilds target glibc — Alpine/musl will NOT work.

# ---------- Stage 1: frontend build ----------
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# VITE_API_URL is deliberately NOT set here: the production build then uses a
# relative API base URL (same origin as the Express server that serves it).
RUN npm run build

# ---------- Stage 2: backend build ----------
FROM node:22-slim AS backend-build
WORKDIR /app/backend

# Native toolchain: @tensorflow/tfjs-node compiles its N-API addon during
# `npm ci`; the cairo/pango headers are the build-from-source fallback for
# node-canvas if no prebuilt binary matches this platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ ./

# Regenerate the Prisma client from schema.prisma — the same thing CI does —
# so the image can never ship a client that disagrees with the schema. (The
# client is ALSO committed at src/generated as an offline/historical fallback;
# the standing decision is "always regenerate at build and test time".)
RUN npx prisma generate

# Type-check + emit dist/.
RUN npx tsc

# Production dependencies only. `prisma` (migrate deploy) and `tsx` (seed
# scripts) live in "dependencies" precisely because they run at runtime.
RUN npm prune --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:22-slim AS runtime

# gosu: drop root after volume/migration setup.
# lib* + fontconfig: runtime libs for node-canvas prebuilt binaries.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu openssl \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app/backend

COPY --from=backend-build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /app/backend/dist ./dist
COPY --from=backend-build --chown=node:node /app/backend/src ./src
COPY --from=backend-build --chown=node:node /app/backend/scripts ./scripts
COPY --from=backend-build --chown=node:node /app/backend/prisma ./prisma
COPY --from=backend-build --chown=node:node /app/backend/models ./models
COPY --from=backend-build --chown=node:node /app/backend/package.json ./package.json
COPY --from=backend-build --chown=node:node /app/backend/tsconfig.json ./tsconfig.json
# Prisma 7 requires this for ALL CLI commands (migrate deploy resolves the
# datasource URL from it, not from schema.prisma) — don't forget it.
COPY --from=backend-build --chown=node:node /app/backend/prisma.config.ts ./prisma.config.ts
COPY --from=frontend-build --chown=node:node /app/frontend/dist /app/frontend/dist

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/backend/uploads /app/backend/logs \
    && chown -R node:node /app/backend/uploads /app/backend/logs

# Build-time proof that native deps actually load in the FINAL image
# (catches missing shared libraries before a deploy, not after).
RUN node -e "require('@tensorflow/tfjs-node'); require('canvas'); console.log('native deps OK')"

EXPOSE 3000

# Waits for start_period because loading the TF models is slow on first boot.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
