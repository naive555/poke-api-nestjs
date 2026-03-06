# --- Stage 1: Build ---
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# --- Stage 2: Run ---
FROM oven/bun:1.3-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN bun install --frozen-lockfile --production

EXPOSE 3001

CMD ["bun", "run", "start:prod"]