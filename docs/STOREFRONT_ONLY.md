# This repository is the Canadian Plans storefront only

Written 2026-11-12. Keep it current.

## What changed

Until 2026-11-12 this repository held the whole platform: backend, admin,
storefront, jobs and shared packages. The owner split it:

- **Backend and admin** now live in `Canadian-Plans/canadianplans-crm` (a copy
  of the GT Sales CRM, renamed for Canadian Plans). That repository is the only
  place backend and admin work happens.
- **This repository** keeps the storefront `apps/site-1` and the shared
  packages it uses: `packages/contracts`, `packages/ui`, `packages/types` and
  `packages/config`.

Removed here: `apps/backend`, `apps/admin`, `jobs`, `packages/db`,
`packages/adapters`, `packages/observability`, `railway.json`, the three backup
workflows and the backup and recovery scripts. They remain in this
repository's git history.

## What is not done yet

**The storefront still speaks the old backend's API.** `apps/site-1` calls
`/api/v1/...` routes for offers, quotes, orders and tracking through
`src/lib/backendClient.ts`, using the request and response shapes in
`packages/contracts`. The new CRM has a different website API: no quotes and no
offer versions; a website creates a lead with a lead type, reads plans from
`GET /website/plans` and sends an order as `order: { planId, quantity }`
(`canadianplans-crm/docs/HANDOFF.md` §2.6 and `docs/CANADIAN_PLANS.md`).

Until the storefront is moved onto that API:

- it works only against a deployment of the old backend (now built from
  history, not from `main`);
- its browser journeys in `apps/site-1/e2e` and its security suite
  (`test:security`) cannot run, because they boot the old backend's test
  harness. The files are kept; CI does not run them. Unit tests, typecheck,
  lint and the build do run.

## What comes next

1. Stand up the `canadianplans-crm` deployment and create a site key for this
   storefront.
2. Map each storefront call to the CRM's website API and replace the request
   shapes in `packages/contracts` with the CRM's (a copied client, or the CRM's
   contracts package once it is published).
3. Enter the plans in the CRM admin; the repo catalogue and Sanity catalogue
   sync were backend features and are gone.
4. Rewrite the browser journeys against a local `canadianplans-crm` backend and
   put them back in CI.
5. After a test order passes, switch off the old Railway backend and the old
   Vercel admin project.

## Reading the older documents

`PLATFORM_CONTEXT.md`, `docs/REQUIREMENTS.md`, `docs/IMPLEMENTATION_PLAN.md`,
`docs/BUILD_TASKS.md`, the ADRs, runbooks and evidence describe the whole
platform as it was. Their backend, admin, database and backup sections are
history; the storefront sections and the invariants that bind a website (no
database access, no price trusted from the browser, no PII in logs, no secrets
in the browser) still apply.
