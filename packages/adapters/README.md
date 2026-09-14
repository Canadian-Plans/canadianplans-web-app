# @canadian-plans/adapters

Server-only Sanity/R2/email/delivery/payment/analytics provider adapters,
each behind an interface (per PLATFORM_CONTEXT.md §6 Phase B seams), plus
in-memory fakes for tests. Real providers are wired in later tasks
(T9–T20).

## Single responsibility

Isolate every third-party provider SDK and secret behind a small interface
so the backend depends on an interface, not a vendor.

## Must never import

- `@canadian-plans/db` — adapters don't run queries; the backend composes
  db + adapters.
- `@canadian-plans/ui` — this package is never bundled for the browser.
- Any app (`apps/*`).

Only `apps/backend` and `jobs/` may depend on this package. Browser-safe
Sanity schema types live in `@canadian-plans/contracts` under the `cms`
export, not here.
