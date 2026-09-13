# Canadian Plans — planning documents

Reviewed 14 September 2026. Build one shared Express backend, one Next.js admin and the first SIM storefront in a pnpm monorepo. Additional storefronts follow in Phase B.

## Start here

1. Read [PLATFORM_CONTEXT.md](PLATFORM_CONTEXT.md) for scope, ownership and invariants.
2. Follow the dependency order in [BUILD_TASKS.md](BUILD_TASKS.md); task IDs are stable references, not execution order.
3. Use [OPEN_INPUTS.md](OPEN_INPUTS.md) for unresolved business rules and confirmed owner decisions.

## Files and authority

All eight planning files stay at the workspace/repository root. Generated implementation artifacts live under docs/.

| File | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Agent reading order, boundaries and completion rules |
| [PLATFORM_CONTEXT.md](PLATFORM_CONTEXT.md) | Business, architecture, invariants and current decisions |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Requirements v2.3, REQ 01–51, launch gates 1–14 and cost assumptions |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Plan v3.2, technical contracts, recovery and traceability |
| [BUILD_TASKS.md](BUILD_TASKS.md) | Task prompts, schema prerequisites and executable dependency order |
| [OWNER_PLAYBOOK.md](OWNER_PLAYBOOK.md) | Owner workflow and evidence review |
| [OPEN_INPUTS.md](OPEN_INPUTS.md) | Unresolved business inputs and deferred recovery objectives |
| [Review decision record](docs/ADR/0000-reviewed-planning-baseline.md) | Rationale and technical audit resolutions |

PLATFORM_CONTEXT defines invariants; REQUIREMENTS defines acceptance; IMPLEMENTATION_PLAN defines technical contracts; BUILD_TASKS executes them. If they disagree, correct the lower-level instruction before implementation rather than silently overriding an invariant.

## Current decisions

- Launch one storefront plus backend/admin; preserve full Phase A and move the date until gates pass.
- Initial target: 100 orders/day, verified with staging performance and integrity tests.
- Prefer managed services that grow through plan upgrades. Use eligible free services in development; Vercel Pro before commercial hosting/minute-level cron and Supabase Pro for the production baseline.
- SES is the preferred email candidate, subject to production approval and delivery tests; provider selection is not complete.
- AI handles development and maintenance under Takib's direction; the owner handles access, purchases and production deployment.
- Standard recovery baseline now; exact acceptable loss/downtime and PITR deferred. Stop intake when necessary to protect confirmed orders.

## Intended application layout

```
apps/backend/    Express API; only business application with DB access
apps/admin/      Staff frontend
apps/site-1/     SIM storefront with embedded Studio
packages/       types, contracts, db, adapters, ui, config
jobs/           Backend job handlers and separately authorized offline tooling
docs/           ADR, API, ENV, schema history, RUNBOOKS and EVIDENCE
```

Sites 2 and 3 are later deployments. Phase A uses a second synthetic workspace to prove isolation.

## Keep documents consistent

Business decisions update PLATFORM_CONTEXT and the answered-input history. Requirement changes update their REQ and traceability. Architecture changes get a decision record. Task changes update BUILD_TASKS; external trackers are synchronized only when explicitly requested.

Status: planning files updated; no application has been built or deployed in this workspace. Implementation starts with T0/T1 and follows the dependency order. The former September 30 schedule is superseded.
