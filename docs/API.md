# API.md

Hand-maintained reference for `apps/backend`'s `/api/v1` surface. The health
response is checked against the shared contract in backend tests and the
admin's placeholder client; the handler constructs its typed response.

An OpenAPI document generated from `@canadian-plans/contracts` is planned
(PLATFORM_CONTEXT.md §3, IMPLEMENTATION_PLAN.md §7) but not wired yet; this
file is the hand-maintained skeleton until that generation step exists.

## Conventions

- Base path: `/api/v1`.
- Every response carries a fresh server-generated `x-request-id` header.
  The health JSON echoes that value in `requestId`. Unknown routes/methods
  currently use Express's default 404 response, not a JSON error envelope.
- Error envelope shape is defined once `@canadian-plans/contracts` adds it
  (T7) — not yet in place.
- No endpoint below performs a database operation or requires
  authentication; both arrive with T4/T5/T6.

## Endpoints

### `GET /api/v1/health`

Liveness check. No auth, no tenant context, no DB access.

**Response `200`**

```json
{ "ok": true, "requestId": "<uuid>" }
```

Schema: `healthResponseSchema` in
[`packages/contracts/src/health.ts`](../packages/contracts/src/health.ts).
