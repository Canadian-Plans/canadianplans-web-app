# SCHEMA_HISTORY.md

Chronological record of every database migration in `packages/db`: what
changed, why, and which task introduced it.

## 0000_cheerful_vermin.sql

Task: T4

Date: 2026-09-14

### Change

- Added the private `app` schema and enum-backed membership types, role names and permission names.
- Added the global `workspaces` registry and tenant-owned `memberships`, `roles`, `membership_roles`, `permissions`, `membership_permissions`, `service_credentials` and `audit_events` tables.
- Added UUID primary keys, UTC `timestamptz` columns, `(workspace_id, id)` unique constraints on every tenant table, composite tenant-parent foreign keys and workspace-leading secondary indexes.
- Added the login-capable, non-owner `app_runtime` role with `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `NOREPLICATION` and `NOBYPASSRLS`. Its password is provisioned outside migrations.
- Revoked `PUBLIC` access, granted `app_runtime` only schema usage and tenant-table privileges, denied direct global workspace-registry reads, limited audit events to `SELECT`/`INSERT`, and kept migration ownership on the separate migration connection.

### Why

This is the Phase A persistence and isolation foundation. It makes cross-workspace child references invalid at the constraint layer and supports serverless runtime work through the Supavisor transaction-mode pooler.

### RLS

RLS is enabled and forced on all seven tenant tables. Each `FOR ALL` policy is scoped to `app_runtime`, checks both transaction-local `app.workspace_id` and `app.actor_id`, and repeats the predicate in `WITH CHECK`. Missing or cleared settings fail closed. `workspaces` is the global registry exception and contains no tenant business records, but `app_runtime` has no direct table access; future bootstrap lookup paths must be actor- or credential-scoped.

## 0001_boring_mister_fear.sql

Task: T5

Date: 2026-09-14

### Change

- Added pending-invitation identity fields and lifecycle timestamps to memberships, constrained the pending/active/revoked states, and indexed actor bootstrap plus normalized pending email matching.
- Added allow/deny effects to individual membership permissions so an explicit individual decision overrides the role matrix.
- Added the narrowly granted `app.accept_staff_invitations` and `app.list_staff_workspaces` bootstrap functions. They read the transaction-local, server-verified actor context; the first claims only matching pending staff invitations and audits each claim, while the second returns only that actor's active membership/workspace metadata.
- Added an idempotent, non-production synthetic seed for isolated `site-1` (Northern Arrival Mobile) and `demo-2` (Maple Demo Sandbox), with one distinct staff user per workspace and the owner in both.

### Why

T5 requires authorization state to be current on every protected backend request, revocation to beat token expiry, and a pre-tenant workspace switcher lookup that cannot enumerate tenants. Pending invitations need an email identity until the first verified login binds the Supabase actor UUID.

### RLS

Existing forced tenant RLS remains unchanged for ordinary operations. The restricted runtime role receives only `EXECUTE` on the two fixed-shape bootstrap functions; `PUBLIC` execution is revoked. Tenant authorization reads and invitation/removal writes still run inside `withTenantTx` with both actor and workspace context.

## 0002_shallow_ogun.sql

Task: T5

Date: 2026-09-14

### Change

- Changed all seven tenant RLS policies to evaluate the transaction-local actor
  and workspace settings through scalar subqueries.

### Why

Supabase's database advisor identified that evaluating `current_setting()` for
every row would add avoidable work at scale. The scalar-subquery form creates an
initialization plan while preserving the same fail-closed predicate.

### RLS

The policy scope, `USING` conditions, `WITH CHECK` conditions, and restricted
runtime role are unchanged; only evaluation frequency changed.

## 0003_chubby_songbird.sql

Task: T5

Date: 2026-09-14

### Change

- Moved each `current_setting()` call itself into a scalar subquery in all seven
  tenant policies.

### Why

This is the exact initialization-plan shape recognized by Supabase's database
advisor and avoids per-row session-setting evaluation.

### RLS

Authorization behavior remains unchanged. The connected Supabase project reports
no security findings and no remaining RLS initialization-plan warnings.

## 0004_simple_hellfire_club.sql

Task: T6

Date: 2026-09-14

### Change

- New `app.rate_limit_buckets` table: bounded per-key fixed-window counters
  (`bucket_key` + `window_start` primary key, `request_count`, `expires_at`).
- New global unique constraint `service_credentials_secret_hash_unique` so a
  credential secret resolves to exactly one workspace.
- New SECURITY DEFINER bootstrap functions (search_path `''`):
  `app.resolve_website_credential(secret_hash)` returns the credential's own
  workspace/scopes/revocation before tenant context; `app.rate_limit_hit(key,
window_seconds, max_count)` records a hit and reports allow/retry with a short
  `lock_timeout` and opportunistic bounded expiry cleanup.
- `EXECUTE` on both functions granted to `app_runtime`.

### Why

T6 storefront-to-backend authentication (PLATFORM_CONTEXT §4b website bootstrap;
IMPLEMENTATION_PLAN §5 public abuse controls). The website credential resolves
its own workspace without a caller-supplied workspace and without a broad
cross-tenant read; the durable limiter uses per-key rows, never a global hot
counter.

### RLS

`rate_limit_buckets` has RLS enabled and FORCED with **no** policy and **no**
`app_runtime` table grant, so the runtime role reaches it only through
`app.rate_limit_hit`. `service_credentials` keeps its existing tenant policy;
`app.resolve_website_credential` is the sole pre-tenant read path, scoped to a
single secret-hash lookup.

## 0005_reinvitation.sql

Task: Foundation review / T5 correction
Date: 2026-09-14 (disposable PostgreSQL only; not applied to hosted resources)

Replaces `accept_staff_invitations` without editing historical migrations.
Re-invitation preserves a revoked staff membership's identity, replaces its
roles with the fresh invitation's roles, clears old permission overrides, and
audits both consumption and acceptance. Invitations for an already-active
identity are consumed/audited without changing roles. Actor advisory locking
and row locking serialize concurrent acceptance. Existing SECURITY DEFINER,
empty search path and restricted EXECUTE grants are retained; no broader RLS
policy or application grant is added.

## 0006_square_vindicator.sql

Task: T4P

Date: 2026-09-16

### Change

- New tenant table `app.partners` (referral agencies): `name`, `referral_code`,
  `status` constrained to `pending`/`approved`/`suspended`, `created_at`.
- `(workspace_id, id)` unique constraint (so T19's commission/invoice tables can
  compose-FK to a partner without recreating this table) and a case-insensitive
  `(workspace_id, lower(referral_code))` unique index so a referral code is
  unique per workspace but reusable across workspaces. Workspace-leading index
  on `status` for admin listing/lookup.
- Extended the non-production synthetic seed with one `approved`, one
  `suspended` and one `pending` partner for `site-1`.

### Why

T4P is the partner schema prerequisite for T11 (lead referral-code attribution)
and T19 (commissions/invoices). Keeping this table minimal and stable lets T19
extend it with composite foreign keys instead of recreating it.

### RLS

Added the standard `partners_tenant_policy` (`FOR ALL`, scoped to
`app.workspace_id`/`app.actor_id`, fail-closed) and forced RLS, following the
same shape as every other tenant table. `app_runtime` is granted
`SELECT, INSERT, UPDATE, DELETE` on `app.partners`, matching the original
tenant-table grant in `0000_cheerful_vermin.sql`.

## 0007_stormy_infant_terrible.sql

Task: T10A

Date: 2026-09-16

### Change

- New tenant table `app.products`: workspace ownership plus `product_key`,
  the stable CMS identifier from the `product` document
  (`packages/contracts/src/cms/schema-types.ts`); unique per workspace.
- New tenant table `app.offer_versions`: immutable commercial-content
  snapshots. `content` (jsonb) plus `content_hash`, unique on
  `(workspace_id, product_id, content_hash)` so re-syncing unchanged content
  never creates a duplicate version. `cms_document_id`/`cms_revision_id` are
  nullable CMS revision provenance, kept out of the uniqueness key so
  reconfirming a version from a later revision is not a new row.
- New tenant table `app.product_availability`: one mutable row per product
  (`product_id` primary key) with a nullable `revoked_at`, kept separate from
  the immutable version history so unpublishing never edits it.
- `(workspace_id, id)` unique constraints on `products`/`offer_versions` so
  T11 can add a composite `(workspace_id, offer_version_id)` foreign key
  without recreating either table.

### Why

T10A is the catalogue schema prerequisite for T11 (leads/quotes reference an
offer version) and T10 (catalogue sync, which owns computing the content hash
and writing these rows). IMPLEMENTATION_PLAN.md §6 "Offer synchronisation"
requires uniqueness on workspace + product + content hash and separate
mutable availability/revocation records so an unpublish never rewrites
immutable history.

### RLS

Added the standard `products_tenant_policy`, `offer_versions_tenant_policy`
and `product_availability_tenant_policy` (`FOR ALL`, scoped to
`app.workspace_id`/`app.actor_id`, fail-closed) and forced RLS on all three.
`app_runtime` is granted `SELECT, INSERT, UPDATE, DELETE` on `products` and
`product_availability`, but only `SELECT, INSERT` on `offer_versions` — the
same immutability enforcement already used for `audit_events` — so no
application code path can update or delete a published version.

## 0008_first_garia.sql

Task: T11

Date: 2026-09-16

### Change

- New tenant table `app.leads`: `status` constrained to `incomplete`/`submitted`,
  individually nullable contact fields, `selected_offer_version_id` (composite
  FK to `offer_versions`), `payload` jsonb (the versioned form), `attribution`
  jsonb (defaults to `{}`, always the backend's sanitized snapshot — never raw
  request data), `consent_version`, and a mutable `updated_at` (repeated saves
  update the same row). `(workspace_id, id)` unique so `draft_grants` — and any
  future table — can compose-FK to a lead.
- New tenant table `app.draft_grants`: `lead_id` (composite FK to `leads`,
  cascade), a globally unique `token_hash`, `expires_at`, and a reserved
  `revoked_at` (no revoke endpoint yet).
- `app.resolve_website_credential` now also returns the credential's own `id`.
  The website flow has no human Supabase actor, so every tenant policy's
  `app.actor_id IS NOT NULL` predicate needs something else non-null; the
  service credential's own id — the one verified identity that exists at that
  point — is now used as `actorId` for its tenant writes. The migration drops
  the previous function signature before recreating it because PostgreSQL does
  not allow `CREATE OR REPLACE FUNCTION` to change OUT parameters.

### Why

T11 (leads and draft grants; REQ 16/17/34/35). A prospective customer's draft
must survive across requests without any account, be resumable only by its own
grant, and never leak cross-workspace even though multiple workspaces can
share the same attribution values. The `resolve_website_credential` change is
the minimal fix needed to give the leads module _any_ non-null actor id to run
`withTenantTx` with — without it, no website-originated tenant write could
ever satisfy the existing RLS predicate.

### RLS

Added the standard `leads_tenant_policy` and `draft_grants_tenant_policy`
(`FOR ALL`, scoped to `app.workspace_id`/`app.actor_id`, fail-closed) and
forced RLS on both, with the usual `SELECT, INSERT, UPDATE, DELETE` grant to
`app_runtime`. `resolve_website_credential` remains the sole pre-tenant read
path and is otherwise unchanged (still one secret-hash lookup, still
`SECURITY DEFINER` with an empty search path); a draft grant itself is always
resolved _inside_ an already-established tenant context, so it needed no
SECURITY DEFINER function of its own.

## 0009_brainy_revanche.sql

Task: T10A/T11 review repair

Date: 2026-09-16

### Change

- Added nullable `leads.partner_id` with a composite
  `(workspace_id, partner_id)` foreign key to `partners`. Approved codes now
  persist the partner identity; unknown, suspended and foreign-workspace codes
  remain recorded in bounded attribution but leave `partner_id` null.
- Changed the `offer_versions` product foreign key from cascading delete to
  `NO ACTION`, preventing runtime product deletion from removing immutable
  commercial history.

### Why

REQ 31 requires referred leads to carry the partner ID so T12 can copy it to
the order without resolving a mutable referral code again. Immutable offer
history must survive product withdrawal and attempted deletion.

### RLS

No policy change. Both relationships retain the existing workspace-scoped RLS
and composite foreign-key enforcement.

## 0010_unknown_stingray.sql

Task: T10

Date: 2026-09-16

### Change

- Added tenant-scoped `catalogue_sync_events` (deduplicated durable Sanity inbox),
  `catalogue_sync_leases` (expiring `(workspace, product_key)` leases), and
  `catalogue_sync_state` (last attempt/success/error for staff visibility).
- Added tenant-scoped `quotes`, linked by composite foreign keys to the draft,
  product, and exact immutable offer version. Charges, payment setting,
  document checklist, terms version, expiry and revocation are persisted;
  T12 adds `consumed_by_order_id` after orders exist.
- Extended `product_availability` with the current immutable version pointer
  and last-sync time. Added `(workspace_id, product_id, id)` uniqueness to
  `offer_versions` so availability and quotes cannot pair a product with
  another product's version.

### Why

T10 requires signed durable webhook intake, per-product serialization,
out-of-order convergence, an observable reconciliation state, and quotes that
remain tied to the validated CMS payload used to create their immutable
version. Withdrawal changes mutable availability/quote revocation; it never
edits offer history.

### RLS

All four new tenant tables use the standard fail-closed workspace/actor policy,
with RLS enabled and forced. `app_runtime` has only the operations used by the
inbox processor, lease manager, status writer and quote revocation flow;
`offer_versions` retains its prior `SELECT, INSERT`-only grant.

## 0011_lovely_blur.sql

Task: T12

Date: 2026-09-16

### Change

- Added tenant-scoped `orders` with independently constrained fulfilment,
  payment, delivery and archive state, optimistic versioning, immutable
  commercial snapshot, versioned form payload, partner attribution and a
  non-guessable workspace-unique reference.
- Added `order_status_history`, `order_amendments`,
  `order_change_requests`, `idempotency_keys`, `outbox_jobs`,
  `dispatch_records`, and `payment_records` with composite tenant foreign keys.
- Extended `quotes` with paired `consumed_by_order_id` / `consumed_at` fields
  and a workspace-scoped order foreign key.
- Enforced one order per `(workspace_id, lead_id)` and one submission claim per
  `(workspace_id, scope, key_hash)` in Postgres.
- Added an update trigger that rejects changes to submitted order identity,
  reference, snapshot, payload, partner attribution and submission timestamps;
  operational state remains mutable only through transition functions.
- Added an idempotency trigger that freezes the scoped key identity and makes a
  completed stored outcome immutable.

### Why

REQ 14/18/19 and invariants 5–7/9 require immutable submitted commercial
history, exact retry outcomes before quote revalidation, database-enforced
single-order guarantees, transactional follow-up jobs, and independent order
state dimensions with audited transitions.

### RLS

Every new tenant table uses the fail-closed workspace/actor policy with RLS
enabled and forced. Runtime grants omit DELETE from orders and their history;
the submission path receives only the SELECT/INSERT/UPDATE operations it uses.

## 0012_dashing_bug.sql

Task: T15

Date: 2026-09-16

### Change

- Extended the existing `outbox_jobs` table with stable message IDs, payload
  versions, persisted lease ownership/expiry, last-attempt timestamps,
  provider IDs, bounded outcomes, and an explicit uncertain-delivery state.
- Added `outbox_job_alerts` for terminal and uncertain delivery alerts without
  recreating the order-owned outbox table.
- Added lease, attempt, payload-version, and status constraints. In-flight rows
  from the pre-lease schema are safely returned to pending during migration.

### Why

Invariant 7 and T15 require durable at-least-once processing: an atomic claim,
provider work after commit, a separately committed outcome, stable provider
deduplication, bounded retry, and visible terminal failures.

### RLS

The alert table has tenant policy, forced RLS, and only SELECT/INSERT/UPDATE
runtime grants. Existing forced RLS on `outbox_jobs` remains unchanged; every
runner operation supplies both workspace and scheduler actor transaction
context.

## 0013_order_consent.sql

Task: T12 (gap G2)

Date: 2026-09-16

### Change

- Added a nullable `consent` jsonb column to `orders`, guarded by
  `orders_consent_object_check` (`consent is null or jsonb_typeof(consent) =
'object'`) so any stored value is an object. Nullable keeps the migration
  additive for orders that predate the column; the submission path always
  writes it going forward.
- Extended `prevent_order_submission_mutation` (via `CREATE OR REPLACE`) so a
  submitted order's `consent` is immutable alongside its identity, snapshot,
  payload and partner attribution.

### Why

Invariant 11 (CASL) requires the terms version, marketing opt-in and marketing
consent version accepted at capture to be recorded and preserved. The
submission previously stored only the form and terms version, dropping the
marketing consent the request carried.

### RLS

None — `orders` already has the fail-closed tenant policy with forced RLS and
runtime grants unchanged. The added trigger clause protects consent under the
same immutability guarantee as the rest of the submitted order.

## 0014_concerned_karen_page.sql

Task: T10/T12/T15 review (G22)

Date: 2026-09-17

### Change

- Added `app.catalogue_sync_events.actor_id` (`uuid NOT NULL`), the verified
  machine actor that ingested each webhook delivery. The migration adds the
  column nullable, backfills every existing row with its own `id` — the actor
  the pre-change code used — then enforces `NOT NULL`, so it is safe on a
  populated database.
- New ingest writes the registry entry's `actorId`, and every later drain or
  manual sync write reuses the actor persisted on the inbox row.

### Why

G22 requires stable attribution for catalogue writes. Deriving the actor from
the event id or a fresh random UUID per pass would attribute a sync to an
identity that no longer corresponds to the verified machine credential, and
would change on every retry.

### RLS

No RLS predicate change. The column is added to an existing tenant table whose
fail-closed workspace/actor policy and forced RLS are unchanged; every write
still runs inside `withTenantTx` with a non-null actor.

## 0015_organic_roland_deschain.sql

Task: T14

Date: 2026-09-17

### Change

- Added `app.order_notes` (`workspace_id`, `order_id`, `author_id`, `body`,
  `created_at`) as the append-only operational contact notes REQ 20 requires.
  `body` is constrained to 1–2000 characters and the composite
  `(workspace_id, order_id)` foreign key makes a note impossible to attach to
  another workspace's order.
- Added `app.order_reminders` (`workspace_id`, `order_id`, `created_by`,
  `remind_at`, `note`, `created_at`) for scheduled follow-ups; `note` is
  optional and length-bounded, and reminders are deletable so a follow-up can be
  cancelled before T18's sending path re-checks customer status.
- Both tables carry the mandatory `(workspace_id, id)` unique constraint,
  workspace-leading indexes (`order_notes_workspace_order_created_idx`,
  `order_reminders_workspace_order_remind_idx`,
  `order_reminders_workspace_remind_at_idx`), the fail-closed tenant policy, and
  forced RLS.
- Grants: `app_runtime` receives `SELECT, INSERT` on `order_notes` (append-only)
  and `SELECT, INSERT, DELETE` on `order_reminders`. The generated diff omitted
  the `FORCE ROW LEVEL SECURITY` and `GRANT` statements, so both were added
  explicitly, matching the 0011/0012 pattern.

### Why

T14's admin order journey includes notes and reminders (REQ 20), which
IMPLEMENTATION_PLAN §4 places in the Operations record group. They are separate
child records rather than columns on `orders` so adding a note or a reminder
never races a concurrent status transition on the order envelope, and so the
order's optimistic-concurrency version still guards the fields two people could
otherwise overwrite.

### RLS

Both tables use the same `FOR ALL` policy for `app_runtime` comparing
`workspace_id` to the transaction-local `app.workspace_id` and requiring a
non-null `app.actor_id`, repeated in `WITH CHECK`. RLS is enabled **and forced**,
so the table owner does not bypass it. Existing tenant tables are unchanged.

## 0016_bumpy_puppet_master.sql

Task: T21

Date: 2026-09-20

### Change

- Added tenant table `app.deletion_intents` (id, workspace_id, action, subject_type, subject_id, status, reason, actor_id, ledger_ack_id, last_error_code, created_at, acknowledged_at), the local mirror that drives the external deletion ledger.
- Constrained `status` to `pending|acknowledged|failed`, `action` to `delete_customer_data`, and `subject_type` to `order`, with `(workspace_id, id)` uniqueness and a `(workspace_id, status)` index.
- No personal data is stored: identifiers and an action only. The staff reason is bounded by the API contract.

### Why

REQ 24 / REQ 34: a customer-data deletion must be recorded in a minimal ledger held outside any single application-database snapshot so a restore can replay it before reopening. This table is the restricted local intent (§13), not the durable ledger.

### RLS

Tenant RLS enabled and forced on `deletion_intents`, scoped to `app_runtime`, requiring transaction-local `app.workspace_id` and a non-null `app.actor_id`, repeated in `WITH CHECK`. Existing tables are unchanged.

## 0017_worthless_synch.sql

Task: T22

Date: 2026-09-20

### Change

- Added tenant table `app.tracking_challenges` (id, workspace_id, order_id, email_hash, code_hash, status, attempts, expires_at, created_at, consumed_at), the one-time-code challenges for customer order tracking.
- Constrained `status` to `pending|consumed` and `attempts >= 0`, with `(workspace_id, id)` uniqueness, an order FK and `(workspace_id, order_id, status)` / `(workspace_id, email_hash)` indexes.
- Stores only keyed hashes bound to workspace, order and normalized email; the plaintext code is never persisted.

### Why

REQ 05 / IMPLEMENTATION_PLAN §5: a verified customer may track an order after a six-digit email code, with at most five attempts and a 10-minute expiry, and no enumeration of orders.

### RLS

Tenant RLS enabled and forced on `tracking_challenges`, scoped to `app_runtime`, requiring transaction-local `app.workspace_id` and a non-null `app.actor_id`, repeated in `WITH CHECK`.

Each future entry follows this shape:

```
## <migration file name>

Task: T<n>
Date: <date applied>

### Change

<tables/columns/policies added or changed>

### Why

<the requirement or invariant this satisfies>

### RLS

<policies added/changed, or "none — see invariant N for why">
```

## 0016_futuristic_marvel_zombies.sql

Task: T19
Date: 2026-09-20

### Change

Adds the partner commission model, all workspace-scoped:

- `commission_rules` — workspace-scoped, time-bounded rules (`rule_type`
  fixed|percentage, `value_minor`, `currency`, `is_test`, `effective_from`,
  nullable `effective_to`). Immutable: `app_runtime` gets SELECT/INSERT only.
- `commission_lines` — one earned commission per activated order, with
  `rule_snapshot` (JSONB), `amount_minor`, `currency`, `state`
  (earned|carrier_paid|partner_paid) and nullable `invoice_id`. The unique
  `(workspace_id, order_id)` is what guarantees exactly one line per order
  (invariant 10). `app_runtime` gets SELECT/INSERT/UPDATE (state + invoice link).
- `commission_line_events` — append-only state history; SELECT/INSERT only.
- `invoices` / `invoice_lines` — tables only in Phase A (no generation UI).
  One invoice per `(workspace_id, partner_id, period_start, period_end)`;
  sequential `invoice_number` per workspace; a commission line links to at most
  one invoice (`unique (workspace_id, commission_line_id)` on `invoice_lines`).

### Why

PLATFORM_CONTEXT.md §4 item 10 and REQ 31–33: commission is earned exactly once
on activation with the rule snapshotted; rule changes never alter existing lines;
commission state is independent of order status; invoice generation is idempotent
(the uniqueness keys enforce this at the database, not in application code).

### RLS

Every table uses the standard `FOR ALL` `app_runtime` tenant policy comparing
`workspace_id` to `app.workspace_id` with a non-null `app.actor_id`, repeated in
`WITH CHECK`, RLS enabled and forced. Grants are the immutability lever:
commission_rules and commission_line_events are SELECT/INSERT only (like
offer_versions/audit_events); commission_lines and invoices/invoice_lines add
UPDATE where a later transition legitimately mutates state.
