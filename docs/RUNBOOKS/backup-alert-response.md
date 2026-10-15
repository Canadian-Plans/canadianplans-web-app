# Backup alert response

Owner and escalation contact: Takib. Covers what to do when the backup
monitor alert fires. See [alerts.md](alerts.md) for the owner alert channel
mechanics and [restore.md](restore.md) for the full recovery procedure this
runbook escalates into if a real restore turns out to be necessary.

## Required access

- The `backup-monitor` GitHub Environment (read-only recovery-reader B2
  credential — `.github/workflows/backup-monitor.yml`) to inspect the
  monitor's own run output; GitHub Actions run history access to view logs.
- Owner alert channel configuration (`OWNER_ALERT_EMAIL` /
  `OWNER_ALERT_WEBHOOK_URL`) is where the alert itself arrives — no
  additional access needed just to receive it.
- Backblaze B2 console access (owner-controlled) only if the monitor's own
  read-only credential cannot explain the failure and a human needs to look
  at the bucket directly.

## What triggers this alert

`jobs/src/monitor/cli.ts`, run hourly by
`.github/workflows/backup-monitor.yml` (cron `8 * * * *`), checks the latest
verified backup snapshot's age against a 26-hour threshold (REQ 44 — well
inside a 24-hour backup cadence). The monitor alerts through the same owner
alert channel as every other alert source ([alerts.md](alerts.md)) when the
latest complete verified snapshot is:

- **older than 26 hours**,
- **missing** entirely, or
- **malformed** (fails its own verification check).

The monitor's B2 credential is read-only (list + get) and is a **third,
independent credential** from the daily backup writer's (list + write only,
no read/delete) and the retention administrator's (adds delete) — a compromise
of one cannot silently corrupt or hide from another.

## Immediate response

1. **This alert on its own is not an active incident** — data is not lost;
   it means the _next_ backup either hasn't run recently enough or didn't
   verify cleanly. Do not disable public traffic or begin the
   [restore.md](restore.md) incident procedure based on this alert alone.
2. Open the failed/triggering GitHub Actions run for `backup-monitor.yml`
   (and, separately, the most recent runs of `backup.yml`, the daily backup
   workflow) and read the step output — the monitor's failure message states
   which check failed (age, missing, or malformed).
3. Check whether `backup.yml` itself is failing. Common causes: the daily
   backup workflow's B2 writer credential expired/rotated without updating
   the GitHub Environment secret, a transient Supabase/R2/Sanity API error
   during capture, or a schema/tooling change that broke `jobs/backup`'s
   assumptions (`jobs/src/backup/cli.ts`).
4. If `backup.yml` is failing, fix the underlying cause (commonly a
   credential issue — see [secret-rotation.md](secret-rotation.md) if a B2
   key needs rotating) and re-run it manually:
   ```sh
   pnpm --filter @canadian-plans/jobs run backup
   ```
   (this is also invoked automatically by `.github/workflows/backup.yml`;
   prefer re-running the workflow from GitHub Actions so the same environment
   and secrets are used, rather than running the CLI locally with
   hand-copied credentials).
5. If `backup.yml` is succeeding but the monitor still reports the snapshot
   as too old/missing/malformed, the two credentials may be looking at
   different buckets/prefixes, or the monitor's own verification logic is
   failing — check `jobs/src/monitor/cli.ts`'s required environment
   variables against what the `backup-monitor` GitHub Environment actually
   has configured.
6. Once a fresh backup completes successfully, either wait for the next
   hourly monitor run or trigger it manually:
   ```sh
   pnpm --filter @canadian-plans/jobs run monitor
   ```
   (again, prefer re-running the `backup-monitor.yml` workflow from GitHub
   Actions over a local run, so it uses the read-only Environment credential
   rather than a locally-configured one).

## Confirm the latest backup succeeded (read-only check)

This is the safe, low-risk verification any operator can run without
touching credentials or triggering a real backup:

1. Open the GitHub Actions history for `backup.yml` and confirm the most
   recent scheduled run (daily) is green and completed within the last
   24-26 hours.
2. Open the GitHub Actions history for `backup-monitor.yml` and confirm the
   most recent hourly run is green — a green monitor run is itself
   confirmation that the snapshot it checked was within the 26-hour window
   and passed verification.
3. If both are green and recent, no further action is needed — this is the
   expected steady state, not something requiring the alert-response steps
   above.

## Verify

1. `backup-monitor.yml`'s next scheduled (or manually triggered) run
   completes green.
2. No further owner alert arrives for this condition on the following hourly
   run.
3. If a credential was rotated to fix this, confirm the new credential is
   recorded in the `backup-monitor` (or `backup`) GitHub Environment secrets
   and the old one is deactivated in the B2 console
   ([secret-rotation.md](secret-rotation.md)).

## Safe stopping point

It is safe to pause after confirming whether `backup.yml` itself is healthy
(step 3) — a single missed or delayed backup inside the 26-hour window is not
an emergency requiring same-session resolution, provided the underlying cause
is understood and a fix is in progress.

## Escalation

Escalate to the owner (Takib) immediately if: the monitor reports the
snapshot as **malformed** (a verification failure, not just staleness — this
can indicate a real problem with backup integrity, not just a missed run),
multiple consecutive daily backups have failed, or if diagnosing the failure
would require broader B2 console access than the read-only monitor
credential provides.
