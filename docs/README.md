# Documentation index

Everything under `docs/` and the storefront's own docs, grouped by what you need. Read
[PLATFORM_CONTEXT.md](../PLATFORM_CONTEXT.md) first and [AGENTS.md](../AGENTS.md) for the
session workflow; this page only tells you where things are.

## Planning and decisions

| Document                                   | Use it for                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [REQUIREMENTS.md](REQUIREMENTS.md)         | Product requirements (REQ 01–51) and the Phase A launch gates in §16.                                      |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Architecture, technical contracts, delivery sequence and the REQ-to-milestone map in §19.             |
| [BUILD_TASKS.md](BUILD_TASKS.md)           | Task prompts and the dependency order (not numeric order).                                                 |
| [TASK_TEMPLATE.md](TASK_TEMPLATE.md)       | The fields every task fills in: REQ IDs, contract, schema, negative tests, evidence, rollback.             |
| [OWNER_PLAYBOOK.md](OWNER_PLAYBOOK.md)     | How the owner runs the build and what to review.                                                           |
| [OPEN_INPUTS.md](OPEN_INPUTS.md)           | Business inputs: open questions and every recorded owner decision. Never invent an answer.                 |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | From "code on `main`" to the first real order fulfilled, with production status checks.                    |
| [LAUNCH_PLANS.md](LAUNCH_PLANS.md)         | The plans, prices and promotions confirmed for launch (feeds the repo catalogue, ADR 0005).                |
| [RETENTION_POLICY.md](RETENTION_POLICY.md) | Customer-data retention and deletion rules (request-only deletion, 21 October 2026).                       |
| [ADR/](ADR/)                               | Architecture decision records 0000–0007 (planning baseline, split architecture, design system, catalogue/orders/outbox, Railway backend, repo catalogue, in-app automations). |
| [superpowers/](superpowers/specs/2026-10-27-admin-crm-and-automations.md) | Admin CRM refresh and automations: owner decisions, roadmap ([spec](superpowers/specs/2026-10-27-admin-crm-and-automations.md)) and per-phase build plans ([Phase 1](superpowers/plans/2026-10-27-admin-crm-phase-1-orders-list.md)). |

[Lead data model](LEAD_DATA_MODEL.md) documents discovery, typed values, staff screens,
permissions, compatibility, release checks and rollback ([ADR 0007](ADR/0007-lead-data-model.md)).

## Reference

| Document                                           | Use it for                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [API.md](API.md)                                   | Hand-maintained reference for the backend's `/api/v1` surface.                               |
| [api/openapi.json](api/openapi.json)               | Generated OpenAPI 3.1 document from `@canadian-plans/contracts`; CI fails if it is stale.    |
| [ENV.md](ENV.md)                                   | Every environment variable by name (values never live in the repo).                          |
| [DEPLOYMENT_INVENTORY.json](DEPLOYMENT_INVENTORY.json) | Redacted record of which credential names each preview deployment carries.               |
| [SCHEMA_HISTORY.md](SCHEMA_HISTORY.md)             | Every database migration: what changed, why, and which task introduced it.                   |
| [legal/](legal/README.md)                          | Published privacy and terms versions; version 1 files are kept as accepted-text evidence.    |

## Operations

[RUNBOOKS/](RUNBOOKS/README.md) holds the production runbooks: staff onboarding and
recovery, catalogue sync and price errors, orders, outbox jobs, dispatch and activation,
failed-email recovery, data deletion, commission month-end, observability and alerts,
backup alert response, full restore, credential rotation, release rollback, web security
headers and the monthly cost review.

## Evidence

[EVIDENCE/](EVIDENCE/README.md) holds the proof that gates passed and pages matched their
designs: task and gate evidence files (`T*`, `A*`), per-page design verification folders,
the generated storefront audit output, and the three audit and review reports.

## Marketing

[marketing/](marketing/) holds the launch posts drafted for the owner, the
22 October 2026 business-growth research note and the 23 October 2026 SEO content
research that the storefront copy rewrite is based on.

## Storefront design and CMS

The Canadian Plans storefront keeps its own docs in `apps/site-1/docs/`:

- [DESIGN_NOTES.md](../apps/site-1/docs/DESIGN_NOTES.md) — design tokens, per-page notes
  and the redesign log (the reference for any page work).
- [DESIGN_TO_CODE_PLAN.md](../apps/site-1/docs/DESIGN_TO_CODE_PLAN.md) — the 12 October
  2026 Figma-to-code plan, kept as planning context.
- [CMS.md](../apps/site-1/docs/CMS.md) — the Sanity schema, draft preview, test fixtures and
  the paused Sanity-storefront handoff.
- [apps/site-1/AGENTS.md](../apps/site-1/AGENTS.md) — rules for Figma foundation and page
  implementation tasks.
