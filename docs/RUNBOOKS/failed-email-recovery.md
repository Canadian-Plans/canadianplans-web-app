# Failed-email recovery

Owner and escalation contact: Takib. Covers diagnosing and resending failed
transactional customer email (order acknowledgement, status, dispatch,
activation, awaiting-customer) and the marketing follow-up template. Resend
is the live production provider (`EMAIL_PROVIDER=resend`, `docs/ENV.md`
"Email (T18)" / "Resend"); AWS SES is wired but deferred (OPEN_INPUTS #23).

## Required access

- Staff session with `workspace.read` to view `/w/<workspace>/settings/jobs`.
- Staff session with `integration_management` (the `integration.manage`
  permission) to retry a job.
- Resend dashboard access (owner-controlled account) to inspect provider-side
  delivery/bounce/complaint status.

## How email delivery works here

Every transactional email is queued as an outbox job at the point it is
triggered (order submitted, status changed, dispatched, activated) — never
sent synchronously from the request handler
([outbox-jobs.md](outbox-jobs.md)). The in-process scheduler runs the outbox
every 60 seconds. Each send is bounded by a 30-second per-handler timeout and
capped exponential backoff with jitter on failure.

Three outcomes matter:

- **delivered** — Resend accepted the message and returned a message id.
- **failed** (definitively) — the provider call errored in a way the adapter
  can recognize as non-ambiguous, or attempts are exhausted.
- **uncertain** — Resend returned a non-2xx or a malformed/missing id, or the
  request timed out. This is deliberately **not** treated as failed: the
  provider may have already accepted the message. An uncertain job is never
  auto-retried — see "Reconcile before resending" below.

## Diagnose a failed or missing email

1. Open `/w/<workspace>/settings/jobs` in admin (staff with `workspace.read`).
   This lists pending, processing, failed, and uncertain outbox jobs for the
   workspace. `canRetry` on the response reflects a live
   `integration.manage` authorization check — the retry button only appears
   if you actually hold that permission.
2. Identify the job by its template/order/lead reference. A failed job shows
   the last recorded provider evidence (`provider_id`/`outcome` from its most
   recent attempt), which survives a retry until a later attempt overwrites
   it.
3. Cross-check the Resend dashboard (Emails / Logs) for the same recipient
   and approximate timestamp. Because the `email_messages` audit table never
   stores the raw recipient address (only a `contactHash`, per invariant 12),
   search Resend by the customer's known address, not by a value visible in
   admin.
   - Confirmed 2026-09-21 via the Resend API: the sending domain
     (`canadianplans.com`) is verified with sending enabled, and the message
     log is live and searchable (real delivered messages returned for this
     account). The diagnostic path itself is real, not aspirational.
   - **Note (needs owner verification):** exact Resend *dashboard* navigation
     (menu labels, URL paths in the web UI) is not captured in this
     repository and may change between Resend UI releases — confirm the
     current path in the Resend dashboard rather than relying on this
     runbook for exact clicks.
4. Common Resend-side causes to check: recipient domain hard-bounced, sender
   domain (`RESEND_FROM_EMAIL`'s domain) not verified or DNS records
   (SPF/DKIM/DMARC) broken, API key revoked/rate-limited, or the message was
   rejected for content/compliance reasons.

## Reconcile before resending an uncertain job

An **uncertain** job must never be blindly retried — the provider may have
already sent it, and a naive resend risks a duplicate customer email. Before
retrying:

1. Search the Resend dashboard for a message to that recipient around the
   job's `availableAt`/attempt timestamp.
2. If Resend shows it was sent, do not retry — the job is stuck uncertain in
   admin but the customer already received it; this is a display-state gap,
   not a delivery failure. Escalate to the owner if the job needs to be
   manually marked resolved (there is no admin action to force-clear an
   uncertain job into `delivered`).
3. If Resend shows no matching send, treat it as a genuine failure and
   proceed to the resend step below.

## Resend a definitively failed job

1. In `/w/<workspace>/settings/jobs`, use **Retry** on the failed job (or
   `POST /api/v1/staff/workspaces/{workspaceId}/jobs/{jobId}/retry`).
   Requires `integration.manage`.
2. `404 job_not_found` — the job id is wrong or belongs to another workspace.
   `409 job_not_retryable` — the job is not in a definitively-failed state
   (it may be uncertain — see above — or already pending/processing).
3. A successful retry resets attempts to `0` and returns the job to
   `pending`; the scheduler picks it up on its next 60-second tick. The
   previous attempt's provider evidence is preserved until the new attempt
   overwrites it, so incident review still shows what the first attempt
   reported.
4. Fake adapters (`OUTBOX_ADAPTERS=fake`, non-production only) deduplicate on
   the outbox `message_id` — this is why retrying a job already delivered
   under a fake adapter in a non-production environment never double-sends
   there; it is not what governs production Resend behaviour.

## Manual resend path (Resend is down or misconfigured)

If Resend itself is unavailable or misconfigured (wrong `RESEND_API_KEY`,
unverified sending domain) rather than a single message failing:

1. Confirm the outage/misconfiguration in the Resend dashboard or via a
   direct test send from the dashboard's own test tools.
2. Do not switch `EMAIL_PROVIDER` to `fake` on production to "unblock"
   customers — `docs/ENV.md` is explicit that `fake` is refused whenever
   `NODE_ENV=production`; there is no way to fake-send to a real customer in
   production, by design.
3. Fix the Resend-side configuration (rotate the API key — see
   [secret-rotation.md](secret-rotation.md) — or re-verify the sending
   domain), then retry the backlog of failed jobs from
   `/w/<workspace>/settings/jobs` once delivery is confirmed working again
   (send yourself one test order acknowledgement first).
4. Failed/uncertain jobs persisting for 10+ minutes already trigger an owner
   alert automatically ([alerts.md](alerts.md), "Failed-job-queue-growth
   detection") — if that alert didn't fire, check `OWNER_ALERT_EMAIL` /
   `RESEND_API_KEY` configuration on the alert channel itself (it is a
   separate, non-suppressible send path from the customer `EmailAdapter`).

## Verify

1. The job no longer appears under failed/uncertain in
   `/w/<workspace>/settings/jobs`.
2. The Resend dashboard shows a delivered/accepted event for the recipient
   at the retry's timestamp.
3. For a customer-visible check, confirm receipt with the customer or, for a
   synthetic test, use a controlled verified recipient address only — never
   send a live transactional resend to an address you don't control as a
   test.

## Safe stopping point

Diagnosis (steps under "Diagnose") is read-only and safe to pause at any
point. Once a retry is issued, it is safe to stop and check back after the
next scheduler tick (≤60s) — the retry itself does not need to be watched
live.

## Escalation

Escalate to the owner (Takib) for: any uncertain job where Resend evidence is
ambiguous, a suspected domain-wide deliverability problem (hard bounces
across many recipients), rotating the Resend API key, or any request to
resend a customer email to a different address than the one on the order.
