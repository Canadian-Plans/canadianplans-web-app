# Lead data model

Design recorded before implementation, 27 October 2026. Scope: leads only.
Owner decisions are in the supplied task; [ADR 0007](ADR/0007-lead-data-model.md)
records the storage and compatibility choices.

## Discovery

Sources inspected: root AGENTS and platform context; project workflow, database,
API, authorization, security, frontend, testing and local Supabase skills; schema,
migrations, contracts, route handlers, lead/order/tracking/deletion stores,
storefront form/resume/actions, admin shell/settings/list, CI and test helpers.

Twenty references read on 27 October:
[overview](https://docs.twenty.com/user-guide/data-model/overview),
[fields](https://docs.twenty.com/user-guide/data-model/capabilities/fields),
[core concepts](https://docs.twenty.com/getting-started/core-concepts/data-model).
The reference distinguishes standard and custom fields, configures them through
Settings, and preserves data on deactivation. We follow that interaction pattern
in the existing shadcn admin; we do not adopt Twenty's custom objects or runtime DDL.

### Current storage and access

`packages/db/src/schema.ts` defines `app.leads`: nullable contact columns,
status (incomplete/submitted), partner and offer-version composite tenant foreign
keys, consent version, attribution JSON, versioned form JSON and restriction time.
There is no lead type, stage, lead detail page, lead timeline, or lead trash flag.
The existing list is paged, read-only and status-filtered. Order views already
exist, are personal, and use tenant-and-actor RLS; their shape is order-specific.

Drizzle generation is `pnpm --filter @canadian-plans/db db:generate`; review the
SQL and snapshot/journal, add FORCE RLS and explicit runtime grants, then use
`db:migrate` with the migration role. Runtime uses `withTenantTx`, transaction-local
workspace/actor settings, `prepare:false`, and the restricted `app_runtime` role.
All new tenant tables require workspace IDs and composite parent foreign keys.

Staff roles: owner, orders, partners, finance, content, viewer. Authorization lives
in `apps/backend/src/staff/authorization.ts`. Individual allow/deny rows override
role permissions; deny wins. Privileged operations require `aal2`. Personal lead
contact access currently follows order.manage OR financial.read. A data-model
grant must not implicitly grant either. Permission storage/loading exists, but
there is no general per-member grant UI/API; add a narrow owner-only grant path.

Admin uses Next App Router, shared shadcn primitives and the existing Twenty-style
CRM shell. Settings is under `/w/[workspace]/settings`; leads under `/leads`.
The supplied Figma reference is for the storefront, whose appearance does not
change. Controls need labels, native keyboard behavior, status announcements,
loading/error/empty/denied states and sortable-header aria-sort.

Audit events already record actor, action, entity, timestamp and request ID.
Website lead updates record broad changed-field names, not values. Orders have
their own histories and amendments; do not repurpose those for lead history.

### Read, write and erase inventory

| Path                                            | Current responsibility                              | Feature coverage                                                               |
| ----------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| site-1 order/actions and pre-arrival wrapper    | Save contact/form; create/update/resume draft       | Send type; preserve form messages, grants and envelope                         |
| backend routes/website and leads/store          | Website intake and grant-scoped reads/writes        | Allowlist new input, separate custom values, preserve old stored keys          |
| orders/store                                    | Lock draft, submit once, change lead status/offer   | Keep retry-first ordering and commercial snapshot; add value-free lead history |
| orders/staff-actions                            | Approved contact amendment updates originating lead | Record changed keys without copying amendment values into lead history         |
| synthetic/check                                 | Synthetic draft/order probe                         | Valid empty draft remains accepted                                             |
| db/seed and backend e2e harness/tests           | Synthetic workspace/lead fixtures                   | Default/inferred type; seed built-ins on first model use                       |
| admin leads-list; staff routes                  | Paged lead visibility                               | Body-based search, explicit projections, detail and views                      |
| orders/query-store, transitions, tracking/store | Order contact/tracking reads                        | Existing explicit projections; custom values never added                       |
| documents/grant, resolver; website/session      | Draft access and document commercial context        | Existing grant/restriction checks; no custom document access                   |
| reports/store                                   | Source/partner aggregates                           | Keep existing dimensions; do not introduce field values                        |
| jobs/providers and email handlers               | ID-based events and explicit email data             | No custom values in outbox, analytics or mail                                  |
| catalogue/store                                 | Product commercial definitions                      | No lead custom values enter catalogue/quote/price                              |
| deletion/store, restriction, cleanup, replay    | Restrict then erase; replay deletion after restore  | Erase custom JSON with contact/form; purge lead view filters                   |
| retention/abandoned-leads                       | Existing incomplete-draft cleanup                   | Erase custom JSON; no change to retention policy                               |
| exports contracts                               | Phase B seam, no lead export implementation         | Do not add fields or expose sensitive values                                   |

No import implementation was found. No production database was accessed.

### Website fields and compatibility

`apps/site-1/src/app/(storefront)/order/details.ts` owns current validation and
`buildOrderForm`; `resume.ts` decodes schema version 1. All categories require
fullName (1–160), email (≤254) and phone (≤32; SIM ≥5 chars, Canadian flows ≥10
digits). SIM also requires ISO country code, currentCountry (1–80), destination
(1–160), arrivalDate (YYYY-MM-DD). Internet requires province, dateOfBirth
(valid date and existing configured age limits), address.street (1–200), city
(1–80), Canadian postal code; unit ≤40 is optional. Provider and preferred
installation time ≤120 are optional. Mobile requires lines (existing MIN/MAX),
provider from its code list, keepNumber, simType, the address, and credit consent.
Keep these website rules and their messages unchanged. Staff custom fields have
no required option. Partial draft intake permits missing built-ins.

Form flow values are category, documents.required/acknowledged, creditCheck
consent/version, and callbackRequested. Contact remains in columns. SIM's old form
has no category; mobile/internet forms do. These flow fields remain code-owned,
read-only, and bounded; they never become editable commercial inputs.

A disposable local database (`canadian_plans_test`, loopback only) was migrated
through 0028 and populated with four synthetic forms based on those source shapes.
A `jsonb_each(payload->'payload')` query found: address/documents/creditCheck as
objects; keepNumber/callbackRequested as booleans; lines as number; arrivalDate,
category,currentCountry,currentProvider,dateOfBirth,destination,
preferredInstallationTime,province,simType as strings. A synthetic legacyAnswer
string proves unknown historical keys exist in the free-form storage model. This
is a synthetic compatibility experiment, not evidence of production contents.

### Verification baseline

Vitest covers contracts, components and real-database integration. CI uses
Postgres 15, restricted-role isolation, destructive-test opt-in and `_test`
database-name guards. Use distinct synthetic IDs and clean per-test-owned rows
so new tests can run twice. Playwright covers admin shell, storefront/security
and real-backend order journeys. Commands: typecheck, lint, format, test:tooling,
test, contracts build (OpenAPI generated and git-diffed), build, test:e2e.
This workspace's local binary is Postgres 18; CI remains the Postgres 15 gate.

## Data and validation

`lead_type` is NOT NULL with a code-list check and `(workspace_id, lead_type)`
index. Expand with a constant legacy default so old deployments can still insert.
Backfill category, then offer content.productType, then SIM form signature. A
compatibility trigger classifies inserts from older backends. Migration uses a
bounded-lock timeout and fails safely rather than waiting indefinitely; inspect
live counts read-only before release and use a maintenance window for large data.

Field definitions have workspace/id, immutable key, label (1–80), description
(≤500), icon (allowlisted), immutable type, options, origin, active state,
applicable lead types (empty means all), sensitive/website/staff-editable flags,
created/updated actor IDs and timestamps, plus deletion time. Keys are generated
from the first label with `custom_` prefix, ASCII snake case and a collision suffix;
reserved tombstones prevent reuse. Built-in definitions come from code, with only
active/label and option display labels/colours overridden per site. Built-in
identity/document fields are locked sensitive. Select values are stable, labels
and colours editable, and hidden options retain old values.

| Type         | Valid stored custom value                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| text         | Trimmed nonempty string, ≤500 chars                                                                                            |
| long_text    | Nonempty string, ≤10,000 chars                                                                                                 |
| number       | Finite number, absolute value ≤1e12                                                                                            |
| boolean      | JSON true or false                                                                                                             |
| date         | Real ISO calendar date                                                                                                         |
| datetime     | ISO UTC timestamp                                                                                                              |
| select       | One declared stable option value                                                                                               |
| multi_select | Unique declared option values, 1–50                                                                                            |
| phone        | `{number,countryCode}`: international number ≤32, country ISO alpha-2                                                          |
| email        | `{address}`: valid email ≤254, normalized lowercase                                                                            |
| address      | `{street,unit?,city,province?,postalCode,country?}`; street≤200, unit≤40, city/province≤80, postalCode≤20, country ISO alpha-2 |
| links        | 1–10 `{url,label?}` entries; http/https URL≤2048, label≤80                                                                     |

Null is the explicit clear command; remove the JSON property, never store an
empty string. Composite values are strict objects. Built-in contact phone/email
project into these shapes without changing physical storage. Legacy flow objects
project as read-only display fields, with original storage untouched.

A shared edit function validates active/editable/applicable fields, normalizes
values, removes cleared values and returns changed keys. All writes use it.
Sensitive data is returned only in authorized detail responses. Legacy unknown
keys appear at the end for personal-data readers, humanized from their keys;
they are never queryable, sortable or exported.

Layouts are per workspace/type, ≤20 named sections, ≤200 unique field keys.
Sections and field order have drag/drop plus move-up/down and section-selection
controls. Object settings hold display name and a validated nonsensitive default
sort. Personal views are per workspace/actor, ≤30 views, name 1–60, ≤12 unique
columns, ≤10 filters, one sort, optional type/status. Revalidate references when
the model changes. Never return stale sensitive filters or columns after a field
becomes sensitive or the reader loses access.

## API and behavior

All paths below are under `/api/v1/staff/workspaces/:workspaceId`. Responses use
shared Zod contracts and request IDs; errors use the existing error envelope.
Malformed input: 400; no session: 401; denied/MFA: 403; missing/foreign resource:
404; version/usage conflict: 409. Unexpected errors are generic and value-free.

| Endpoint                                                     | Access                                            | Behavior                                                |
| ------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------- |
| GET/POST data-model/leads/fields                             | data_model.manage + MFA                           | Bounded field list / create                             |
| PATCH/DELETE data-model/leads/fields/:id                     | same                                              | Edit, deactivate/reactivate, delete-if-empty            |
| GET/PATCH data-model/leads/settings                          | same                                              | Name and default sort                                   |
| GET/PATCH data-model/leads/layouts/:type                     | same                                              | Section/order layout                                    |
| GET leads/model                                              | workspace.read                                    | Reader-safe definitions, capabilities, settings/layouts |
| POST leads/search                                            | workspace.read; personal access for field queries | Body filters/sort/columns, page≤200                     |
| GET/PATCH leads/:id                                          | workspace.read / order.manage                     | Detail / validated field edit and history               |
| GET/POST leads/views; PATCH/DELETE leads/views/:id           | personal access, actor ownership                  | Personal views with validation                          |
| GET memberships/data-model; PATCH memberships/:id/data-model | staff.roles.manage + MFA                          | Owner grants/revokes this permission                    |

Field type/key/origin cannot change. A custom field can be deactivated anytime.
Delete checks every lead in the same locked transaction; a refusal returns a
count only to personal-data readers, otherwise a generic conflict. Option removal
checks usage under the same lock; hiding preserves its stable value. Model changes
are audited with IDs, action and changed property names, never field values or
view contents. Lead history reuses append-only audit events for actor/time/changed
keys and resolves current field names; no duplicate value-bearing history store.

Search operators: empty/not_empty for all; eq/neq for scalar types; contains and
starts_with for text/contact/links; gt/gte/lt/lte for numbers and dates; has_any /
has_all for multi-select. Address requires a city/province/postalCode/country part.
Phone matches digits, email lowercase; text uses case-insensitive matching with
`%`, `_` and backslash escaped. Every key/value is bound, never SQL text. Guard
stored JSON types before numeric/date comparisons; malformed stored values return
null and do not match. Nulls sort last in both directions, followed by lead ID.
Every query includes workspace and excludes restricted leads before pagination
and total counts. No arbitrary JavaScript post-filtering of paged results.

Website intake validates schema-version-1 keys against built-ins and enabled,
applicable, website-accepted custom fields. Custom values are stored separately
and never copied into order submission or commercial calculations. Hidden built-in
fields still accept website input because visibility cannot break checkout.
Unknown existing draft keys may be retained unchanged; new or modified unknown
keys are rejected. Missing type is inferred for old clients. Grant checks and
submitted-state locks happen before a resumed write. Idempotent order retry logic
is unchanged and returns its existing result before new validation.

## Release and rollback

Release migrations first, backend second, admin and website last. Do not deploy
or migrate production from this task. Before release the owner runs a read-only
grouped count by payload category and offer productType and inspects ambiguous
rows without exporting customer answers. Check classified counts after migration.
Test old-backend writes and old-draft resume against the expanded schema.

Rollback application versions together to the previous release; retain additive
tables/columns, tombstones and values. Do not run a destructive down migration.
The old application ignores the added data; re-enable the feature after forward
repair. Owner grants `Manage data model` only to intended staff; the grant does
not confer personal-data access. New workspace onboarding must seed permissions;
built-in field rows are initialized idempotently from code under tenant context.

Before migration, run this read-only classification check with the migration role:

```sql
SELECT CASE
  WHEN l.payload->'payload'->>'category' IN ('sim', 'mobile', 'internet') THEN l.payload->'payload'->>'category'
  WHEN o.content->>'productType' IN ('sim', 'mobile', 'internet') THEN o.content->>'productType'
  WHEN l.payload->'payload' ?| ARRAY['currentCountry', 'destination', 'arrivalDate'] THEN 'sim'
  ELSE 'legacy'
END AS expected_type, count(*)
FROM app.leads l
LEFT JOIN app.offer_versions o ON o.workspace_id = l.workspace_id AND o.id = l.selected_offer_version_id
GROUP BY 1 ORDER BY 1;
```

The total must be at most 100,000 for this release migration. Review the ambiguous
count; do not dump form values. After migration compare `SELECT lead_type, count(*)
FROM app.leads GROUP BY lead_type ORDER BY lead_type` with these counts. Both checks
read only aggregates. The migration does not rewrite any submitted form payload.

Switching a field to sensitive removes its references and filter values from
persisted personal views, including other actors' views, while preserving each
view's name and unrelated state. Restricting a customer clears all lead views in
that workspace because arbitrary free-text filters can contain their personal data.
This conservative erasure is intentional. Grants identify active staff by the
same user ID as the existing membership system; pending invitations show the
invited address.

## Implementation evidence

Verified on 27 October 2026 with Node 22.19.0, pnpm 9.15.0 and synthetic data in
local disposable PostgreSQL databases. No production database was accessed and
no deployment was performed.

| Check                                                                                    | Result                                                         |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm run test` on a fresh disposable database                                           | 197 files, 1,611 tests passed; none skipped                    |
| New lead backend and populated-backfill suites, repeated on a used database              | 25 tests passed                                                |
| `pnpm run test:tooling`                                                                  | 74 tests passed                                                |
| `pnpm run typecheck`, `lint`, `format`, `check:frontend-db-boundary`                     | Passed                                                         |
| `pnpm run build`                                                                         | Backend, admin and site-1 production builds passed             |
| Contracts/OpenAPI generation                                                             | Repeated generation produced identical output                  |
| `pnpm --filter @canadian-plans/db db:generate`                                           | No schema changes after the checked-in migration/snapshot      |
| Preview-isolation inventory, forbidden service-role scan, admin browser-bundle seam scan | Passed                                                         |
| Admin shell browser tests                                                                | 18 passed                                                      |
| Admin lead and order browser journeys                                                    | 5 passed, including the full owner/granted-member lead journey |
| Website browser journeys                                                                 | 86 passed on desktop/mobile                                    |

The complete website security command passed: 86 browser tests in each of the
analytics-enabled and analytics-disabled configurations (172 executions). Both
production builds passed scans of 327 browser assets and 325 rendered payloads
for a synthetic service credential. A deliberate client import of server
configuration correctly failed to build. Across all browser suites and these
configurations, 281 test executions passed.

The first combined browser run encountered a rate-limit database lock timeout in
one final website journey while other database tests were running. The full
security command then passed without competing integration tests; no application
change or weakened assertion was needed. The admin order/lead suite passed
separately. [Screenshots](EVIDENCE/lead-data-model/README.md) show the saved layout
and reloaded personal view using synthetic records and the real backend.

The populated-backfill test creates and removes its own temporary database and
coordinates historical cluster-wide role changes with the integration setup.
New lead fixtures use unique workspaces; their repeatability was verified. The
entire existing suite uses a fresh database because some pre-existing suites
retain fixed fixtures between invocations.

Local database checks ran on PostgreSQL 18.4; CI remains the PostgreSQL 15.14
compatibility gate. Live backfill classification and migration execution are
deliberately left to the release owner, using the read-only checks and release
order above. External catalogue, bot verification and staff identity are test
harness substitutes; authorization, persistence, RLS and workflow code are real.
