# jobs

Placeholder for backend-invoked outbox handlers (T15) and separately operated offline recovery tooling (T24), following the build plan. There is no worker, scheduler or database implementation yet.

Ordinary handlers receive database operations from backend-owned orchestration; `jobs/**` has no blanket database-import exemption. Any future offline migration, backup, restore or database-test entry point must have its exact file path added to `offlineDbFiles` in `packages/config/boundaries.js`, with its responsibility and exception documented in the same task.
