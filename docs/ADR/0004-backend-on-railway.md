# 0004 — Backend compute on Railway; admin and site-1 stay on Vercel

Date: 17 September 2026
Status: accepted, except the residency decision, which is **PENDING OWNER DECISION**

## Context

`apps/backend` was written as a plain long-lived Express server
(`createApp().listen()`), but was squeezed through a Vercel function adapter plus
a catch-all rewrite. That host imposes two hard limits the backend had already
outgrown:

- `CatalogueSyncRunner` and `OutboxRunner` both default to a **120 second** run
  deadline, which exceeds Vercel function limits outright.
- Scheduled work needs a sub-daily cadence. A sub-daily `crons` expression fails
  the whole deployment on the Vercel Hobby plan; that failure took the backend
  deployment down once (commit `33c4811`). Lifting it requires Vercel Pro.

The consequence was a real, open gap: the T10B catalogue schedule (G30) could
never run on a hosted environment. This ADR records moving only the backend to
Railway so the server and its schedule run as designed. It **supersedes the
hosting part of [ADR 0001](0001-split-architecture.md)** — the monorepo,
workspace-package and database-ownership decisions there still stand.

The design decisions below (D1–D6) were settled before implementation; this ADR
records them, it does not re-open them.

## Decisions

**D1 — One Railway service, not a separate worker.** The cheapest shape that
works. The outbox already claims jobs under a database lease and catalogue sync
already serializes on `app.catalogue_sync_leases`, so a single service is
concurrency-safe. A dedicated worker is a later upgrade, not a launch
requirement (see the migration plan §19).

**D2 — In-process scheduler, not Railway cron.** Railway cron has a
**five-minute floor** with no minute-level precision guarantee. T15's outbox
needs a **60 second** cadence, so a Railway cron job would silently degrade the
outbox to five-minute (or worse) batches. The schedule therefore runs on timers
inside the service: outbox every 60s, catalogue sync every 300s, each with 0–5s
of jitter so replicas do not align, a ~10s post-boot delay so the health check
passes first, and an overlap guard that skips a tick while the previous run is
still in flight. The two runners' own 120s deadlines make skipping — never
queueing — the correct response.

**D3 — The scheduler calls the runner functions directly, not over HTTP.** The
scheduler resolves its identity exactly as the HTTP routes do — through the
server-only machine registry (`JOB_RUNNER_SELECTOR` / `CATALOGUE_SYNC_SELECTOR`,
verified with `CRON_SECRET`, requiring `outbox:run` / `reconcile:run`) — and uses
that entry's `actorId` and explicit `workspaceIds`. It never derives its
workspace set from a database scan. The `/api/internal/jobs/run` and
`/api/internal/catalogue/sync` routes are unchanged and remain the documented
manual invocation path; the scheduler just avoids a self-call and a second auth
hop.

**D4 — Dockerfile, not Railpack autodetect.** The workspace packages
(`@canadian-plans/*`) resolve to raw TypeScript source through their
`package.json` `exports`, so a deterministic root-context Docker build is safer
than a framework autodetect. The image ships the full pnpm install rather than a
pruned one because `postgres` is a dependency of `packages/db`, not
`apps/backend`; naive pruning breaks resolution.

**D5 — Railway region US West.** The Supabase project is in `us-west-2`;
co-locating minimises cross-region database latency.

**D6 — Keep the Vercel backend deployed until cutover is verified.** Rollback is
then a URL change, not a redeploy, and no data migration is involved. The Vercel
files (`vercel.json`, `src/vercelHandler.ts`, `api/index.ts`) are deliberately
retained until a separate post-cutover change removes them.

## Residency — PENDING OWNER DECISION

`PLATFORM_CONTEXT.md` records "region = Canada for the **database and
functions**". Railway cannot satisfy the compute half of that: it has no Canadian
region (US West, US East, EU West, Southeast Asia only).

This is **already violated today**: `apps/backend/vercel.json` pins
`"regions": ["sfo1"]` (San Francisco), and the single Supabase project is in
`us-west-2` with `ca-central-1` noted as required. Railway therefore does not
break a guarantee currently held — but the owner must record one of:

- **(a)** Accept non-Canadian compute. Then amend the `PLATFORM_CONTEXT.md`
  region decision, and T21's privacy policy must state the actual region. The
  now-misleading `sfo1` pin must be fixed or removed.
- **(b)** Canada is a hard requirement. Then **stop this migration** — the answer
  is Vercel Pro with a Canadian region, and the Supabase project must move to
  `ca-central-1`.

**No provisioning or cutover may proceed past this point until the owner records
the decision.** The executor implemented Phases 0–6 with this section pending.

## Why admin and site-1 stay on Vercel

`apps/admin` and `apps/site-1` are Next.js applications (App Router, server
components, embedded Sanity Studio). Vercel is the native host for Next.js and
their request/response workloads fit serverless cleanly; they have no long-lived
run loop and no sub-daily schedule. The migration is intentionally two-platform.
`apps/site-1` keeps reading `VERCEL_ENV` because it remains on Vercel.

## Consequences

- Scheduled work no longer depends on a Pro Vercel plan or a special staging
  project; G30 can be closed with real Railway-scheduler evidence in Phase 8.
- `DEPLOYMENT_ENV` (`production` | `preview` | `development`) is the
  platform-neutral environment signal, with `VERCEL_ENV` as a fallback during the
  cutover window. The preview guard is unchanged and still fail-closed.
- The container build needs a root `.dockerignore`; without it `COPY . .` would
  overwrite the image's Linux `node_modules` with the host checkout.
- If the service is ever scaled past one replica the scheduler runs on each
  replica. That is safe (lease-based claiming) but wasteful; moving the schedule
  to a second, `ENABLE_SCHEDULER=1` service is the documented upgrade path.
- Railway **config-as-code** (`railway.json`) is deprecated in favour of
  Infrastructure as Code, with existing files supported until 2026-12-01. The
  field names used here were verified against Railway's current schema; a future
  change should migrate the file.

## References

[Migration plan](../MIGRATION/RAILWAY_BACKEND.md) §3, §8–§13 ·
[ADR 0001](0001-split-architecture.md) · [PLATFORM_CONTEXT.md](../../PLATFORM_CONTEXT.md)
§3, §7 · [ENV](../ENV.md) · [Outbox runbook](../RUNBOOKS/outbox-jobs.md) ·
[Catalogue sync runbook](../RUNBOOKS/catalogue-sync.md)
