# Catalogue sync and price-error handling

Owner: Takib. Required access: backend environment variables, Sanity project,
and the restricted runtime database credential. Do not paste secrets or CMS
payloads into tickets or logs.

## Safe manual invocation

Webhook receipt only commits a tenant-scoped inbox row and returns `200`.
The scheduled route (`GET`/`POST /api/internal/catalogue/sync`, T10B) runs the
same handlers, but its `crons` entry is not deployed yet (see "Scheduling
boundary"). Until then, run the handlers manually from the repository with the
target UUIDs:

```powershell
pnpm --filter backend catalogue:job -- process-event <workspace-uuid> <event-uuid>
pnpm --filter backend catalogue:job -- reconcile <workspace-uuid>
```

Or drive the identical scheduled pass by authenticated POST against a deployment
that has the route:

```text
POST https://<backend>/api/internal/catalogue/sync
Authorization: Bearer <CRON_SECRET>
X-Scheduler-Selector: <CATALOGUE_SYNC_SELECTOR>
```

The command reads `DATABASE_URL`, `DATABASE_SSL_MODE`,
`MACHINE_REGISTRY_JSON`, and the TEST-only `QUOTE_WITHDRAWAL_POLICY`. It prints
only a bounded diagnostic code on failure. Re-running either action is safe:
inbox delivery IDs, canonical version hashes, and product leases make the work
idempotent and convergent.

## Stable actor attribution

Each verified Sanity webhook records the registry entry's `actorId` on its inbox
row (`app.catalogue_sync_events.actor_id`). Every later `processEvent` write
(drain or manual) reuses that persisted actor, so audit attribution is the
machine identity that ingested the delivery — never the event id, the scheduler
actor or a random UUID. Rows created before the column existed are backfilled
deterministically with their own event id by migration `0014`; all new ingest
writes the verified registry actor. Consequently `MACHINE_REGISTRY_JSON` must
include `actorId` on every webhook entry (see `docs/ENV.md`).

Manual `reconcile` refuses a synthetic actor too. The command resolves, from
`MACHINE_REGISTRY_JSON`, the single non-revoked scheduler entry that authorizes
the target workspace and holds `reconcile:run`, and uses that entry's `actorId`.
If zero or several entries match it fails closed, prints
`reconcile_actor_unavailable`, and writes no catalogue state; no extra
environment variable is required. Reconciliation reads the published snapshot
once for the whole pass — the per-delivery post-lease re-fetch stays in
`processEvent` (ADR 0003).

## Verify

Open `/w/<workspace>/settings/catalogue` and confirm:

1. Last success advanced and current error is `None`.
2. The expected product points to the intended current offer version.
3. The storefront revalidation endpoint succeeded (a failure leaves the sync
   event failed so it can be retried).

If Sanity cannot be read, priced quote creation returns
`unpriced_lead_required`; keep the lead as an incomplete/unpriced callback and
do not confirm an order. If version integrity is uncertain, stop priced
checkout and escalate to the owner. Never edit `offer_versions` or restore
availability by changing historical rows.

## Scheduling boundary

T10B registers these handlers with T15's authenticated cron surface at
`/api/internal/catalogue/sync`. For every workspace in the verified scheduler
identity's explicit set, in registry order, the route runs one bounded
`drainEvents` pass and then `reconcile` using the registry entry's `actorId`; it
never discovers a tenant through the database and refuses preview deployments.
It requires the existing `reconcile:run` scope, selected by
`CATALOGUE_SYNC_SELECTOR` (`docs/ENV.md`) — no new scope and no schema migration.
A workspace whose drain or reconcile fails is recorded with a bounded error code
and the pass continues, so one poison workspace cannot stall the schedule. A
120-second run deadline stops starting new workspaces while work already in
flight is still recorded, so a slow CMS cannot exceed the serverless limit.

The five-minute `crons` entry (`*/5 * * * *`) is **not** in
`apps/backend/vercel.json` yet: a sub-daily cron expression fails the whole
deployment on the Hobby plan, exactly as the one-minute outbox entry did before
it was removed. It is added together with the outbox entry once a Pro,
non-preview deployment exists (`docs/RUNBOOKS/outbox-jobs.md`). Until then the
route is reachable only by the authenticated manual POST above, so the hosted
staging check (G30) remains unrecorded — see `docs/EVIDENCE/T10-T12-T15.md`.

One drain pass lists the workspace's pending events plus failed events still
below the bounded maximum attempt count, in deterministic `createdAt` then `id`
order, and calls `processEvent` for each. A single failing event is recorded and
the drain continues, so one poison delivery cannot block the rest of the inbox.
A duplicate delivery is stored once at ingest; an older delivery drained after a
newer one re-reads the published document and converges on the newer revision; a
product whose webhook never arrived is created by the `reconcile` half alone.
