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
  Before that, each client IP is limited to 300 staff requests a minute
  (`429` `rate_limited` with `Retry-After`; staff and `/api/v1/email/staff`
  routes), and a token that is not a three-part JWT is rejected without a
  call to Supabase.
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
  `tracking:otp`. Protected writes require `X-Turnstile-Token` for their route-owned action before database work; authenticated catalogue/tracking-status GETs do not consume a challenge. A fresh proof is required for each write/retry. The server-owned optional `X-Website-Visitor-Id` digest is trusted only after credential verification; raw forwarding headers are ignored. A durable, bounded network-bootstrap, visitor and credential rate limiter
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
in the body is ignored. Validated contact, form, attribution and product data are
persisted with the consent version. The response includes the new lead summary
and a scoped draft grant for subsequent draft updates and checkout.

- `201`: `{ lead, draftGrant: { token, expiresAt }, requestId }`
- `400`: `validation_error`
- `401`: `missing_credential`, `invalid_credential`, `credential_revoked`
- `403`: `scope_denied`, `caller_forbidden`
- `429`: `rate_limited` (with `Retry-After`)

### `GET /api/v1/website/leads/{leadId}`

Resume an unfinished draft with the website credential (`leads:write`) and its
exact `X-Draft-Grant`. Returns `{ draft: { leadId, productId, contact, form },
requestId }` with `Cache-Control: private, no-store`. Revoked/expired or mismatched
grants return `401`; submitted drafts return `409 draft_already_submitted`. Reads
do not consume a bot proof. The storefront restores only supported, validated
form data and honors explicit plan/category/province navigation. Grants and the
submission key stay in the httpOnly cookie; consent must be confirmed again.

### `POST /api/v1/website/region-waitlist`

Website credential with `leads:write`. Leaves an email for a province we do not
serve yet (ADR 0005, D5). Body: `{ province, email, interest?, consentVersion }`
where `province` is a two-letter province code (never `CA`) and `interest` is
`sim`, `mobile` or `internet`. The same email (any letter case) for the same
province is stored once. The answer is identical for a new and a repeated email,
so the form cannot be used to find out which addresses are listed. The audit entry
records the province, interest and consent version, never the email.

- `201`: `{ requestId }`
- `400`: `validation_error`
- `401`: `missing_credential`, `invalid_credential`, `credential_revoked`
- `403`: `scope_denied`, `caller_forbidden`
- `429`: `rate_limited` (with `Retry-After`)

### `GET /api/v1/website/offers`

Website credential with `quotes:create`. Optional `?province=SK` returns only the
offers sold in that province plus national ones. Returns the quotable catalogue for the
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

**Dispatch and activation gates.** Both require
`ORDER_OPERATIONAL_TRANSITIONS` to be set on the deployment (`docs/ENV.md`);
while unset they return `409 feature_not_ready` in every environment. On top
of that, `ready_for_delivery`, `dispatched` and `activated` enforce the
document prerequisite (OPEN_INPUTS #15): every document type on the order's
frozen `documentChecklist` must have an attached file whose latest staff
review is `approved`. Payment state is never a prerequisite. A blocked
attempt returns `409 documents_incomplete` with the outstanding types in
`details.missingDocuments`. Any `order.manage` holder may proceed anyway by
sending `documentOverrideReason` with the transition; the reason is mandatory
(`400 document_override_reason_required` when blank) and is recorded in the
audit event with the document types that were outstanding. The override is
scoped to documents — it does not rescue an illegal edge or a partnered
activation with no usable commission rule.

| Route                                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /orders`                                         | Paginated list. Filters: `status`, `paymentState`, `assigneeId`, `partnerId`, `partnerCode`, `source`, `submittedFrom`/`submittedTo` (ISO, `to` exclusive), `archiveState=active\|archived\|all`. `search` (≤120 chars) matches the reference and, when the actor holds the contact-search capability, the customer name/email/phone with substring matching, parameterized and workspace-scoped.                                                                |
| `GET /orders/{orderId}`                               | Full detail: frozen snapshot, customer, plan payload, consent, status history, audit events, notes, reminders, change requests, amendments, payments, dispatch record, the actor's `capabilities`, and `allowedTransitions` computed from the current status and the live gates.                                                                                                                                                                                 |
| `PATCH /orders/{orderId}`                             | Status transitions: `transition` (`toStatus`, optional `reason`), `dispatch` (`courier` required, optional `trackingReference`/`dispatchDate`), `activate`, `cancel` (`reason` required). All except `cancel` accept an optional `documentOverrideReason` (see the gates above). Dispatch writes `dispatch_records` in the same transaction as the status change and sets `delivery_state`.                                                                      |
| `PATCH /orders/{orderId}/assignee`                    | Assign to an active staff membership of the same workspace, or unassign with `assigneeId: null`.                                                                                                                                                                                                                                                                                                                                                                 |
| `PATCH /orders/{orderId}/archive`                     | Set or clear `archived_at`. Archiving is a visibility action, never deletion.                                                                                                                                                                                                                                                                                                                                                                                    |
| `POST /orders/bulk-assign`                            | Assign up to 100 orders. Each entry carries its own `expectedVersion`; the response reports `assigned`, `version_conflict` or `not_found` per order, so a partial failure is never silent. An unknown assignee returns `404 assignee_not_found` for the whole request.                                                                                                                                                                                           |
| `GET`/`POST /orders/{orderId}/notes`                  | Operational notes with author and timestamp. Append-only; the audit event records only the note id, never its text.                                                                                                                                                                                                                                                                                                                                              |
| `POST /orders/{orderId}/reminders`                    | Schedule a follow-up (`remindAt`, optional `note`).                                                                                                                                                                                                                                                                                                                                                                                                              |
| `DELETE /orders/{orderId}/reminders/{reminderId}`     | Cancel a scheduled reminder.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `POST /orders/{orderId}/change-requests`              | Record a proposed customer edit (`patch.contact`, `patch.form`, optional `note`) for staff decision.                                                                                                                                                                                                                                                                                                                                                             |
| `POST /orders/{orderId}/change-requests/{id}/approve` | Approve in one transaction: exactly one audited `order_amendments` row plus the version check. Contact fields are applied to the originating lead; the submitted order envelope (snapshot, payload, consent, terms) stays immutable (REQ 14), so form changes live in the amendment.                                                                                                                                                                             |
| `POST /orders/{orderId}/change-requests/{id}/reject`  | Reject without changing any customer data. Re-resolving a resolved request returns `409 change_request_resolved`.                                                                                                                                                                                                                                                                                                                                                |
| `POST /orders/{orderId}/payments`                     | Record a manual payment (`paymentState`, optional `method`/`reference`/`amountMinor`) into `payment_records` and update `payment_state` in one transaction. The amount currency always comes from the frozen snapshot.                                                                                                                                                                                                                                           |
| `POST /orders/{orderId}/deletion`                     | Delete the customer's personal data for the order (`reason` required). Requires the `deletion` permission (`record.delete`; always a verified `aal2` session). Restricts every linked copy, keeps the reference and commercial snapshot, audits without personal data, and commits a local deletion intent. Returns `202` with current `ledgerStatus` and `cleanupStatus`; erasure waits for acknowledgement and completion waits for physical document cleanup. |

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

### Partners and commissions (T19)

`GET /api/v1/staff/workspaces/{workspaceId}/partners` — any staff member
with `workspace.read` sees the partner directory (records only, no money).

`GET /api/v1/staff/workspaces/{workspaceId}/partners/{partnerId}` — partner
detail with referred orders and commission lines. Commission `amount` is
`null` unless the actor also holds `financial.read`; the response includes
`canViewPayouts`, `canMarkCarrierPaid`, `partnerPaidEnabled: false`, and
`payoutDisabledReason` — marking a line `partner_paid` is disabled in code
until OPEN_INPUTS #18/B1 invoice approval exists (see
`docs/RUNBOOKS/commission-month-end.md`).

`POST /api/v1/staff/workspaces/{workspaceId}/partners/{partnerId}/commissions`
— requires `financial.read` (Finance's privileged action, `aal2`). Body:
`{ commissionId, toState }`. `earned → carrier_paid` succeeds;
`→ partner_paid` returns `409 feature_not_ready`
(`partner_paid_disabled`). Invalid state machine edges return
`409 commission_state_invalid`.

A commission line is created automatically, never through this route, when a
partnered order activates (see "Dispatch and activation gates" below and
`docs/RUNBOOKS/dispatch-and-activation.md`).

### Documents (T17)

`GET /api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/files` —
`workspace.read`; lists document metadata for the order.

`POST /api/v1/staff/workspaces/{workspaceId}/files/{fileId}/review` —
`order.manage`. Body: `{ decision, note? }`. Approves or rejects an uploaded
document.

`POST /api/v1/staff/workspaces/{workspaceId}/files/{fileId}/download-link` —
requires the separately-grantable `document.download` permission (REQ 23;
gate 5), not merely `workspace.read`. Issues a short-lived signed URL
(`{ url, expiresAt }`); `409 file_not_available` if the file isn't ready,
`404 file_not_found` otherwise.

### Customer-data deletion (T21)

`POST /orders/{orderId}/deletion` remains supported. Privileged verified-MFA
staff may also `POST /customer-data/search` with `{ email, page? }` to discover
candidate IDs, then `POST /customer-data/{subjectType}/{subjectId}/deletion`
with a nonblank `{ reason }`. Supported subjects are `order`, `lead` and
`region_waitlist`; a converted lead resolves to its order. Search returns
`subjects`, `page`, `hasMore` and never deletes by matching email alone.

The first transaction restricts access/sends, revokes grants/tracking challenges,
and commits an audited intent plus `deletion_ledger_publish`. Personal values
remain until durable acknowledgement. Acknowledgement atomically queues
`customer_data_cleanup`, which erases linked personal database copies and records
every private document key as durable `deletion_object_cleanup` work. Financial
amounts, the order reference/commercial snapshot and minimal audit evidence remain.

`202` returns the stable `deletionId`, `ledgerStatus` and `cleanupStatus`.
`acknowledged` does not mean cleanup is complete. `cleanupStatus: completed`
requires local erasure and every R2 object acknowledgement. Retries reuse the
intent; missing ledger/storage leaves work pending. Restricted/deleted staff
order details have `payload: null`, masked personal fields, explicit
`customerDataState` and disabled operational mutation capabilities.
See [the deletion runbook](RUNBOOKS/data-deletion.md) for exact scope and limits.

### Dispatch and activation gates

Dispatch and activation require `ORDER_OPERATIONAL_TRANSITIONS` to be exactly
`1` or `true` in every environment, including production; unset returns
`409 feature_not_ready`. Required documents must still be approved or the
document prerequisite explicitly overridden with a recorded reason. Partnered
activation must commit its commission line atomically (invariant 10) and returns
`feature_not_ready` if its commission configuration is incomplete. See
`docs/RUNBOOKS/dispatch-and-activation.md` for the current operational procedure.

### `POST /api/v1/webhooks/sanity`

Raw-body endpoint. Requires `X-Webhook-Selector`, `X-Provider-Account`, Sanity's
`sanity-webhook-signature`, and `idempotency-key`. The selector is untrusted
until the server-only registry verifies the timestamped HMAC and matching
provider account. A valid delivery is durably deduplicated in the tenant inbox
and acknowledged `200`; the body is only a document selector, never commercial
authority.

### `POST /api/v1/webhooks/resend/{selector}`

Native Resend raw-JSON endpoint (64 KiB limit), mounted before JSON parsing. The
active registry entry determines provider account, workspace and machine actor
after verifying the Svix signature and five-minute timestamp window. Body tenant
fields have no authority. Delivery/bounce/complaint/failure events must correlate
to a prepared send in that account and match its recipient digest; unknown sends
return 503 for retry/reconciliation. The signed `svix-id` is deduplicated within
workspace/provider/account. Temporary bounces do not create permanent suppression;
a later delivery clears temporary-bounce uncertainty but cannot erase a permanent bounce or complaint. Other signed
event types are acknowledged as ignored. The old `/api/v1/email/webhook/events`
shared-secret endpoint is retired (404). See ENV.md for the required cutover.

### `GET /api/v1/staff/workspaces/{workspaceId}/catalogue`

Any staff member with `workspace.read` can view the read-only last sync
attempt/success/error, recent event errors, and each product's current immutable
offer version. Catalogue editing happens in Sanity once a workspace has a Sanity registry entry; until then site-1 is served from the repo catalogue (`packages/adapters/src/static-catalogue/site-1-plans.ts`, ADR 0005) and edited by code change and deploy.

### `GET /api/v1/staff/workspaces/{workspaceId}/jobs`

Staff with `workspace.read` can view pending, processing, failed, and uncertain
outbox deliveries for that workspace, most recently updated first and capped at
500 rows; `total` counts every active job. The response includes `canRetry`,
derived from the same live `integration.manage` authorization decision used by
the mutation endpoints.

### `POST /api/v1/staff/workspaces/{workspaceId}/jobs/{jobId}/retry`

Requires `integration.manage` (the `integration_management` individual
permission or an allowed role, with explicit deny winning). Only definitively
failed jobs can be requeued; uncertain deliveries must be reconciled first.

### `POST /api/v1/staff/workspaces/{workspaceId}/jobs/{jobId}/resolve`

Requires `integration.manage`. Body `{ "delivered": boolean }`, sent after
staff check the provider's own log for an uncertain job. `true` closes the job
as `completed`; `false` marks it `failed` so the retry endpoint accepts it.
Either way the job's open alerts are resolved, its provider evidence is kept and
an `outbox_job.uncertain_resolved` audit event is written. A job that is not
uncertain returns 409 `job_not_uncertain`.

### `GET /api/v1/staff/workspaces/{workspaceId}/reports/sources`

Any staff member with `workspace.read` can read lead-to-order counts grouped by
UTM source, UTM medium, UTM campaign and partner (REQ 35). Optional `from`/`to`
ISO-8601 bounds filter by lead-created / order-submitted time; counts come only
from the workspace's sanitized stored attribution — never raw request data — and
the response is workspace-scoped.

Server lead/order conversion events (`lead_saved`, `order_submitted`) are emitted
once through the Umami `AnalyticsSink` from the outbox; the browser sends only
page views and `plan_selected`, so a submission is never counted twice.

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

### Customer order tracking (T22, email-only since 25 Oct 2026)

The customer proves an email address with a six-digit code and then sees every
order placed with that email **on the credential's own website** (workspace),
never another brand's. All routes need the `tracking:otp` scope.

`POST /api/v1/website/tracking/otp` takes `{ email }` and sends a code only when
the email has at least one active (not deletion-restricted) order in the
workspace. It **always** answers `200 { status: "challenge_sent" }` so the
endpoint cannot be used to enumerate customers — including timing: the response
is held to a minimum latency (`TRACKING_OTP_MIN_LATENCY_MS`, default 500 ms).
The Turnstile bot check (`tracking-request`) stays on. The code is keyed-hashed
(bound to workspace and normalized email), expires in 10 minutes, is invalidated
by a resend (resends for one email are serialized) and permits at most five
attempts. Requests are rate-limited per email and authenticated visitor.

A matching request atomically writes the challenge (`order_id` null) and a
`tracking_otp_email` outbox job (payload version 2: challenge id, address,
contact hash, sealed code, expiry; no order). No provider is called in the
request transaction. The worker rechecks expiry, pending status, that the
address still owns an active order, the code hash and deliverability
suppression before sending. The email names no order. Completed or uncertain
jobs keep only the challenge id. Version-1 jobs queued before the release send
nothing; the customer requests a new code.

`POST /api/v1/website/tracking/verify` takes `{ email, code }` (bot check
`tracking-verify`); on success it atomically consumes the code and returns a
30-minute grant. The grant is an HMAC-signed token bound to workspace + the
email's keyed hash, carrying the email sealed with AES-GCM (never readable in
the token). Verifications are rate-limited per email and visitor before any
consumption, and every non-verified outcome returns the same generic
`tracking_challenge_invalid`. Grants issued before email-only tracking (bound
to one order) are refused.

Every route below requires the grant in `X-Customer-Grant`. A missing, forged,
expired or foreign-workspace grant answers `401 not_found`. Each call
re-resolves the order by reference **and** the verified email inside the
workspace, so another email's order, another website's order and an unknown
reference all answer `404 order_not_found` alike. Codes and grants are never
logged.

| Route                                                                                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/website/tracking/orders`                                                     | The email's orders, newest first (at most 50): reference, plan, the three state dimensions, `actionNeeded`, dates.                                                                                                                                                                                                                                                                                 |
| `GET /api/v1/website/tracking/orders/{reference}`                                         | One order: plan and frozen price, states, provider reference, the customer's current details (submitted values plus approved amendments), document checklist, documents still required, per-document status (`received`, `approved`, `needs_replacement`), open staff info requests, and change requests (field names and status only). No notes, staff names or audit rows.                       |
| `POST /api/v1/website/tracking/orders/{reference}/change-requests`                        | `{ patch, note? }` with only the amendable fields (REQ 21). Creates a pending row in `order_change_requests` with `payload.origin = "customer"`; staff approve or reject it in admin's Change requests panel and approval writes the audited amendment (REQ 14). At most three open customer requests per order (`409 too_many_pending_requests`). The response carries field names, never values. |
| `POST /api/v1/website/tracking/orders/{reference}/info-requests/{infoRequestId}/response` | Answers a staff request for missing details. The patch must supply exactly the requested fields (`422 info_request_fields_mismatch`); it becomes a pending change request linked to the info request, which is marked answered.                                                                                                                                                                    |
| `POST /api/v1/website/tracking/orders/{reference}/uploads/intents`                        | `{ documentType, fileName, contentType, sizeBytes }` (bot check `upload-intent`). The type must be on the order's frozen checklist. Returns the same signed direct-to-R2 PUT as the order form, attached to the order.                                                                                                                                                                             |
| `POST /api/v1/website/tracking/orders/{reference}/uploads/{uploadId}/finalize`            | `{ checksumSha256 }` (bot check `upload-finalize`). Copy-verifies signature and checksum (invariant 8); an upload belonging to another order answers `404 upload_not_found`. Returns the document as `received`; it appears in admin's Documents panel for review.                                                                                                                                 |

Customer writes are additionally limited per email (30 per 10 minutes).
`GET /api/v1/website/tracking` (single order bound to a reference) was removed.

Staff ask for missing details with
`POST /api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/info-requests`
(`{ fields, message? }`, `order.manage`; at most three open per order) and
withdraw one with `.../info-requests/{infoRequestId}/cancel`. The staff order
detail lists `infoRequests` and marks each change request's `origin`
(`staff` or `customer`) and `infoRequestId`. The audit keeps field names only.

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
