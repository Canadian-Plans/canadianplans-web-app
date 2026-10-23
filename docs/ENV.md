# Environment variables

This file intentionally lists variable names only. Store all values in the
password manager and in the appropriate deployment environment; never commit
them or paste them into chat.

The redacted [deployment inventory](DEPLOYMENT_INVENTORY.json) records which
credential names are present in each preview deployment and maps each one to a
non-production resource using a SHA-256 fingerprint of the provider-issued
immutable resource ID. Display names are not accepted as isolation evidence.
On 2026-10-22 admin and site-1 previews were recorded as `credential_free`:
Vercel builds them for each PR, but every variable is scoped to Production
only, so a preview gets no backend URL and no credentials. The backend has no
preview deployments (Railway deploys only production). Never add a
Preview-scoped variable or enable Railway PR environments without updating the
inventory with an isolated preview resource in the same reviewed change.
Provisioned inventory entries must declare `emailProvider: fake` and
`authSmtp: fake_sink`; customer email configuration does not configure Auth SMTP.
The check validates the committed inventory, not live provider configuration.
Read-only provider observation on 2026-09-14 found no Vercel projects in the
Canadian Plans team and one Supabase project in `us-west-2`; on 2026-10-22 the
team had three Vercel projects (admin, site-1, Umami). Do not use that
project as evidence of Canadian staging compliance (required: `ca-central-1`).

Protected website writes validate a fresh `X-Turnstile-Token` with their fixed
route action before database work. Missing configuration, invalid/reused tokens,
hostname/action mismatches and provider errors fail closed. Machine catalogue
and granted tracking-status reads still require credentials, scopes and limits,
but no browser challenge. Live provider/hostname verification remains a deployment
check; CI emulates the external script and enforces one-use action-bound proofs.
The backend never trusts arbitrary `X-Forwarded-For`. The Vercel storefront reads
its proxy-set `x-real-ip` only inside the Vercel runtime and sends a keyed visitor
digest over the authenticated service connection. Other hosts or missing ingress
metadata use the backend network identity; confirm the proxy-derived IP is the
visitor's address if another proxy sits in front of Vercel.

## Runtime

- `NODE_ENV`
- `PORT`
- `DEPLOYMENT_ENV` — backend-only platform-neutral deployment environment: `production`, `preview` or `development`. Railway has no `VERCEL_ENV`, so this is set explicitly per service; `VERCEL_ENV` remains a fallback during the Vercel-to-Railway cutover (ADR 0004). An unknown or unset value resolves to no environment and is never treated as production. `preview` makes the internal job routes and the in-process scheduler refuse to run.
- `ENABLE_SCHEDULER` — backend-only opt-in for the in-process scheduler. Exactly `1` enables the 60s outbox and 300s catalogue-sync timers, the hourly expired-upload sweep and the daily retention pass (abandoned order forms are erased after 90 days); unset disables scheduling. It must not be set on a preview environment. Railway cron has a five-minute floor and no minute-level precision, which is why the schedule is in-process (ADR 0004).
- `OPERATIONAL_RETENTION_ENABLED` — backend-only, off by default. Exactly `1` lets the daily retention pass delete old operational rows through `app.prune_operational_rows` (migration 0026): completed jobs and resolved alerts after 30 days, used or expired tracking codes after 7, expired unused quotes and finished CMS webhook events after 90, applied email provider events after 180. Set it only after the first verified backup (docs/OPEN_INPUTS.md); the deletes cannot be undone.
- `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` — Railway service variable (Railway default `0`). Set to `30` so Railway waits between `SIGTERM` and `SIGKILL`, giving graceful shutdown time to drain an in-flight run.
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `ADMIN_ORIGIN` — backend-only exact admin origin allowed for browser API calls; defaults to `http://localhost:3000` in local development
- `TRUST_PROXY_HOPS` — backend-only number of trusted reverse-proxy hops (Express `trust proxy`). Set to `1` on Railway so the pre-authentication IP rate bucket keys on the visitor address instead of the edge proxy's; unset or `0` ignores forwarded headers (local, tests). Never set it higher than the real hop count, or `X-Forwarded-For` becomes spoofable for that bucket.
- `MACHINE_REGISTRY_JSON` — backend-only server-only integration registry (PLATFORM_CONTEXT §4b). A Sanity webhook entry maps `{ selector, provider: "sanity", providerAccount, workspaceId, actorId, verificationSecret, sanity: { projectId, dataset, apiVersion?, readToken?, revalidateUrl, revalidateSecret } }`; scheduler entries map `{ selector, secret, actorId, workspaceIds, scopes }`. `actorId` is the UUID written into tenant transaction context: for a scheduler entry it attributes that identity's job runs, and for a webhook entry it is the verified machine actor persisted on every ingested catalogue event and reused by each later drain write. Webhook entries without `actorId` are rejected by the schema, so **this release changes the registry shape: add `actorId` to every webhook entry in `MACHINE_REGISTRY_JSON` in the same release, before the backend is deployed**, or webhook ingestion fails closed. Unset means deny-all. Configure Sanity's custom `X-Webhook-Selector` and `X-Provider-Account` headers to match the entry; secrets and environment registries remain separate.
- `CRON_SECRET` — backend scheduler secret, used by the in-process scheduler and by authenticated manual invocations of the internal routes. It must equal the `secret` on the selected scheduler registry entry and must not be exposed to preview deployments. The registry rejects duplicate active scheduler secrets, so one `CRON_SECRET` requires a single registry entry holding both `outbox:run` and `reconcile:run`, with both selector variables pointing at it.
- `JOB_RUNNER_SELECTOR` — backend-only selector for the scheduler registry entry used by the in-process scheduler and the manual `/api/internal/jobs/run` route. The entry must have `outbox:run`, an explicit `actorId`, and the complete authorized workspace UUID set. The runner takes its workspace set and actor only from this verified entry, never from a database tenant scan.
- `CATALOGUE_SYNC_SELECTOR` — backend-only selector for the scheduler registry entry used by the 300-second in-process catalogue sync (T10B) and the manual `/api/internal/catalogue/sync` route. The entry must have the existing `reconcile:run` scope (no new scope or migration), an explicit `actorId`, and the complete authorized workspace UUID set; its `secret` must equal `CRON_SECRET` (see the single-entry note above). Unset means the route cannot resolve a scheduler and fails closed.
- `OUTBOX_ADAPTERS` — backend-only explicit provider opt-in. Only `fake` is accepted, and only when `NODE_ENV` is not `production`, to construct the in-memory email/analytics fakes. Otherwise the analytics handler uses the configured Umami sink (below) and the email handler stays unconfigured until T18 wires its adapter. Unset, unknown or any value on a production deployment with no configured sink selects no provider: handlers fail permanently with `provider_not_configured`, so each claimed job is recorded as failed and appears in admin rather than completing with a fake provider id. There is no implicit default; never set a fake provider on production.
- `QUOTE_WITHDRAWAL_POLICY` — `immediate` or `honour_until_expiry`. OPEN_INPUTS #14 resolved this to `honour_until_expiry` on 21 September 2026 and it is set on the production backend; it is **required** for priced checkout. Unset/unknown becomes `unresolved` and every quote and order returns `503 priced_checkout_disabled`.
- `ORDER_OPERATIONAL_TRANSITIONS` — operational switch for the dispatch and activate transitions. Must be exactly `1` or `true` to have any effect. It was TEST-only and ignored in production while OPEN_INPUTS #15 (transition prerequisites) was unresolved; #15 is now answered, so it applies in every environment. It is deliberately opt-in — unset means dispatch/activation return `409 feature_not_ready` — so fulfilment goes live only when the owner sets it, and unsetting it stops dispatch/activation without a deploy. It never authorizes skipping the document prerequisite: required documents must still be approved, or an `order.manage` holder must override with a recorded reason (`docs/RUNBOOKS/dispatch-and-activation.md`).

## Deletion ledger (T21, §13)

- `DELETION_LEDGER_ENDPOINT` — backend-only write endpoint of the dedicated deletion/suppression ledger bucket (Backblaze B2), separate from the archive. The object key is the logical deletion id, so a retry cannot duplicate an event.
- `DELETION_LEDGER_TOKEN` — backend-only write-only ledger credential; it must not be able to delete events or read back other events.

Unset (either value) means no ledger is configured: a `deletion_ledger_publish` job fails closed with `deletion_ledger_not_configured` and the local intent stays pending/failed rather than reporting completion. The write-only/S3 SigV4 key restrictions are provisioned and verified by T4R before this is set in production.

## Customer tracking (T22)

- `TRACKING_HASH_SECRET` — backend-only HMAC secret (at least 32 characters) that keys the order-tracking email/code hashes and the 30-minute tracking grant, and derives a separate AES-GCM key for encrypted OTP outbox delivery. Unset or too short means tracking is unavailable: the OTP request still answers neutrally and verify/status fail closed with `persistence_unavailable`. Never expose it to a browser bundle and rotate it only with a deployment (existing grants, pending codes and encrypted OTP jobs become invalid).
- `TRACKING_OTP_MIN_LATENCY_MS` — optional backend-only minimum latency for the neutral `tracking/otp` response (default `500`, capped at `5000`), so a matched and unmatched request are timing-indistinguishable. Set lower only in tests; never lower it in production.

## Supabase

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — backend publishable/legacy anonymous key used only for server-side Auth verification; never a privileged key
- `NEXT_PUBLIC_SUPABASE_URL` — admin browser Auth endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — admin publishable/legacy anonymous key; the admin client extracts Auth only and never calls Data or Storage APIs
- `DATABASE_URL` — backend-only Supavisor transaction-mode URL for the restricted `app_runtime` role; never use the migration owner or a service-role key
- `DATABASE_SSL_MODE` — optional; `require` (default: encrypted, but the server certificate is **not** checked), `verify-full` (encrypted and the server certificate is verified) or `disable` (local disposable PostgreSQL only). Switch Railway to `verify-full` after confirming it connects to the Supabase pooler.
- `DATABASE_SSL_CA` — optional PEM text of the CA used with `verify-full` (Supabase: Dashboard → Settings → Database → SSL). Needed only if Node does not already trust the pooler's certificate chain.
- `DATABASE_POOL_MAX` — optional backend-only size of the shared application pool (integer 1–50; default `8`). The long-lived Railway process serves HTTP requests and the in-process scheduler from this one pool, so `1` serialises everything. Keep `DATABASE_POOL_MAX × replicas` below the Supabase pooler's client limit for the project's compute tier.
- `MIGRATION_DATABASE_URL` — offline/CI migration connection using a separate privileged database role; never exposed to applications or previews
- `MIGRATION_DATABASE_SSL_MODE` — optional; same values as `DATABASE_SSL_MODE` (`require` default, `verify-full`, `disable`), with `MIGRATION_DATABASE_SSL_CA` as the optional CA
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

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — storefront public widget key, compiled at build time. Missing key prevents protected form submission; it never bypasses verification.
- `TURNSTILE_SECRET_KEY` — backend-only Siteverify secret; public test secrets are rejected.
- `TURNSTILE_HOSTNAMES` — backend-only comma-separated exact permitted hostnames (for example `canadianplans.com,www.canadianplans.com`), maximum 20. No scheme, path, port or wildcard. Configure corresponding hostnames on the provider widget.
- `TURNSTILE_HOSTNAME` — legacy single-host fallback when `TURNSTILE_HOSTNAMES` is unset.

Use separate preview keys and a preview backend; never copy production secrets
into previews. Provider verification is bounded to five seconds and is never
cached. Human proofs are consumed once on matched routes, not by a catch-all
router. The widget requests a new token for every protected request, including
upload intent/finalization and a retry after a transport failure. Cancellation,
provider errors and expiry keep entered form values and allow a fresh attempt.

| Operation                                            | Required provider action               |
| ---------------------------------------------------- | -------------------------------------- |
| Create/update lead, save documents, callback request | `lead-save`                            |
| Province wish list                                   | `waitlist-join`                        |
| Create quote                                         | `quote-create`                         |
| Submit order                                         | `order-submit`                         |
| Upload intent / finalize                             | `upload-intent` / `upload-finalize`    |
| Customer download-link issuance                      | `file-download`                        |
| Tracking code request / verification                 | `tracking-request` / `tracking-verify` |

The browser never chooses the backend's expected action. Transport recovery
obtains a fresh proof while retaining the same order idempotency key. Starting a
new purchase after a finished draft also obtains a fresh proof before creating
a new lead/key. SSR offers and authenticated tracking-status GETs require no
challenge. Hostname/provider configuration and a live verification on each
published domain must be checked before release; local emulation is not evidence
of live Cloudflare configuration.

## Per-endpoint rate limits (REQ 37)

The public write surface carries a tighter per-endpoint budget on top of the
coarse network-bootstrap/per-visitor/per-credential ceilings in `requireWebsiteCredential`. Each budget
is keyed by `(endpoint, workspace, authenticated visitor)` and durable (the `rateLimitHit` SQL
function). The bootstrap network budget is 1,200/minute; valid callers also have a 300/minute credential ceiling and a 120/minute visitor ceiling. Defaults (per 60s): `leads` 30, `quotes` 30, `orders` 10, `tracking` 20. Override per deployment; invalid/absent values fall back to the default:

- `RATE_LIMIT_LEADS_MAX` / `RATE_LIMIT_LEADS_WINDOW`
- `RATE_LIMIT_QUOTES_MAX` / `RATE_LIMIT_QUOTES_WINDOW`
- `RATE_LIMIT_ORDERS_MAX` / `RATE_LIMIT_ORDERS_WINDOW`
- `RATE_LIMIT_TRACKING_MAX` / `RATE_LIMIT_TRACKING_WINDOW`

`WINDOW` is in seconds; both must be positive integers. `tracking` layers on top
of the existing per-email/per-visitor OTP limits, which are unchanged.

## Sanity

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION`
- `SANITY_API_TOKEN`
- `SITE_1_SANITY_PREVIEW_TOKEN` — site-1-scoped, read-only viewer token for editor draft preview only; never `NEXT_PUBLIC_*`
- `SITE_1_REVALIDATE_SECRET` — site-1 server-only bearer secret accepted only by `/api/revalidate/catalogue`; must match the registry entry's `sanity.revalidateSecret`

## Repo catalogue (ADR 0005)

Used while Sanity is not connected. Plans, prices and promotions are written in
`packages/adapters/src/static-catalogue/site-1-plans.ts` and published by the
backend's catalogue sync. A Sanity registry entry for a workspace always wins, so
connecting Sanity later needs no code change.

- `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID` — backend-only UUID of the one workspace
  that reads the repo catalogue (site-1 is `10000000-0000-4000-8000-000000000101`).
  Unset means no repo catalogue. Any other workspace never receives these plans.
- `CATALOGUE_ALLOW_OPEN_INPUTS` — backend-only safety valve. The launch catalogue has no
  placeholders left (21 Oct 2026), so it is not needed. Set to `1` to publish offers that still
  carry `TEST-` placeholders for unanswered owner decisions (who bills, provider
  names, terms version, pre-arrival eligibility). Without it, `DEPLOYMENT_ENV=production`
  and any unknown environment refuse to publish them (`catalogue_open_inputs` in the
  sync status); `development` and `preview` publish them. Set it in production only as a
  deliberate decision.

## Email (T18)

- `EMAIL_PROVIDER` — backend-only, explicit selection: `fake`, `resend`, or `ses`. There is no implicit default; an unset or unrecognised value fails every email job closed with `provider_not_configured` rather than guessing. `fake` is only honoured outside `NODE_ENV=production`. Set to `fake` in CI and preview deployments; `resend` is the live default (OPEN_INPUTS #23: Resend selected for launch); `ses` remains available but is deferred to a later migration.
- `EMAIL_CONTACT_HASH_SECRET` — backend-only, at least 16 characters. Keys the HMAC used to match a contact against suppression/consent records without storing the raw address; rotating it invalidates existing unsubscribe links and orphans old suppression matches, so treat it as a durable secret, not a rotate-on-a-whim one.
- `EMAIL_WEBHOOK_SHARED_SECRET` — retired; the old normalized endpoint returns 404. Configure native Resend verification through `MACHINE_REGISTRY_JSON` instead.
- `MARKETING_CONSENT_VERSION` — the consent-version string recorded when a customer unsubscribes via the no-login link; defaults to `"1"` if unset.

## Resend (current email provider)

- `RESEND_ACCOUNT_ID` — server-owned account label matching the active Resend webhook registry entry for each sending workspace. Sending fails closed if the mapping is absent, ambiguous, or differs from this label.
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — must be an address on a domain verified in the Resend account
- `RESEND_FROM_NAME`
- `RESEND_REPLY_TO_EMAIL` — optional

Configure Resend's webhook URL as `/api/v1/webhooks/resend/<selector>` and subscribe to `email.delivered`, `email.bounced`, `email.complained`, and `email.failed`. Add a webhook registry entry with `provider: "resend"`, the account label in `providerAccount`, its workspace UUID, a stable machine `actorId` UUID, and the dashboard's `whsec_...` signing secret. The endpoint verifies native `svix-id`, `svix-timestamp`, and `svix-signature` over the original bytes within five minutes. No workspace or account header from the provider is trusted. Use a separate secret for each active registry entry.

Apply migration 0022 before deploying. Create the native provider endpoint and registry mapping through the owner's deployment process; do not route the old shared-secret protocol to it. Newly prepared sends include a logical message tag and a stable idempotency key; events must match that recorded workspace/account/contact and provider ID. Old uncorrelated messages are not guessed into an account: the endpoint returns 503 for reconciliation/retry. Inspect those events during cutover. Resend's idempotency window remains provider-defined; uncertain sends require reconciliation, not indefinite blind retry.

Bounce/complaint suppression commits with a `suppression_ledger_publish` outbox job, using the same `DELETION_LEDGER_*` publisher and authenticated restore checkpoint as deletion events. An unavailable ledger leaves the job pending/failed and visible; it never falls back to an in-memory production publisher. The recovery integration must accept and replay `suppress_contact` events (keyed contact digest and reason) before reopening restored data.

## AWS SES (deferred)

Not selected for launch (OPEN_INPUTS #23); kept wired for a later migration off Resend.

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SES_FROM_EMAIL`
- `SES_FROM_NAME`
- `SES_REPLY_TO_EMAIL` — optional
- `SES_CONFIGURATION_SET_NAME` — optional. Native SES/SNS event ingestion is not implemented; the retired normalized webhook cannot be used for SES.

## Observability and analytics

- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`

- `SENTRY_DSN` — backend/jobs-only Sentry DSN (`https://<key>@<host>/<projectId>`). Unset yields a no-op tracker (`createErrorTrackerFromEnv`, `@canadian-plans/adapters`) rather than throwing, so it is always safe to call `captureException`. There is no separate SDK dependency: the tracker posts directly to the DSN's classic store endpoint over `fetch`.
- `SENTRY_AUTH_TOKEN` — reserved for a future CI release/source-map upload step; not read by the runtime tracker.
- `NEXT_PUBLIC_SENTRY_DSN` — admin-only browser+server DSN (`apps/admin/src/lib/error-tracking.ts`). Deliberately public/`NEXT_PUBLIC_*`: a Sentry ingest DSN only authorizes sending events to one project, the same way the browser Sentry SDK ships it on every page load.
- `RELEASE_SHA` — the deployed git SHA, tagged on every captured exception (REQ 40: "release tags"). Backend/jobs read it directly; admin also accepts `NEXT_PUBLIC_RELEASE_SHA` for the browser bundle. Unset falls back to `"unknown"` rather than failing.
- `UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `UMAMI_EVENTS_URL` — backend-only full URL of the Umami collect endpoint server events POST to (for Umami Cloud, `https://cloud.umami.is/api/send`). Never exposed to a browser bundle.
- `UMAMI_WORKSPACE_WEBSITES` — backend-only JSON array `[{ "workspaceId": "<uuid>", "websiteId": "<umami-site-id>" }]` mapping each workspace to its Umami website id. A workspace with no mapping fails closed (`analytics_site_unmapped`) rather than sending to the wrong site (REQ 35). Unset or malformed means no server sink is configured, so the outbox fails closed.
- `UMAMI_HOSTNAME` — optional backend-only hostname recorded on server events; omitted when unset.
- `UMAMI_USER_AGENT` — optional backend-only User-Agent for server events. Defaults to a browser-shaped value because Umami discards events whose agent looks like a bot (Node's default does); never include "bot", "crawler", "spider" or a URL.

Server lead/order conversion events are emitted once from the backend outbox; browser page views and `plan_selected` come from the Umami script. Never enable a server event that the browser also sends, or a submission is counted twice.

## Owner alerts (REQ 40, IMPLEMENTATION_PLAN §10)

`createOwnerAlertChannelFromEnv` (`@canadian-plans/adapters`) builds the channel the backend scheduler, the synthetic check route, and the independent backup monitor (`jobs/src/monitor/cli.ts`) all alert through. None of them throw when it is unconfigured — it becomes a no-op that only logs the omission — so an unset alert channel degrades to "check the logs," never a second failure mode.

- `OWNER_ALERT_EMAIL` — the owner's address. Combined with the Resend variables below to wire the email channel.
- `OWNER_ALERT_WEBHOOK_URL` — optional chat-channel webhook (IMPLEMENTATION_PLAN §10: "and optionally a chat channel"). Wired independently of the email channel; either or both may be set.
- `OWNER_ALERT_WEBHOOK_SECRET` — optional; when set, every webhook delivery carries an `X-Alert-Signature: sha256=<hmac>` header over the raw JSON body so the receiving endpoint can verify it came from this deployment.

The email channel reuses the Resend credentials already documented under **Resend (current email provider)** below (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`) — it is a separate, non-suppressible send path from the customer `EmailAdapter`, not a second provider account.

## Synthetic order check (REQ 40)

Runs lead → quote → order → cancel every 15 minutes on the backend's in-process scheduler (`SYNTHETIC_CHECK_INTERVAL_MS`), and is also reachable at `/api/internal/synthetic-check/run` for a manual staging invocation, mirroring the outbox/catalogue-sync jobs routes.

- `SYNTHETIC_WORKSPACE_ID` — backend-only UUID of a dedicated, owner-provisioned workspace that exists only to be ordered from and cancelled. It is never a customer-facing workspace and never appears in admin's site list.
- `SYNTHETIC_PRODUCT_ID` — backend-only UUID of one `app.products` row in that workspace (the check serves its fixed, zero-cost, no-document offer under that row's `product_key`, so any key works; `synthetic-check` is the conventional one).
- `SYNTHETIC_CHECK_SELECTOR` — points at the **same** scheduler registry entry as `JOB_RUNNER_SELECTOR`/`CATALOGUE_SYNC_SELECTOR` (one `CRON_SECRET`, one entry — see the `MACHINE_REGISTRY_JSON` note above); the entry additionally needs the `synthetic:check` scope and `authorizedWorkspaceIds`/`workspaceIds` including `SYNTHETIC_WORKSPACE_ID`. Unset or missing the scope means the scheduler skips the task entirely (logged once) — it never blocks outbox/catalogue-sync from starting.

Provisioning is a one-time, owner-run step (create the workspace row and one product row, add `synthetic:check` to the registry entry's scopes) — there is no seed script for it because it touches production, matching how the machine registry itself is deployment configuration, not application data (§4b).

## Site 1 SEO (REQ 10)

- `NEXT_PUBLIC_SITE_URL` — canonical public origin (e.g. `https://<domain>`), used
  for `metadataBase`, `robots.txt` and `sitemap.xml`. Absent → `http://localhost:3001`.

Indexability follows `VERCEL_ENV`: only `production` is indexable. Preview and
local deployments emit `Disallow: /`, an empty sitemap, and a page-level
`noindex` (set centrally in the root layout), so drafts/previews never reach a
search index. `/studio` is `noindex` (via `next-sanity`) and disallowed in
`robots.txt`.

## Site 1 backend (server only)

- `SITE_1_BACKEND_URL`
- `SITE_1_SERVICE_CREDENTIAL`

## Backblaze B2 backups

GitHub Environment secrets, one environment per role (names only; the
exact commands are in [restore.md](RUNBOOKS/restore.md)):

- **backup** (`backup.yml`, list + write only): `BACKUP_SOURCE_DATABASE_URL`
  (connect as `backup_reader`), `BACKUP_LEASE_DATABASE_URL` (connect as
  `backup_lease_writer`; never use the `postgres` owner role for either), `BACKUP_SUPABASE_PROJECT_REF`, `BACKUP_R2_*` (read-only
  source), optional `BACKUP_SANITY_PROJECT_ID` / `BACKUP_SANITY_AUTH_TOKEN`,
  `RECOVERY_AGE_RECIPIENT` (public key only), `B2_ARCHIVE_ENDPOINT`, `B2_ARCHIVE_REGION`,
  `B2_ARCHIVE_BUCKET`, `B2_ARCHIVE_WRITER_KEY_ID`, `B2_ARCHIVE_WRITER_APPLICATION_KEY`.
- **backup-monitor** (read-only): `B2_ARCHIVE_READER_KEY_ID`,
  `B2_ARCHIVE_READER_APPLICATION_KEY`, `B2_ARCHIVE_ENDPOINT`, `B2_ARCHIVE_REGION`,
  `B2_ARCHIVE_BUCKET`, plus the owner-alert `OWNER_ALERT_*` / `RESEND_*` values.
- **backup-retention** (list + delete; never holds the recovery private key):
  `B2_ARCHIVE_RETENTION_KEY_ID`, `B2_ARCHIVE_RETENTION_APPLICATION_KEY`,
  `B2_ARCHIVE_ENDPOINT`, `B2_ARCHIVE_REGION`, `B2_ARCHIVE_BUCKET`.
- **restore** (owner-run): `B2_ARCHIVE_READER_*` and the escrowed recovery private key
  supplied as a file path (`RECOVERY_PRIVATE_KEY_PATH`) at restore time only.

### Customer-requested physical document cleanup

The backend's durable cleanup worker requires the configured private `R2_BUCKET`
and the existing backend-only R2 credentials to permit DELETE inside its workspace
prefix. It never substitutes fake deletion when configuration is missing. A key
whose recorded bucket differs from the configured bucket stays pending; migrate
old-bucket cleanup through an explicitly configured worker instead of marking it
complete. Apply migration 0023 before the new backend. The backup runner must use
the protected lease interface, which waits for active cleanup requests before
starting its snapshot. Independent ledger acknowledgement is required before
personal database/object erasure; see the deletion and restore runbooks. Live R2
permission/ledger durability verification belongs to the deployment operator.
