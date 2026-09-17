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
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `ADMIN_ORIGIN` — backend-only exact admin origin allowed for browser API calls; defaults to `http://localhost:3000` in local development
- `MACHINE_REGISTRY_JSON` — backend-only server-only integration registry (PLATFORM_CONTEXT §4b). A Sanity webhook entry maps `{ selector, provider: "sanity", providerAccount, workspaceId, verificationSecret, sanity: { projectId, dataset, apiVersion?, readToken?, revalidateUrl, revalidateSecret } }`; scheduler entries map `{ selector, secret, actorId, workspaceIds, scopes }`. `actorId` is the UUID written into tenant transaction context for scheduler work. Unset means deny-all. Configure Sanity's custom `X-Webhook-Selector` and `X-Provider-Account` headers to match the entry; secrets and environment registries remain separate.
- `CRON_SECRET` — Vercel Cron bearer secret for the backend production deployment. It must equal the `secret` on the selected scheduler registry entry and must not be exposed to preview deployments.
- `JOB_RUNNER_SELECTOR` — backend-only selector for the scheduler registry entry used by Vercel Cron. The entry must have `outbox:run`, an explicit `actorId`, and the complete authorized workspace UUID set.
- `QUOTE_WITHDRAWAL_POLICY` — `immediate` or `honour_until_expiry`. This is a **TEST policy only** while OPEN_INPUTS #14 is unresolved. Unset/unknown becomes `unresolved` and disables priced checkout; do not set it in production until the owner records the decision.

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

## AWS SES

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SES_FROM_EMAIL`
- `SES_FROM_NAME`

## Observability and analytics

- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`

- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`

## Site 1 backend (server only)

- `SITE_1_BACKEND_URL`
- `SITE_1_SERVICE_CREDENTIAL`

## Backblaze B2 backups

- `B2_APPLICATION_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET`
- `B2_ENDPOINT`
