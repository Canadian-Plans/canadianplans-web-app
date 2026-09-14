# API.md

Generated reference for `apps/backend`'s `/api/v1` surface. Kept in sync with
`@canadian-plans/contracts` — every endpoint below is validated against the
Zod schema of the same name at both request and response time.

An OpenAPI document generated from `@canadian-plans/contracts` is planned
(PLATFORM_CONTEXT.md §3, IMPLEMENTATION_PLAN.md §7) but not wired yet; this
file is the hand-maintained skeleton until that generation step exists.

## Conventions

- Base path: `/api/v1`.
- Every response carries the `x-request-id` header and echoes the same value
  in the JSON body's `requestId` field.
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
