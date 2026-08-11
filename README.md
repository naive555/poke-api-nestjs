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
- **Bull** for background jobs and queue processing

Primary use case:

- Fetch Pokémon data from PokeAPI
- Process and persist data asynchronously into Postgres
- Support containerized deployment

(Yes, it’s fast. Bun makes `npm install` feel like cheating.)

---

## Tech Stack

- **Runtime**: Bun
- **Framework**: NestJS
- **HTTP Adapter**: Fastify
- **Queue**: Bull (`@nestjs/bull`) + Redis
- **Database**: Postgres via TypeORM, schema managed by migrations
- **Cache**: Cache Manager + Redis
- **Logging**: Pino (`nestjs-pino`)
- **Containerization**: Docker + Compose

---

## Requirements

- Bun `>= 1.3`
- Postgres `>= 16`
- Redis `>= 8`
- Docker (recommended — the Compose stack provides Postgres and Redis)

Postgres specifically: entities use `jsonb` columns and a UUID primary key
backed by the `uuid-ossp` extension.

---

## Quick Start

```bash
bun install
cp .env.example .env        # then fill in real local values

docker compose up -d        # Postgres + Redis + the app
```

The app is on <http://localhost:3001/api>, Swagger on
<http://localhost:3001/api/docs>.

To run the app on the host instead, with only its dependencies in Docker:

```bash
docker compose up -d psql redis
bun run start:dev
```

**First boot takes a minute.** The app applies migrations, then warms its
Pokémon catalogue from PokeAPI in the background. The API serves traffic
immediately — the catalogue fills in as it goes.

---

## Configuration

Environment files are resolved in this order:

```
.env.docker  (only when NODE_ENV=docker)
.env.local
.env
```

`.env.example` is the documented template and the only env file in git; every
other `.env*` is ignored. In production, values come from the platform's secret
store rather than a file — see the
[deployment runbook](docs/deployment-runbook.md).

Required variables are validated at startup (`src/config/env.validation.ts`). A
missing or malformed one fails the boot with a single readable error rather than
a driver-level failure later:

```
Invalid environment configuration:
  - DATABASE_HOST: DATABASE_HOST should not be empty, DATABASE_HOST must be a string
  - APP_JWT_SECRET: APP_JWT_SECRET must be longer than or equal to 16 characters
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

Fastify is used automatically as the HTTP adapter.

---

## Database and Migrations

The schema is owned by migrations in `src/database/migrations/`.
`DATABASE_SYNCHRONIZE` stays `false` everywhere, including local development —
it rewrites live tables to match entities and can drop columns and their data.

```bash
bun run migration:generate src/database/migrations/DescribeTheChange
bun run migration:run
bun run migration:revert
```

`DATABASE_MIGRATIONS_RUN=true` applies pending migrations on boot, which is fine
for local and single-container use. In production, migrations run as a separate
step so replicas cannot race each other — see the
[deployment runbook](docs/deployment-runbook.md).

---

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe, used by the container healthcheck |
| `GET` | `/api/docs` | Swagger UI |
| `POST` | `/api/auth/register` | |
| `POST` | `/api/auth/login` | Returns a JWT |
| `POST` | `/api/auth/logout` | Requires bearer token |
| `GET` | `/api/user`, `/api/user/:id` | |
| `POST` `PUT` `DELETE` | `/api/user`, `/api/user/:id` | |
| `GET` | `/api/pokemon/random` | |
| `GET` | `/api/pokemon/:name` | |
| `GET` | `/api/pokemon/:name/ability` | |

---

## Logging

Logs are written by **Pino** through `nestjs-pino`, which also replaces the Nest
logger, so framework and application lines share one JSON stream.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOG_LEVEL` | `info` in production, `silent` in test, `debug` otherwise | Lowest level written |
| `LOG_PRETTY` | on outside production | Human‑readable output via `pino-pretty` |

`pino-pretty` is a devDependency and is deliberately absent from the production
image, so production must emit JSON. Setting `LOG_PRETTY=true` there fails at
startup with `unable to determine transport target for "pino-pretty"`.

Each request produces **one** line, written when the response ends and carrying
the route, status, duration, `handler`, `userId` and the request id. Failures
with a 5xx status add the error, its stack and its `cause` chain to that same
line, so nothing is logged twice. `/api/docs` and `/api/health` are not logged —
healthcheck polling would otherwise bury real traffic.

Every request gets an id: an inbound `x-request-id` is reused, otherwise a UUID
is generated. It tags every line produced while handling the request and is
returned in the `x-request-id` response header.

Authorization, cookie and `set-cookie` headers, and any `password` or
`accessToken` field at any nesting depth, are replaced with `[REDACTED]`.

---

## Background Jobs

Pokémon detail fetching is handled asynchronously through a Bull queue backed by
Redis.

### Queue flow

1. The catalogue warm-up fetches the full Pokémon name list from PokeAPI
2. Names are chunked and enqueued, one job per chunk of 100
3. The consumer fetches each Pokémon's detail and upserts it
4. Results are cached in Redis

The warm-up runs on module init but is **not** awaited, so a slow or unreachable
PokeAPI cannot delay or block startup; failures are logged and the first request
retries the same work. Chunk jobs carry a deterministic job id, so replicas
starting together against an empty database enqueue the batch once.

Throughput is bounded by Bull's default concurrency of one job at a time per
worker, with names fetched sequentially inside a job. There is no explicit rate
limiter — if you need one, configure Bull's `limiter` on the queue.

---

## Docker

The local stack:

```bash
docker compose up -d          # app on :3001, Postgres on :5432, Redis on :6379
docker compose logs -f app
docker compose down           # add -v to also drop the database volume
```

The image is a two-stage Bun build. The runtime stage pins its base by digest,
runs as the unprivileged `bun` user, and carries a `HEALTHCHECK` against
`/api/health` with a start period long enough to cover migrations and the
catalogue warm-up.

`docker-compose.yml` is the **local** stack and publishes Postgres and Redis to
the host. `docker-compose.prod.yml` is a separate production stack that keeps
them on the internal network only, takes all secrets from the environment, and
runs migrations as a one-shot service before the app starts.

---

## Deployment

See the **[deployment runbook](docs/deployment-runbook.md)** for the
build → migrate → start sequence, rollback, and troubleshooting.

---

## Kubernetes

Nothing here is Kubernetes-specific yet, but the pieces a deployment needs are in
place: the app is stateless, `/api/health` works as a liveness probe, and
migrations run as a separate step that maps cleanly onto an init container or a
pre-install job. Manifests could live under `/k8s`.

---

## Testing

```bash
bun run test
bun run test:e2e
bun run test:cov
```

Controllers and services are unit tested with their dependencies replaced by
`useValue` doubles, so the suite needs neither Postgres nor Redis running.

---

## Scripts

```bash
bun run start:dev          # development
bun run start:prod         # production
bun run build
bun run lint
bun run test

bun run migration:generate <path>   # diff entities against the database
bun run migration:run
bun run migration:revert
```

The `:prod` migration variants (`migration:run:prod`, `migration:revert:prod`,
`migration:show:prod`) read the compiled data source from `dist/`, for use inside
the production image.

---

## Notes

- Bun + Fastify significantly reduces startup time
- Nothing at boot waits on a third party, so PokeAPI being down never stops the
  app from serving
- The schema is owned by migrations, never by `synchronize`

In short: fast startup, no surprise schema rewrites, fewer regrets.

---

## License

MIT License
