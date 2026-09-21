# Environment variables

This file intentionally lists variable names only. Store all values in the
password manager and in the appropriate deployment environment; never commit
them or paste them into chat.

The redacted [deployment inventory](DEPLOYMENT_INVENTORY.json) records which
credential names are present in each preview deployment and maps each one to a
non-production resource using a SHA-256 fingerprint of the provider-issued
immutable resource ID. Display names are not accepted as isolation evidence.
Preview deployments are currently recorded as not provisioned; update the
inventory in the same reviewed change that provisions any preview credential.
Provisioned inventory entries must declare `emailProvider: fake` and
`authSmtp: fake_sink`; customer email configuration does not configure Auth SMTP.
The check validates the committed inventory, not live provider configuration.
Read-only provider observation on 2026-09-14 found no Vercel projects in the
Canadian Plans team and one Supabase project in `us-west-2`. Do not use that
project as evidence of Canadian staging compliance (required: `ca-central-1`).

The default website-write route validates `X-Turnstile-Token` through Cloudflare
Siteverify before database work. It denies missing configuration, invalid tokens,
hostname/action mismatches and provider failures. The storefront must forward a
fresh widget token with action `lead-submit`; deployed widget verification remains
pending. Tests inject explicit admission or mock the provider response.
The backend does not trust caller-controlled `X-Forwarded-For`; any deployment
proxy trust policy must be narrowly verified before enabling public traffic.

## Runtime

- `NODE_ENV`
- `PORT`
- `DEPLOYMENT_ENV` — backend-only platform-neutral deployment environment: `production`, `preview` or `development`. Railway has no `VERCEL_ENV`, so this is set explicitly per service; `VERCEL_ENV` remains a fallback during the Vercel-to-Railway cutover (ADR 0004). An unknown or unset value resolves to no environment and is never treated as production. `preview` makes the internal job routes and the in-process scheduler refuse to run.
- `ENABLE_SCHEDULER` — backend-only opt-in for the in-process scheduler. Exactly `1` enables the 60s outbox and 300s catalogue-sync timers; unset disables scheduling. It must not be set on a preview environment. Railway cron has a five-minute floor and no minute-level precision, which is why the schedule is in-process (ADR 0004).
- `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` — Railway service variable (Railway default `0`). Set to `30` so Railway waits between `SIGTERM` and `SIGKILL`, giving graceful shutdown time to drain an in-flight run.
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `ADMIN_ORIGIN` — backend-only exact admin origin allowed for browser API calls; defaults to `http://localhost:3000` in local development
- `MACHINE_REGISTRY_JSON` — backend-only server-only integration registry (PLATFORM_CONTEXT §4b). A Sanity webhook entry maps `{ selector, provider: "sanity", providerAccount, workspaceId, actorId, verificationSecret, sanity: { projectId, dataset, apiVersion?, readToken?, revalidateUrl, revalidateSecret } }`; scheduler entries map `{ selector, secret, actorId, workspaceIds, scopes }`. `actorId` is the UUID written into tenant transaction context: for a scheduler entry it attributes that identity's job runs, and for a webhook entry it is the verified machine actor persisted on every ingested catalogue event and reused by each later drain write. Webhook entries without `actorId` are rejected by the schema, so **this release changes the registry shape: add `actorId` to every webhook entry in `MACHINE_REGISTRY_JSON` in the same release, before the backend is deployed**, or webhook ingestion fails closed. Unset means deny-all. Configure Sanity's custom `X-Webhook-Selector` and `X-Provider-Account` headers to match the entry; secrets and environment registries remain separate.
- `CRON_SECRET` — backend scheduler secret, used by the in-process scheduler and by authenticated manual invocations of the internal routes. It must equal the `secret` on the selected scheduler registry entry and must not be exposed to preview deployments. The registry rejects duplicate active scheduler secrets, so one `CRON_SECRET` requires a single registry entry holding both `outbox:run` and `reconcile:run`, with both selector variables pointing at it.
- `JOB_RUNNER_SELECTOR` — backend-only selector for the scheduler registry entry used by the in-process scheduler and the manual `/api/internal/jobs/run` route. The entry must have `outbox:run`, an explicit `actorId`, and the complete authorized workspace UUID set. The runner takes its workspace set and actor only from this verified entry, never from a database tenant scan.
- `CATALOGUE_SYNC_SELECTOR` — backend-only selector for the scheduler registry entry used by the 300-second in-process catalogue sync (T10B) and the manual `/api/internal/catalogue/sync` route. The entry must have the existing `reconcile:run` scope (no new scope or migration), an explicit `actorId`, and the complete authorized workspace UUID set; its `secret` must equal `CRON_SECRET` (see the single-entry note above). Unset means the route cannot resolve a scheduler and fails closed.
- `OUTBOX_ADAPTERS` — backend-only explicit provider opt-in. Only `fake` is accepted, and only when `NODE_ENV` is not `production`, to construct the in-memory email/analytics fakes. Otherwise the analytics handler uses the configured Umami sink (below) and the email handler stays unconfigured until T18 wires its adapter. Unset, unknown or any value on a production deployment with no configured sink selects no provider: handlers fail permanently with `provider_not_configured`, so each claimed job is recorded as failed and appears in admin rather than completing with a fake provider id. There is no implicit default; never set a fake provider on production.
- `QUOTE_WITHDRAWAL_POLICY` — `immediate` or `honour_until_expiry`. This is a **TEST policy only** while OPEN_INPUTS #14 is unresolved. Unset/unknown becomes `unresolved` and disables priced checkout; do not set it in production until the owner records the decision.
- `ORDER_OPERATIONAL_TRANSITIONS` — **TEST-only** switch that lets T14/T16 exercise the dispatch and activate transitions synthetically. It must be exactly `1` or `true` to have any effect, is always ignored when `NODE_ENV=production` (production is disabled regardless of the value), and never authorizes real dispatch or activation. Production dispatch/activation stay disabled until OPEN_INPUTS #15 (transition prerequisites) is resolved; do not set this on a production deployment.

## Deletion ledger (T21, §13)

- `DELETION_LEDGER_ENDPOINT` — backend-only write endpoint of the dedicated deletion/suppression ledger bucket (Backblaze B2), separate from the archive. The object key is the logical deletion id, so a retry cannot duplicate an event.
- `DELETION_LEDGER_TOKEN` — backend-only write-only ledger credential; it must not be able to delete events or read back other events.

Unset (either value) means no ledger is configured: a `deletion_ledger_publish` job fails closed with `deletion_ledger_not_configured` and the local intent stays pending/failed rather than reporting completion. The write-only/S3 SigV4 key restrictions are provisioned and verified by T4R before this is set in production.

## Customer tracking (T22)

- `TRACKING_HASH_SECRET` — backend-only HMAC secret (at least 32 characters) that keys the order-tracking email/code hashes and the 30-minute tracking grant. Unset or too short means tracking is unavailable: the OTP request still answers neutrally and verify/status fail closed with `persistence_unavailable`. Never expose it to a browser bundle and rotate it only with a deployment (existing grants and pending codes become invalid).
- `TRACKING_OTP_MIN_LATENCY_MS` — optional backend-only minimum latency for the neutral `tracking/otp` response (default `500`, capped at `5000`), so a matched and unmatched request are timing-indistinguishable. Set lower only in tests; never lower it in production.

## Supabase

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — backend publishable/legacy anonymous key used only for server-side Auth verification; never a privileged key
- `NEXT_PUBLIC_SUPABASE_URL` — admin browser Auth endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — admin publishable/legacy anonymous key; the admin client extracts Auth only and never calls Data or Storage APIs
- `DATABASE_URL` — backend-only Supavisor transaction-mode URL for the restricted `app_runtime` role; never use the migration owner or a service-role key
- `DATABASE_SSL_MODE` — optional; defaults to `require`, with `disable` allowed only for local disposable PostgreSQL
- `MIGRATION_DATABASE_URL` — offline/CI migration connection using a separate privileged database role; never exposed to applications or previews
- `MIGRATION_DATABASE_SSL_MODE` — optional; defaults to `require`, with `disable` allowed only for local disposable PostgreSQL
- `TEST_MIGRATION_DATABASE_URL` — test-only privileged connection to a disposable database whose name ends in `_test`; never reuse a staging or production migration URL
- `DB_TEST_ALLOW_DESTRUCTIVE` — explicit integration-test opt-in; must be exactly `1` and is set only alongside `TEST_MIGRATION_DATABASE_URL`

The application has no privileged Supabase key variable. Staff invitations use a pending backend membership plus the recipient's public Auth signup/confirmation flow. Custom Auth SMTP and allowed redirect URLs must be configured before live invitation/recovery testing (OPEN_INPUTS #21).

## Cloudflare R2

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`

## Cloudflare Turnstile

- `TURNSTILE_SECRET_KEY` — backend-only Siteverify secret; public test secrets are rejected
- `TURNSTILE_HOSTNAME` — exact allowed storefront hostname returned by Siteverify, without scheme or path

The verifier has a five-second network timeout and does not cache successful tokens.
It never takes the allowed hostname from the request. Do not place live Turnstile
credentials in previews. The current credential proof endpoint uses `lead-submit`;
future public actions must bind their own expected action explicitly.

## Sanity

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION`
- `SANITY_API_TOKEN`
- `SITE_1_SANITY_PREVIEW_TOKEN` — site-1-scoped, read-only viewer token for editor draft preview only; never `NEXT_PUBLIC_*`
- `SITE_1_REVALIDATE_SECRET` — site-1 server-only bearer secret accepted only by `/api/revalidate/catalogue`; must match the registry entry's `sanity.revalidateSecret`

## Email (T18)

- `EMAIL_PROVIDER` — backend-only, explicit selection: `fake`, `resend`, or `ses`. There is no implicit default; an unset or unrecognised value fails every email job closed with `provider_not_configured` rather than guessing. `fake` is only honoured outside `NODE_ENV=production`. Set to `fake` in CI and preview deployments; `resend` is the live default (OPEN_INPUTS #23: Resend selected for launch); `ses` remains available but is deferred to a later migration.
- `EMAIL_CONTACT_HASH_SECRET` — backend-only, at least 16 characters. Keys the HMAC used to match a contact against suppression/consent records without storing the raw address; rotating it invalidates existing unsubscribe links and orphans old suppression matches, so treat it as a durable secret, not a rotate-on-a-whim one.
- `EMAIL_WEBHOOK_SHARED_SECRET` — backend-only shared secret gating `/api/v1/email/webhook/events`. Interim verification only: provider webhook notifications should move to the provider's supported signed transport (Resend's Svix signature, or SES/SNS) as a follow-up.
- `MARKETING_CONSENT_VERSION` — the consent-version string recorded when a customer unsubscribes via the no-login link; defaults to `"1"` if unset.

## Resend (current email provider)

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — must be an address on a domain verified in the Resend account
- `RESEND_FROM_NAME`
- `RESEND_REPLY_TO_EMAIL` — optional

## AWS SES (deferred)

Not selected for launch (OPEN_INPUTS #23); kept wired for a later migration off Resend.

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SES_FROM_EMAIL`
- `SES_FROM_NAME`
- `SES_REPLY_TO_EMAIL` — optional
- `SES_CONFIGURATION_SET_NAME` — optional; required in practice to receive delivery/bounce/complaint events at `/api/v1/email/webhook/events`

## Observability and analytics

- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`

- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `UMAMI_EVENTS_URL` — backend-only full URL of the Umami collect endpoint server events POST to (for Umami Cloud, `https://cloud.umami.is/api/send`). Never exposed to a browser bundle.
- `UMAMI_WORKSPACE_WEBSITES` — backend-only JSON array `[{ "workspaceId": "<uuid>", "websiteId": "<umami-site-id>" }]` mapping each workspace to its Umami website id. A workspace with no mapping fails closed (`analytics_site_unmapped`) rather than sending to the wrong site (REQ 35). Unset or malformed means no server sink is configured, so the outbox fails closed.
- `UMAMI_HOSTNAME` — optional backend-only hostname recorded on server events; omitted when unset.

Server lead/order conversion events are emitted once from the backend outbox; browser page views and `plan_selected` come from the Umami script. Never enable a server event that the browser also sends, or a submission is counted twice.

## Site 1 backend (server only)

- `SITE_1_BACKEND_URL`
- `SITE_1_SERVICE_CREDENTIAL`

## Backblaze B2 backups

- `B2_APPLICATION_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET`
- `B2_ENDPOINT`
