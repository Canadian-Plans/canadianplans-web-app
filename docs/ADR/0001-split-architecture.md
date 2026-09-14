# 0001 — Split architecture: one pnpm monorepo, Express backend as sole DB client, Vercel functions

Date: 14 September 2026
Status: accepted

## Context

T1 (BUILD_TASKS.md) scaffolds the repository PLATFORM_CONTEXT.md §2–§3 and §10
already committed to: five deployable apps sharing one database, reached only
through one backend. This ADR records the scaffold-time decisions so later
tasks don't re-derive or quietly drift from them.

## Decisions

**One pnpm monorepo, workspace packages, never a registry.** `apps/*` +
`packages/*` in a single private repo (`canadian-plans`). Shared code is
consumed via `workspace:*` — never published externally, per PLATFORM_CONTEXT
§3's "outside the current baseline" list. Each Vercel project points at one
`apps/*` directory; `pnpm-workspace.yaml`'s `catalog:` pins shared tooling
dependency versions once, so `apps/backend` and `apps/admin` can't drift onto
different ESLint/TypeScript/Vitest versions by accident.

**`apps/backend` is the only importer of `@canadian-plans/db`.** Enforced,
not just documented: the root `eslint.config.js` bans importing
`@canadian-plans/db` everywhere by default and allowlists only
`apps/backend/**`, `packages/db/**` (its own source), `jobs/**` (cron
handlers invoked by the backend), and a future `scripts/**` for offline
migration/backup/restore tooling. No frontend app is in that allowlist —
PLATFORM_CONTEXT.md §4 invariant 3. `apps/backend/src/db/boundary-check.ts`
imports the (currently placeholder) package to prove backend is allowed to;
the same import from `apps/admin` fails lint (demonstrated in this task's
evidence).

**Backend ships as Vercel functions, not a long-running server.** `src/app.ts`
exports a `createApp()` factory with no listener. `api/index.ts` is the one
Vercel function entry (`export default createApp()`) — Express's
`(req, res)` handler shape is already what Vercel's Node runtime expects, so
no adapter package is needed. `vercel.json` rewrites every path to that one
function. `src/server.ts` is the separate local-dev entry that actually calls
`.listen()`. This keeps the backend's serverless constraints (no long-lived
in-process state between requests) visible in the code structure itself,
per PLATFORM_CONTEXT §3's Express row.

**Packages stay as raw TypeScript source, no build step.** `packages/*`
`package.json` files point `main`/`types`/`exports` directly at
`src/index.ts`. Consumers (Next.js, `tsx`, Vitest, and Vercel's own Node
function bundler) all transpile TypeScript on the fly, so there is nothing to
build or version-skew between a package and its compiled output. This is
consistent with packages never being published outside the repo; a build
step could be added later if that changes.

**Affected-only Vercel builds via `ignoreCommand`, not a deploy step in
CI.** Each app's `vercel.json` sets `ignoreCommand` to
`scripts/vercel-ignore-build.sh <app>`, which diffs `apps/<app>`, `packages`,
and `jobs` since the last production deploy (or the previous commit locally)
and skips the build when nothing relevant changed. GitHub Actions
(`.github/workflows/ci.yml`) runs install/typecheck/lint/test/build on every
push regardless — it is a correctness gate, not a cost-optimization — and
never deploys anywhere; the owner is the only one who promotes to
production (PLATFORM_CONTEXT.md "Hard rules").

## Consequences

- A frontend task that tries to import `@canadian-plans/db` fails CI
  immediately with a message pointing at the invariant, instead of being
  caught later in review.
- Adding `apps/site-2` or `apps/site-3` later (Phase B) needs no changes to
  this lint/CI/Vercel structure — the allowlists are already scoped to
  "everything except backend/db/jobs/scripts", not to a fixed app list.
- Because packages ship as source, `apps/backend`'s and `apps/admin`'s own
  `tsc --noEmit` is what actually type-checks package code today; a package
  with no consumer yet only gets checked via its own `pnpm typecheck` script.

## Open discrepancy (not resolved by this task)

`docs/BUILD_TASKS.md` and ADR 0000 both say the eight planning files
(`CLAUDE.md`, `PLATFORM_CONTEXT.md`, `README.md`, `REQUIREMENTS.md`,
`IMPLEMENTATION_PLAN.md`, `BUILD_TASKS.md`, `OWNER_PLAYBOOK.md`,
`OPEN_INPUTS.md`) live at the repo root. Today `REQUIREMENTS.md`,
`IMPLEMENTATION_PLAN.md`, `BUILD_TASKS.md`, `OWNER_PLAYBOOK.md`, and
`OPEN_INPUTS.md` are actually under `docs/`. This task did not move them —
that's a separate, owner-visible change outside T1's scope — but it means
some cross-references in this ADR and elsewhere use `docs/<file>.md` paths
that don't yet match the "at the root" description.

## References

[PLATFORM_CONTEXT.md](../../PLATFORM_CONTEXT.md) §2–§4, §10 ·
[Implementation Plan](../IMPLEMENTATION_PLAN.md) §3, §18 ·
[Build Tasks T1](../BUILD_TASKS.md) · [ADR 0000](0000-reviewed-planning-baseline.md)
