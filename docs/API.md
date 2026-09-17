# API.md

Hand-maintained reference for `apps/backend`'s `/api/v1` surface. Shared Zod
request/response/error schemas live in `@canadian-plans/contracts` and are
consumed by both backend tests and the admin API client.

A machine-readable **OpenAPI 3.1** document is generated from the
`@canadian-plans/contracts` Zod schemas — never hand-edited — and covers the
full `/api/v1` surface (leads, quotes, orders, workspace orders, uploads,
download links, partners/commissions/invoices, webhooks, exports, tracking, and
the staff/service-credential routes):

- Generated file: [`docs/api/openapi.json`](./api/openapi.json)
- Regenerate: `pnpm --filter @canadian-plans/contracts build`
  (runs [`scripts/generate-openapi.ts`](../packages/contracts/scripts/generate-openapi.ts)).

The typed client `createBackendClient({ baseUrl, credential })` in the same
package is derived from those schemas and is consumed by both `apps/admin`
(staff session credential) and `apps/site-1` (service credential), so a schema
change breaks both consumers at build time (REQ 50). This Markdown file remains
the human-readable reference for the currently implemented (T5/T6) routes.

## Conventions

- Base path: `/api/v1`.
- Every response carries a fresh server-generated `x-request-id` header.
  The health JSON echoes that value in `requestId`. Unknown routes/methods
  currently use Express's default 404 response, not a JSON error envelope.
- Staff errors use `{ "error": { "code", "message", "requestId" } }`. Stable
  T5 codes include `missing_session`, `invalid_session`, `membership_missing`,
  `membership_pending`, `membership_revoked`, `permission_denied`, and
  `mfa_required`.
- Staff endpoints accept `Authorization: Bearer <Supabase access token>`.
  The backend verifies the token with Supabase Auth on every request, obtains
  the current assurance level for that exact token, then reads membership,
  roles and individual permissions from Postgres. Client role/AAL headers and
  user-editable metadata are ignored.
- Browser access is allowed only from the exact `ADMIN_ORIGIN`. Staff request
  bodies are capped at 64 KiB.

## Authentication

`/api/v1` has three caller types. The workspace is always derived from the
verified identity — never from a body field, `workspace_id`, Host, Origin or
CORS (PLATFORM_CONTEXT §4b, invariant 2).

- **Staff** (`/api/v1/staff/*`): `Authorization: Bearer <Supabase access token>`.
  Verified with Supabase Auth on every request; membership, roles and
  permissions are re-read from Postgres. See the T5 codes above.
- **Website** (`/api/v1/website/*`, `/api/v1/quotes`, and `/api/v1/orders`): `Authorization: Bearer cplsk_<secret>`. The
  backend hashes the secret (SHA-256) and resolves it through the SECURITY
  DEFINER `app.resolve_website_credential` bootstrap function to a workspace,
  scopes and revocation status. A credential may hold only these scopes:
  `leads:write`, `quotes:create`, `orders:create`, `uploads:customer`,
  `tracking:otp`. Size and edge/bot admission run before any database work; a
  durable, bounded per-IP and per-credential rate limiter
  (`app.rate_limit_hit`, fixed window, no global counter) gates database work.
  Error codes: `missing_credential`, `invalid_credential`, `credential_revoked`,
  `credential_not_found`, `scope_denied`, `caller_forbidden`, `rate_limited`,
  `payload_too_large`.
- **Machine** (webhooks and schedulers, wired in later tasks): resolved by the
  server-only registry (`MACHINE_REGISTRY_JSON`, PLATFORM_CONTEXT §4b). URL
  selectors are untrusted; the mapped HMAC signature or scheduler secret is
  verified before any context is derived. Unknown/revoked selectors, invalid
  signatures, wrong provider accounts and foreign workspaces all fail closed.
  Error codes: `machine_unknown`, `machine_signature_invalid`,
  `machine_account_mismatch`, `machine_workspace_mismatch`.

All error codes share the one envelope
`{ error: { code, message, requestId, details? } }`. The code vocabulary is
`apiErrorCodeSchema` in `@canadian-plans/contracts` — the authentication codes
(`authErrorCodeSchema`) plus the request-family domain codes (validation,
conflicts, quote/draft/order/upload/file/commission/invoice/export/tracking
states). `details` is optional structured context and never carries PII
(invariant 12).

## Endpoints

### `GET /api/v1/health`

Liveness check. No auth, no tenant context, no DB access.

**Response `200`**

```json
{ "ok": true, "requestId": "<uuid>" }
```

Schema: `healthResponseSchema` in
[`packages/contracts/src/health.ts`](../packages/contracts/src/health.ts).

### `GET /api/v1/staff/workspaces`

Protected staff bootstrap lookup. The first verified login also atomically
accepts pending staff invitations matching the verified Auth email. Returns
only the actor's active membership/workspace metadata and assigned role names;
it never returns another actor or tenant business data.

- `200`: `{ workspaces: StaffWorkspace[], requestId }`
- `401`: `missing_session` or `invalid_session`

### `GET /api/v1/staff/workspaces/{workspaceId}/access`

Re-reads this actor's membership, roles and individual permission overrides
inside tenant RLS and authorizes `workspace.read`.

- `200`: `{ workspace, permissions, requestId }`
- `400`: `invalid_request`
- `401`: session errors
- `403`: membership/permission reason code
- `404`: `workspace_not_found`

### `POST /api/v1/staff/workspaces/{workspaceId}/invitations`

Owner-only privileged action; requires a server-verified `aal2` session. Body:
`{ email, roles[] }`. Creates a pending membership and role assignments, and
audits the action. The recipient uses **Accept staff invitation** on `/login`;
Supabase Auth sends its confirmation email, and the first verified backend
request binds the pending membership. This avoids any privileged Auth key in
application code.

- `201`: `{ membershipId, status: "pending", requestId }`
- `400`: `invalid_request`
- `403`: `permission_denied`, membership reason, or `mfa_required`
- `409`: `membership_conflict`

### `DELETE /api/v1/staff/workspaces/{workspaceId}/memberships/{membershipId}`

Owner-only privileged action; requires server-verified `aal2`. Sets status to
`revoked` and audits old/new status. Self-removal is refused. Because every
later protected request re-reads the row, an already-issued access token does
not retain workspace access.

- `200`: `{ membershipId, status: "revoked", requestId }`
- `400`: invalid IDs or self-removal
- `403`: authorization/MFA reason
- `404`: `membership_not_found`

### `POST /api/v1/staff/workspaces/{workspaceId}/service-credentials`

Owner-only privileged action (`integration.manage`); requires a server-verified
`aal2` session. Body: `{ scopes: WebsiteScopeName[] }` (1–5 scopes). Generates a
random secret, stores only its hash, and audits the action. The plaintext
`secret` is returned **once** in this response and never again.

- `201`: `{ credential: { id, scopes, createdAt, revokedAt }, secret, requestId }`
- `400`: `invalid_request` (empty/unknown scopes)
- `403`: `permission_denied`, membership reason, or `mfa_required`

### `GET /api/v1/staff/workspaces/{workspaceId}/service-credentials`

Owner-only (`integration.manage`, `aal2`). Lists the workspace's credentials
without secrets.

- `200`: `{ credentials: { id, scopes, createdAt, revokedAt }[], requestId }`
- `403`: authorization/MFA reason

### `DELETE /api/v1/staff/workspaces/{workspaceId}/service-credentials/{credentialId}`

Owner-only (`integration.manage`, `aal2`). Sets `revoked_at`; the next website
request presenting that credential is denied `credential_revoked`. Idempotent —
re-revoking returns the original revocation time.

- `200`: `{ id, revokedAt, requestId }`
- `403`: authorization/MFA reason
- `404`: `credential_not_found`

### `POST /api/v1/website/leads`

Storefront endpoint authenticated by a website service credential holding the
`leads:write` scope. The workspace comes from the credential; any `workspace_id`
in the body is ignored. Real lead persistence lands in A2; this route currently
acknowledges the authenticated, scoped context.

- `202`: `{ workspaceId, callerType: "website", scopes, requestId }`
- `401`: `missing_credential`, `invalid_credential`, `credential_revoked`
- `403`: `scope_denied`, `caller_forbidden`
- `429`: `rate_limited` (with `Retry-After`)

### `GET /api/v1/website/offers`

Website credential with `quotes:create`. Returns the quotable catalogue for the
credential's own workspace: each entry pairs the backend `productId` a quote must
reference with the product's current immutable offer version
(`offerVersionId`, `lastSyncedAt`) and the validated commercial snapshot
(`commercial`). Only currently available offers are returned — a product with no
current offer version or a withdrawn/revoked availability row is excluded, as is
any row whose stored content fails commercial validation. This is public
catalogue content scoped to the credential; it never returns tenant records.

- `200`: `{ offers: [{ productId, offerVersionId, lastSyncedAt, commercial }], requestId }`
- `401`: `missing_credential`, `invalid_credential`, `credential_revoked`
- `403`: `scope_denied`, `caller_forbidden`
- `429`: `rate_limited` (with `Retry-After`)

### `POST /api/v1/quotes`

Website credential with `quotes:create` plus `X-Draft-Grant`. Body contains
only `{ leadId, productId, form? }`; it never contains a price. The backend
verifies the draft, takes the product lease, reads and validates the current
published Sanity offer outside a transaction, hashes it canonically, then
atomically selects/inserts that exact immutable version and creates a 15-minute
quote.

- `201`: `{ quote, requestId }`
- `401`: `draft_not_found` / `draft_expired`
- `409`: `offer_unavailable`
- `503`: `unpriced_lead_required` with
  `details.canSaveUnpricedLead = true`, or `priced_checkout_disabled` while
  OPEN_INPUTS #14 is unresolved

### `POST /api/v1/orders`

Website credential with `orders:create`, `X-Draft-Grant`, and a bounded
`Idempotency-Key`. The body contains `quoteId`, the accepted terms version,
the versioned form payload, and consent — never browser-supplied prices.

One tenant transaction first resolves a completed idempotency outcome and
returns it before inspecting the consumed/expired quote. A new submission
validates the draft and quote, claims the scoped key, freezes the commercial
snapshot, records the accepted consent (terms version, marketing opt-in and
marketing consent version — invariant 11), creates the order/history, consumes
the quote, marks the lead submitted, and commits the acknowledgement-email and
analytics outbox jobs. The stored consent is immutable once written, under the
same submission-immutability trigger that freezes the snapshot.

A submitted draft keeps its grant only so the exact-retry lookup above can
return the stored order; the grant no longer authorises editing the draft
(`PATCH /api/v1/website/leads/{leadId}` returns `409 draft_already_submitted`).

- `201`: newly committed order or completed retry with the same stored order
  reference
- `401`: `draft_not_found` / `draft_expired`
- `404`: `quote_not_found`
- `409`: idempotency, quote, terms, one-order-per-draft, or
  `draft_already_submitted` conflict
- `503`: `persistence_unavailable`, `details.retryable = true`, and
  `Retry-After`, or `priced_checkout_disabled` while OPEN_INPUTS #14 remains
  unresolved; no success response is emitted

### Staff order processing (`/api/v1/staff/workspaces/{workspaceId}/orders`)

T14's order journey. Every write is a backend endpoint; the admin renders
buttons and dialogs but holds no transition, payment or amendment rule. All
reads require `workspace.read`; all mutations require `order.manage` except
payment recording, which accepts `order.manage` **or** `financial.read`
(Finance's privileged action, so it additionally requires a verified `aal2`
session).

Every mutation carries the `recordVersion` the caller last rendered as
`expectedVersion`. A mismatch returns `409 version_conflict` and changes
nothing; the admin shows "changed by someone else, reload" and offers a reload.
Transition edges, cancellation reasons, dispatch details, partnered activation
and the operational-transition gate are all decided server-side. Illegal edges
return `409 illegal_transition`, a cancellation without a reason returns
`400 cancellation_reason_required`, and a dispatch without a courier returns
`400 dispatch_details_required`.

| Route                                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /orders`                                         | Paginated list. Filters: `status`, `paymentState`, `assigneeId`, `partnerId`, `partnerCode`, `source`, `submittedFrom`/`submittedTo` (ISO, `to` exclusive), `archiveState=active\|archived\|all`. `search` (≤120 chars) matches the reference and, when the actor holds the contact-search capability, the customer name/email/phone with substring matching, parameterized and workspace-scoped. |
| `GET /orders/{orderId}`                               | Full detail: frozen snapshot, customer, plan payload, consent, status history, audit events, notes, reminders, change requests, amendments, payments, dispatch record, the actor's `capabilities`, and `allowedTransitions` computed from the current status and the live gates.                                                                                                                  |
| `PATCH /orders/{orderId}`                             | Status transitions: `transition` (`toStatus`, optional `reason`), `dispatch` (`courier` required, optional `trackingReference`/`dispatchDate`), `activate`, `cancel` (`reason` required). Dispatch writes `dispatch_records` in the same transaction as the status change and sets `delivery_state`.                                                                                              |
| `PATCH /orders/{orderId}/assignee`                    | Assign to an active staff membership of the same workspace, or unassign with `assigneeId: null`.                                                                                                                                                                                                                                                                                                  |
| `PATCH /orders/{orderId}/archive`                     | Set or clear `archived_at`. Archiving is a visibility action, never deletion.                                                                                                                                                                                                                                                                                                                     |
| `POST /orders/bulk-assign`                            | Assign up to 100 orders. Each entry carries its own `expectedVersion`; the response reports `assigned`, `version_conflict` or `not_found` per order, so a partial failure is never silent. An unknown assignee returns `404 assignee_not_found` for the whole request.                                                                                                                            |
| `GET`/`POST /orders/{orderId}/notes`                  | Operational notes with author and timestamp. Append-only; the audit event records only the note id, never its text.                                                                                                                                                                                                                                                                               |
| `POST /orders/{orderId}/reminders`                    | Schedule a follow-up (`remindAt`, optional `note`).                                                                                                                                                                                                                                                                                                                                               |
| `DELETE /orders/{orderId}/reminders/{reminderId}`     | Cancel a scheduled reminder.                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /orders/{orderId}/change-requests`              | Record a proposed customer edit (`patch.contact`, `patch.form`, optional `note`) for staff decision.                                                                                                                                                                                                                                                                                              |
| `POST /orders/{orderId}/change-requests/{id}/approve` | Approve in one transaction: exactly one audited `order_amendments` row plus the version check. Contact fields are applied to the originating lead; the submitted order envelope (snapshot, payload, consent, terms) stays immutable (REQ 14), so form changes live in the amendment.                                                                                                              |
| `POST /orders/{orderId}/change-requests/{id}/reject`  | Reject without changing any customer data. Re-resolving a resolved request returns `409 change_request_resolved`.                                                                                                                                                                                                                                                                                 |
| `POST /orders/{orderId}/payments`                     | Record a manual payment (`paymentState`, optional `method`/`reference`/`amountMinor`) into `payment_records` and update `payment_state` in one transaction. The amount currency always comes from the frozen snapshot.                                                                                                                                                                            |

`GET /api/v1/staff/workspaces/{workspaceId}/members` lists the active staff
memberships as assignee options. It returns membership id, roles and an
`isSelf` flag — never another tenant's member and never the actor's email.

The order detail carries the consent captured at submission. Consent is exposed
on the staff order detail only, never on the public order summary; it is `null`
for orders that predate the consent column.

`GET /orders` and `GET /orders/{orderId}` include a `capabilities` object
(`canManageOrders`, `canRecordPayment`, `canSearchContact`) computed from the
same live authorization decision the mutations use, so the admin can render the
right controls without re-deriving policy from role names.

### Dispatch and activation gates

Phase A keeps dispatch and activation disabled in production until OPEN_INPUTS
#15/#19 are resolved; partnered activation additionally returns
`409 feature_not_ready` until activation can commit its commission line
(invariant 10). Tests and staging exercise both behind the TEST-only
`ORDER_OPERATIONAL_TRANSITIONS` flag, which the backend ignores when
`NODE_ENV=production`. The admin surfaces `feature_not_ready` rather than hiding
the action. See `docs/RUNBOOKS/orders.md`.

### `POST /api/v1/webhooks/sanity`

Raw-body endpoint. Requires `X-Webhook-Selector`, `X-Provider-Account`, Sanity's
`sanity-webhook-signature`, and `idempotency-key`. The selector is untrusted
until the server-only registry verifies the timestamped HMAC and matching
provider account. A valid delivery is durably deduplicated in the tenant inbox
and acknowledged `200`; the body is only a document selector, never commercial
authority.

### `GET /api/v1/staff/workspaces/{workspaceId}/catalogue`

Any staff member with `workspace.read` can view the read-only last sync
attempt/success/error, recent event errors, and each product's current immutable
offer version. Catalogue editing remains in Sanity.

### `GET /api/v1/staff/workspaces/{workspaceId}/jobs`

Staff with `workspace.read` can view pending, processing, failed, and uncertain
outbox deliveries for that workspace. The response includes `canRetry`, derived
from the same live `integration.manage` authorization decision used by the
mutation endpoint.

### `POST /api/v1/staff/workspaces/{workspaceId}/jobs/{jobId}/retry`

Requires `integration.manage` (the `integration_management` individual
permission or an allowed role, with explicit deny winning). Only definitively
failed jobs can be requeued; uncertain deliveries must be reconciled first.

### `GET /api/internal/jobs/run`

Backend-only internal route. On the Railway service the in-process scheduler runs
the equivalent `OutboxRunner.run` every 60 seconds (ADR 0004); this HTTP route
remains the authenticated manual invocation path. It uses
`Authorization: Bearer <CRON_SECRET>`; the secret and configured selector resolve
through the server-only scheduler registry to an actor, `outbox:run` scope, and an
explicit workspace set. Preview deployments are rejected. An equivalent
authenticated `POST` is accepted.

### `GET /api/internal/catalogue/sync`

Backend-only internal route for catalogue sync (T10B). On the Railway service the
in-process scheduler runs the equivalent pass every 300 seconds (ADR 0004); this
HTTP route remains the authenticated manual invocation path. It uses
`Authorization: Bearer <CRON_SECRET>`; the secret and the configured
`CATALOGUE_SYNC_SELECTOR` resolve through the server-only scheduler registry to an
actor, the existing `reconcile:run` scope, and an explicit workspace set. Preview
deployments are rejected, and no tenant is discovered through the database. For
each authorized workspace, in registry order, the pass drains the catalogue inbox
(`CatalogueService.drainEvents`, one bounded pass) and then reconciles against the
published CMS snapshot using the registry actor. A failed workspace records a
bounded error code and the pass continues; a 120-second run deadline stops
starting new workspaces while work already in flight is still recorded, and a
tick is skipped while a run is still in flight. The response reports bounded
counters (`workspaces`, `listed`, `processed`, `drainFailed`, `reconciled`,
`failures`) and contains no PII. An equivalent authenticated `POST` is accepted.

## Staff permission matrix

`workspace.read` is non-privileged so an authenticated Owner/Finance actor can
reach MFA enrollment/challenge and recovery. Every other Owner/Finance action
below requires verified `aal2`.

| Role     | Matrix actions                                        |
| -------- | ----------------------------------------------------- |
| owner    | every T5 action                                       |
| orders   | `workspace.read`, `order.manage`                      |
| partners | `workspace.read`                                      |
| finance  | `workspace.read`, `financial.read`, `invoice.approve` |
| content  | `workspace.read`                                      |
| viewer   | `workspace.read`                                      |

Individual permission rows map to document download, financial data, bulk
export, deletion, invoice approval and integration management. An explicit
individual `deny` wins over the matrix; otherwise an explicit `allow` can add
the mapped action. No match denies by default.
