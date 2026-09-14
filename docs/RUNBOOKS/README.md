# RUNBOOKS

Handover documents for operating Canadian Plans in production. Each names
required access, a safe stopping point, how to verify success, and an
escalation owner — always the owner (Takib); there is no one else to
escalate to (PLATFORM_CONTEXT.md "Who decides").

None exist yet. Per IMPLEMENTATION_PLAN.md §18, the following are added as
their tasks land:

| Runbook | Added by |
|---|---|
| Staff onboarding and removal | T5 |
| CMS publishing and price-error handling | T9/T10 |
| Failed-email recovery | T18 |
| Dispatch and activation | T14/T19 |
| Commission and invoice month-end | T19 |
| Backup alert response | T24/T25 |
| Full restore | T24 |
| Workspace provisioning | T4/T4P |
| Export/import | Phase B (see PLATFORM_CONTEXT.md §6) |
| Credential rotation | T25/T26 |
| Release rollback | T1 CI/Vercel setup (this task) — see below |
| Monthly cost review | T28 |

## Release rollback (interim, from T1)

Nothing deploys automatically yet — the owner is the only one who promotes a
Vercel deployment to production. Until a dedicated rollback runbook lands:

1. Vercel keeps every previous production deployment; promote the last-known
   good deployment from the Vercel dashboard.
2. No destructive migration exists yet (T4+), so there is nothing to reverse
   at the database level today.
