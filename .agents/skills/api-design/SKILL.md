---
name: api-design
description: Design HTTP/REST APIs - resources, endpoints, status codes, errors, pagination, versioning, idempotency. Use when creating or modifying any API endpoint or reviewing an API contract.
---

# API Design

Contract first, code second. An API is a promise; design it as one.

## Procedure

1. **Model resources, not actions.** Nouns, plural (`/invoices`, `/invoices/{id}/line-items`). Actions that don't map to CRUD become sub-resources (`POST /invoices/{id}/send`) — sparingly.
2. **Write the contract before code**: for each endpoint — method, path, auth requirement, request schema, response schema, every status code it can return, error shapes. This table IS the deliverable to review.
3. **Apply the rules table:**

| Concern | Rule |
|---|---|
| Status codes | 200 read/update, 201 create (+Location), 204 delete, 400 malformed, 401 unauthenticated, 403 unauthorized, 404 missing OR hidden-by-authz, 409 conflict, 422 valid syntax/invalid semantics, 429 rate limited |
| Errors | One machine-readable shape everywhere: `{ "error": { "code": "invoice_not_found", "message": "...", "details": [...] } }`. Codes stable and documented; messages human, never leaking internals |
| Pagination | Mandatory on every collection. Cursor-based default (`?cursor=&limit=`, response carries `next_cursor`); hard max limit |
| Filtering/sort | Explicit allowlist of fields; never pass client input into query construction |
| Idempotency | GET/PUT/DELETE idempotent by design; POST that creates accepts `Idempotency-Key` header when clients may retry (payments: mandatory) |
| Versioning | Additive changes (new optional fields) need no version. Breaking changes → new major (`/v2/`) + deprecation window on old. Never silently change semantics |
| Auth | Every endpoint authenticated by default; public endpoints are the explicit exception, documented |
| Timeouts/limits | Server-side timeout, request size limit, rate limit per principal — decided at design time, not incident time |

4. **Design for the consumer**: write the client code snippet for the top use case first. If it's awkward, the API is wrong.
5. **Walk the edge cases**: empty collection (200 + `[]`, not 404), partial batch failure (207 or per-item status — pick one convention), concurrent update (ETag/version field → 409), large payloads.
6. **Review** the contract against this skill's rules and the affected sections of [docs/API.md](../../../docs/API.md). Reuse existing error shapes, naming and shared contract schemas; examples here do not authorize changing established conventions.

## Compatibility rules

Safe: adding optional request fields, adding response fields, adding endpoints/enum values (if clients
were told to tolerate unknowns). Breaking: removing/renaming anything, type changes, new required
fields, tightening validation, changing error codes, reordering enum semantics.

## Anti-patterns

Verbs in paths (`/getUser`), 200-with-error-body, unpaginated lists, per-endpoint error formats,
exposing DB ids/columns 1:1, chatty designs needing N calls for one screen.
