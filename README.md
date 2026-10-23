# Canadian Plans

Canadian Plans sells Canadian telecom plans — pre-arrival eSIM, bring-your-own-device
mobile, and home internet and TV by province — to people moving to or living in Canada.
This is the one pnpm monorepo for the whole platform: an Express backend that is the only
database client, a Next.js staff admin, and the Canadian Plans storefront (`site-1`).
The backend runs on Railway; admin and the storefront run on Vercel; Postgres and Auth are
Supabase. The owner is the only person who deploys to production.

## Start here

- [PLATFORM_CONTEXT.md](PLATFORM_CONTEXT.md) — what the business is, the architecture and
  the non-negotiable invariants. Read it in full before changing anything.
- [AGENTS.md](AGENTS.md) — how AI sessions work in this repository; `CLAUDE.md` points here.
- [docs/README.md](docs/README.md) — index of every planning, reference, runbook and
  evidence document.

For an AI tool that does not load AGENTS.md automatically, start with:

> Read AGENTS.md and follow its startup reading order. My task is: …

## Repository layout

| Path                     | What it is                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `apps/backend`           | Express + strict TypeScript API; the only database client. Docker image on Railway. See [its README](apps/backend/README.md). |
| `apps/admin`             | Next.js staff console (orders, partners, finance, settings). Backend API client only. [README](apps/admin/README.md) |
| `apps/site-1`            | Next.js storefront for Canadian Plans. [README](apps/site-1/README.md), design and CMS docs in `apps/site-1/docs/`. |
| `packages/contracts`     | Zod request/response schemas, typed API client, OpenAPI generator, browser-safe CMS schema types.                |
| `packages/db`            | Drizzle schema, migrations and the tenant transaction helper. Imported only by the backend.                      |
| `packages/adapters`      | Server-only provider adapters (R2, Resend, Sentry-style tracker, alerts, analytics, static catalogue).          |
| `packages/ui`            | Shared shadcn-based primitives and the Canadian Plans design tokens.                                            |
| `packages/types`         | Shared domain TypeScript types.                                                                                   |
| `packages/observability` | Browser-safe log-record builder and PII scrubber shared by every app.                                           |
| `packages/config`        | Shared tsconfig, ESLint (including the DB import-boundary rule), Prettier, Vitest and Playwright presets.        |
| `jobs`                   | Outbox handlers run by the backend scheduler, plus the offline backup, restore, retention and monitor CLIs.      |
| `scripts`                | Repo tooling: affected builds, preview-isolation check, B2 writer provisioning, recovery spike.                  |
| `docs`                   | Planning, reference, ADRs, runbooks, legal texts and evidence. Indexed in [docs/README.md](docs/README.md).      |
| `.github/workflows`      | CI (never deploys) and the backup, backup-monitor and backup-retention jobs.                                     |

## Local development

Use Node **22.19.0** and pnpm **9.15.0**. Dependency versions are pinned in manifests, the
pnpm catalog and the lockfile.

```sh
pnpm install --frozen-lockfile
pnpm --filter backend dev
pnpm --filter admin dev
pnpm --filter site-1 dev
DB_SEED_ALLOW_SYNTHETIC=1 pnpm --filter @canadian-plans/db db:seed   # local disposable DB only
```

The backend listens on port 4000, admin on 3000 and the storefront on 3001. The health
endpoint needs no credentials. Everything else needs the variables documented in
[docs/ENV.md](docs/ENV.md) (names only; values live in the password manager and the
deployment platforms). The admin starts at `/login`; authenticated workspace routes begin at
`/w/site-1/orders`.

## Verification

```sh
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm run test:tooling
pnpm run test
pnpm run build
pnpm --filter admin exec playwright install chromium
pnpm run test:e2e
```

`test:e2e` runs the admin shell checks, the site-1 browser suite, the site-1 security suite
(production builds with analytics on and off, plus a synthetic-credential bundle scan) and
the admin order-journey tests against the real backend harness. Playwright starts the
production admin build on port 3100; set `CAPTURE_SCREENSHOTS=1` to refresh the screenshots
under `docs/EVIDENCE/T2-screenshots`.

`pnpm run build:affected` selects applications through workspace dependencies using
`BASE_SHA`; without a valid baseline it builds everything. Vercel uses the same selector with
`VERCEL_GIT_PREVIOUS_SHA`, anchored to the repository root. CI never deploys; the owner
selects production releases ([release runbook](docs/RUNBOOKS/release-rollback.md)).

## Dependency notes

Sanity 6.20.0 and tsup 9 are kept on the pinned Node 22.19.0 runtime. Two overrides are
limited to their reviewed callers: `@esbuild-kit/core-utils@3.3.2` uses esbuild 0.25.12 for
the legacy Drizzle transform loader, and `typeid-js@1.2.0` uses UUID 11.1.1 for Sanity CLI
type IDs. `pnpm test:tooling` exercises their real CJS/ESM APIs, source maps, imports, UUID
generation and buffer validation. Reassess these pins when their parents change; the Sanity
CLI's `skills` pin is 1.5.9 to satisfy its declared range on Node 22. The dependency audit
still reports unpatched upstream `braces` and `sprintf-js` advisories; passing application
checks does not remove those advisories.
