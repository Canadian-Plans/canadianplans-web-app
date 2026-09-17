# Outbox jobs

The backend production deployment exposes `GET /api/internal/jobs/run` for
Vercel Cron and an equivalent authenticated `POST` for manual staging checks.
`vercel.json` schedules the GET every minute. This cadence requires a Vercel Pro
project.

## Configuration

Set `CRON_SECRET`, `JOB_RUNNER_SELECTOR`, and `MACHINE_REGISTRY_JSON` only on the
backend production environment. `CRON_SECRET` must match the selected scheduler
entry. The entry must contain a UUID `actorId`, `outbox:run`, and the explicit
workspace UUIDs that this deployment may process. Do not put a catch-all tenant
identity or a privileged database URL on the scheduler.

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

Staff can inspect `/w/{workspace}/settings/jobs`. A staff member with
`integration_management` can retry a definitively failed job. An uncertain job
must be reconciled before any resend because the provider may already have
accepted it. Fake adapters deduplicate using the stable outbox `message_id`.

Manual staging check:

```text
POST https://<staging-backend>/api/internal/jobs/run
Authorization: Bearer <CRON_SECRET>
X-Scheduler-Selector: <selector>
```

Expect HTTP 200 with bounded counters. A 401 means the selector/secret mapping
failed; 403 means the scope is absent or the deployment is a preview.
