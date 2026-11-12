# Canadian Plans

Canadian Plans sells Canadian telecom plans — pre-arrival eSIM, bring-your-own-device
mobile, and home internet and TV by province — to people moving to or living in Canada.
This repository holds the Canadian Plans storefront (`site-1`, Next.js on Vercel) and the
shared packages it uses. The backend and the staff admin moved to
`Canadian-Plans/canadianplans-crm` on 12 November 2026; see
[docs/STOREFRONT_ONLY.md](docs/STOREFRONT_ONLY.md). The owner is the only person who
deploys to production.

## Start here

- [docs/STOREFRONT_ONLY.md](docs/STOREFRONT_ONLY.md) — what this repository holds since the
  split, what is not done yet and what comes next.
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
| `apps/site-1`            | Next.js storefront for Canadian Plans. [README](apps/site-1/README.md), design and CMS docs in `apps/site-1/docs/`. |
| `packages/contracts`     | Zod request/response schemas, typed API client, OpenAPI generator, browser-safe CMS schema types.                |
| `packages/ui`            | Shared shadcn-based primitives and the Canadian Plans design tokens.                                            |
| `packages/types`         | Shared domain TypeScript types.                                                                                   |
| `packages/config`        | Shared tsconfig, ESLint (including the DB import-boundary rule), Prettier, Vitest and Playwright presets.        |
| `scripts`                | Repo tooling: affected builds and the preview-isolation check. |
| `docs`                   | Planning, reference, ADRs, runbooks, legal texts and evidence. Indexed in [docs/README.md](docs/README.md).      |
| `.github/workflows`      | CI (never deploys). |

## Local development

Use Node **22.19.0** and pnpm **9.15.0**. Dependency versions are pinned in manifests, the
pnpm catalog and the lockfile.

```sh
pnpm install --frozen-lockfile
pnpm --filter site-1 dev
```

The storefront listens on port 3001. It needs a backend to call and the variables
documented in [docs/ENV.md](docs/ENV.md) (names only; values live in the password manager
and the deployment platforms); see [docs/STOREFRONT_ONLY.md](docs/STOREFRONT_ONLY.md) for
which backend.

## Verification

```sh
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm run test:tooling
pnpm run test
pnpm run build
```

The browser journeys in `apps/site-1/e2e` and the security suite
(`pnpm --filter site-1 run test:security`) boot the old backend's test harness, which is no
longer in this repository, so they do not run until the storefront calls the Canadian Plans
CRM ([docs/STOREFRONT_ONLY.md](docs/STOREFRONT_ONLY.md)).

`pnpm run build:affected` selects applications through workspace dependencies using
`BASE_SHA`; without a valid baseline it builds everything. Vercel uses the same selector with
`VERCEL_GIT_PREVIOUS_SHA`, anchored to the repository root. CI never deploys; the owner
selects production releases ([release runbook](docs/RUNBOOKS/release-rollback.md)).

## Dependency notes

Sanity 6.20.0 is kept on the pinned Node 22.19.0 runtime. One override is limited to its
reviewed caller: `typeid-js@1.2.0` uses UUID 11.1.1 for Sanity CLI type IDs.
`pnpm test:tooling` exercises its real CJS/ESM APIs, UUID generation and buffer validation. Reassess these pins when their parents change; the Sanity
CLI's `skills` pin is 1.5.9 to satisfy its declared range on Node 22. The dependency audit
still reports unpatched upstream `braces` and `sprintf-js` advisories; passing application
checks does not remove those advisories.
