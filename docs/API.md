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
snapshot, creates the order/history, consumes the quote, marks the lead
submitted, and commits the acknowledgement-email and analytics outbox jobs.

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

### `PATCH /api/v1/staff/workspaces/{workspaceId}/orders/{orderId}`

Orders/Owner transition endpoint. Every status transition carries
`expectedVersion`; a stale version returns `409 version_conflict`. Illegal
edges are rejected, cancellation requires a reason, and every accepted edge
writes status history plus an audit event. Dispatch/activation remain gated by
unresolved production prerequisites. Partnered activation returns
`feature_not_ready` until T19 can create its commission atomically.

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

Backend-only Vercel Cron route, scheduled every minute on a Pro production
deployment. Vercel supplies `Authorization: Bearer <CRON_SECRET>`; the secret
and configured selector resolve through the server-only scheduler registry to
an actor, `outbox:run` scope, and an explicit workspace set. Preview
deployments are rejected. An equivalent authenticated `POST` supports manual
staging checks.

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
