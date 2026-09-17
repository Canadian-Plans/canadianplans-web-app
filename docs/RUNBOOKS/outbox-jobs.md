# Outbox jobs

The backend production deployment exposes `GET /api/internal/jobs/run` for
Vercel Cron and an equivalent authenticated `POST` for manual staging checks.

The `crons` entry that schedules the GET every minute is **deliberately absent
from `apps/backend/vercel.json` for now**: a sub-daily cron expression fails the
whole deployment at deploy time while the project is on the Hobby plan
("Hobby accounts are limited to daily cron jobs" — this exact failure took the
backend deployment down when the entry first shipped). T10B re-adds the entry
(`{"path": "/api/internal/jobs/run", "schedule": "* * * * *"}`, plus the
five-minute catalogue sync cron) once the dedicated staging Vercel project on
Pro exists. Until then the authenticated `POST` below is the only invocation
path; nothing else changes about the route.

The same boundary applies to the T10B catalogue sync route,
`GET /api/internal/catalogue/sync`, which drains the catalogue inbox and
reconciles each authorized workspace at a five-minute cadence
(`docs/RUNBOOKS/catalogue-sync.md`). Its route is implemented and tested; only
the `crons` entry is pending the same Pro, non-preview deployment.

## Configuration

Set `CRON_SECRET`, `JOB_RUNNER_SELECTOR`, and `MACHINE_REGISTRY_JSON` only on the
backend production environment. `CRON_SECRET` must match the selected scheduler
entry. The entry must contain a UUID `actorId`, `outbox:run`, and the explicit
workspace UUIDs that this deployment may process. Do not put a catch-all tenant
identity or a privileged database URL on the scheduler. The catalogue sync route
uses a separate `CATALOGUE_SYNC_SELECTOR` entry holding the existing
`reconcile:run` scope (documented in `docs/ENV.md`); its `secret` is the same
`CRON_SECRET`.

Provider adapters are selected explicitly. Set `OUTBOX_ADAPTERS=fake` on local and
automated non-production deployments that should exercise the in-memory email and
analytics fakes; the value is refused when `NODE_ENV=production`, so a fake is never
used to deliver production mail. There is no implicit default: a production
deployment, or any deployment without the explicit opt-in, registers handlers that
fail permanently with `provider_not_configured`. The claimed job is recorded as
failed and appears in admin rather than completing with a fake provider id.

Vercel sends `Authorization: Bearer $CRON_SECRET`. The route rejects preview
deployments even if a secret is accidentally copied. Validate scheduling on the
dedicated staging Vercel project's **production deployment**, never on a pull
request preview. T0 must provision that project before this external check can
be recorded.

## Processing and recovery

Each authorized workspace is visited separately. Claiming uses its tenant
transaction context, `FOR UPDATE SKIP LOCKED`, and a persisted lease. The claim
commits before an email or analytics adapter is called. Completion, retry, or
failure is then written in a second tenant transaction. Retries use capped
exponential backoff with jitter; exhausted and uncertain deliveries create an
alert record.

Each handler is bounded by a per-handler abort timeout (default 30 seconds). A
handler that exceeds it is recorded `uncertain` with `handler_timeout`, never
retried automatically, because the provider may already have accepted the work;
reconcile it before any resend. A run deadline (default 120 seconds) stops
claiming new batches once it passes; jobs already claimed under a lease are still
handled and recorded.

Staff can inspect `/w/{workspace}/settings/jobs`. A staff member with
`integration_management` can retry a definitively failed job. An uncertain job
must be reconciled before any resend because the provider may already have
accepted it. Fake adapters deduplicate using the stable outbox `message_id`.

An operator requeue of a definitively failed job preserves the previous
attempt's provider evidence — the stored `provider_id` and `outcome` — and
resets only the attempt and lease state (status back to `pending`, attempts to
0, availability, lease fields, and the completion/uncertain timestamps).
Incident review and reconciliation therefore still see what the provider
reported, even after a retry; a later successful attempt overwrites the
evidence with its own provider result.

Manual staging check:

```text
POST https://<staging-backend>/api/internal/jobs/run
Authorization: Bearer <CRON_SECRET>
X-Scheduler-Selector: <selector>
```

Expect HTTP 200 with bounded counters. A 401 means the selector/secret mapping
failed; 403 means the scope is absent or the deployment is a preview.
