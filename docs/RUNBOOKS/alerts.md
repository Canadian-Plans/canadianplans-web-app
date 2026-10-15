# Observability and alerts

REQ 40 / IMPLEMENTATION_PLAN §10. Covers structured logging and its scrubber,
the error tracker, the synthetic order check, and the owner alert channel that
ties failures from all three (plus the backup monitor) back to the owner.

## Structured logging and the scrubber

`@canadian-plans/observability` (`packages/observability/src/index.ts`) is the
one, browser-safe scrubber and log-record builder every app shares — backend,
admin, and jobs never invent their own PII allowlist. `scrubValue` redacts:

- any field whose _name_ marks it as PII regardless of casing/separators
  (`fullName`, `full_name`, `EMAIL`, `phone`, `documentUrl`, `token`,
  `apiKey`, `password`, `passportNumber`, …) — see the fragment list at the
  top of that file;
- an email- or phone-shaped _substring_ inside any surviving string field,
  so a careless free-text note doesn't leak one either;
- depth beyond 6 and strings over 2000 characters, so a malformed or
  adversarial payload can't inflate log volume.

Unit tests: `packages/observability/src/index.test.ts`.

The backend emits one structured `http_request` log per request
(`apps/backend/src/http/requestLog.ts`, wired in `app.ts`) carrying
`requestId`, `workspaceId`, `actorId`, `route`, and `durationMs` — the exact
fields REQ 40 names — pulling workspace/actor identity from whichever auth
middleware already ran (staff session, website credential, or a route's own
`:workspaceId`) rather than requiring every route to log itself.
`@canadian-plans/adapters`'s `logEvent` (`packages/adapters/src/logging.ts`)
is the thin server-side `console.info(JSON.stringify(...))` wrapper backend
and jobs call; it always routes through `buildLogRecord`, so a caller cannot
bypass the scrubber by passing raw fields.

## Error tracker

`createErrorTrackerFromEnv()` (`@canadian-plans/adapters`) builds a
Sentry-class tracker from `SENTRY_DSN` — no `@sentry/*` SDK dependency; it
posts the scrubbed event to the DSN's classic store endpoint directly over
`fetch`, matching this repo's existing hand-rolled-HTTP adapter convention
(`ResendEmailAdapter`, `SesEmailAdapter`). Unset `SENTRY_DSN` yields a no-op
tracker, so `captureException` is always safe to call, and a delivery
failure is swallowed (fire-and-forget) rather than propagating into the
request/job that triggered it.

Every capture carries `requestId`, `workspaceId` (when known), `route`, and a
`release` tag (`RELEASE_SHA`, falling back to `"unknown"`) — REQ 40's
"release tags." The message is always reduced through
`buildErrorEvent`/`scrubValue` before it leaves the process, so a careless
`throw new Error(customerEmail)` still can't reach the tracker with PII
intact.

Wired in:

- **backend** — `apps/backend/src/app.ts`'s last-resort error handler
  (`createInvalidBodyError`) captures anything reaching Express's error path
  (a JSON parse failure, or a handler calling `next(error)`) before
  responding to the client. Test:
  `apps/backend/tests/error-tracking-wiring.test.ts`.
- **jobs** — `backup`, `retention`, `restore`, and `monitor`'s `main().catch`
  blocks (`jobs/src/*/cli.ts`) capture an unhandled failure with the run id
  as `requestId`.
- **admin** — `apps/admin/src/lib/error-tracking.ts` is a browser-safe
  variant (admin cannot import `@canadian-plans/adapters`; it's
  backend/jobs-only by the import-boundary lint) using
  `NEXT_PUBLIC_SENTRY_DSN`. Wired at `instrumentation.ts`'s `onRequestError`
  hook (server components/actions) and `src/app/global-error.tsx` (the
  client render-error boundary). Test:
  `apps/admin/src/lib/error-tracking.test.ts`.

### Verifying the tracker manually (owner)

1. Set `SENTRY_DSN` (backend/jobs) and `NEXT_PUBLIC_SENTRY_DSN` (admin) on
   the target deployment.
2. Trigger a fake error — the simplest is a malformed request:
   `curl -X POST https://<backend host>/api/v1/website/leads -H 'content-type: application/json' -d 'not json'`
3. Confirm the event appears in Sentry within a few seconds, tagged with the
   `requestId` echoed on the response's `x-request-id` header, and that the
   event contains no email/phone/name/token content.

## Synthetic order check

Runs the real `lead → quote → order → cancel` flow
(`apps/backend/src/synthetic/check.ts`) every 15 minutes on the backend's
in-process scheduler (`SYNTHETIC_CHECK_INTERVAL_MS`, alongside the existing
60s outbox and 300s catalogue-sync timers — ADR 0004), against a dedicated
synthetic workspace, then cancels the order it creates so nothing lingers
for staff to see. It drives the same `LeadStore`/`CatalogueService`/
`OrderService`/order-transition classes the public website routes use — not
the HTTP endpoints themselves (no bot check to fight) — so it is a faithful
check of the backend logic, not a browser click-through.

The synthetic workspace needs no Sanity project: its catalogue provider
(`apps/backend/src/synthetic/provider.ts`) is a second, fixed
implementation of the same `CatalogueProvider` seam the Sanity adapter
implements, returning a zero-cost, no-document, no-payment-required offer
fixture — so the check never depends on a payment provider or document
upload/verification being configured.

Also reachable at `/api/internal/synthetic-check/run` (GET/POST,
scheduler-authenticated, mirrors `/api/internal/jobs/run`) for a manual
staging invocation. A preview deployment always refuses it, same as the
other internal job routes.

### One-time provisioning (owner, per environment)

1. Create a dedicated workspace row (`app.workspaces`) that will never be a
   real customer-facing site. Record its id as `SYNTHETIC_WORKSPACE_ID`.
2. Create one `app.products` row in that workspace (any `product_key`).
   Record its id as `SYNTHETIC_PRODUCT_ID`. No `offer_versions` row is
   needed — the synthetic catalogue provider supplies content live, the same
   way a Sanity-backed quote does.
3. Add the `synthetic:check` scope to the **same** scheduler registry entry
   `JOB_RUNNER_SELECTOR`/`CATALOGUE_SYNC_SELECTOR` already point at (one
   `CRON_SECRET`, one entry — the registry rejects duplicate active
   scheduler secrets), and add `SYNTHETIC_WORKSPACE_ID` to that entry's
   `workspaceIds`.
4. Set `SYNTHETIC_CHECK_SELECTOR` to that same selector string.

Unset or missing the scope means the scheduler logs
`scheduler_task_failed` once for `synthetic_check` and simply never adds the
task — it never blocks outbox/catalogue-sync from starting (see
`apps/backend/src/scheduler.ts`'s `createBackendScheduler`).

Test: `apps/backend/tests/synthetic-check.test.ts` (success and every
failure step, using fakes — no real DB needed to verify the flow logic).

### Verifying it manually (owner)

```
curl -X POST https://<backend host>/api/internal/synthetic-check/run \
  -H "x-scheduler-selector: $SYNTHETIC_CHECK_SELECTOR" \
  -H "authorization: Bearer $CRON_SECRET"
```

A healthy response is `{"status":"ok","orderId":"...","reference":"...","durationMs":...}`.
Check the synthetic workspace's order list in admin briefly shows the order
and then `cancelled` — never any other terminal state.

## Owner alert channel

`createOwnerAlertChannelFromEnv()` (`@canadian-plans/adapters`) is the one
channel every alert source sends through:

| Trigger                                                 | Where                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Synthetic check step failed                             | `apps/backend/src/routes/synthetic-check.ts`                                    |
| Backup snapshot older than 26h, missing, or malformed   | `jobs/src/monitor/cli.ts` (`.github/workflows/backup-monitor.yml`)              |
| Failed/uncertain outbox jobs persisting for 10+ minutes | `apps/backend/src/jobs/queueMonitor.ts`, wired into the scheduler's `runOutbox` |
| Error-rate spike                                        | _(not yet wired — see below)_                                                   |

It is deliberately **not** the customer `EmailAdapter`
(`packages/adapters/src/messaging.ts`): the owner is not a suppressible
contact, and an alert must never be gated by consent/unsubscribe state or a
customer template.

### Configuration

Set on the backend production environment and the backup-monitor GitHub
Environment (`.github/workflows/backup-monitor.yml` already forwards these):

- `OWNER_ALERT_EMAIL` + the existing `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/
  `RESEND_FROM_NAME` wire the email channel.
- `OWNER_ALERT_WEBHOOK_URL` (+ optional `OWNER_ALERT_WEBHOOK_SECRET` for an
  `X-Alert-Signature: sha256=<hmac>` header) additionally wires an optional
  chat-channel webhook.

Neither configured means every alert call becomes a no-op that only logs
`owner_alert_channel_unconfigured` — an unconfigured channel degrades to
"check the logs," it never crashes the caller. Both channels configured
fans out to both and only raises if _every_ channel failed to deliver, so
one bad webhook URL can't silently swallow the email the owner actually
needs.

### Failed-job-queue-growth detection

`trackQueueHealth` (`apps/backend/src/jobs/queueMonitor.ts`, unit-tested in
`apps/backend/tests/queue-monitor.test.ts`) is a small, pure state machine:
a single tick reporting failed/uncertain outbox jobs is normal (the outbox
runner's own backoff retries them), so it only alerts once the condition has
persisted continuously for 10 minutes, and resets the moment a tick reports
a clean queue again — so it fires once per incident, not once per 60-second
tick.

### Error-rate spike — not yet wired

REQ 40 lists "error-rate spike" as a fourth alert trigger. This runbook
ships the channel and three of the four triggers; wiring a rate-based
trigger off the error tracker (e.g. N captured exceptions in M minutes)
needs either Sentry's own alerting (simplest — configure an Issue Alert on
the project this DSN points at) or a small in-process counter mirroring
`trackQueueHealth`'s shape. Recorded here rather than silently left out:
**use Sentry's built-in alert rules for now** (no code needed once
`SENTRY_DSN` is set) rather than duplicating that logic in-process.

### Verifying delivery manually (owner)

1. Set `OWNER_ALERT_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
   `RESEND_FROM_NAME` (and optionally the webhook variables) on the target
   environment.
2. Trigger a fake synthetic-check failure — the simplest is a wrong
   `SYNTHETIC_PRODUCT_ID` for one run — or invoke the backup monitor against
   an archive bucket with no recent snapshot.
3. Confirm the alert email arrives at `OWNER_ALERT_EMAIL` within a minute,
   and (if configured) the webhook payload arrives with a valid
   `X-Alert-Signature`.

## Log retention

Follows provider limits (Railway/Vercel log retention, Sentry's plan
retention). Anything needed longer than that lives in the audit tables
(`app.audit_events`), not in logs — see PLATFORM_CONTEXT §10/§13.
