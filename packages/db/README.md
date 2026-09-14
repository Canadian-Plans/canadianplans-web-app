# @canadian-plans/db

Drizzle schema, checked-in SQL migrations, RLS policies, and the
`withTenantTx` helper (all added in T4 — the database foundation task).

**This package is imported ONLY by `apps/backend`.** No other business app
may import it or hold a database credential — enforced by the
`no-restricted-imports` boundary rule in the root `eslint.config.js`. The
only other allowed importers are this package's own source, `jobs/`
(cron handlers invoked by the backend), and explicitly allowlisted offline
migration/backup/restore tooling under `scripts/` (PLATFORM_CONTEXT.md §4
invariant 3, §10).

## Single responsibility

Be the single source of truth for persistence types (DB row shapes) and own
the runtime Postgres connection, migrations, and tenant-isolation helpers.

## Must never import

- `@canadian-plans/contracts`, `@canadian-plans/ui` — this package is
  strictly server-side and knows nothing about API response shaping.
- Any app (`apps/*`).
- The Supabase service-role key. The backend connects via the pooled
  Postgres runtime role with RLS; never a service-role client
  (PLATFORM_CONTEXT.md §4 invariant 13).
