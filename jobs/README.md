# jobs

Backend-invoked outbox orchestration and provider handlers. The runner receives a
tenant-scoped store from `apps/backend`; it never imports the database or discovers
tenants itself. The backend scheduler registry supplies the explicit workspace set.

Ordinary handlers receive database operations from backend-owned orchestration;
`jobs/**` has no blanket database-import exemption. Any future offline migration,
backup, restore or database-test entry point must have its exact file path added to
`offlineDbFiles` in `packages/config/boundaries.js`, with its responsibility and
exception documented in the same task.
