# Evidence — T1 monorepo scaffold

Date: 14 September 2026
Task: BUILD_TASKS.md T1 (monorepo scaffold, backend, shared packages, conventions)
Pre-task commit: `27001b02abdf0d66294c2f28780f22e638bbad0d`
Pre-task `pnpm-lock.yaml` sha256: `5fb060927e62323ca5bd170bff31dfc644eb56ba89756d953ffe725fb5656fac`

Environment: Node v22.19.0, pnpm 9.15.0 (installed via `npm install -g pnpm@9.15.0`
— corepack couldn't enable on this machine due to a Windows `Program Files`
permission error, unrelated to this task).

## 1. Full local CI pipeline — all green

```
pnpm install            # 587 packages resolved, 0 peer-dependency warnings
pnpm run typecheck       # 8 of 8 projects — Done
pnpm run lint             # eslint . — 0 problems
pnpm run format            # prettier --check . — all matched files use Prettier code style
pnpm run test                # 3 test files, 11 tests, all passed
pnpm run build                 # backend (tsup) + admin (next build) — both succeeded
```

Full output:

```
$ pnpm run typecheck
Scope: 8 of 9 workspace projects
packages/db typecheck: Done
packages/types typecheck: Done
packages/ui typecheck: Done
packages/adapters typecheck: Done
packages/contracts typecheck: Done
apps/backend typecheck: Done
apps/admin typecheck: Done

$ pnpm run lint
> eslint .
(no output — 0 problems)

$ pnpm run format
Checking formatting...
All matched files use Prettier code style!

$ pnpm run test
 Test Files  3 passed (3)
      Tests  11 passed (11)

$ pnpm run build
apps/backend build: tsup — ESM Build success in 62ms
  dist/chunk-EFTZ3AQV.js, dist/api/index.js, dist/src/server.js
apps/admin build: next build (Turbopack) — Compiled successfully in 5.9s
  Running TypeScript ... Finished TypeScript in 2.6s
  Route (app): / and /_not-found — both static
```

## 2. `@canadian-plans/db` boundary lint — provably fails from a frontend

A scratch file was added at `apps/admin/src/__lint_boundary_demo/demo.ts`
(never committed — created, linted, then deleted):

```ts
import { DB_PACKAGE_PLACEHOLDER } from '@canadian-plans/db';

export const shouldNeverBeAllowed = DB_PACKAGE_PLACEHOLDER;
```

```
$ pnpm exec eslint apps/admin/src/__lint_boundary_demo/demo.ts

H:\CanadianPlans\apps\admin\src\__lint_boundary_demo\demo.ts
  1:1  error  '@canadian-plans/db' import is restricted from being used. Only
  apps/backend, packages/db, jobs/, and allowlisted offline tooling may
  import @canadian-plans/db. See PLATFORM_CONTEXT.md §4 invariant 3
  no-restricted-imports

✖ 1 problem (1 error, 0 warnings)
exit code: 1
```

The identical import from `apps/backend/src/db/boundary-check.ts` (a real,
committed file) passes lint — proven by the clean `pnpm run lint` output
above, since that file is part of the repo being linted.

## 3. `any` ban — active

`@typescript-eslint/no-explicit-any` is `error` in
`packages/config/eslint.js` (applied repo-wide via `eslint.config.js`).
`@typescript-eslint/consistent-type-assertions` with `assertionStyle: 'never'`
additionally bans unchecked `as` casts (only `as const` is exempt). This was
caught live during this task: `apps/backend/tests/health.test.ts` originally
used `server.address() as AddressInfo`, which `pnpm run lint` correctly
flagged; it was rewritten as an explicit `typeof`/`null` narrow instead of a
cast (see the file's `beforeEach`).

## 4. Affected-project Vercel builds — `ignoreCommand` logic verified

`apps/backend/vercel.json` and `apps/admin/vercel.json` both set
`ignoreCommand` to `scripts/vercel-ignore-build.sh <app>`, which diffs
`apps/<app>`, `packages`, `jobs`, and the lockfile since the last production
deploy (`VERCEL_GIT_PREVIOUS_SHA`, falling back to `HEAD^` locally) and exits
0 (skip) or non-zero (build) accordingly.

The core diff logic was verified in an isolated scratch git repository
(same directory shape, two commits):

| Scenario                                | `apps/backend` decision | `apps/admin` decision |
| --------------------------------------- | ----------------------- | --------------------- |
| Commit touches only `apps/backend/*`    | build (exit 1)          | **skip** (exit 0)     |
| Commit touches `packages/db/*` (shared) | build (exit 1)          | build (exit 1)        |

This matches the intended behaviour: an app-only change builds only that
app's Vercel project; a shared-package change builds every app that could
depend on it. This was exercised against a throwaway repo rather than this
one because nothing in this scaffold is committed yet (T1 does not commit —
see "Rollback" in `docs/TASK_TEMPLATE.md`'s filled example).

## 5. Schema compatibility

No database schema exists yet (explicit constraint for this task —
`packages/db` is a placeholder, real schema arrives in T4). Nothing to check
for compatibility.

## 6. Release metadata

`.github/workflows/ci.yml`'s `install` job logs the commit SHA and
`pnpm-lock.yaml` sha256 on every run (`Record release metadata` step), so
every CI run is traceable to an exact dependency set.
