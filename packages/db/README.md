# @canadian-plans/db

**This package is imported ONLY by `apps/backend` among business applications.** The defining package can import itself. An exact-file allowlist for offline migration/backup/restore/database-test tooling is currently empty; neither `jobs/**` nor `scripts/**` receives blanket access.

## Single responsibility

Own the Drizzle persistence schema, checked-in migrations, row types, pooled runtime client and tenant transaction helper. The first migration creates the global workspace registry plus tenant-owned memberships, roles, role assignments, permissions, permission assignments, service credentials and audit events in the private `app` schema.

## Connections and migrations

The backend runtime uses `DATABASE_URL`, connected as the non-owner `app_runtime` role through Supavisor transaction mode. The Postgres.js client is module-scoped, capped at one connection per warm serverless instance, and always sets `prepare: false` because transaction mode does not support named prepared statements.

Migrations use the separate, privileged `MIGRATION_DATABASE_URL`; never point it at the runtime role. Apply checked-in migrations with:

```sh
pnpm --filter @canadian-plans/db db:migrate
```

Both connections require TLS by default. Local disposable PostgreSQL may set `DATABASE_SSL_MODE=disable` and `MIGRATION_DATABASE_SSL_MODE=disable`; deployed Supabase environments leave both at `require` (or omit them).

## Tenant transactions

Every runtime unit of work uses `withTenantTx({ workspaceId, actorId }, fn)`. It starts a transaction on the pooled client and calls `set_config(..., true)` for both `app.workspace_id` and `app.actor_id`; the `true` flag is PostgreSQL's parameter-safe equivalent of `SET LOCAL`.

Transaction-local settings are mandatory under transaction pooling. A session-level `SET` could remain on a physical connection and be inherited by an unrelated request when the pooler reuses that connection. `SET LOCAL` disappears automatically on commit or rollback. Policies also use `current_setting(..., true)` plus `nullif(..., '')`, so fresh sessions and reused connections with cleared custom settings both fail closed.

The Vitest integration suite runs only when `TEST_MIGRATION_DATABASE_URL` and `DB_TEST_ALLOW_DESTRUCTIVE=1` are both present. The URL must name a database ending in `_test`; never reuse `MIGRATION_DATABASE_URL`, because the suite changes the runtime-role password and writes fixtures. CI provides a disposable PostgreSQL service, applies the migration to an empty database first, then verifies missing/wrong context, composite tenant foreign keys, non-bypass runtime privileges, denied workspace enumeration, append-only audit privileges and pooled-connection context cleanup.

## Must never import

- Applications (`apps/*`).
- UI or API response contracts; persistence rows are not audience-specific responses.
- Supabase service-role credentials. Runtime connections use only the restricted pooled Postgres role.

The shared `canadian-plans/data-boundary` ESLint rule enforces static/dynamic/re-export/relative import boundaries. See `packages/config/README.md` for tooling policy and negative tests.
