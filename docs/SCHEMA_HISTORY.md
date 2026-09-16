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
