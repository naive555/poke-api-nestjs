<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

<p align="center">
  Backend service built with <strong>NestJS</strong>, <strong>Fastify</strong>, and <strong>Bun</strong>, focused on high‑performance data fetching and background processing.
</p>

---

## Overview

This project is a NestJS backend application migrated to:

- **Bun** for dependency management and runtime
- **Fastify** as the HTTP adapter for better performance
- **BullMQ** for background jobs and queue processing

Primary use case:

- Fetch Pokémon data from external APIs
- Process and persist data asynchronously into a database
- Support containerized and Kubernetes‑ready deployment

(Yes, it’s fast. Bun makes `npm install` feel like cheating.)

---

## Tech Stack

- **Runtime**: Bun
- **Framework**: NestJS
- **HTTP Adapter**: Fastify
- **Queue**: BullMQ + Redis
- **Database**: TypeORM (configurable)
- **Cache**: Cache Manager
- **Logging**: Pino (`nestjs-pino`)
- **Containerization**: Docker (K8s‑ready)

---

## Requirements

- Bun `>= 1.x`
- Node.js `>= 18` (for tooling compatibility)
- Redis (for BullMQ)
- Docker (optional, recommended)

---

## Project Setup

Install dependencies using Bun:

```bash
bun install
```

Environment files resolution order:

```
.env.docker  (if ENV=docker)
.env.local
.env
```

---

## Running the Application

### Development

```bash
bun run start:dev
```

### Production

```bash
bun run build
bun run start:prod
```

Fastify will be used automatically as the HTTP adapter.

---

## Logging

Logs are written by **Pino** through `nestjs-pino`, which also replaces the Nest
logger, so framework and application lines share one JSON stream.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOG_LEVEL` | `info` in production, `silent` in test, `debug` otherwise | Lowest level written |
| `LOG_PRETTY` | on outside production | Human‑readable output via `pino-pretty` |

Each request produces **one** line, written when the response ends and carrying
the route, status, duration, `handler`, `userId` and the request id. Failures
with a 5xx status add the error, its stack and its `cause` chain to that same
line, so nothing is logged twice.

Every request gets an id: an inbound `x-request-id` is reused, otherwise a UUID
is generated. It tags every line produced while handling the request and is
returned in the `x-request-id` response header.

Authorization and cookie headers, and any `password` or `accessToken` field, are
replaced with `[REDACTED]`.

---

## Background Jobs (BullMQ)

Pokémon detail fetching is handled asynchronously using BullMQ.

### Queue Flow

1. Producer enqueues Pokémon names
2. Consumer fetches Pokémon details
3. Data is saved into the database
4. Concurrency is controlled to avoid overload

Redis must be running:

```bash
docker run -p 6379:6379 redis:7
```

---

## Docker Support

Build image:

```bash
docker build -t pokemon-service .
```

Run container:

```bash
docker run -p 3000:3000 pokemon-service
```

Works seamlessly with Docker Desktop and is Kubernetes‑ready.

---

## Kubernetes (Optional)

The application is designed to run in Kubernetes:

- Stateless API pods
- Redis as external or in‑cluster service
- Horizontal scaling supported

Sample manifests can be added later under `/k8s`.

---

## Testing

```bash
bun run test
bun run test:e2e
bun run test:cov
```

---

## Scripts

```bash
bun run start:dev   # development
bun run start:prod  # production
bun run lint
bun run test
```

---

## Notes

- Bun + Fastify significantly reduces startup time
- BullMQ prevents API overload during mass fetch jobs
- Concurrency limits are enforced at both queue and worker level

In short: fast startup, controlled load, fewer regrets.

---

## License

MIT License
