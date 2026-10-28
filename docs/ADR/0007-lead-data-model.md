# ADR 0007: Lead fields and personal views

Date: 27 October 2026. Status: accepted for implementation by the owner's task.

## Context

Staff need a Twenty-style Settings → Data model → Leads area, with Fields,
Settings and Layout tabs. The owner explicitly limits this to leads, per site,
without custom objects or a website form builder. Website forms remain developer
built. This is compatible with PLATFORM_CONTEXT.md's baseline and invariants.

## Decision

Use code-owned built-in definitions, per-workspace field rows, and a dedicated
`leads.custom_values` JSON object. Never execute DDL when staff change a field.
Built-in storage remains in existing columns and the versioned form envelope.
One typed projection joins those sources for staff use. Stable keys, rather than
labels, are the future automation interface.

Keep deleted custom definitions as tombstones. Their immutable keys remain
reserved forever; deleting a field means removing it from the usable model, not
reclaiming its identifier. Lock model writes and custom-value writes in the same
workspace transaction before checking usage. Check all leads, including restricted
and any future trashed rows. Built-ins can only be hidden.

Use separate lead views rather than widening the existing order-view schema:
lead views may contain personal filter values and need field-aware validation on
every read/write/use. Tenant-and-actor RLS protects them. Neither their names nor
filters enter audit values. Customer erasure also scrubs free-text filter values
from every personal lead view in that workspace (migration 0030): typed text
cannot reliably be attributed to one customer, while the views themselves, their
columns, sort and option, date, number and yes/no filters hold no customer data
and stay. Ordinary restriction, including the abandoned-draft prune, leaves views
untouched.

The existing website already supports SIM, mobile and internet. Preserve these
code-defined types, plus a code-only legacy type for rows that cannot be classified.
Do not label an ambiguous historical row as a SIM application. The additive
migration derives type from the stored form category, then the offer's product
type, then the old SIM field signature; otherwise it uses legacy. New old-client
SIM requests without a category remain supported. No working-stage feature is
introduced.

Management uses `manage_data_model` → `data_model.manage`, owner by default,
grantable through existing membership permissions, requiring verified MFA. This
permission alone does not grant personal-data access. Field queries require the
existing `order.manage` or `financial.read` decision. Sensitive fields never
participate in queries, columns, views or exports, regardless of role.

## Consequences

JSON permits schema-free field changes but requires guarded query expressions and
bounded definitions, filters and views. No dynamic expression indexes are created.
The initial workspace/type indexes support tenant-scoped scans; measure before
adding reviewed indexes. Operational fields and consent/document flow metadata
are read-only in the staff field editor. Order snapshots and pricing never read
custom values. See the [design and discovery note](../LEAD_DATA_MODEL.md).
