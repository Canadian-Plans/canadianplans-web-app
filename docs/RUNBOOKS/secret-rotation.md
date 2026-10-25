# Credential rotation

Owner and escalation contact: Takib. Covers rotating the API keys and
signing secrets Canadian Plans depends on. Rotate on suspected compromise
immediately; otherwise treat this as a periodic (recommend: annual, or per
provider's own recommendation) maintenance task. Never place a rotated value
in a repository file, commit message, ticket, or log — only in the
provider's dashboard and the deployment platform's environment-variable
store.

## Required access

- Railway project owner/member access (`canadian-plans-backend` project,
  `backend` service, `production` environment — verified live via the
  Railway MCP on 2026-09-21) to set backend environment variables.
- Vercel team access (`canadian-plans` team; projects
  `canadianplans-web-app-admin` and `canadianplans-web-app-site-1` — verified
  live via the Vercel MCP on 2026-09-21) to set frontend environment
  variables.
- Supabase project-owner dashboard access for the project referenced in
  `docs/ENV.md`.
- Resend, Backblaze B2, and Cloudflare account access as needed per secret
  below.

## General procedure (applies to every secret)

1. Generate the new credential in the provider's dashboard **without**
   revoking the old one yet (most providers support this; if not, expect a
   short window of downtime for that integration and plan the rotation for a
   low-traffic time).
2. Set the new value in the deployment platform's environment-variable store
   (Railway for backend/jobs, Vercel for admin/site-1), then redeploy the
   affected service so the new value takes effect (Railway auto-redeploys on
   variable change for most setups; confirm via the Railway dashboard or
   `list-deployments`).
3. Confirm the service is healthy with the new credential (see per-secret
   verification below).
4. Only after confirming, revoke/delete the old credential in the provider's
   dashboard.
5. Record that the rotation happened (date, secret name, reason) wherever the
   owner tracks operational history — never the value itself.

## Per-secret rotation

### Supabase (`DATABASE_URL`, `SUPABASE_ANON_KEY`, `MIGRATION_DATABASE_URL`)

- `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: rotate from the
  Supabase dashboard's API settings. This repo has **no privileged
  service-role key in application code** (`docs/ENV.md`) — only the
  publishable/legacy anon key, used server-side only for Auth token
  verification. Set the new value on the backend (Railway) and admin
  (Vercel) environments together, since both reference the same project.
- `DATABASE_URL` (the restricted `app_runtime` role): rotate the role's
  password from the Supabase SQL editor or dashboard
  (`ALTER ROLE app_runtime WITH PASSWORD '...'` via the dashboard's
  supported flow, never a hand-run migration against production without
  review). Update the backend Railway variable immediately after — this
  role has no read access without the app's own request context, so a brief
  mismatch fails closed rather than leaking data.
- `MIGRATION_DATABASE_URL`: privileged CI-only role; rotate its password and
  update the CI secret store (GitHub Actions secrets), never the Railway
  runtime environment — this credential must never reach a running
  application or preview.

### Sanity (`SANITY_API_TOKEN`, `SITE_1_SANITY_PREVIEW_TOKEN`)

- Rotate from the Sanity project's API settings (Manage → API → Tokens).
  Create the replacement token with the same scoped permissions (read-only
  for the preview token) before revoking the old one.
- Update `SANITY_API_TOKEN` (Railway backend) and
  `SITE_1_SANITY_PREVIEW_TOKEN` (Vercel `canadianplans-web-app-site-1`)
  separately — they are different tokens with different scopes; do not
  reuse one for the other.

### Resend (`RESEND_API_KEY`)

- Create a new API key in the Resend dashboard (Settings → API Keys),
  update `RESEND_API_KEY` on the backend (Railway), confirm a test send
  succeeds (see [failed-email-recovery.md](failed-email-recovery.md)'s
  manual resend path for how to confirm delivery), then revoke the old key.
  Note this is also the credential the owner alert channel's email side
  reuses ([alerts.md](alerts.md)) — rotating it affects both customer email
  and owner alerts together.

### Cloudflare R2 (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`) and Turnstile (`TURNSTILE_SECRET_KEY`)

- R2: rotate the API token from the Cloudflare dashboard (R2 → Manage API
  Tokens), scoped to the same bucket/permissions as the existing token.
  Update the backend Railway variables.
- Turnstile: rotate the secret key from the Cloudflare dashboard (Turnstile
  → the storefront's widget → Rotate Secret Key). This must stay paired with
  the storefront's public site key (`NEXT_PUBLIC_*` equivalent, if used by
  `site-1`) — rotating only the secret key without confirming the widget
  still points at the matching site key breaks lead submission.

### Backblaze B2 (backup/archive/ledger credentials)

There are **at least three distinct B2 application keys** by design
([restore.md](restore.md)) — do not rotate them together or reuse one for
another's role:

- The daily backup writer (`B2_ARCHIVE_WRITER_KEY_ID` /
  `B2_ARCHIVE_WRITER_APPLICATION_KEY` on the `backup` GitHub Environment) — list +
  write only, no read/delete.
- The retention administrator (`B2_ARCHIVE_RETENTION_KEY_ID` /
  `B2_ARCHIVE_RETENTION_APPLICATION_KEY`, separate GitHub Environment) — adds delete,
  used only by `backup-retention.yml`.
- The backup monitor's read-only reader (`B2_ARCHIVE_READER_KEY_ID` /
  `B2_ARCHIVE_READER_APPLICATION_KEY`, separate GitHub Environment, `backup-monitor` — see [backup-alert-response.md](backup-alert-response.md)).
- The deletion-ledger writer (`DELETION_LEDGER_TOKEN`, Railway backend) —
  write-only, cannot delete or read back events.

Rotate each from the Backblaze B2 console (App Keys) with the **same scoped
capabilities** as the key being replaced — copying an existing key's
capability list before generating the new one avoids accidentally granting
broader access. Update the corresponding GitHub Environment secret or
Railway variable, confirm the next scheduled job run succeeds
(`backup.yml` / `backup-retention.yml` / `backup-monitor.yml`), then delete
the old key.

### Scheduler secret (`CRON_SECRET`) and `MACHINE_REGISTRY_JSON`

This is the most coupled rotation in the system — read
[outbox-jobs.md](outbox-jobs.md) and [catalogue-sync.md](catalogue-sync.md)
before touching it. `CRON_SECRET` must exactly equal the `secret` field on
the single scheduler registry entry that `JOB_RUNNER_SELECTOR` and
`CATALOGUE_SYNC_SELECTOR` both point at (the registry rejects duplicate
active scheduler secrets, so there is deliberately one entry, not one per
selector).

1. Generate a new random secret value.
2. Update `MACHINE_REGISTRY_JSON`'s scheduler entry `secret` field **and**
   `CRON_SECRET` in the **same** Railway deployment — these must change
   together; a deployment with a mismatched pair fails the scheduler closed
   (fails open in the sense that the service still boots and serves traffic,
   but silently never runs a job — see outbox-jobs.md's "fails open"
   warning) rather than erroring loudly.
3. Immediately follow outbox-jobs.md's "Confirm the scheduler actually
   started" check after this deploy — this rotation is exactly the failure
   mode that check exists to catch.

### Sentry (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`)

A DSN is a write-only ingest identifier scoped to one project — rotating it
is lower-risk than most secrets here (it cannot read data back). Regenerate
from the Sentry project settings and update the three variables together
(backend/jobs `SENTRY_DSN`, admin `NEXT_PUBLIC_SENTRY_DSN`); a mismatch
between them just means errors from one app stop reporting until fixed, not
a security exposure.

## Rotation log

Dates and scope only. Never record a value here.

| Date (UTC)       | Credential                                                                                            | Reason                                              | New credential                                                                                                                                                                                        | Verified by                                                                                      | Old credential                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-25 05:23 | Cloudflare R2 API token (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`, Railway backend)                | Stored in plain text in a TickTick note             | Account token `canadian-plans-backend-documents`: Object Read & Write, bucket `canadian-plans-data` only                                                                                              | Railway deployment `3b04c6be` SUCCESS, health ok. First real upload (task 5.2) still to prove it | `canadianplans-admin` (Admin Read & Write, all buckets, never used) deleted                                                                                 |
| 2026-10-25 05:34 | B2 archive writer (`B2_ARCHIVE_WRITER_KEY_ID` / `B2_ARCHIVE_WRITER_APPLICATION_KEY`, GitHub `backup`) | Stored in plain text in a TickTick note             | Key `…0004` `canadian-plans-archive-writer`, exactly `listFiles` + `writeFiles` on the archive bucket, created with the native v4 API by an owner-run script and written straight into GitHub secrets | Backup run `40166011413` and monitor run `40166157021` succeeded                                 | The noted key `…0001` was already absent. Unused key `…0002` `archive-writer` remains; delete it at the next B2 session                                     |
| 2026-10-25 05:45 | Backup recovery age key (`RECOVERY_AGE_RECIPIENT`, GitHub `backup`; private half offline)             | Private key stored in plain text in a TickTick note | New X25519 pair made with age 1.3.2 on the owner's PC, round-trip tested; public key `age159m6g7zxf9vcr2dkqskallm9yswf9h4xnj3yy62guu35lrdjmv9s5lttuf`                                                 | Backup run `40166655606` succeeded with the new recipient                                        | Old private key deleted from TickTick and OneDrive. Backups taken before 05:45 UTC on 25 Oct are readable only with the old key and hold no customer orders |

**Backblaze gotcha:** keys created with the v4 API (`bucketIds` array) do not appear on
the Backblaze website or in `b2_list_keys` v3. Use `b2api/v4/b2_list_keys` to see and
delete them.

## Verify

- Backend/jobs: confirm the relevant service redeployed successfully
  (Railway `list-deployments` shows `SUCCESS` for the latest deployment on
  the `backend` service / `production` environment) and the health check
  passes.
- Frontend: confirm the Vercel deployment for the affected project shows
  `READY` on its current production deployment.
- Functionally exercise the rotated integration (a test order, a test email,
  a scheduler tick) rather than only checking the deploy succeeded — a
  service can boot successfully with a broken credential (outbox-jobs.md's
  "fails open" scheduler behaviour is the sharpest example of this).

## Safe stopping point

Stop safely after step 2 of the general procedure (new value set and
service redeployed) but before revoking the old credential — leaving both
credentials valid briefly is safe and gives room to confirm before the old
one is gone. Never leave a rotation half-done across two different
deployment platforms overnight (e.g. backend updated but admin/site-1 not)
when the secret is shared across them.

## Escalation

Escalate to the owner (Takib) before rotating: `CRON_SECRET` /
`MACHINE_REGISTRY_JSON` (highest blast radius — can silently stop all
scheduled jobs), any B2 credential (three-way separation must be preserved
exactly), or any rotation prompted by suspected compromise (treat as a
security incident, not routine maintenance — preserve logs before rotating).
