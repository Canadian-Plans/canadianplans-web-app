# Migration plan — backend from Vercel Functions to Railway

Status: **not started**
Author: review session, 17 September 2026
Executor: an AI agent working in this repository, step by step
Owner actions are marked **[OWNER]** and cannot be performed by the agent

---

## 1. Scope

**Moves to Railway:** `apps/backend` only — the Express API, and the scheduled
work it owns (T15 outbox runner, T10B catalogue sync).

**Stays on Vercel:** `apps/admin` and `apps/site-1`. They are Next.js apps and
Vercel is the right host for them. This migration makes the deployment
two-platform; that is intended, not a transitional state.

**Stays on Supabase:** Postgres and Auth. Nothing in this plan touches the
database provider or the identity provider. That is a separate decision.

**Not in scope:** changing the database region, replacing Supabase Auth,
altering RLS, or touching any migration in `packages/db/drizzle`.

---

## 2. Why (so the executor does not re-litigate)

1. `apps/backend/src/server.ts` is already a plain `createApp().listen()`. The
   app was written as a long-lived Express server and is currently squeezed
   through `vercelHandler.ts` plus a catch-all `/(.*)` → `/api` rewrite.
2. `CatalogueSyncRunner` uses a **120 second** run deadline and `OutboxRunner`
   defaults to the same. Those exceed Vercel Hobby function limits outright.
3. Scheduled work needs sub-daily cron. On Vercel that requires Pro
   ($20/seat/month); a sub-daily `crons` expression fails the whole deployment
   on Hobby, which has already broken a deploy once (commit `33c4811`).
4. G30 — the open staging-cron evidence gap — cannot be closed today for that
   reason. This migration closes it.

**Known cost:** Railway has no Canadian region (US West, US East, EU West,
Southeast Asia only). See §11.

---

## 3. Decisions already made

Implement these; do not reopen them.

| #   | Decision                                                         | Rationale                                                                                              |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| D1  | **One Railway service**, not a separate worker                   | Cheapest; the outbox lease design is already concurrency-safe. Upgrade path in §19.                    |
| D2  | **In-process scheduler**, not Railway cron                       | Railway cron has a **5-minute floor** and no minute-level precision guarantee. T15's outbox needs 60s. |
| D3  | Scheduler calls the runner functions **directly**, not over HTTP | Avoids a self-call and a second auth hop. The existing HTTP routes stay for manual invocation.         |
| D4  | **Dockerfile**, not Railpack autodetect                          | Deterministic for a pnpm workspace whose `workspace:*` deps resolve to `.ts` sources.                  |
| D5  | Railway region **US West**                                       | The Supabase project is in `us-west-2`; co-locating minimises cross-region DB latency.                 |
| D6  | Keep the Vercel backend deployed until cutover is verified       | Rollback is then a URL change, not a redeploy.                                                         |

---

## 4. Prerequisites — **[OWNER]**

The agent cannot do any of these. Confirm all four before Phase 7.

1. **Railway plan.** The account (`md-takibuddin`, workspace "Md Takib Uddin
   Saker's Projects", id `3294cd15-ef03-4fe0-aa1f-e8468783a4c9`) exists. Confirm
   it is on **Hobby or above**. Free/Trial has peak-hour deploy restrictions and
   can have deploys paused under platform load — not acceptable for a commercial
   backend.
2. **GitHub authorization.** Install the Railway GitHub App on the
   `Canadian-Plans` org with access to `canadianplans-web-app`.
3. **Secrets.** Every value in §10 must be entered by the owner in Railway's
   dashboard. The agent must never be handed production credentials in
   plaintext, must never write them to a file, and must never echo them in logs.
4. **Residency decision.** Record whether backend compute outside Canada is
   accepted. See §11.

---

## 5. Phase 0 — Baseline

Prove the tree is green before changing anything. Record each result.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm run lint
pnpm run test
pnpm run test:tooling
pnpm --filter backend build
```

Expected at time of writing: typecheck clean across 10 projects; lint clean;
`55 passed | 14 skipped` test files (the 14 skipped are DB-gated and run only in
CI); 65 tooling tests; the build emits `apps/backend/dist/src/server.js`.

> **Note on `pnpm run format`:** on a Windows checkout with `core.autocrlf=true`
> this reports ~209 files as unformatted. That is a line-ending artifact, not a
> defect — CI runs on Linux and passes. **Do not run `pnpm run format:fix`**; it
> would rewrite the whole repo with CRLF. To check only files you changed, use
> `npx prettier --end-of-line auto --check <paths>`.

Create a branch: `feat/backend-railway-migration`.

---

## 6. Phase 1 — Platform-neutral deployment environment

`VERCEL_ENV` is read in three places. Two are backend and must become neutral;
the third is site-1 and **stays as-is**, because site-1 remains on Vercel.

**Change (backend only):**

- `apps/backend/src/routes/jobs.ts` — `deploymentEnvironment: process.env.VERCEL_ENV`
- `apps/backend/src/routes/catalogue-sync.ts` — the same line

**Do not change:** `apps/site-1/src/app/(storefront)/order/page.tsx`.

Introduce `DEPLOYMENT_ENV` with values `production` | `preview` | `development`.
Add a loader, e.g. `apps/backend/src/config/deployment.ts`:

```ts
export type DeploymentEnvironment = 'production' | 'preview' | 'development';

/**
 * Platform-neutral deployment environment. Railway has no equivalent of
 * VERCEL_ENV, so it is set explicitly per service. VERCEL_ENV remains a
 * fallback so a Vercel deployment of this same commit still behaves correctly
 * during the cutover window (D6).
 */
export function loadDeploymentEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): DeploymentEnvironment | undefined {
  /* DEPLOYMENT_ENV -> VERCEL_ENV -> undefined */
}
```

**Critical:** the existing guard is `if (deploymentEnvironment === 'preview')`
→ 403. Preserve those exact semantics — a preview deployment must never act as a
scheduler. Keep the fail-closed direction: an unknown value must not be treated
as production.

**Tests:** extend `apps/backend/tests/catalogue-sync-route.test.ts` and the jobs
route tests to cover `DEPLOYMENT_ENV=preview` rejection and the `VERCEL_ENV`
fallback. The existing preview-rejection tests must still pass unchanged.

**Gate:** `pnpm typecheck && pnpm run lint && pnpm run test`.

---

## 7. Phase 2 — Graceful shutdown

`src/server.ts` currently has no signal handling. On Railway this matters:
Railway sends `SIGTERM` and by default allows **0 seconds** before `SIGKILL`.
Without this, an in-flight order submission, or a claimed outbox job holding a
live lease, is killed mid-flight.

Rewrite `apps/backend/src/server.ts` to:

1. Listen on `process.env.PORT` (Railway injects it). Keep the `?? 4000`
   default for local development.
2. Start the scheduler (Phase 3) when enabled.
3. On `SIGTERM` / `SIGINT`:
   - stop accepting new connections (`server.close()`),
   - signal the scheduler to stop and **await** any in-flight run,
   - close the database pool,
   - exit 0.
4. Add a hard timeout (~25s) after which it force-exits, so a stuck handler
   cannot hang the deployment.

Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` on the service (§10) so Railway
actually waits for this.

**Test:** add `apps/backend/tests/shutdown.test.ts` asserting the sequence
completes and awaits an in-flight scheduler run. Inject fakes; do not spawn a
real process.

---

## 8. Phase 3 — In-process scheduler

This replaces Vercel Cron and is the largest piece of real engineering here.

Create `apps/backend/src/scheduler.ts`.

**Behaviour:**

- Two independent timers:
  - **outbox** — every `60_000` ms, calling the same `OutboxRunner.run(...)`
    that `createDefaultJobsRouteDependencies()` builds.
  - **catalogue sync** — every `300_000` ms, calling the same
    `CatalogueSyncRunner.run(...)` that
    `createDefaultCatalogueSyncRouteDependencies()` builds.
- **Identity comes from the machine registry, exactly as the HTTP routes do.**
  Resolve the scheduler entry through `loadMachineRegistry()` using
  `JOB_RUNNER_SELECTOR` / `CATALOGUE_SYNC_SELECTOR`, requiring the `outbox:run`
  / `reconcile:run` scope respectively, and use that entry's `actorId` and
  `workspaceIds`. **Never derive the workspace set from a database scan** — that
  is a standing invariant of both runners.
- **Overlap guard.** Each timer must skip its tick if the previous run has not
  finished. Both runners already carry internal 120s run deadlines, so skipping
  is correct; do not queue.
- **Jitter.** Add 0–5s of random jitter per tick so replicas do not align.
- **Startup delay.** Wait ~10s after boot before the first tick, so the service
  passes its health check first.
- **Error containment.** A thrown error must be logged through the existing
  PII-safe `logRequestError` path and must never crash the process.
- **Disabled by default.** Runs only when `ENABLE_SCHEDULER=1`, and must refuse
  to start when the deployment environment is `preview`, mirroring the HTTP
  guard.

**Keep `/api/internal/jobs/run` and `/api/internal/catalogue/sync` exactly as
they are.** They remain the manual invocation path documented in
`docs/RUNBOOKS/outbox-jobs.md` and `docs/RUNBOOKS/catalogue-sync.md`, and their
existing tests must keep passing untouched.

**Tests:** `apps/backend/tests/scheduler.test.ts`, with fake timers —

- ticks at the configured interval,
- skips a tick while the previous run is still in flight,
- a throwing run does not stop later ticks,
- refuses to start without the required scope,
- refuses to start when the environment is `preview`,
- `stop()` awaits an in-flight run.

**Replica note:** if the service is ever scaled past one replica, the scheduler
runs on each. That is _safe_ — the outbox uses lease-based claiming and
catalogue sync uses `catalogue_sync_leases` — but wasteful. See §19.

---

## 9. Phase 4 — Container and Railway config

### 9.1 `apps/backend/Dockerfile`

The build context is the **repository root**; workspace deps require it.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22.19.0-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS build
# Copy every workspace manifest first so the install layer caches well.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json       apps/backend/
COPY apps/admin/package.json         apps/admin/
COPY apps/site-1/package.json        apps/site-1/
COPY jobs/package.json               jobs/
COPY packages/adapters/package.json  packages/adapters/
COPY packages/config/package.json    packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db/package.json        packages/db/
COPY packages/types/package.json     packages/types/
COPY packages/ui/package.json        packages/ui/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/backend
CMD ["node", "dist/src/server.js"]
```

**Why the whole `/repo` is copied into the runtime stage:** `tsup` inlines the
`@canadian-plans/*` workspace packages (`noExternal`) but leaves real npm
dependencies external — `express`, `drizzle-orm`, `zod`, `postgres`,
`@supabase/supabase-js`. Those resolve through pnpm's symlinked store, so naive
pruning breaks resolution. Shipping the full install is larger but always
correct. If image size later matters, switch to
`pnpm deploy --filter backend --prod` and verify that `postgres` — a dependency
of `packages/db`, not of `apps/backend` — still resolves.

### 9.2 `railway.json` at the repository root

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/backend/Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/api/v1/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Verify these field names against Railway's current config-as-code reference
before committing. This file is written from the documented shape, and Railway's
schema changes occasionally.

### 9.3 Do not delete the Vercel path yet

Leave `apps/backend/vercel.json`, `src/vercelHandler.ts`, `api/index.ts` and the
`write-vercel-handler-dts.mjs` build step in place. They are the rollback route
(D6). Phase 10 removes them.

---

## 10. Environment variables for the Railway service

**[OWNER] sets every value.** The agent supplies only names and shapes.

| Variable                              | Value / source                             | Notes                                                       |
| ------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `NODE_ENV`                            | `production`                               | Also disables the TEST-only switches below                  |
| `DEPLOYMENT_ENV`                      | `production`                               | New in Phase 1                                              |
| `PORT`                                | _leave unset_                              | Railway injects it                                          |
| `ENABLE_SCHEDULER`                    | `1`                                        | New in Phase 3                                              |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `30`                                       | Makes Phase 2 effective                                     |
| `ADMIN_ORIGIN`                        | the admin's Vercel production URL          | Exact origin, no trailing slash — CORS needs an exact match |
| `DATABASE_URL`                        | Supabase Supavisor URL, `app_runtime` role | Never the migration owner role                              |
| `DATABASE_SSL_MODE`                   | _leave unset_ (defaults to `require`)      | `disable` is local-only                                     |
| `SUPABASE_URL`                        | Supabase project URL                       |                                                             |
| `SUPABASE_ANON_KEY`                   | anon / publishable key                     | Never a privileged key                                      |
| `MACHINE_REGISTRY_JSON`               | the full registry JSON                     | Scheduler entries need `actorId`, `workspaceIds`, scopes    |
| `CRON_SECRET`                         | the scheduler entry secret                 | Must equal the selected entry's `secret`                    |
| `JOB_RUNNER_SELECTOR`                 | selector for the `outbox:run` entry        |                                                             |
| `CATALOGUE_SYNC_SELECTOR`             | selector for the `reconcile:run` entry     |                                                             |
| `TURNSTILE_SECRET_KEY`                | Cloudflare Siteverify secret               |                                                             |
| `TURNSTILE_HOSTNAME`                  | storefront hostname, no scheme or path     |                                                             |
| `SANITY_*`                            | per `docs/ENV.md`                          | Needed by the catalogue provider                            |
| `R2_*`                                | per `docs/ENV.md`                          | Only once T17 lands                                         |

**Must NOT be set on this service:** `OUTBOX_ADAPTERS` (a fake provider on
production is forbidden), `ORDER_OPERATIONAL_TRANSITIONS`,
`QUOTE_WITHDRAWAL_POLICY` (until OPEN_INPUTS #14 is resolved),
`MIGRATION_DATABASE_URL`, `TEST_MIGRATION_DATABASE_URL`,
`DB_TEST_ALLOW_DESTRUCTIVE`.

**Supabase network check [OWNER]:** confirm the Supabase project has no IP
allowlist that would block Railway egress. Railway does not publish stable
egress IPs on Hobby.

---

## 11. Residency — DECIDED (option a), 18 September 2026

**The owner has accepted non-Canadian backend compute.** `PLATFORM_CONTEXT.md`
and ADR 0004 are updated accordingly; this is no longer a blocker on any phase.

Context recorded for anyone revisiting this: `PLATFORM_CONTEXT.md` previously
read _"region = Canada for the **database and functions**"_, which Railway
cannot satisfy for compute (US West, US East, EU West, Southeast Asia only).
That invariant was **already violated before this migration** —
`apps/backend/vercel.json` pinned `"regions": ["sfo1"]` (San Francisco), and the
Supabase project is in `us-west-2` with `ca-central-1` recorded as required — so
Railway did not break a guarantee that was actually being held.

T21's privacy policy must state the real regions (Railway US West compute,
Supabase `us-west-2` database), not an aspirational Canadian one. Moving the
Supabase project to `ca-central-1` remains open and separate from this decision.

---

## 12. Phase 5 — Repository tooling

1. **`scripts/affected-builds.mjs`** — the `--vercel backend` mode (around line 92) is the `ignoreCommand` in `apps/backend/vercel.json`. Once the backend
   leaves Vercel it is dead. Keep it working for admin and site-1; remove the
   backend case in Phase 10.
2. **`scripts/check-preview-isolation.mjs` + `docs/DEPLOYMENT_INVENTORY.json`** —
   both assume a single platform. Add a `platform` field (`vercel` | `railway`)
   to each inventory resource and credential entry, and teach the checker to
   validate per platform. Its tests live in
   `scripts/check-preview-isolation.test.mjs`; extend them. `pnpm run
test:tooling` must stay green.
3. **`docs/DEPLOYMENT_INVENTORY.json`** — update `providerObservation` with a
   fresh read-only observation including Railway, in the same reviewed change
   that provisions anything.
4. **`.github/workflows/ci.yml`** — no change needed. CI has no deploy step by
   design and must keep none.

---

## 13. Phase 6 — Documentation

Write these **before** provisioning, so the deployment matches the record.

- **`docs/ADR/0004-backend-on-railway.md`** (new) — supersedes the hosting part
  of ADR 0001. Must state: the 5-minute Railway cron floor and why the scheduler
  is in-process; the residency decision from §11; why admin and site-1 stay on
  Vercel.
- **`PLATFORM_CONTEXT.md`** — line 36 (Backend row), line 38 (Hosting row) and
  the decision list at line 113 all say "Express on Vercel functions". Update
  all three.
- **`docs/ENV.md`** — add `DEPLOYMENT_ENV`, `ENABLE_SCHEDULER`,
  `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`; amend `CRON_SECRET`,
  `JOB_RUNNER_SELECTOR` and `CATALOGUE_SYNC_SELECTOR`, which currently say
  "Vercel Cron".
- **`docs/RUNBOOKS/outbox-jobs.md`** — replace the "Scheduling boundary" section
  explaining the deliberately absent `crons` entry; it becomes obsolete.
- **`docs/RUNBOOKS/catalogue-sync.md`** — same.
- **`docs/EVIDENCE/T10-T12-T15.md`** — the "Staging cron check — NOT performed
  (G30 remains open)" section. **Do not mark G30 closed until Phase 8 produces
  real observed evidence.**

---

## 14. Phase 7 — Provision Railway

The agent may drive these through the Railway MCP; the owner performs the
starred steps.

1. **[OWNER]** Confirm plan tier and GitHub App installation (§4).
2. Create a project — suggested name `canadian-plans-backend`, in the personal
   workspace (`3294cd15-ef03-4fe0-aa1f-e8468783a4c9`).
3. Create a service from the GitHub repo, branch `main`:
   - Root Directory: `/` (repo root — workspace deps need full context)
   - Builder: Dockerfile (picked up from `railway.json`)
   - Region: **US West** (D5)
4. **[OWNER]** Enter every variable from §10.
5. Deploy. Watch the build logs; if the build fails, use Railway's deployment
   diagnosis before changing the Dockerfile blindly.
6. Generate a Railway domain. Record it — Phase 9 needs it.
7. Confirm the health check passes and the service reaches `Active`.

---

## 15. Phase 8 — Verify before cutover

Nothing here touches production traffic; admin and site-1 still point at Vercel.

1. `GET https://<railway-domain>/api/v1/health` → 200.
2. **Auth negative paths** — confirm these still fail closed:
   - `GET /api/internal/jobs/run` with no auth → 401
   - with a wrong secret → 401
   - an `outbox:run`-only scheduler against `/catalogue/sync` → 403
3. **Scheduler is actually running.** Read service logs over ~10 minutes. Expect
   roughly 10 outbox ticks and 2 catalogue-sync ticks. Confirm the registry
   actor id appears and that no tenant scan occurs.
4. **Overlap guard** — confirm no interleaved runs appear in the logs.
5. **Graceful shutdown** — trigger a redeploy and confirm the old deployment
   drains rather than being killed mid-run.
6. **G30 evidence.** Record in `docs/EVIDENCE/T10-T12-T15.md`: the exact request
   and response of a manual `POST /api/internal/catalogue/sync`, the observed
   scheduler tick timestamps, and the resulting sync state. **Only now** may G30
   be marked closed, and it must be described as a Railway in-process scheduler,
   not a five-minute Vercel cron.
7. Re-run the full local gate (§5) and CI on the branch.

---

## 16. Phase 9 — Cutover — **[OWNER]**

Only the owner deploys to production (`PLATFORM_CONTEXT.md`).

1. On Vercel, set the **admin** project's `NEXT_PUBLIC_API_BASE_URL` to the
   Railway domain; redeploy admin.
2. On Vercel, set **site-1**'s `SITE_1_BACKEND_URL` to the Railway domain;
   redeploy site-1.
3. Verify end to end against production:
   - site-1 `/order` loads plans (proves `GET /api/v1/website/offers`),
   - a real order submission returns a reference,
   - admin lists orders and performs one status transition.
4. Watch Railway logs and Supabase connection counts for 24 hours.

**Rollback:** revert both variables to the Vercel backend URL and redeploy. The
Vercel backend is still live (D6). No data migration is involved, so rollback is
a URL change and nothing is lost.

---

## 17. Phase 10 — Decommission (only after 7 stable days)

A separate commit and a separate review.

1. Delete `apps/backend/vercel.json`, `apps/backend/api/index.ts`,
   `apps/backend/src/vercelHandler.ts` and
   `apps/backend/scripts/write-vercel-handler-dts.mjs`.
2. Simplify `apps/backend/tsup.config.ts` to the single `src/server` entry and
   drop the `write-vercel-handler-dts` step from the `build` script.
3. Remove the `--vercel backend` branch from `scripts/affected-builds.mjs`.
4. Remove the `VERCEL_ENV` fallback from `loadDeploymentEnvironment` (keep
   site-1's own usage).
5. **[OWNER]** Delete the Vercel backend project.
6. Re-run the full gate.

---

## 18. Gotchas

- **`pnpm run format` fails locally on Windows.** Line endings, not content. See
  the note in §5. Never run `format:fix`.
- **`postgres` is a dependency of `packages/db`, not `apps/backend`.** Any
  attempt to prune `node_modules` must verify it still resolves.
- **`ADMIN_ORIGIN` must match exactly.** `adminCors()` in `app.ts` compares
  strings; a trailing slash or the wrong scheme silently breaks admin.
- **Never let the scheduler run in a preview environment.** The HTTP routes
  already guard this; the scheduler must too.
- **The Sanity webhook route uses `express.raw`** and is mounted _before_
  `express.json`. Signature verification depends on the raw body — do not
  reorder middleware in `app.ts`.
- **Railway cron cannot do minute-level work.** If anyone later moves the outbox
  onto Railway cron, the T15 one-minute cadence silently becomes five minutes or
  worse. This is why D2 exists.
- **Do not weaken or delete a failing test** to make a phase pass.

---

## 19. Upgrade path — a separate worker service

Not needed at launch. Do this when job volume starts competing with request
handling:

1. Add a second Railway service from the same repo and image, with start command
   `node dist/src/scheduler-worker.js` and `ENABLE_SCHEDULER=1`.
2. Set `ENABLE_SCHEDULER=0` on the web service.
3. The outbox lease design already makes the handover safe, with no change to
   the runners themselves.
