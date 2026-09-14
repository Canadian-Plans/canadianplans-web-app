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
