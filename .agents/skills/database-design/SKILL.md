---
name: database-design
description: Design schemas, migrations, indexes, and constraints - data modeling, integrity, zero-downtime schema changes, backfills. Use for any schema creation or change, migration, or data-integrity question.
---

# Database Design

The schema is the most expensive thing to change. Spend design effort proportionally.

## Modeling procedure

1. List entities with lifecycle: who creates, mutates, deletes; retention; expected row counts at 10x.
2. Write the invariants ("an order always has ≥1 line item", "email unique per tenant"). Every invariant becomes a constraint (FK, UNIQUE, CHECK, NOT NULL) — enforced in the DB, not just app code.
3. Normalize by default (3NF). Denormalize only for a measured read-path need, and document the invalidation/refresh rule for every duplicated fact.
4. List the top queries FIRST, then design indexes for them: leading columns match equality filters, then sort order; covering where hot. Every index is a write tax — justify each.
5. Types: money as integer minor units or DECIMAL (never float); timestamps in UTC with timezone type; ids: bigint sequence internally, opaque/UUIDv7 where exposed; enums as lookup/check-constrained text, not bare ints.
6. Standard columns: `created_at`, `updated_at` on every table; soft-delete (`deleted_at`) only when undelete/audit is a real requirement — remember every query must then filter it.
7. Multi-tenant: `workspace_id NOT NULL` on tenant-owned tables, tenant-scoped business uniqueness, and parent references by `(workspace_id, id)`. Use both backend authorization and RLS with transaction-local `app.workspace_id`, including missing-context and cross-workspace tests under the real restricted runtime role.

## Migration procedure (zero-downtime)

1. Inspect the existing Drizzle schema and migration scripts in `packages/db`; keep that migration history authoritative. Classify lock/compatibility risk even for additive changes. Destructive changes require explicit scope and a verified recovery path; production execution belongs to the owner.
2. Expand: add nullable-or-defaulted structures. Deploy code that writes both/reads old.
3. Migrate: backfill in bounded batches (e.g. 1–10k rows, sleep between, resumable by id cursor); monitor lag/locks.
4. Flip reads to new structure behind a flag; verify with counts/checksums old-vs-new.
5. Contract: remove old structure only after one full release cycle with zero readers (verified by search + query stats).
6. Document recovery through compatible code rollback, forward repair or tested restore as appropriate; do not invent a destructive down migration for irreversible data changes. Verify migration behavior locally or in authorized staging, using representative volumes when lock/duration risk warrants it.

## Red flags

Locking ALTER on a hot table; backfill in one transaction; FK-less "we join in the app"; EAV/JSON columns
for data you filter on; UNIQUE without considering soft-deleted rows; float money.
