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
