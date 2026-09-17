# Outbox jobs

The backend production deployment runs the outbox on an **in-process scheduler**
(Railway; ADR 0004): `OutboxRunner.run` fires every 60 seconds from the service
itself when `ENABLE_SCHEDULER=1`, and skips a tick while the previous run is
still in flight. The scheduler resolves its actor and explicit workspace set from
the server-only machine registry (`JOB_RUNNER_SELECTOR` + `CRON_SECRET`), exactly
as the HTTP route does, and never scans the database for tenants.

`GET /api/internal/jobs/run` and its equivalent authenticated `POST` remain for
manual invocation and staging checks. The GET is no longer driven by a Vercel
`crons` entry: Railway cron has a five-minute floor and no minute-level precision
guarantee, which is why the schedule moved in-process.

The same scheduler runs the T10B catalogue sync every 300 seconds under the
`reconcile:run` scope (`docs/RUNBOOKS/catalogue-sync.md`).

## Configuration

Set `CRON_SECRET`, `JOB_RUNNER_SELECTOR`, `CATALOGUE_SYNC_SELECTOR`,
`ENABLE_SCHEDULER`, and `MACHINE_REGISTRY_JSON` only on the backend production
environment. `CRON_SECRET` must match the selected scheduler entry. The entry must
contain a UUID `actorId`, `outbox:run`, and the explicit workspace UUIDs that this
deployment may process. Do not put a catch-all tenant identity or a privileged
database URL on the scheduler. Because the registry rejects duplicate active
scheduler secrets, one `CRON_SECRET` means a single entry holding both
`outbox:run` and `reconcile:run`, with both selectors pointing at it (documented
in `docs/ENV.md`).

Provider adapters are selected explicitly. Set `OUTBOX_ADAPTERS=fake` on local and
automated non-production deployments that should exercise the in-memory email and
analytics fakes; the value is refused when `NODE_ENV=production`, so a fake is never
used to deliver production mail. There is no implicit default: a production
deployment, or any deployment without the explicit opt-in, registers handlers that
fail permanently with `provider_not_configured`. The claimed job is recorded as
failed and appears in admin rather than completing with a fake provider id.

The route authenticates `Authorization: Bearer $CRON_SECRET` and rejects preview
deployments even if a secret is accidentally copied (`DEPLOYMENT_ENV` /
`VERCEL_ENV` is `preview`). The in-process scheduler refuses to start under the
same condition. Validate scheduling on a non-preview deployment, never on a pull
request preview.

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
