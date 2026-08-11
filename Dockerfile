# Base image pinned by digest so every rebuild starts from the same bits.
# This is oven/bun:1.3-alpine. Refresh with:
#   docker buildx imagetools inspect oven/bun:1.3-alpine
ARG BUN_IMAGE=oven/bun@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0

# --- Stage 1: Build ---
FROM ${BUN_IMAGE} AS builder

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# --- Stage 2: Run ---
FROM ${BUN_IMAGE} AS runner

WORKDIR /app

# The lockfile has to travel with package.json, otherwise --frozen-lockfile has
# nothing to freeze against and the runtime tree can drift from the built one.
COPY --from=builder --chown=bun:bun /app/dist ./dist
COPY --from=builder --chown=bun:bun /app/package.json /app/bun.lock ./

RUN chown bun:bun /app

# oven/bun ships an unprivileged `bun` user (uid 1000); everything past this
# point, including the install, runs without root.
USER bun

RUN bun install --frozen-lockfile --production

EXPOSE 3001

# start-period covers the slow first boot: migrations plus the catalogue
# warm-up. Failures during that window do not count against the retries.
HEALTHCHECK --interval=15s --timeout=3s --start-period=90s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3001}/api/health" > /dev/null || exit 1

CMD ["bun", "run", "start:prod"]
