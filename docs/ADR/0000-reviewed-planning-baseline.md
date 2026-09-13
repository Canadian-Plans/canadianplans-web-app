# 0000 — Reviewed planning baseline

Date: 14 September 2026
Status: accepted for the documentation update requested by the owner; provider provisioning and implementation remain separate work.

## Context and owner decisions

The owner requested technical validation of the existing Canadian Plans plan, then authorized correcting the files. The first release is one SIM storefront plus backend/admin, with later brands in Phase B. Initial target: 100 orders/day. Preserve full Phase A scope and move the date; no automatic cuts. AI does development/maintenance under the owner's direction. The owner remains responsible for access, business decisions and production deployment.

Prefer managed services that grow through plan upgrades. Free development tiers are used where eligible; paid services are acceptable when needed. Vercel Pro is acceptable. SES is a preferred candidate if suitable, not yet an approved working integration. Standard recovery is authorized now; exact loss/downtime objectives and PITR are deferred. Protect confirmed orders even when intake must pause.

## Decisions and tradeoffs

Keep the shared Express backend, Supabase DB/Auth and separate Next.js frontends. This preserves one home for business rules and multi-brand isolation without adding independent business services. Keep Sanity per brand and private R2 documents. Additional deployments are operational overhead, so affected-app deployment tests and a complete environment inventory are mandatory.

Use a server-owned machine registry for webhook account/key/workspace mappings and authenticated scheduler scopes. This closes bootstrap gaps without granting runtime-wide DB access. The tradeoff is configuration deployment for registry changes/revocation; tests must prove fail-closed behavior and isolation.

Use a single selected email adapter, with SES contingent on production approval and verified delivery/suppression events. Fake delivery is the test default. SES can reduce sending cost but adds account/event setup. Do not build automatic provider failover or assume outbox deduplication guarantees exactly-once external mail.

Retain the standard daily recovery baseline and independent encrypted archive. Specify encryption for every payload, separate credentials, manifest-aware retention, supported Auth recovery and the external deletion/suppression ledger. T4R must verify B2/Auth capabilities with synthetic data before dependent integration; T24 proves the complete restore. This is more operational work than a DB-only backup but covers the documents and identity access the business needs. No fixed recovery guarantee is implied.

Keep the eight planning files at the root so current paths resolve. Generated engineering artifacts go in docs/. This avoids relocating user files and creating two copies of the same requirement.

## Technical audit resolutions

| Finding | Resolution / implementation evidence |
|---|---|
| Retry validates consumed quote too early | Completed-order lookup first; DB uniqueness and timeout-after-commit tests in T12 |
| Mutable upload verified before copy | Copy to protected candidate first, verify and attach that exact identity; race tests in T17 |
| Raw attribution storage | Allowlisted bounded fields, origin/known route only; sanitization tests in T11/T20 |
| Machine bootstrap missing | Registered signed account/workspace and scheduler scopes; T6/T10B negative tests |
| Commission placeholder ambiguity | Remove no-op job; activation and earned commission commit together in T19 |
| Payout approval absent | Disable partner_paid until approved invoice support or owner-defined interim workflow |
| Withdrawal policy assumed | TEST both behaviors; gate real priced checkout pending OPEN_INPUTS #14 |
| Offer version/quote race | Exact fetched commercial hash drives version and quote atomically; availability separate |
| Partner/draft/quote circular dependencies | Explicit T4P/T10A/T11/T10/T12/T15/T10B order with deferred order FK |
| Server credential contradiction | Own credential allowed only on storefront server; public config split and bundle check |
| Browser CMS schema imports provider code | Browser-safe contracts/cms export; provider adapters stay server-only |
| Staging cron cannot be proved in preview | Dedicated staging backend production deployment, staging resources/fake email |
| Deadlines/cuts conflict with owner | Replace calendar with gates, retain full Phase A and stabilization/retest |
| Auth/archive/ledger recovery unspecified | T4R feasibility, §13 contract, T21 integration, T24 full rehearsal |
| Archive cleanup could delete shared objects | Separate credential, dry-run, retained-manifest reference union |
| Incomplete inputs create live bad records | TEST-only rules; real publishing/transitions/activation/payout validation |
| Deployment independence unstated | Affected-app controls, explicit production selection, SHA/compatibility evidence |
| OTP/rate-limit detail missing | Keyed code hashes, expiry/attempt/consumption rules; bounded buckets and abuse controls |
| Free-tier email/cost assumptions | REQUIREMENTS §15 cost source; SES candidate and staging/usage costs explicit |
| Traceability stale | REQ 48–51 mapped to launch gate 14; current versions v2.3 / v3.2 |
| Duplicate analytics events | One source per event type; backend outbox owns lead/order completion events |

## Remaining inputs and verification

OPEN_INPUTS retains actual business decisions, sender/provider approval, staging billing and data-retention periods. These are not invented by this review. Exact recovery objectives remain deferred as requested. Security/capacity/provider tests in the tasks are required future evidence, not tests claimed to have passed during this document edit.

References: [platform context](../../PLATFORM_CONTEXT.md), [requirements](../../REQUIREMENTS.md), [implementation plan](../../IMPLEMENTATION_PLAN.md), [build tasks](../../BUILD_TASKS.md), [open inputs](../../OPEN_INPUTS.md).

## Documentation validation

36 automated checks passed after the update: balanced fences, current planning-file paths, no patch/conflict markers, exactly one definition for each REQ 01–51, unique/resolvable task IDs, complete Phase A task order, reviewed prerequisite ordering, launch gates 1–14, engineering traceability and local Markdown links. The technical flows were also reviewed against the platform invariants. No application/runtime tests were run because this workspace contains planning documents, not an implementation.
