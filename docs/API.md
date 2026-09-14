# API.md

Hand-maintained reference for `apps/backend`'s `/api/v1` surface. Shared Zod
request/response/error schemas live in `@canadian-plans/contracts` and are
consumed by both backend tests and the admin API client.

An OpenAPI document generated from `@canadian-plans/contracts` is planned
(PLATFORM_CONTEXT.md §3, IMPLEMENTATION_PLAN.md §7) but not wired yet; this
file is the hand-maintained skeleton until that generation step exists.

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

## Staff permission matrix

`workspace.read` is non-privileged so an authenticated Owner/Finance actor can
reach MFA enrollment/challenge and recovery. Every other Owner/Finance action
below requires verified `aal2`.

| Role     | Matrix actions                                        |
| -------- | ----------------------------------------------------- |
| owner    | every T5 action                                       |
| orders   | `workspace.read`                                      |
| partners | `workspace.read`                                      |
| finance  | `workspace.read`, `financial.read`, `invoice.approve` |
| content  | `workspace.read`                                      |
| viewer   | `workspace.read`                                      |

Individual permission rows map to document download, financial data, bulk
export, deletion, invoice approval and integration management. An explicit
individual `deny` wins over the matrix; otherwise an explicit `allow` can add
the mapped action. No match denies by default.
