# Deployment Runbook

Operational guide for deploying **poke-api**. Covers the deploy sequence, rollback,
the migration workflow, and the failure modes that have actually bitten us.

Audience: whoever is pushing the deploy button. Assumes Docker and network access
to the registry and the database.

---

## 1. Before you deploy

### Prerequisites

- Docker with Compose v2 (`docker compose version`)
- Access to the container registry, if `APP_IMAGE` points at a remote one
- The database reachable from wherever you run the migrate step

### Secrets

Production reads **every** value from the environment. There is no `.env` file in
the production image — `.dockerignore` excludes env files from the build context,
and `docker-compose.prod.yml` declares no `env_file`.

Inject these from your platform's secret store:

| Variable | Notes |
| --- | --- |
| `APP_JWT_SECRET` | 32+ bytes. Generate with `openssl rand -base64 32` |
| `APP_JWT_AUD` | Expected audience claim |
| `DATABASE_USER` | |
| `DATABASE_PASSWORD` | |
| `DATABASE_DB` | |

Missing any of these does not start a broken app — Compose refuses to render the
config at all:

```
error while interpolating services.psql.environment.POSTGRES_DB:
required variable DATABASE_DB is missing a value: DATABASE_DB is required
```

Optional, with defaults in `docker-compose.prod.yml`: `DATABASE_HOST`,
`DATABASE_PORT`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_USERNAME`,
`REDIS_PASSWORD`, `PORT`, `CORS`, `CORS_DOMAINS`, `APP_JWT_ISS`,
`APP_JWT_EXPIRES_IN`, `NAME`, `VERSION`.

### Database privileges

On first connect, TypeORM issues:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
```

It backs the UUID primary key on `user`. A locked-down managed-Postgres role may
not be allowed to create extensions — pre-create it as a superuser, once per
database, before the first deploy.

---

## 2. Deploy

Build → migrate → start, in that order. Do not reorder: the app assumes the
schema is already current.

```bash
# 1. Build. Tag by commit so the migrate and app services run identical code.
export APP_IMAGE=poke-api:$(git rev-parse --short HEAD)
docker compose -f docker-compose.prod.yml build

# 2. Migrate. One-shot; must exit 0 before anything rolls out.
docker compose -f docker-compose.prod.yml run --rm migrate

# 3. Start.
docker compose -f docker-compose.prod.yml up -d app
```

Always pass `-f docker-compose.prod.yml` explicitly. `docker-compose.yml` is the
**local dev** stack — it publishes Postgres and Redis to the host, which
production must not do. Both files share the project name `poke-api`, so do not
run them on the same host.

### Why migrations are a separate step

`DATABASE_MIGRATIONS_RUN` is `false` for the app in production. With multiple
replicas, boot-time migration is a race: every replica reads "0 migrations
applied", every replica issues `CREATE TABLE`, and the losers crash with
`relation already exists` — a failed rollout caused purely by concurrency.

The `migrate` service runs to completion first, and `app` waits on
`condition: service_completed_successfully`. A failed migration exits non-zero
and the new app version never starts, leaving the old one serving.

Single-container and local setups keep `DATABASE_MIGRATIONS_RUN=true`, where the
race cannot happen.

---

## 3. Verify

```bash
docker compose -f docker-compose.prod.yml ps          # app should reach (healthy)
curl -fsS localhost:${PORT:-3001}/api/health          # {"status":"ok",...}
curl -fsS localhost:${PORT:-3001}/api/pokemon/random  # {"name":"..."}
```

**First boot is slow, on purpose.** The container healthcheck has a 90s
`start-period` covering migrations and the initial catalogue warm-up. Failures
inside that window do not count against the retry budget.

The warm-up fetches the full PokeAPI catalogue and enqueues detail jobs in the
background. It is deliberately **not** awaited during bootstrap — PokeAPI being
slow or down cannot prevent the app from starting and serving traffic. Expect
`/api/pokemon/random` to work immediately and the `pokemon` table to fill in over
the following minute or two.

Confirm the seed is progressing:

```bash
docker compose -f docker-compose.prod.yml exec psql \
  psql -U "$DATABASE_USER" -d "$DATABASE_DB" -c 'select count(*) from pokemon;'
```

---

## 4. Rollback

**Application** — redeploy the previous image:

```bash
export APP_IMAGE=poke-api:<previous-sha>
docker compose -f docker-compose.prod.yml up -d app
```

**Schema** — separate and manual. One migration per invocation:

```bash
# What is currently applied? [X] = applied, [ ] = pending
docker compose -f docker-compose.prod.yml run --rm migrate bun run migration:show:prod

docker compose -f docker-compose.prod.yml run --rm migrate bun run migration:revert:prod
```

Roll the app back *before* the schema. A migration's `down()` is only as good as
whoever wrote it — review it before running, and take a backup first if the
migration dropped or rewrote anything.

---

## 5. Migration workflow

Migrations live in `src/database/migrations/` and are applied in filename
(timestamp) order. The `migrations` table records what has run.

```bash
# After changing an entity — diffs entities against the live schema
bun run migration:generate src/database/migrations/DescribeTheChange

bun run migration:run       # apply (local, from source)
bun run migration:revert    # undo the most recent one
```

The `:prod` variants (`migration:run:prod`, `migration:revert:prod`,
`migration:show:prod`) are identical but read the compiled data source from
`dist/`, since the production image ships no TypeScript sources.

Rules that keep this working:

- **Generate against a schema that is already up to date.** `migration:generate`
  diffs your entities against the database it connects to. Diff against a stale
  or hand-modified database and you get a migration full of noise.
- **`DATABASE_SYNCHRONIZE` stays `false` everywhere, including local dev.** It
  rewrites live tables to match entities and can drop columns and their data.
  Local schema drift also silently poisons the next generated diff.
- **Read every generated migration before committing it.** TypeORM emits raw SQL
  from a diff; it does not know which changes are destructive.
- Migrations run inside a transaction, so a mid-migration failure rolls back.

---

## 6. Troubleshooting

### `unable to determine transport target for "pino-pretty"`

The app is asking for pretty logs in an image that has no `pino-pretty` — it is a
devDependency and the runner installs with `--production`.

Fix: production must emit JSON. Ensure `NODE_ENV=production` (which turns pretty
off by default) or set `LOG_PRETTY=false`. Do not move `pino-pretty` into
`dependencies`.

### `relation "pokemon" does not exist`

The schema was never created in this database. Either the migrate step was
skipped, or it ran against a different database than the app.

Fix: run step 2 of the deploy, then confirm the app and migrate services resolve
`DATABASE_HOST`/`DATABASE_PORT`/`DATABASE_DB` identically.

### `Invalid environment configuration:` at startup

Config validation (`src/config/env.validation.ts`) rejected the environment
before the app booted. The message names each offending variable and why.

Note what this does **not** catch: a value that is well-formed but points
somewhere wrong. `DATABASE_PORT=3306` against Postgres is a valid port number, so
validation passes and you get a connection timeout or a protocol error instead.
When the app cannot reach a dependency, check the value is not merely valid but
correct.

### App container never becomes `healthy`

```bash
docker compose -f docker-compose.prod.yml logs app --tail 50
docker inspect poke_app --format '{{json .State.Health}}' | jq
```

The probe is `GET /api/health` — liveness only. It intentionally does not check
Postgres or Redis, so an unhealthy app means the process itself is not serving,
not that a dependency is briefly unavailable.

### Migrations hang

Another connection is likely holding a lock on a table being altered. Check for
long-running transactions:

```sql
select pid, state, query_start, left(query, 80)
from pg_stat_activity
where state <> 'idle' order by query_start;
```

---

## 7. Local development

For reference — this is `docker-compose.yml`, not the production path:

```bash
cp .env.example .env       # then fill in real local values
docker compose up -d       # publishes Postgres:5432 and Redis:6379 to the host
bun run start:dev
```

Local keeps `DATABASE_MIGRATIONS_RUN=true`, so the schema is applied on boot.
Never point a local stack at a production database.
