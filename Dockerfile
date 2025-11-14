# --- Stage 1: Build ---
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install

COPY . .

# --- Stage 2: Run ---
FROM oven/bun:1.3-alpine AS runner

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3001

CMD ["bun", "run", "start"]
