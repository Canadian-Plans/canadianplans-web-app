> **Status note (23 October 2026).** Point-in-time snapshot of the 22 October 2026 read-only
> codebase audit at commit `0982c36`, moved here from the repository root unchanged below
> this note. Finding IDs (`SEC-`, `REL-`, `BUG-`, `CQ-`, `PERF-`, `SEO-`, `A11Y-`) are the
> ones commit messages cite; fixes landed through PRs #27 to #30 and the owner's decisions
> on the remaining items are in `docs/OPEN_INPUTS.md` (22 October 2026 rows). Treat a
> finding as open until a commit or a recorded decision cites its ID. The report's own
> refutation pass was cut short, as "How this report was produced" explains.

# Audit Report

**Repository:** `Canadian-Plans/canadianplans-web-app` (local checkout `H:\CanadianPlans`), branch `docs/l3-progress-2026-10-22` at commit `0982c36` (identical to `main` for all application code).
**Date:** 22 October 2026.
**Mode:** read-only audit. No file other than this report was created or changed. Commands run: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run test:tooling`, `pnpm audit --prod`, plus read-only `git`/`node` inspection.

**How this report was produced.** Seventeen area auditors (backend public API, backend staff API, order domain, backend integrations/runtime, database, adapters, contracts/config, jobs/backups/CI, storefront server flows, storefront pages/SEO/accessibility, storefront content and emails, admin app, UI package, cross-cutting security sweep, tests and CI quality, docs-vs-code, and a "will break with scale" lens) each read their file list in full and reported findings with exact locations. Three planned lenses did not run (time/version drift, external-service limits, configuration drift); their concerns are partly covered by the other auditors and are listed as gaps in section 8. The independent "refute every finding" pass was cut short by usage limits, so each finding states its verification status: the lead auditor personally re-read the code behind every High finding and a sample of the rest; the remainder are single-auditor findings with file:line evidence. Duplicates found by two auditors were merged (the more complete twin kept). Nothing in this report was taken from documentation claims alone.

**Totals:** 0 Critical · 11 High · 71 Medium · 95 Low (177 total; 134 in section 3, 43 in section 4).

---

## 1. Project Snapshot

### Stack and hosting

| Concern | What is actually in the repo |
| --- | --- |
| Monorepo | pnpm 9.15.0 workspaces, Node 22.19.0 (`engines >=22 <23`), TypeScript 6.0.3 strict, ESLint 9 flat config with a custom `canadian-plans/data-boundary` rule, Prettier 3.9, Vitest 5.0.0, Playwright 1.63 |
| `apps/backend` | Express 5.2.1 API (strict TS). The **only** database client. Built with tsup into `dist/`, shipped as a Docker image (`apps/backend/Dockerfile`, `railway.json`) on **Railway** (`https://backend-production-ebbb6.up.railway.app`). Runs an in-process scheduler (`ENABLE_SCHEDULER=1`): outbox every 60 s, catalogue sync every 300 s, synthetic order check every 15 min. A legacy Vercel serverless entry (`api/index.ts`, `vercel.json`) is still present. |
| `apps/site-1` | Next.js 16.3.8 / React 19.3.1 App Router storefront ("Canadian Plans", `canadianplans.com`) on **Vercel** (project `canadianplans-web-app-site-1`). Talks to the backend server-side only via `src/lib/backendClient.ts` with a scoped service credential. Embeds Sanity Studio at `/studio` (not connected). Tailwind 4, react-hook-form, React Email templates for design previews. |
| `apps/admin` | Next.js 16.3.8 staff console on **Vercel** (project `canadianplans-web-app-admin`). Supabase Auth (email + MFA) in the browser; every data call goes to the backend with a Bearer token through `@canadian-plans/contracts` typed client. |
| `packages/db` | Drizzle ORM 0.45.2 + `postgres` 3.4.9, 25 SQL migrations (`drizzle/0000…0024`), Postgres RLS with `SET LOCAL app.workspace_id` per transaction, restricted `app_runtime` role. Database is **Supabase** Postgres (project `ixbhodlvfyxjctpsjibj`, `us-west-2`, Free plan) reached through the Supavisor transaction pooler. |
| `packages/contracts` | Zod 4 request/response schemas, endpoint table, typed fetch client, OpenAPI generator (`docs/api/openapi.json`), browser-safe Sanity schema types (depends on the full `sanity` package). |
| `packages/adapters` | Backend-only providers: Cloudflare **R2** via hand-written SigV4, **Resend** email (SES wired but unused), **Sentry** via a hand-written HTTP tracker (no SDK), owner alerts (email + webhook), Umami analytics sink, deletion ledger, logging redaction, the static repo catalogue (`static-catalogue/site-1-plans.ts`) that currently publishes every plan and price. |
| `packages/ui`, `packages/types`, `packages/observability`, `packages/config` | shadcn-style primitives and Canadian Plans design elements; shared types; log-record builder and PII scrubber; shared tsconfig/eslint/vitest/playwright presets and the data-boundary lint rule. |
| `jobs/` | Offline backup (Supabase dump + R2 objects + Sanity export → age-encrypted → Backblaze B2), restore, retention and monitor CLIs, run by four GitHub Actions workflows (`.github/workflows/backup*.yml`). |
| CI | `.github/workflows/ci.yml`: preview-isolation check, frontend DB-boundary lint, migrations against a disposable Postgres 15, typecheck, lint, format, tooling tests, service-role grep, unit tests, OpenAPI currency, affected builds, admin + site-1 Playwright e2e (real backend harness against the disposable DB). CI never deploys. |

### Structure map

```
apps/backend/src/
  app.ts, server.ts, scheduler.ts, shutdown.ts     app wiring, listener, in-process jobs
  routes/{website,staff,email,jobs,catalogue-sync,sanity-webhook,synthetic-check,health}.ts
  website/{credential,session,turnstile,store}.ts  storefront service-credential auth, rate limits, bot check
  auth/session.ts, staff/{authorization,store}.ts  Supabase staff sessions, permissions, aal2
  orders/*, partners/*, leads/*, tracking/*, documents/*, deletion/*, catalogue/*, jobs/*, email/*
  machines/registry.ts                             MACHINE_REGISTRY_JSON (webhooks + scheduler identities)
apps/site-1/src/app/(storefront)/order/*           the real 5-step order journey (server actions)
apps/site-1/src/app/(storefront)/track/*           the real order tracking (OTP)
apps/site-1/src/app/(…)/…                          marketing pages; (pre-arrival-order), (internet-order),
                                                   (track-order) are DESIGN PREVIEWS that are still routable
apps/site-1/content/*.ts                           all page copy, prices and claims (typed)
apps/site-1/src/emails/*                           React Email design previews (not what the backend sends)
packages/adapters/src/messaging.ts                 the email templates the backend actually sends
packages/db/src/schema.ts, drizzle/*.sql           schema and migrations
docs/ENV.md, docs/RUNBOOKS/*, docs/LAUNCH_CHECKLIST.md, docs/OPEN_INPUTS.md
```

### How to run, build and test

```bash
pnpm install --frozen-lockfile
```
```bash
pnpm --filter backend dev        # http://localhost:4000 (needs the env in docs/ENV.md)
```
```bash
pnpm --filter site-1 dev         # http://localhost:3001
```
```bash
pnpm --filter admin dev          # http://localhost:3000
```
```bash
pnpm run typecheck && pnpm run lint && pnpm run format && pnpm run test:tooling && pnpm run test
```
```bash
pnpm run build
```
```bash
pnpm run test:e2e                # needs a local Postgres: createdb canadian_plans_e2e_test, plus TEST_MIGRATION_DATABASE_URL and DB_TEST_ALLOW_DESTRUCTIVE=1
```

Results on this machine today: typecheck ✅ (11 projects), lint ✅, format not re-run (CRLF warnings on Windows are known noise), tooling tests ✅ 71/71, unit tests ✅ 1112 passed / 156 skipped (the 21 skipped files are the DB-backed integration suites, which need `TEST_MIGRATION_DATABASE_URL`; they ran green in CI on `main` at `1af1773`), `pnpm audit --prod` ❌ 1 high + 3 moderate (see SEC findings on `sanity`/`@vitest/mocker`).

### Environment variables and external services

Full list with semantics: `docs/ENV.md`. The ones that decide whether the business works:

| Where | Variable | Effect when wrong |
| --- | --- | --- |
| Railway (backend) | `DATABASE_URL`, `DATABASE_SSL_MODE` | no DB → every API call 503 |
| Railway | `ENABLE_SCHEDULER=1`, `CRON_SECRET`, `JOB_RUNNER_SELECTOR`, `CATALOGUE_SYNC_SELECTOR`, `MACHINE_REGISTRY_JSON` | scheduler silently does not start → no emails sent, no catalogue published |
| Railway | `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID`, `DEPLOYMENT_ENV=production` | no plans on `/order` |
| Railway | `QUOTE_WITHDRAWAL_POLICY`, `ORDER_OPERATIONAL_TRANSITIONS=1` | unset → checkout disabled / dispatch+activate return 409 |
| Railway | `EMAIL_PROVIDER=resend`, `RESEND_*`, `EMAIL_CONTACT_HASH_SECRET`, `TRACKING_HASH_SECRET` | unset → every email job fails; tracking unavailable |
| Railway | `TURNSTILE_SECRET_KEY`, `TURNSTILE_HOSTNAMES`, `ADMIN_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `R2_*`, `SENTRY_DSN`, `OWNER_ALERT_EMAIL` | writes blocked / admin CORS fails / uploads fail / no error reports / no alerts |
| Vercel site-1 | `NEXT_PUBLIC_SITE_URL`, `SITE_1_BACKEND_URL`, `SITE_1_SERVICE_CREDENTIAL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | wrong canonical/noindex; no backend; forms cannot submit |
| Vercel admin | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN` | admin cannot reach backend / cannot log in |
| GitHub Actions | `BACKUP_*`, `B2_*`, `RECOVERY_PRIVATE_KEY`, `SANITY_*` | backups fail (they currently cannot complete, REL-03) |

External services: Supabase (Postgres + Auth), Railway, Vercel, Cloudflare R2, Cloudflare Turnstile, Resend (domain verified; SPF/DKIM/DMARC published), Sentry (org `canadian-plans`, projects `canadian-plans-backend`, `canadian-plans-admin`), Backblaze B2 (backups, never run for real), Umami (not configured), Sanity (not connected; static catalogue in use), GitHub Actions.

---

## 2. Verdict

**Is the architecture okay for this site? Yes.** The split (one Express API as the only DB client; two Next.js apps that only call that API; Postgres RLS plus per-request workspace context; server-authoritative prices; a transactional outbox for email/analytics; a shared contracts package) is the right shape for a small multi-brand telecom reseller and is enforced by lint rules and CI, not just by convention. The code is far more disciplined than typical "vibe-coded" output: strict types, no `any`, Zod on every input, fail-closed defaults, 1,100+ unit tests and a real-backend e2e suite. The problems are concentrated in operations (one DB connection, swallowed errors, a backup that cannot run), in what the public site says (fabricated reviews, unverified price claims, editor notes rendered to customers, design previews reachable in production) and in launch configuration (every page is `noindex`).

**Overall health score: 6 / 10.** Solid core, not yet safe to send paying customers to without the Phase 1–2 fixes.

**Top 3 risks in plain English**

1. **The live website is both invisible and over-claiming.** Every storefront page is hard-coded `noindex` and the canonical URL falls back to `localhost`, so Google will never list you (SEO-01, SEO-02); at the same time the homepage shows a made-up "4.8 · 1,200+ Google reviews" badge, unverified "in-store price" comparisons, placeholder testimonials and `[Confirm …]` editor notes (SEC-03, SEC-04, BUG-07…BUG-13). That is a consumer-protection exposure the day a real customer or competitor notices.
2. **The public API can be knocked offline cheaply and runs on one database connection.** Because the backend does not trust Railway's proxy, every visitor shares one rate-limit bucket; a 20-requests-per-second script with a junk token makes every real order, lead and tracking call return 429 (REL-01). Independently, the backend opens a single Postgres connection for all requests *and* the scheduler (PERF-01), so a handful of concurrent customers queue behind each other and behind the outbox runner.
3. **Customers never hear back, and there is no working backup.** Status, dispatch and activation emails exist as templates but nothing ever enqueues them (BUG-01); the synthetic check meanwhile queues a real email to a non-existent address every 15 minutes (REL-02). The daily backup hard-requires a Sanity export that is not connected, so it cannot complete (REL-03), runs an unpinned third-party action with production credentials (SEC-02), and keeps the recovery private key beside a delete-capable credential (SEC-01). If the Supabase free project is lost, the business data is gone.

High findings at a glance:

| ID | Title |
| --- | --- |
| BUG-01 | Order status/dispatch/activation emails are never queued by the transition store |
| PERF-01 | Backend runs on a single-connection Postgres pool (max: 1), serializing every request and the scheduler |
| REL-01 | Pre-auth bootstrap IP rate bucket collapses to the proxy address (no trust proxy), so one unauthenticated client can 429 the whole storefront API |
| REL-02 | Synthetic order check writes real outbox side effects every 15 minutes: an acknowledgement email to a non-existent .internal address plus two analytics events, and ~12 permanent rows per run |
| REL-03 | Daily backup hard-depends on a Sanity dataset export that is not connected and has no auth token, so the run cannot complete |
| SEC-01 | Retention workflow keeps the escrowed age PRIVATE key in GitHub secrets next to a read+delete B2 credential |
| SEC-02 | Backup workflow runs an unpinned third-party action (supabase/setup-cli@v1, version: latest) with production credentials, and records fake tool versions in the manifest |
| SEC-03 | Fabricated Google rating "4.8 · 1,200+ Google reviews" shown on the live homepage |
| SEC-04 | Unverified 'in-store' comparison prices and savings claims presented as fact on live pages |
| SEO-01 | Production indexability and canonical URLs depend on NEXT_PUBLIC_SITE_URL, which the launch checklist records as unset: whole site is noindex with localhost canonicals |
| SEO-02 | Every commercial storefront page ships noindex,nofollow and is absent from the sitemap; the launch 'open to search engines' step has no single switch |

---

## 3. Issues

Findings are ordered High → Medium → Low, then by category. Each block says how it was verified. "[NEEDS VERIFICATION]" marks a fact that depends on runtime configuration or a provider and must be confirmed before the fix is applied.

### [BUG-01] Order status/dispatch/activation emails are never queued by the transition store
- **Severity:** 🟠 High
- **Category:** Bug
- **Location:** apps/backend/src/orders/transitions.ts:276-327, jobs/src/index.ts:4-28, packages/adapters/src/messaging.ts:241-262, docs/RUNBOOKS/dispatch-and-activation.md:89,121
- **Problem:** DatabaseOrderTransitionStore.transition writes the order update, order_status_history, dispatch_records and audit_events rows but never inserts an outbox_jobs row. The jobs registry defines and handles 'order_status_email', 'order_awaiting_customer_email', 'order_dispatch_email' and 'order_activation_email' (jobs/src/index.ts:4-28, 297-320), the adapters define the matching templates (messaging.ts:241-262), and the runbook states that dispatch and activation queue these emails (runbook lines 89 and 121). A `git grep` over apps/backend/src shows the only email job types ever inserted are 'order_acknowledgement_email' (orders/store.ts:398) and 'tracking_otp_email'. Invariant 7 says email requests belong in outbox rows written at their respective transitions; none exist for any transition.
- **Impact (plain English):** Customers receive only the initial 'we received your order' email and then hear nothing: no 'action needed' email when staff set the order to awaiting_customer (the way staff ask for a missing document), no handoff/dispatch email, no 'your service is active' email and no cancellation email. Staff will believe these emails went out because the runbook says so.
- **Evidence:**
  ```text
  transitions.ts:298-321 inserts auditEvents then returns at 322 with no tx.insert(outboxJobs). git grep 'jobType:' -- apps/backend/src lists only order_acknowledgement_email, analytics_*, tracking_otp_email, deletion/suppression jobs. jobs/src/index.ts:9 'order_activation_email'; messaging.ts:258 case 'order_activation'.
  ```
- **Fix steps:**
  1. In apps/backend/src/orders/transitions.ts, extend the imports from '@canadian-plans/db' to add `leads` and `outboxJobs`, and add `import { hashContact, normalizeEmail, requireContactHashSecret } from '../email/hash.js';`.
  2. In the `current` select (transitions.ts:185-192) add two fields: `reference: orders.reference` and `leadId: orders.leadId`.
  3. Directly after the `await tx.insert(auditEvents)...` call (ends line 321) and before the `return { status: 'transitioned', ... }` at line 322, add: `const jobType = input.toStatus === 'awaiting_customer' ? 'order_awaiting_customer_email' : input.toStatus === 'dispatched' ? 'order_dispatch_email' : input.toStatus === 'activated' ? 'order_activation_email' : input.toStatus === 'cancelled' ? 'order_status_email' : undefined;` then `if (jobType) { const [lead] = await tx.select({ email: leads.email }).from(leads).where(and(eq(leads.workspaceId, input.workspaceId), eq(leads.id, current.leadId))).limit(1); if (lead?.email) { const variables: Record<string, string> = {}; if (input.toStatus === 'dispatched' && input.dispatch) { variables.courier = input.dispatch.courier.trim(); if (input.dispatch.trackingReference?.trim()) variables.trackingReference = input.dispatch.trackingReference.trim(); } if (input.toStatus === 'cancelled') variables.status = 'cancelled'; await tx.insert(outboxJobs).values({ workspaceId: input.workspaceId, jobType, dedupeKey: `${input.orderId}:${nextVersion}`, payload: { orderId: input.orderId, reference: current.reference, toAddress: lead.email, contactHash: hashContact(normalizeEmail(lead.email), requireContactHashSecret()), ...(Object.keys(variables).length > 0 ? { variables } : {}) }, availableAt: changedAt, updatedAt: changedAt }); } }`. The payload keys must be exactly orderId, reference, toAddress, contactHash and optional variables because jobs/src/index.ts:183-191 parses them with a `.strict()` schema. dedupeKey must include nextVersion because outbox_jobs has a unique on (workspace_id, job_type, dedupe_key) (packages/db/src/schema.ts:1247-1250).
  4. In apps/backend/tests/orders-transitions.integration.test.ts beforeAll (line 39), add `process.env['EMAIL_CONTACT_HASH_SECRET'] = 'transitions-integration-contact-secret';` (and delete it in afterAll) exactly as apps/backend/tests/orders.integration.test.ts:84 and 252 do, so the new hashContact call has a secret in tests.
  5. Note for the owner (no code change required by this finding): the runbook (docs/RUNBOOKS/dispatch-and-activation.md:103-105) already says the 'order_dispatch' template text ('has shipped … via <courier>') must be reworded for the no-shipping provider handoff before the first real order; once emails actually send, that wording goes live.
- **Acceptance criteria:** Add to orders-transitions.integration.test.ts: seed a lead WITH an email (e.g. 'dispatch@example.test'), transition its order ready_for_delivery -> dispatched with courier 'Provider handoff (no shipment)' and tracking 'ABC123', then `select job_type, payload from app.outbox_jobs where workspace_id = WORKSPACE and dedupe_key = '<orderId>:2'` must return one row with job_type 'order_dispatch_email', payload.toAddress = 'dispatch@example.test', payload.variables.courier = 'Provider handoff (no shipment)'. Repeat for dispatched -> activated expecting 'order_activation_email' with dedupe_key '<orderId>:3', and in_progress -> awaiting_customer expecting 'order_awaiting_customer_email'. Transitioning submitted -> in_progress must insert no outbox row. The existing test 'a stale expected version conflicts without writing any rows' must still pass (no outbox row on conflict). Run `pnpm --filter @canadian-plans/backend test` plus the disposable-DB integration suite.
- **Risk of fix:** Medium. Adds a dependency on EMAIL_CONTACT_HASH_SECRET inside the transition path; that variable is already required by order submission so production has it, but any test or local run that transitions an order whose lead has an email now needs it set. The outbox runner will start sending four new email kinds to real customers immediately after deploy; the dispatch template wording should be reviewed first (runbook lines 103-105). Orders whose lead has no email get no job (guarded).
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.

### [REL-03] Daily backup hard-depends on a Sanity dataset export that is not connected and has no auth token, so the run cannot complete
- **Severity:** 🟠 High
- **Category:** Reliability
- **Location:** jobs/src/backup/cli.ts:42-45, jobs/src/backup/cli.ts:66-69, jobs/src/backup/sources.ts:229-251, .github/workflows/backup.yml:60-62, jobs/src/backup/run.ts:112-113, docs/RUNBOOKS/restore.md:157-159
- **Problem:** `main()` in backup/cli.ts calls `requiredEnv('SANITY_PROJECT_ID')` and always wires `SanityCliExporter`, and `runBackup` (run.ts:113) always runs `exportDataset()` before building the manifest. Sanity is not connected yet (the storefront uses the static repo catalogue), and backup.yml passes only SANITY_PROJECT_ID/SANITY_DATASET/SANITY_SITE_FILTER — no SANITY_AUTH_TOKEN or any login — so `pnpm --filter site-1 exec sanity datasets export production ...` runs unauthenticated on a fresh runner. Either the env check throws before anything is exported, or the Sanity step fails, and because the heartbeat is published only after every component succeeds, no snapshot of the production database or documents is ever produced. The CLI subcommand spelled `datasets export` (sources.ts:238-239 and restore.md:158) should also be checked against the installed Sanity CLI, whose documented command is `sanity dataset export`.
- **Impact (plain English):** The production database (orders, leads, consents, staff accounts) and customers' uploaded ID documents have no independent backup at all until a CMS that the business is not even using yet is provisioned. A Supabase incident or a bad migration today is unrecoverable from the project's own archive.
- **Evidence:**
  ```text
  cli.ts:42: `const sanityProjectId = requiredEnv('SANITY_PROJECT_ID');`; sources.ts:231-245: `this.run('pnpm', ['--filter', this.options.siteFilter, 'exec', 'sanity', 'datasets', 'export', this.options.dataset, path, '-p', this.options.projectId], {})`; backup.yml:60-62 passes only SANITY_PROJECT_ID, SANITY_DATASET, SANITY_SITE_FILTER.
  ```
- **Fix steps:**
  1. In jobs/src/backup/run.ts make the Sanity step optional: change `sanity: SanityExporter` in `BackupRunDependencies` (line 48) to `sanity?: SanityExporter`; at step 4 (line 113) use `const sanity = deps.sanity ? await deps.sanity.exportDataset() : undefined;`; in `namedArtifacts` include `['sanity-export.tar.gz', sanity.archive]` only when `sanity` is defined; in `counts` use `sanityDocuments: sanity?.documentCount ?? 0, sanityAssets: sanity?.assetCount ?? 0`; when `sanity` is undefined push `'sanity_dataset_not_configured'` onto the `exclusions` array so the manifest records the omission.
  2. In jobs/src/backup/cli.ts replace `const sanityProjectId = requiredEnv('SANITY_PROJECT_ID')` with `const sanityProjectId = process.env.SANITY_PROJECT_ID?.trim();` and pass `sanity: sanityProjectId ? new SanityCliExporter({...}) : undefined` and `sourceIds: { supabaseProjectRef, ...(sanityProjectId ? { sanityProjectId, sanityDataset } : {}) }`.
  3. In .github/workflows/backup.yml add `SANITY_AUTH_TOKEN: ${{ secrets.BACKUP_SANITY_AUTH_TOKEN }}` to the backup step env (a read-only Sanity token, consumed by the Sanity CLI) so the export works once Sanity is connected; leave BACKUP_SANITY_PROJECT_ID unset in the GitHub Environment until then.
  4. Verify the CLI subcommand on a machine with the repo installed: run `pnpm --filter site-1 exec sanity dataset --help` and `pnpm --filter site-1 exec sanity datasets --help`; keep whichever is accepted in sources.ts:238 and in docs/RUNBOOKS/restore.md:158 and :329.
  5. Add a run.test.ts case: `runBackup` without `sanity` succeeds, produces no `sanity-export.tar.gz` artifact and lists `sanity_dataset_not_configured` in manifest.exclusions.
- **Acceptance criteria:** With SANITY_PROJECT_ID unset, `runBackup` (unit test with fakes) publishes a heartbeat and the manifest contains the exclusion string; a `workflow_dispatch` of backup.yml with the three Sanity secrets absent completes green and the monitor reports `ok` on its next run.
- **Risk of fix:** Low. Manifest schema unchanged (exclusions is a free-form string array). Restore code reads artifacts from the manifest, so a missing Sanity artifact is handled already.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.
- **[NEEDS VERIFICATION]** Confirm (a) the installed Sanity CLI's command is `dataset export` vs `datasets export` and (b) that `sanity dataset export` on a CI runner without SANITY_AUTH_TOKEN fails with an authentication error. The hard dependency on SANITY_PROJECT_ID and the absence of any token in backup.yml are verified in code.

### [SEC-01] Retention workflow keeps the escrowed age PRIVATE key in GitHub secrets next to a read+delete B2 credential
- **Severity:** 🟠 High
- **Category:** Security
- **Location:** .github/workflows/backup-retention.yml:45-57, jobs/src/retention/cli.ts:34-36, jobs/src/retention/run.ts:77-101, docs/RUNBOOKS/restore.md:55-57, docs/RUNBOOKS/restore.md:205-207
- **Problem:** The runbook's security model is that the age private key lives only in owner-controlled offline escrow and no scheduled job ever holds it (restore.md 205-207: 'Immediately move the private key into owner-controlled offline escrow and remove it from the runner. Daily jobs receive only RECOVERY_AGE_RECIPIENT'). But backup-retention.yml stores the private key as the GitHub secret RECOVERY_PRIVATE_KEY, writes it to the runner (step 'Write the escrowed recovery private key'), and jobs/src/retention/run.ts decrypts every run's manifest with it (line 92) merely to learn the run's capturedAt and artifact key list. The same job also holds the B2 retention key (list+read+delete). So one GitHub Environment contains everything needed to download and decrypt every backup. The decryption is unnecessary: every artifact is uploaded under its own run prefix (`${runId}/<name>.enc`, run.ts 150-162), the S3 listing already exposes every key and its LastModified, and the run id itself embeds the capture timestamp (createBackupRunId: `run-<ISO>-<uuid>`).
- **Impact (plain English):** Anyone who gains access to the backup-retention GitHub Environment (a compromised maintainer account, a malicious or hijacked action step, a GitHub token leak) can read every customer's uploaded passport/ID scan and the full database dump including staff password hashes, in plaintext. The whole point of encrypting the archive is defeated for that one environment.
- **Evidence:**
  ```text
  backup-retention.yml:50-53: `RECOVERY_PRIVATE_KEY: ${{ secrets.RECOVERY_PRIVATE_KEY }}` ... `printf '%s' "$RECOVERY_PRIVATE_KEY" > "$RUNNER_TEMP/recovery-private-key.txt"`; retention/run.ts:92-93: `const plaintext = await options.decryptor.decrypt(ciphertext); const manifest = backupManifestSchema.parse(...)`
  ```
- **Fix steps:**
  1. In jobs/src/retention/run.ts `runRetention`: replace the decrypt-and-parse block (lines 91-101) with listing-derived data. For each runId with a manifest object present, set `objectKeys` to every key in `allObjects` whose key starts with `${runId}/` and set `capturedAt` to the manifest object's `lastModified` (from `allObjects`); if `lastModified` is undefined, push the manifestKey to `unreadableManifests` (keeps the existing fail-safe path).
  2. Remove `decryptor` from `RetentionRunOptions` (run.ts:17) and from the call in jobs/src/retention/cli.ts (lines 34-36 and 39): delete the `RECOVERY_PRIVATE_KEY_PATH` read, the `AgeCliDecryptor` import/instantiation, and the `age --version` precheck at line 26.
  3. In .github/workflows/backup-retention.yml delete the steps 'Install and verify age' (lines 40-44) and 'Write the escrowed recovery private key' (lines 45-53) and the `RECOVERY_PRIVATE_KEY_PATH` env line (57). Then remove the RECOVERY_PRIVATE_KEY secret from the backup-retention GitHub Environment (owner action) and rotate the age key pair if that secret was ever populated.
  4. Update jobs/src/retention/run.test.ts and jobs/tests/backup-restore-rehearsal.test.ts (line 124-129) to stop passing `decryptor` to `runRetention`; keep the assertion that retained runs still decrypt and verify afterwards (that check belongs to the restore side and uses the test decryptor there).
  5. Update docs/RUNBOOKS/restore.md 'Tooling (T24)' section to state that retention never holds the private key.
- **Acceptance criteria:** `pnpm --filter @canadian-plans/jobs test` passes with no `decryptor` in retention; `git grep -n RECOVERY_PRIVATE_KEY -- .github` returns nothing; the rehearsal test still asserts `retentionReport.retainedRunIds` equals the retained run and `deleted` is empty on dry run; a retention run against the in-memory backend with two runs on the same day plus 31 distinct days still deletes only the non-retained run's objects (existing run.test.ts cases).
- **Risk of fix:** Medium. Retention's grace-period maths switches from manifest.capturedAt to the manifest object's upload time (a few minutes later); harmless for a 24h grace. If the owner has already populated RECOVERY_PRIVATE_KEY, the key must be considered exposed to GitHub and rotated (re-encrypting old backups is not possible; keep the old key offline for them).
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.

### [SEC-03] Fabricated Google rating "4.8 · 1,200+ Google reviews" shown on the live homepage
- **Severity:** 🟠 High
- **Category:** Security
- **Location:** apps/site-1/content/home-redesign.ts:326-328, apps/site-1/src/components/home/design/hero.tsx:74-80, apps/site-1/content/home.ts:18,35-37,304-310 (unused copy, same claim)
- **Problem:** homeRedesign.hero.ratingScore ('4.8') and ratingText ('· 1,200+ Google reviews') are design-fixture values that the live HomeHero renders verbatim under the headline. No review source exists in the repo, no Google Business profile is referenced anywhere, and the owner's inputs (docs/OPEN_INPUTS.md, docs/LAUNCH_PLANS.md) never supply a rating. The homepage is served to real visitors at canadianplans.com (only robots noindex is set).
- **Impact (plain English):** Every visitor sees a star rating and review count that was invented by the designer. In Canada a false performance/popularity representation is a reviewable matter under the Competition Act and an easy complaint for a competitor or a customer who looks for the 1,200 reviews and finds none. It also damages trust the moment someone checks Google.
- **Evidence:**
  ```text
  home-redesign.ts:327-328  ratingScore: '4.8',  ratingText: '· 1,200+ Google reviews',
  hero.tsx:79  <strong>{h.ratingScore}</strong> {h.ratingText}
  ```
- **Fix steps:**
  1. In apps/site-1/content/home-redesign.ts delete the three properties `stars`, `ratingScore` and `ratingText` from `homeRedesign.hero` (lines 326-328).
  2. In apps/site-1/src/components/home/design/hero.tsx remove the first `<span>` inside `<div className="cp-hd-hero-trust">` (lines 75-80, the one rendering h.stars / h.ratingScore / h.ratingText) so only the `assurances` list remains.
  3. Run `pnpm --filter site-1 typecheck` to confirm nothing else references the removed keys (home.ts has its own copies and is not affected).
  4. If the owner later supplies a real Google rating and review count with a link to the profile, re-add the line with those values and a link to the profile.
- **Acceptance criteria:** Load / in a browser: the hero trust row shows only 'No credit check options' and 'Pay $0 until we confirm'; `git grep -n '1,200+' apps/site-1/content/home-redesign.ts` returns nothing; site-1 typecheck and vitest pass.
- **Risk of fix:** Low. Pure copy/markup removal; the CSS class cp-hd-hero-trust still has content so layout is unchanged.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.

### [SEC-04] Unverified 'in-store' comparison prices and savings claims presented as fact on live pages
- **Severity:** 🟠 High
- **Category:** Security
- **Location:** apps/site-1/content/pre-arrival.ts:176-177,202-203,276-277, apps/site-1/content/home-redesign.ts:315, apps/site-1/content/guides.ts:206,215,232, apps/site-1/content/plan-finder.ts:553,598,1251,1270, docs/LAUNCH_PLANS.md:89-92
- **Problem:** Several live pages state what the same plan 'costs in a Canadian store' ($60 for Fido 75 GB, $80 for Rogers 100 GB, $67 for Chatr 90 GB), derive 'Save up to $40/mo vs in-store' and 'SAVE UP TO 50%' from those numbers, and say 'Some plans have special newcomer pricing'. docs/LAUNCH_PLANS.md §E explicitly records that the owner has NOT confirmed these in-store prices as true public claims. The CpPlanCard renders `originalPrice` as a struck-through price (packages/ui/src/components/canadian-plans/elements.tsx:164-169), which is the classic 'ordinary selling price' representation.
- **Impact (plain English):** Customers are told they save $25–$40 a month compared with a store price that nobody has verified. If Rogers/Fido/Chatr sell those plans for less in store, this is a false savings claim (Competition Act s.74.01 ordinary-price provisions) and a carrier-relations problem for an authorised dealer. The finder's 'SAVE UP TO 50%' badge is not backed by any plan in the catalogue (the largest documented gap is 50%, on one plan, only if the $80 figure is true).
- **Evidence:**
  ```text
  pre-arrival.ts:201-202  originalPrice: '$80/mo',
    finePrint: 'in store · $0 due today',
  home-redesign.ts:315  chips: ['✓ Pay $0 today', '✓ Save up to $40/mo vs in-store'],
  plan-finder.ts:598  badge: 'SAVE UP TO 50%',
  plan-finder.ts:1251  comparison: '$80/mo if bought in Canada',
  LAUNCH_PLANS.md:91  Do the "in store" prices in table D ($60, $80, $67) ... hold up as true public claims?
  ```
- **Fix steps:**
  1. OWNER APPROVAL: the owner must either supply the source and date for each in-store price (then keep the claims and add a dated footnote) or drop them. Until then remove the claims as follows.
  2. apps/site-1/content/pre-arrival.ts: delete the `originalPrice` property on the Fido (line 176), Rogers Plus (line 202) and Chatr 90 GB (line 276) plans and change their `finePrint` from 'in store · $0 due today' to 'Pre-arrival price · $0 due today' (the value the other cards already use).
  3. apps/site-1/content/home-redesign.ts line 315: change the newcomer chips to `['✓ Pay $0 today', '✓ No credit history needed']`.
  4. apps/site-1/content/plan-finder.ts: remove `badge: 'SAVE UP TO 50%'` (line 598); change `description: 'Some plans have special newcomer pricing.'` (line 553) and `mobileDescription` (line 554) to 'We show the plans that fit how you are arriving.'; remove the `comparison` lines 1251 and 1270.
  5. apps/site-1/content/guides.ts: remove `storePrice: '$60'` (line 206) and `storePrice: '$80'` (line 215), and in the comparison `note` (line 232) delete the sentence 'Crossed-out prices are what the same plan costs in a Canadian store.'
  6. Run site-1 typecheck and vitest; `apps/site-1/src/lib/plan-finder-flow.test.ts` and guide tests must still pass (they do not assert these strings, but confirm).
- **Acceptance criteria:** `git grep -n -E 'in store|in-store|if bought in Canada|SAVE UP TO|storePrice|originalPrice' apps/site-1/content` returns no hits in pre-arrival.ts, home-redesign.ts, guides.ts or plan-finder.ts; /pre-arrival-sim plan cards show no struck-through prices; the student guide table has no crossed-out column.
- **Risk of fix:** Low. Copy-only. If the owner later verifies the prices, the same lines can be restored with a source footnote.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner must confirm whether the $60/$80/$67 store prices are true today (LAUNCH_PLANS.md §E is still open). If confirmed with a source, keep the claims and add a dated footnote instead of removing them.

### [SEO-01] Production indexability and canonical URLs depend on NEXT_PUBLIC_SITE_URL, which the launch checklist records as unset: whole site is noindex with localhost canonicals
- **Severity:** 🟠 High
- **Category:** SEO
- **Location:** apps/site-1/src/lib/seo.ts:8-14, apps/site-1/src/lib/seo.ts:37-44, apps/site-1/src/app/layout.tsx:24, apps/site-1/src/app/robots.ts:12-13, apps/site-1/src/app/sitemap.ts:15, apps/site-1/src/lib/page-metadata.ts:11, docs/LAUNCH_CHECKLIST.md:40, docs/LAUNCH_CHECKLIST.md:42
- **Problem:** `siteBaseUrl()` falls back to `http://localhost:3001` whenever `NEXT_PUBLIC_SITE_URL` is missing or invalid, and `isIndexable()` requires that base to be https and non-local. The root layout emits `robots: noindex, nofollow`, `robots.ts` returns `Disallow: /`, `sitemap.ts` returns `[]`, and every `pageMetadata()` canonical/OpenGraph URL is built from the fallback. docs/LAUNCH_CHECKLIST.md line 42 records that production Vercel does NOT have `NEXT_PUBLIC_SITE_URL` set and line 40 confirms live robots.txt is `Disallow: /`. The code offers no production-safe fallback (Vercel exposes `VERCEL_PROJECT_PRODUCTION_URL` and `VERCEL_ENV` which could be used).
- **Impact (plain English):** Search engines are told not to index canadianplans.com at all, the sitemap is empty, and every page's canonical and social-share link points to http://localhost:3001/... . The business gets no organic traffic and shared links carry a broken URL until someone sets one environment variable. A single missing env var silently turns off SEO for the whole site with no error or warning.
- **Evidence:**
  ```text
  seo.ts: `const DEFAULT_BASE_URL = 'http://localhost:3001'; ... if (!raw) return DEFAULT_BASE_URL;` and `isIndexable(): process.env.VERCEL_ENV === 'production' && base.protocol === 'https:' && !['localhost',...].includes(base.hostname)`. LAUNCH_CHECKLIST.md:42 "Not set: `NEXT_PUBLIC_SITE_URL`"; :40 "robots.txt | `Disallow: /` for all agents".
  ```
- **Fix steps:**
  1. Ops: in the Vercel project for site-1, set `NEXT_PUBLIC_SITE_URL=https://canadianplans.com` for the Production environment and redeploy (NEXT_PUBLIC_* values are inlined at build time, so a redeploy is required).
  2. Code hardening in `apps/site-1/src/lib/seo.ts`, function `siteBaseUrl()`: after `const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();` add a Vercel fallback: `const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim(); const candidate = raw || (process.env.VERCEL_ENV === 'production' && vercelHost ? `https://${vercelHost}` : undefined); if (!candidate) return DEFAULT_BASE_URL;` and parse `candidate` instead of `raw` in the existing `new URL(...)` block.
  3. Add a build-time guard so this cannot silently recur: in `apps/site-1/next.config.ts` top level, add `if (process.env.VERCEL_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) { throw new Error('NEXT_PUBLIC_SITE_URL must be set for a production build.'); }`.
  4. Update `apps/site-1/src/lib/seo.test.ts` with a case: `VERCEL_ENV=production`, `NEXT_PUBLIC_SITE_URL` unset, `VERCEL_PROJECT_PRODUCTION_URL=canadianplans.com` -> `siteBaseUrl()` returns `https://canadianplans.com` and `isIndexable()` returns true.
- **Acceptance criteria:** After redeploy: `curl -s https://canadianplans.com/robots.txt` shows `Allow: /` with `Disallow: /studio` and `/api` and a `Sitemap:` line; `curl -s https://canadianplans.com/sitemap.xml` lists at least `/accessibility`; `curl -s https://canadianplans.com/ | grep -o '<link rel="canonical"[^>]*>'` shows `https://canadianplans.com/`, not localhost. `pnpm --filter site-1 test -- seo` passes with the new case.
- **Risk of fix:** Low. Setting the env var only changes metadata/robots output. The build guard will fail production builds that lack the variable, which is the intended behaviour; preview builds are unaffected because VERCEL_ENV is 'preview' there.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.
- **[NEEDS VERIFICATION]** Confirm in the Vercel dashboard (site-1 project, Production env) that NEXT_PUBLIC_SITE_URL is still absent, and fetch https://canadianplans.com/robots.txt to confirm it still returns `Disallow: /`. The code path is read and certain; only the live env state is inferred from docs/LAUNCH_CHECKLIST.md.

### [SEO-02] Every commercial storefront page ships noindex,nofollow and is absent from the sitemap; the launch 'open to search engines' step has no single switch
- **Severity:** 🟠 High
- **Category:** SEO
- **Location:** apps/site-1/src/app/(home)/page.tsx:18, apps/site-1/src/app/(about)/about/page.tsx:14, apps/site-1/src/app/(contact)/contact/page.tsx:20, apps/site-1/src/app/(faq)/faq/page.tsx:22, apps/site-1/src/app/(guides)/guides/[slug]/page.tsx:27, apps/site-1/src/app/(guides-index)/guides/page.tsx:15, apps/site-1/src/app/(home-internet)/home-internet/page.tsx:14, apps/site-1/src/app/(landing-arrival)/pre-arrival-sim/students/page.tsx:17, apps/site-1/src/app/(landing-arrival)/pre-arrival-sim/from-india/page.tsx:17, apps/site-1/src/app/(landing-arrival)/pre-arrival-sim/toronto-pearson/page.tsx:17, apps/site-1/src/app/(landing-internet)/home-internet/vancouver/page.tsx:11, apps/site-1/src/app/(landing-internet)/home-internet/ontario/page.tsx:11, apps/site-1/src/app/(mobile-plans)/mobile-plans/page.tsx:15, apps/site-1/src/app/(pre-arrival)/pre-arrival-sim/page.tsx:14, apps/site-1/src/app/sitemap.ts:12
- **Problem:** Each page's metadata hard-codes `robots: { index: false, follow: false }` and `sitemap.ts` lists only `/accessibility` plus published legal pages (`PUBLIC_ROUTES = ['/accessibility']`). `robots.ts` allows crawling in production, but the per-page meta tag blocks indexing of the homepage, all category pages (/pre-arrival-sim, /mobile-plans, /home-internet), the five landing pages, /faq, /guides, /guides/[slug], /about and /contact. Launch checklist item 6.1 ('production robots/sitemap allow indexing; only /business-internet stays noindex') therefore requires editing 14 page files plus the sitemap by hand, with no central flag; forgetting one page silently keeps it out of search. The FAQPage/Article/BreadcrumbList JSON-LD emitted on these pages is wasted while they are noindex.
- **Impact (plain English):** When the site goes live on canadianplans.com, Google and Bing will not list the homepage, plan pages or guides at all, so no customer can find the business through search. The go-live step is also error-prone: it is a manual edit across 15 files instead of one switch.
- **Evidence:**
  ```text
  (home)/page.tsx:16-19: `export const metadata: Metadata = pageMetadata('/', { title: homeCopy.title, robots: { index: false, follow: false } });` — sitemap.ts:12: `const PUBLIC_ROUTES = ['/accessibility'] as const;` — docs/LAUNCH_CHECKLIST.md:327-328: '6.1 Open to search engines — production robots/sitemap allow indexing; only /business-internet stays noindex.'
  ```
- **Fix steps:**
  1. In apps/site-1/src/lib/seo.ts add: `export const STOREFRONT_INDEXING_OPEN = false;` (flip to `true` as launch step 6.1), `export const INDEXABLE_PATHS: readonly string[] = ['/', '/about', '/contact', '/faq', '/guides', '/home-internet', '/home-internet/vancouver', '/home-internet/ontario', '/mobile-plans', '/pre-arrival-sim', '/pre-arrival-sim/students', '/pre-arrival-sim/from-india', '/pre-arrival-sim/toronto-pearson', '/accessibility'];` and `export function publicRobots(path: string): { index: boolean; follow: boolean } | undefined { const listed = INDEXABLE_PATHS.includes(path) || path.startsWith('/guides/'); return STOREFRONT_INDEXING_OPEN && listed ? undefined : { index: false, follow: false }; }`.
  2. In each of the 14 page files listed in `location` (NOT business-internet, order, track, search, dev, studio or plans pages), import `publicRobots` from '@/lib/seo' and replace `robots: { index: false, follow: false }` with `robots: publicRobots('<that page's path>')`; for guides/[slug] use `publicRobots(`/guides/${article.slug}`)`.
  3. In apps/site-1/src/app/sitemap.ts replace `PUBLIC_ROUTES` with: `import { INDEXABLE_PATHS, STOREFRONT_INDEXING_OPEN } from '../lib/seo'; import { guideArticles } from '@content/guides';` and compute `const publicRoutes = STOREFRONT_INDEXING_OPEN ? [...INDEXABLE_PATHS, ...guideArticles.map((a) => `/guides/${a.slug}`)] : ['/accessibility'];` then use `publicRoutes` where `PUBLIC_ROUTES` was used.
  4. Update apps/site-1/src/app/sitemap.test.ts: keep the existing two tests (they describe the closed state) and add one that uses `vi.mock('../lib/seo', async (importOriginal) => ({ ...(await importOriginal()), STOREFRONT_INDEXING_OPEN: true }))` and asserts the home, category, landing and guide URLs appear.
  5. Add a note to docs/LAUNCH_CHECKLIST.md item 6.1: 'flip STOREFRONT_INDEXING_OPEN in apps/site-1/src/lib/seo.ts to true and deploy'.
- **Acceptance criteria:** `pnpm vitest run apps/site-1/src/app/sitemap.test.ts` passes. With the flag still false, `curl -s http://localhost:3001/ | grep -o '<meta name="robots"[^>]*>'` shows noindex (unchanged behaviour). With the flag set to true and `VERCEL_ENV=production NEXT_PUBLIC_SITE_URL=https://canadianplans.com pnpm --filter site-1 build && pnpm --filter site-1 start`: the same grep on `/`, `/mobile-plans`, `/pre-arrival-sim`, `/guides/best-sim-for-students-from-india` returns nothing, `/business-internet` and `/order` still return `noindex`, and `curl -s http://localhost:3001/sitemap.xml` lists all INDEXABLE_PATHS plus guide URLs.
- **Risk of fix:** Low. Behaviour is unchanged until the flag is flipped. The only risk is accidentally listing a route that must stay private; the list above excludes /order*, /track*, /search, /dev/*, /studio, /plans* and /business-internet.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.

### [A11Y-01] Homepage explorer category nav hijacks in-page links: no focus move, no URL hash, and smooth scrolling regardless of prefers-reduced-motion
- **Severity:** 🟡 Medium
- **Category:** Accessibility
- **Location:** apps/site-1/src/components/home/design/explorer-nav.tsx:44-53, apps/site-1/src/components/home/design/explorer-nav.tsx:64-71, apps/site-1/src/components/home/design/explorer.tsx:64
- **Problem:** `HomeExplorerNav` renders `<a href="#cat-…">` links whose onClick calls `event.preventDefault()` and `scrollIntoView({ behavior: 'smooth' })`. Cancelling the default removes the browser's behaviour of moving the sequential focus starting point to the target and updating `location.hash`, and nothing re-creates it: keyboard users press Enter, the page scrolls, but focus stays on the nav link so the next Tab goes to the next nav item, not into the section (WCAG 2.4.3). The scroll is always `smooth` (also in the second effect's `nav.scrollTo`), while the FAQ and Contact components in the same codebase check `prefers-reduced-motion` before animating. The target `<div className="cp-hd-catsec" id=…>` has no `tabIndex={-1}`, so it could not receive focus anyway.
- **Impact (plain English):** Keyboard and screen-reader users of the homepage cannot jump into a category section from the sticky nav, and motion-sensitive users get animated scrolling they asked the OS to suppress.
- **Evidence:**
  ```text
  explorer-nav.tsx:64-71: `onClick={(event) => { event.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); lockUntil.current = Date.now() + 900; setActive(item.id); }}` — compare faq/interactive.tsx:58-61 which uses `window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'`.
  ```
- **Fix steps:**
  1. In apps/site-1/src/components/home/design/explorer.tsx line 64 add `tabIndex={-1}` to the `<div className="cp-hd-catsec" id={sectionId(category.key)} …>`.
  2. In explorer-nav.tsx replace the onClick body with: `event.preventDefault(); const el = document.getElementById(item.id); const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); el?.focus({ preventScroll: true }); history.replaceState(null, '', `#${item.id}`); lockUntil.current = Date.now() + 900; setActive(item.id);`.
  3. In the same file's second useEffect (lines 44-53) change `behavior: 'smooth'` to `behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`.
  4. Add `.cp-hd-catsec:focus { outline: none; }` to apps/site-1/src/app/(home)/home-design.css only if a visible ring on the whole section is undesirable (focus is programmatic, tabIndex -1).
- **Acceptance criteria:** On /, Tab to the explorer nav, press Enter on 'Home internet': `document.activeElement.id === 'cat-home-internet'`, the URL ends with `#cat-home-internet`, and the next Tab lands on the first link inside that section. With Chrome DevTools 'Emulate CSS prefers-reduced-motion: reduce', the scroll is instant. Axe on / still reports zero violations.
- **Risk of fix:** Low. Only the homepage nav behaviour changes; the scroll-spy lock logic is kept.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-02] OTP request and OTP verify share one per-email rate bucket, so a customer who mistypes a code is silently refused a fresh code for 10 minutes
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/backend/src/routes/website.ts:799-809, apps/backend/src/routes/website.ts:855-861, apps/backend/src/tracking/secrets.ts:43-49, apps/backend/src/tracking/service.ts:15-18, packages/db/drizzle/0004_simple_hellfire_club.sql:80-99
- **Problem:** `POST /tracking/otp` and `POST /tracking/verify` both call `dependencies.auth.rateLimit` with the identical `bucketKey` from `emailRateBucket(secret, workspaceId, normalizedEmail)` and the same 600 s window, differing only in `maxCount` (5 vs 10). `app.rate_limit_hit` keys its counter only by (bucket_key, window_start) and ignores maxCount when counting, so the two endpoints increment one shared counter. Sequence: request code (count 1), three wrong guesses (count 4), one more wrong guess (count 5), request a new code → count 6 > 5 → `emailLimit.allowed` is false and the route silently skips `requestCode` while still returning the neutral `challenge_sent`. The customer is told a code was sent but none was, until the window rolls (up to 10 minutes). The IP bucket is unaffected because it has distinct prefixes.
- **Impact (plain English):** A customer tracking their order who types the code wrong a few times, or requests a code twice because the email was slow, will be told a new code has been sent when it has not, and will be stuck for up to ten minutes with no explanation. Support will receive 'I never got my code' complaints that cannot be reproduced.
- **Evidence:**
  ```text
  website.ts:801 `bucketKey: emailRateBucket(secret, ctx.workspaceId, normalizeEmail(body.data.email))` with `maxCount: TRACKING_OTP_EMAIL_MAX_REQUESTS` (5); website.ts:857 same `emailRateBucket(...)` with `maxCount: TRACKING_OTP_VERIFY_EMAIL_MAX_REQUESTS` (10); secrets.ts:48 `return \`email:${hmac(secret, \`rate\n${workspaceId}\n${normalizedEmail}\`)}\`;` ; SQL `ON CONFLICT (bucket_key, window_start) DO UPDATE SET request_count = bucket.request_count + 1`.
  ```
- **Fix steps:**
  1. In apps/backend/src/tracking/secrets.ts change `emailRateBucket` to take a purpose: `export function emailRateBucket(secret: string, workspaceId: string, normalizedEmail: string, purpose: 'otp' | 'verify'): string { return \`email:${purpose}:${hmac(secret, \`rate\n${purpose}\n${workspaceId}\n${normalizedEmail}\`)}\`; }`.
  2. In apps/backend/src/routes/website.ts pass `'otp'` as the fourth argument at line 801-805 (the `/tracking/otp` handler) and `'verify'` at line 857 (the `/tracking/verify` handler).
  3. Fix any other caller: run `git grep -n emailRateBucket -- apps/backend` and add the matching purpose argument (tests included).
  4. Add a test in apps/backend/tests/tracking-routes.test.ts using a counting fake limiter (copy `FakeRateLimiter` from website-auth.test.ts): after 1 OTP request and 5 wrong verifies, a second OTP request must still produce a second entry in `store.sent`.
- **Acceptance criteria:** `pnpm --filter backend test -- tracking-routes` passes including the new test; the two bucket keys recorded by the fake limiter for /otp and /verify differ (`email:otp:` vs `email:verify:` prefixes).
- **Risk of fix:** Low. Bucket keys change, so counters already in `app.rate_limit_buckets` for the old key simply expire; no migration needed.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-05] MFA enrolment cannot be retried after an abandoned attempt (duplicate friendly name)
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/admin/src/app/mfa/enroll/page.tsx:37-56
- **Problem:** The enrol page calls `auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Canadian Plans Admin' })` with a fixed friendly name and never cleans up earlier unverified factors. Supabase Auth rejects a new factor whose friendly name matches an existing factor for the same user (`mfa_factor_name_conflict`, HTTP 422), and an unverified factor created by a previous visit (page reload, closed tab, QR that did not scan) still exists for a while. The page only checks for *verified* factors before enrolling, so the second attempt hits the conflict and shows the dead-end message 'Multi-factor enrollment could not be started.' with no retry path.
- **Impact (plain English):** An Owner or Finance user who reloads the enrol page, or whose first QR scan failed, is told enrolment 'could not be started' and has no way forward in the UI; until they wait for the stale factor to expire (or someone removes it in the Supabase dashboard) they cannot reach aal2 and every privileged action (invite staff, delete customer data, finance views) stays blocked.
- **Evidence:**
  ```text
  mfa/enroll/page.tsx:42-56: `if (factors.data.totp.some((factor) => factor.status === 'verified')) { ... } const result = await auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Canadian Plans Admin' }); if (result.error || result.data.type !== 'totp') { setMessage('Multi-factor enrollment could not be started.'); return; }` — unverified factors are never unenrolled and the same friendlyName is always reused.
  ```
- **Fix steps:**
  1. In apps/admin/src/app/mfa/enroll/page.tsx, inside the `listFactors().then(async (factors) => { ... })` callback, after the verified-factor check and before `auth.mfa.enroll(...)`, add: `for (const stale of factors.data.totp.filter((f) => f.status === 'unverified')) { await auth.mfa.unenroll({ factorId: stale.id }); }` (ignore unenroll errors).
  2. Make the friendly name unique as a belt-and-braces measure: `friendlyName: \`Canadian Plans Admin ${new Date().toISOString().slice(0, 10)}\`` or append a short random suffix.
  3. When `result.error` is set, show the error code in a non-PII way only if helpful (e.g. 'Multi-factor enrollment could not be started (code: X). Reload to try again.').
- **Acceptance criteria:** Manual: as a user with no verified factor, open /mfa/enroll, wait for the QR, reload the page immediately; the new QR must render instead of the 'could not be started' message. Then complete enrolment with the second QR and confirm `listFactors()` shows exactly one verified factor and no unverified leftovers.
- **Risk of fix:** Low. Unenrolling an unverified factor cannot affect an already-verified factor; `unenroll` of unverified factors is allowed at aal1. Only the enrol page changes.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Reproduce by enrolling twice without verifying (second call expected to return a 422 `mfa_factor_name_conflict`). Supabase's unverified-factor expiry window may make the second attempt succeed if enough time has passed; test within a minute of the first attempt.

### [BUG-06] Activate, Record payment and Mark carrier paid execute on a single click with no confirmation
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/admin/src/components/orders/order-actions.tsx:132-147, apps/admin/src/components/orders/order-payment.tsx:146-167, apps/admin/src/components/partners/partner-detail.tsx:221-229
- **Problem:** Dispatch and Cancel open a confirmation dialog, but `Activate` (which, per invariant 10, creates the partner commission exactly once and is irreversible), `Record payment` (writes a payment ledger row and changes payment state) and `Mark carrier paid` (moves a commission to `carrier_paid`) fire immediately from one button click. `write.busy` and `expectedVersion` prevent double submission, but not a mis-click on a 'Processing actions' button row where Activate sits next to ordinary status buttons.
- **Impact (plain English):** One stray click activates an order that has not actually been activated by the carrier, creating a commission line the finance flow then has to unwind manually, or records a payment that was never received. There is no undo in the UI for either.
- **Evidence:**
  ```text
  order-actions.tsx:133-146 `<Button ... onClick={() => void write.run(() => patchWorkspaceOrder(accessToken, workspaceId, order.id, { action: 'activate', expectedVersion }))}>Activate</Button>`; order-payment.tsx:146-167 `onClick={async () => { const result = await write.run(() => recordOrderPayment(...` with no confirmation; partner-detail.tsx:226 `onClick={() => void markCarrierPaid(commission.id)}`.
  ```
- **Fix steps:**
  1. In order-actions.tsx add `const [activateOpen, setActivateOpen] = useState(false);` and change the Activate button to `onClick={() => setActivateOpen(true)}`. Add a `<Dialog open={activateOpen} onOpenChange={setActivateOpen}>` modelled on the existing Cancel dialog with title 'Activate order', description 'Activation is final and creates the partner commission for this order. Only confirm once the carrier has activated the plan.', a Close button and a 'Confirm activation' button whose onClick runs the existing `write.run(() => patchWorkspaceOrder(..., { action: 'activate', expectedVersion }))` and closes the dialog when the result is truthy.
  2. In order-payment.tsx wrap the `Record payment` submission the same way: a Dialog that restates the chosen payment state, amount (formatted with `formatMoney` when `amountMinor` is set), method and reference, with a 'Confirm payment record' button that runs the existing `write.run(...)`.
  3. In partner-detail.tsx wrap `markCarrierPaid` in a Dialog ('Mark carrier paid', 'Confirms the carrier has paid Canadian Plans for order {reference}.') before calling `changeCommissionState`.
- **Acceptance criteria:** Clicking Activate, Record payment or Mark carrier paid opens a dialog and no network request is made until the confirm button inside the dialog is pressed (check Network tab). Pressing Escape/Close makes no request. Existing order-detail.test.tsx and partner tests still pass; add a test that `Activate` does not call `patchWorkspaceOrder` until confirmed.
- **Risk of fix:** Low. Purely additive UI; backend calls and payloads are unchanged. Keyboard users get the same dialog focus handling the Dispatch/Cancel dialogs already use.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-07] Internal editorial note 'VERIFY before publishing…' is rendered to customers on /pre-arrival-sim
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/pre-arrival.ts:104, apps/site-1/src/app/(pre-arrival)/pre-arrival-sim/page.tsx:66
- **Problem:** arrivalCopy.comparison.note contains a note addressed to the content team ('VERIFY before publishing: kiosk and carrier-store claims must be checked against current airport and store offers (YVR, YYZ, YUL, YYC).') and the page prints it under the comparison table as the table's footnote.
- **Impact (plain English):** Visitors to the main pre-arrival page read an internal to-do telling them the comparison above has not been checked, which undermines the whole table and looks unfinished.
- **Evidence:**
  ```text
  pre-arrival.ts:104  note: 'VERIFY before publishing: kiosk and carrier-store claims must be checked against current airport and store offers (YVR, YYZ, YUL, YYC).',
  page.tsx:66  <p className="cp-arrival-note">{copy.comparison.note}</p>
  ```
- **Fix steps:**
  1. In apps/site-1/content/pre-arrival.ts replace the `note` value on line 104 with customer-facing text: 'Airport kiosk and carrier-store details are general observations, checked October 2026. Prices and availability vary by location.'
  2. If the owner has not verified the kiosk/store rows, additionally soften the 'Airport kiosk' and 'Carrier store after you land' columns (lines 81-103) or remove those two columns and keep only the Canadian Plans column.
- **Acceptance criteria:** Open /pre-arrival-sim and scroll to 'Pre-arrival SIM vs. buying after you land': the footnote no longer contains the word VERIFY; `git grep -n 'VERIFY before publishing' apps/site-1` returns nothing.
- **Risk of fix:** Low. Copy only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-08] Placeholder testimonials ('Real customer quote goes here', 'Customer name', 'Customer since 20XX') render on the live homepage
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/home-redesign.ts:765-808, apps/site-1/src/components/home/design/stories.tsx:21-50, apps/site-1/content/site-chrome.ts:72
- **Problem:** homeRedesign.testimonials.items holds three placeholder cards whose quote, name and meta are literal template text; HomeStories maps over them and prints each as a <blockquote> with <figcaption>. The footer 'Reviews' link (site-chrome.ts:72) sends people to /#stories, i.e. straight to the placeholders. The comment on line 769 says these must be replaced before use, but nothing hides them.
- **Impact (plain English):** Visitors see a 'Customer stories' section that literally says 'Real customer quote goes here' three times. It looks broken and invites the suspicion that any future review is also made up.
- **Evidence:**
  ```text
  home-redesign.ts:778-781  quote: 'Real customer quote goes here. One or two sentences about their experience, used with permission.',
    name: 'Customer name',
    meta: 'City · Customer since 20XX',
  stories.tsx:44  <blockquote>{item.quote}</blockquote>
  ```
- **Fix steps:**
  1. In apps/site-1/content/home-redesign.ts set `testimonials.items` to an empty array `[]` (delete the three placeholder objects, lines 770-807) and keep the comment on line 769.
  2. In apps/site-1/src/components/home/design/stories.tsx add as the first line of `HomeStories`: `if (homeRedesign.testimonials.items.length === 0) return null;` (keep the existing `const t = ...` after it).
  3. In apps/site-1/content/site-chrome.ts remove the `{ label: 'Reviews', href: '/#stories' }` entry (line 72) from the Company footer group until real reviews exist.
  4. Run site-1 typecheck; if TypeScript narrows `items` to `never[]`, change the declaration to `items: [] as readonly HomeTestimonial[]` where `HomeTestimonial` is an interface with the existing fields (id, photo, alt, photoHint, category, tone, quote, name, meta).
- **Acceptance criteria:** Load /: no 'Customer stories' section and no 'Real customer quote goes here' text; footer Company column has no 'Reviews' link; site-1 typecheck and vitest pass.
- **Risk of fix:** Low. Hiding a section shifts the homepage layout slightly; the CSS for cp-hd-stories remains for when real reviews are added.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-09] Bracketed editor notes ('[Confirm …]', '[Add your typical install timeline.]') render in the homepage and Business Internet FAQs
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/home-redesign.ts:870,881,887, apps/site-1/content/business-internet.ts:69,75, apps/site-1/src/components/home/design/faq.tsx:47-49, apps/site-1/src/app/(business-internet)/business-internet/page.tsx:36
- **Problem:** homeRedesignFaq answers contain square-bracket instructions for the owner that the live HomeFaq prints as the answer text. businessFaq (shown on /business-internet, which is linked from the homepage picker, the service columns, the header nav and the footer) has the same problem. Facts that would fill these gaps already exist elsewhere on the site: order 1–3 weeks before (pre-arrival.ts:117), installs 'within about 3 days' (home-internet.ts:109), no device sales.
- **Impact (plain English):** Customers opening 'Can I get a Canadian number before I arrive?' read '[Confirm how far ahead people can order.]'; opening 'How fast can I get home internet installed?' reads '[Add your typical install timeline.] We book…'. On the business page the install FAQ says 'Usually [typical business install timeline].' This reads as an unfinished site.
- **Evidence:**
  ```text
  home-redesign.ts:887  '[Add your typical install timeline.] We book the install for you and keep you updated.',
  home-redesign.ts:881  'No contract on any of our plans. [Confirm any device financing terms if you sell phones.]',
  business-internet.ts:69  'Usually [typical business install timeline]. We book the visit around your opening hours.',
  ```
- **Fix steps:**
  1. apps/site-1/content/home-redesign.ts line 870: change the answer to 'Yes. Order a pre-arrival plan 1 to 3 weeks before your flight, from any country, and your Canadian number is ready before you fly.'
  2. apps/site-1/content/home-redesign.ts line 881: change the answer to 'There is no contract with Canadian Plans. Your service agreement is with the provider, and an advisor explains its terms before anything is activated.' (also resolves part of the 'No contract' finding).
  3. apps/site-1/content/home-redesign.ts line 887: change the answer to 'Most installs happen within about 3 days of your call with us. We book the install for you and keep you updated.'
  4. apps/site-1/content/business-internet.ts line 69: change to 'Usually within a few business days of your quote. We book the visit around your opening hours.' and line 75 to 'Static IP options depend on the plan. Ask your advisor when you request a quote.'
  5. Verify no other bracketed placeholder remains: `git grep -n -E '\[(Confirm|Add|Describe|List|Name|X|legal company name|Lawyer)' apps/site-1/content` should only hit apps/site-1/content/legal.ts (dead draft, see separate finding).
- **Acceptance criteria:** Open / and expand every FAQ item, then open /business-internet FAQ: no text contains '[' or ']'; site-1 typecheck passes.
- **Risk of fix:** Low. Copy only; the replacement facts are copied from pages already live.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-10] Document-upload copy on pre-arrival pages contradicts the catalogue and Terms (no documents required to order)
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/landing/students.ts:73-90, apps/site-1/content/landing/from-india.ts:75-92, apps/site-1/content/landing/toronto-pearson.ts:73-90, apps/site-1/content/pre-arrival.ts:40, apps/site-1/content/faq.ts:106,117, apps/site-1/content/guides.ts:278, apps/site-1/content/pre-arrival-order.ts:69,91-98, packages/adapters/src/static-catalogue/site-1-plans.ts:484-485, apps/site-1/content/legal-published.ts:107, docs/OPEN_INPUTS.md:15
- **Problem:** The owner decided (OPEN_INPUTS #6, 22 Oct 2026) that pre-arrival eSIM orders upload no documents; the catalogue sets documentChecklist: [] for every prearrival-* offer and the published Terms §7 say 'Regular online orders do not require you to upload documents when you order.' The three landing pages nevertheless have a 'Before you order' checklist saying 'Send each one as a photo or PDF' (passport, permit, …), the FAQ says 'To order you need your passport, your study or work permit…', the guide step says 'Add your passport, study permit or visa', and the preview order form (/order/pre-arrival) requires passport and permit uploads with 'Rogers requires ID to activate'.
- **Impact (plain English):** Customers are told to prepare and send passport scans that the real order form never asks for, then read Terms that say the opposite. Some will email passports to info@ unprompted (unnecessary PII handling), others will distrust the site. It also misstates eligibility ('just your passport and your visa or permit').
- **Evidence:**
  ```text
  students.ts:78  description: 'Four things, and you can send them as photos or PDFs.',
  site-1-plans.ts:484-485  // Regular online orders upload no documents; an advisor asks if anything is needed (canadaesim terms, section 4).
    documentChecklist: [],
  legal-published.ts:107  'Regular online orders do not require you to upload documents when you order. If we need a document to confirm your identity or eligibility, we will ask you…'
  ```
- **Fix steps:**
  1. apps/site-1/content/landing/students.ts line 78: change `description` to 'You do not upload anything to order. Have these ready in case your advisor asks for them.'; line 76 eyebrow 'Before you order' may stay. Do the same in from-india.ts line 80 ('Send each one as a photo or PDF.' → 'You do not upload anything to order. Have these ready in case your advisor asks.') and toronto-pearson.ts line 78.
  2. apps/site-1/content/pre-arrival.ts line 40: change the ending 'just your passport and your visa or permit.' to 'An advisor confirms your eligibility by WhatsApp or phone; you upload nothing to order.'
  3. apps/site-1/content/faq.ts line 106: change the answer to 'No. You order with your name, email, phone, arrival date and city. An advisor asks for your passport or permit only if the provider needs it.'; line 117: prefix with 'Nothing is uploaded when you order. If asked, '.
  4. apps/site-1/content/guides.ts line 278: change 'Add your passport, study permit or visa, and arrival date.' to 'Add your arrival date and city. An advisor asks for documents only if needed.'
  5. apps/site-1/content/pre-arrival-order.ts line 69: change 'Rogers requires ID to activate a Canadian number. A clear phone photo is fine.' to 'If the provider needs ID to activate your number, an advisor will ask. You can add it here now if you prefer.' (the preview form's required-upload rule at lines 91-98 is a UI preview; flag for the pages auditor).
- **Acceptance criteria:** `git grep -n -E 'photo or PDF|photos or PDFs' apps/site-1/content/landing` returns no hits; /faq 'Do I need a SIN to sign up?' no longer lists documents as required; Terms §7 and the landing checklists agree that nothing is uploaded to order.
- **Risk of fix:** Low. Copy only; the backend order form already matches the catalogue.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-11] Order form offers 'Physical SIM card (we send it to you)' although Canadian Plans ships nothing; eSIM-only vs eSIM-or-SIM copy also conflicts
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/order-forms.ts:27-30, apps/site-1/content/home-redesign.ts:386,440, apps/site-1/content/pre-arrival.ts:47, apps/site-1/content/guides.ts:245, apps/site-1/content/legal-published.ts:110, docs/OPEN_INPUTS.md:18
- **Problem:** SIM_TYPE_OPTIONS (used by the live /order mobile form) labels the physical option 'we send it to you'. The owner decided on 22 Oct 2026 that Canadian Plans ships no SIM cards (the provider does). Separately, the homepage says pre-arrival plans come 'as an eSIM or physical SIM' while /pre-arrival-sim and the student guide say 'All pre-arrival plans are eSIM' / 'eSIM only', and the Terms §7 say 'We confirm with you whether you receive an eSIM by email or a physical SIM.'
- **Impact (plain English):** A mobile customer picking a physical SIM expects a package from Canadian Plans and will chase the wrong party when it does not arrive. Newcomers reading the homepage may order expecting a physical SIM to be posted abroad, which the pre-arrival page says is not offered.
- **Evidence:**
  ```text
  order-forms.ts:29  { value: 'physical', label: 'Physical SIM card (we send it to you)' },
  OPEN_INPUTS.md:18  None at launch: Canadian Plans ships no SIM cards (eSIM, or the provider ships).
  home-redesign.ts:386  'eSIM or physical SIM',
  pre-arrival.ts:47  'All pre-arrival plans are eSIM. Exact prices, no contract.'
  ```
- **Fix steps:**
  1. apps/site-1/content/order-forms.ts line 29: change the label to 'Physical SIM card (the provider sends it to you)'.
  2. apps/site-1/content/home-redesign.ts line 386: change 'eSIM or physical SIM' to 'eSIM, ready before you fly'; line 440: change 'as an eSIM or physical SIM' to 'as an eSIM'.
  3. OWNER APPROVAL (small): confirm whether pre-arrival customers can ever receive a physical SIM. If yes, change pre-arrival.ts line 47 and guides.ts line 245 to 'Pre-arrival plans are eSIM; ask an advisor if you need a physical SIM.' If no, leave them and tighten Terms §7 (legal-published.ts line 110) at the next version bump.
- **Acceptance criteria:** `git grep -n 'we send it to you' apps/site-1/content` returns nothing; homepage pre-arrival column and /pre-arrival-sim picker say the same thing about eSIM.
- **Risk of fix:** Low. Copy only. The SIM_TYPE_OPTIONS `value`s are unchanged so the Zod contract and backend are unaffected.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner to confirm whether pre-arrival plans are strictly eSIM (pre-arrival.ts) or eSIM-or-physical (Terms §7).

### [BUG-12] Live /pre-arrival-sim FAQ shows 5 of 6 answers as 'This answer is awaiting approved content' although the answers exist elsewhere on the site
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/pre-arrival.ts:119-143, apps/site-1/src/app/(pre-arrival)/pre-arrival-sim/page.tsx:38, apps/site-1/content/faq.ts:149,155,181, apps/site-1/content/landing/shared.ts:59-70, apps/site-1/content/landing/students.ts:59
- **Problem:** arrivalCopy.faq.items passes placeholder answers straight to CategoryTemplate as plain FaqItemContent (no `pending` flag, unlike the landing pages and faq.ts), so the main category page's FAQ is almost entirely placeholders. Four of the five questions already have approved answers on other pages: eSIM support (faq.ts:149), unlocked phone (shared.ts:61), order from any country (students.ts:59, from-india.ts:60), when charged (faq.ts:181, mobile-plans.ts:94).
- **Impact (plain English):** The most important sales page tells customers the business cannot answer basic questions about its own product, and sends them to an advisor instead. It also reads as unfinished.
- **Evidence:**
  ```text
  pre-arrival.ts:122  answer: 'This answer is awaiting approved content. Talk to an advisor for current details.',
  (repeated for arrival-faq-2 … arrival-faq-5)
  ```
- **Fix steps:**
  1. apps/site-1/content/pre-arrival.ts: replace the answers as follows. arrival-faq-1 (line 122): 'On an iPhone, go to Settings → General → About and look for “EID” or “Digital SIM”. On Samsung and Android, go to Settings → Connections → SIM manager and look for “Add eSIM”. Not sure? Send us your phone model on WhatsApp.' arrival-faq-2 (line 127): 'Yes. Your phone must be unlocked and support eSIM. If it is locked to another carrier, ask that carrier to unlock it before you order.' arrival-faq-3 (line 132): 'Yes. Order online from any country 1 to 3 weeks before your flight. We confirm on WhatsApp and email your eSIM QR code; it switches on when you land.' arrival-faq-4 (line 137): 'Nothing is paid on this website. Your first bill comes from the carrier once your number is active, and an advisor walks you through the date before anything is billed.'
  2. arrival-faq-5 'Can I switch to a postpaid plan later?' (line 142): if the owner has no answer, delete the item; otherwise use 'Yes. Ask your advisor after your first month and we arrange the change with the carrier.' only once the owner confirms.
  3. Re-run `pnpm --filter site-1 test` (FAQ-related tests in src/lib/faq-content.test.ts are unaffected but confirm).
- **Acceptance criteria:** Open /pre-arrival-sim FAQ: at most one item contains 'awaiting approved content' (or none); each new answer matches the wording on /faq and the landing pages.
- **Risk of fix:** Low. Copy only, reusing text already live.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-13] 'No credit check' / 'no Canadian credit history needed' for postpaid pre-arrival plans is not backed by the catalogue or Terms
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/pre-arrival.ts:40,100-102, apps/site-1/content/landing/students.ts:42,66,107,122, apps/site-1/content/landing/from-india.ts:42,152, apps/site-1/content/home-redesign.ts:329,509, apps/site-1/content/faq.ts:99, apps/site-1/content/about.ts:56-57, packages/adapters/src/static-catalogue/site-1-plans.ts:486-489, apps/site-1/content/legal-published.ts:102-111
- **Problem:** Many pages state that the Fido/Rogers postpaid pre-arrival plans need no credit check or credit history ('Our pre-arrival plans are postpaid but skip that'). The catalogue's eligibility text for these offers mentions only permit type and stay length, the arrivalTerms say nothing about credit, and Terms §7 are silent; only the BYOD mobile plans explicitly state 'An identity and credit check is required'. The claim appears to come from the owner's canadaesim site but is not recorded in OPEN_INPUTS or LAUNCH_PLANS.
- **Impact (plain English):** If the carrier does run a credit check or asks for a deposit on these postpaid plans, newcomers were promised otherwise on the highlight chips of every pre-arrival page. This is a material eligibility representation.
- **Evidence:**
  ```text
  students.ts:107  'Postpaid plans bought in a Canadian store usually need a credit check or a deposit. Our pre-arrival plans are postpaid but skip that: no Canadian credit history and nothing to pay upfront.'
  site-1-plans.ts:486-489  eligibility: input.payType === 'Postpaid' ? 'For people arriving in Canada on a study permit, a work permit or as a permanent resident, staying more than 90 days.' : …
  ```
- **Fix steps:**
  1. OWNER APPROVAL: confirm with the owner (and the canadaesim terms) that no credit check is performed for the pre-arrival Fido/Rogers postpaid plans.
  2. If confirmed: add the sentence 'No Canadian credit history or credit check is needed.' to `arrivalTerms` in packages/adapters/src/static-catalogue/site-1-plans.ts (line 454-458) so the recorded offer snapshot carries the claim, and add the same sentence to Terms §7 in apps/site-1/content/legal-published.ts at the next version bump.
  3. If not confirmed: soften copy to 'No Canadian credit history needed to order' only where true, and remove 'No credit check' from students.ts:42,66, from-india.ts:42,152, pre-arrival.ts:101 ('None needed' row) and home-redesign.ts:329.
- **Acceptance criteria:** The credit-check statement on the pre-arrival pages matches a sentence in the catalogue's arrivalTerms (visible in the /order review step) and in Terms §7.
- **Risk of fix:** Low. Adding to arrivalTerms changes the contractTerms text in new quotes (fine; existing orders keep their snapshot).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner must confirm the carrier's actual process for the pre-arrival postpaid plans; the repo contains no source for the claim.

### [BUG-14] Home-internet order summary renders the literal word 'undefined' in the plan title
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/internet-order.ts:128-135, apps/site-1/content/home-internet.ts:166-190, packages/ui/src/components/canadian-plans/elements.tsx:105, apps/site-1/src/components/internet-order/summary.tsx:22,49, apps/site-1/src/app/(internet-order)/order/home-internet/page.tsx:27,54
- **Problem:** internetOrderSummaryFor builds compactTitle with a template string `${plan.allowance} ${plan.unit}`. `unit` is optional on PlanCardContent and the `internetPlan()` factory never sets it, so the string becomes e.g. 'Home Internet · 1 Gbps undefined'. The JSX `{plan.allowance} {plan.unit}` on summary.tsx:49 renders nothing for undefined, but the compactTitle is printed on page.tsx:54 and summary.tsx:22.
- **Impact (plain English):** Anyone on /order/home-internet sees 'Home Internet · 1 Gbps undefined' in the sticky summary and the order recap.
- **Evidence:**
  ```text
  internet-order.ts:131  compactTitle: `${internetOrderCopy.summary.category} · ${plan.allowance} ${plan.unit}`,
  home-internet.ts:175-190  (returned InternetPlan object has no `unit` property)
  ```
- **Fix steps:**
  1. In apps/site-1/content/internet-order.ts line 131 change to: compactTitle: `${internetOrderCopy.summary.category} · ${plan.allowance}${plan.unit ? ` ${plan.unit}` : ''}`,
  2. Add a unit test (e.g. apps/site-1/src/lib/internet-order-preview.test.ts or a new content test) asserting internetOrderSummaryFor(internetPlansByProvince.BC[1]).compactTitle === 'Home Internet · 1 Gbps'.
- **Acceptance criteria:** Visit /order/home-internet?plan=internet-bc-1000: the summary heading reads 'Home Internet · 1 Gbps' with no 'undefined'; new test passes.
- **Risk of fix:** Low. None.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-15] Site promises WhatsApp confirmation and 'Chat on WhatsApp' buttons everywhere, but no WhatsApp number exists and the buttons open a 'UI preview' dialog
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/contact.ts:35-44,132-139, apps/site-1/src/components/contact/interactive.tsx:76, apps/site-1/content/site-chrome.ts:47, apps/site-1/content/emails.ts:8,22,27, apps/site-1/content/home-internet.ts:109, apps/site-1/content/landing/shared.ts:36,68, apps/site-1/content/system.ts:14,57, apps/site-1/content/faq.ts:50,190, docs/OPEN_INPUTS.md:66
- **Problem:** Dozens of copy strings say an advisor 'will call or WhatsApp you', 'Send us your phone model on WhatsApp', 'Chat on WhatsApp', 'We reply in minutes'. contact.ts records that 'A verified business number is needed before live chat can open', the WhatsApp option on /contact opens a dialog saying no chat was started, and the footer 'WhatsApp' social link just goes to /contact. OPEN_INPUTS records the decision 'Messaging channels: Email only; no SMS or WhatsApp' (9 Sep 2026).
- **Impact (plain English):** Customers who click 'Chat on WhatsApp' get a dialog telling them it is a preview; those who wait for a WhatsApp confirmation after ordering never receive one unless staff do it manually from a personal phone. Trust and conversion suffer on the most prominent CTA on the site.
- **Evidence:**
  ```text
  contact.ts:136-137  whatsapp: 'WhatsApp is a UI preview. A verified business number is needed before live chat can open. No chat or message was started.',
  OPEN_INPUTS.md:66  | — | Messaging channels | Email only; no SMS or WhatsApp | 9 Sep 2026 |
  ```
- **Fix steps:**
  1. OWNER APPROVAL: ask the owner for the WhatsApp Business number (E.164). If supplied, add `whatsappHref: 'https://wa.me/<digits>'` to apps/site-1/content/contact.ts next to `callHref` (line 140) and make the WhatsApp option in apps/site-1/src/components/contact/interactive.tsx open that link instead of the preview dialog; point site-chrome.ts line 47 `social[0].href` at the same URL.
  2. If no number exists yet: in apps/site-1/content/contact.ts change the WhatsApp option (lines 36-44) title to 'Message us', description to 'Use the form below; we reply within one business day.', action 'Send a message', and have the button link to '#message-us' instead of opening the preview; change 'Chat on WhatsApp' labels in system.ts:14 and faq.ts:50 to 'Message an advisor' linking to /contact#message-us; change 'We reply in minutes' (system.ts:57, plan-finder.ts:97) to 'We reply within one business day'.
  3. Either way, replace 'call or WhatsApp you' with 'call or message you' in emails.ts:22,27 and home-internet.ts:109 only if the owner confirms WhatsApp is not used by advisors.
- **Acceptance criteria:** Clicking every 'WhatsApp' control on /, /contact, /faq and the 404 page either opens a real wa.me link or a working message form; no dialog says 'UI preview'.
- **Risk of fix:** Medium. Touches CTAs across many pages; contact/interactive.tsx has tests (contact-preview) that may assert the preview dialog.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner must say whether a WhatsApp Business number exists; OPEN_INPUTS says no WhatsApp channel.

### [BUG-16] Three pre-arrival landing pages advertise home internet 'from $55/mo', a price that exists in no catalogue province
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/src/app/(landing-arrival)/pre-arrival-sim/students/page.tsx:28, apps/site-1/src/app/(landing-arrival)/pre-arrival-sim/from-india/page.tsx:28, apps/site-1/src/app/(landing-arrival)/pre-arrival-sim/toronto-pearson/page.tsx:28
- **Problem:** The promo strip string is hard-coded in each page as 'Moving in? Add home internet from $55/mo.'. The static catalogue's lowest internet price is $50 (Saskatchewan), BC/AB start at $70 and MB at $90. The canonical copy for this promo already exists in apps/site-1/content/pre-arrival.ts:412 (`arrivalChrome.promo = 'Moving in? Add home internet from $50/mo.'`) and the /home-internet hero says 'From $50/mo' (content/home-internet.ts:29), so the three landing pages contradict the rest of the site.
- **Impact (plain English):** Visitors on the student, India and Toronto Pearson landing pages see a 'from $55' internet price that is neither the cheapest real price ($50) nor achievable in most provinces ($70+). This is a false price claim in advertising and causes confusion when they click through to the real prices.
- **Evidence:**
  ```text
  students/page.tsx:28: `content={siteChromeWithPromo('Moving in? Add home internet from $55/mo.', {` — content/pre-arrival.ts:412: `promo: 'Moving in? Add home internet from $50/mo.',`
  ```
- **Fix steps:**
  1. In each of the three page files, add `import { arrivalChrome } from '@content/pre-arrival';` and replace the literal `'Moving in? Add home internet from $55/mo.'` with `arrivalChrome.promo` so the price has one source.
  2. Run `git grep -n '\$55' apps/site-1` and confirm no results remain.
- **Acceptance criteria:** `git grep -n '\$55' apps/site-1` returns nothing; loading /pre-arrival-sim/students shows the promo strip 'Moving in? Add home internet from $50/mo.'; `pnpm --filter site-1 typecheck` passes.
- **Risk of fix:** Low. Copy-only change; the promo link target (/home-internet) is unchanged.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-17] /home-internet promo strip link 'Check my address' points to #address-check, an id that does not exist on the page
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/site-1/content/home-internet.ts:536, apps/site-1/src/app/(home-internet)/home-internet/page.tsx:34
- **Problem:** `internetChrome.promoLink` is `{ label: 'Check my address', href: '#address-check' }` and the page passes it straight to the header (`promoLink: internetChrome.promoLink`). No element in apps/site-1/src or packages/ui/src has `id="address-check"` (`git grep` for `address-check` finds only this content line); the plans section on the page is `id="internet-plans"` (page.tsx:60) and the header's own plan CTA already uses `planHref="#internet-plans"` (page.tsx:30).
- **Impact (plain English):** On the Home Internet page, clicking the headline promo link does nothing (the browser cannot find the anchor), so a visitor who wants to see plans/availability from the banner is stuck.
- **Evidence:**
  ```text
  content/home-internet.ts:536: `promoLink: { label: 'Check my address', href: '#address-check' },` — page.tsx:60: `<section id="internet-plans" className="cp-internet-plans cp-internet-section">`
  ```
- **Fix steps:**
  1. In apps/site-1/content/home-internet.ts line 536 change `href: '#address-check'` to `href: '#internet-plans'`.
- **Acceptance criteria:** On /home-internet, clicking the promo strip link scrolls to the province plan cards; `document.querySelector('a[href="#address-check"]')` returns null in the rendered page.
- **Risk of fix:** Low. Content-only; no other file references #address-check.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-01] Admin order-processing UI (list, detail, transitions, dispatch, activate) has no browser test; only jsdom component tests with the API client mocked
- **Severity:** 🟡 Medium
- **Category:** Code quality
- **Location:** apps/admin/e2e/shell.spec.ts:1-60, apps/admin/e2e/README.md:7-23, apps/admin/src/components/orders/order-detail.test.tsx:37-55, apps/admin/src/components/orders/orders-list.test.tsx:26-33, apps/site-1/e2e/a2-launch-gates.spec.ts:146-233
- **Problem:** The only admin Playwright spec (shell.spec.ts) checks five public routes, the 404 page and that an unauthenticated visit to /w/site-1/orders does not render the shell. Every authenticated admin screen is covered solely by Vitest/jsdom component tests that `vi.mock('../../lib/api', ...)` and `vi.mock('../staff-session-provider', ...)`, i.e. the real admin HTTP client, Next.js routing, session provider and the real backend are never exercised together in a browser. The A2 e2e spec covers the staff API directly with fetch (a2-launch-gates.spec.ts:146-233), not through the admin UI. The README acknowledges the gap and defers it to a staging run that does not yet exist. The backend e2e harness already has a stub staff-session verifier that admits a fixed bearer (harness.ts:381-392), so the missing piece is only on the admin side: the admin reads the Supabase session in the browser and has no injectable seam for a harness token.
- **Impact (plain English):** A regression in how the admin pages call the backend (wrong URL, wrong header, broken optimistic-version handling, a button that no longer sends the transition) would not be caught by any automated test; staff would discover it when processing a real order. The business rules themselves are protected on the backend, so the risk is a broken admin workflow rather than wrong data.
- **Evidence:**
  ```text
  shell.spec.ts:27  test('an unconfigured or unauthenticated deployment never renders a workspace shell', ...)
  order-detail.test.tsx:37  vi.mock('../../lib/api', () => ({ ... }))
  README.md:18 'A live Playwright journey is blocked in CI ... it needs a real Supabase Auth staff session'
  ```
- **Fix steps:**
  1. OWNER APPROVAL: this is a new test harness seam, roughly one to two days of work. Add an env-gated e2e session seam to the admin (e.g. when `NEXT_PUBLIC_E2E_STAFF_BEARER` is set at build time AND the host is 127.0.0.1, `apps/admin/src/components/staff-session-provider.tsx` returns a session whose access token is that bearer instead of calling Supabase; the seam must be compiled out when the variable is absent so it can never exist in a production build).
  2. Extend apps/admin/playwright.config.ts with a second webServer entry that starts `apps/backend/tests/e2e/harness.ts` (same command/env as apps/site-1/playwright.config.ts:52-81) and point the admin `next start` at it via the admin backend URL env var, passing `E2E_STAFF_BEARER` to both.
  3. Add apps/admin/e2e/orders.spec.ts that: resets the harness (`POST /__e2e__/reset`), creates an order through the harness's website API or by reusing the site-1 order journey helpers, opens /w/<workspace-slug>/orders, asserts the order row is listed, opens its detail, clicks 'Start processing' (in_progress), asserts the status badge updates and that a second tab with a stale version shows the version-conflict reload prompt.
  4. Add `pnpm --filter admin build` with the e2e env in .github/workflows/ci.yml before the admin Playwright step (line 83) so the seam is compiled in for CI only.
  5. Keep the existing jsdom component tests; they remain the fast feedback layer.
- **Acceptance criteria:** `pnpm --filter admin exec playwright test e2e/orders.spec.ts` passes in CI against the harness and fails if, e.g., the transition PATCH body's `expectedVersion` is removed from apps/admin/src/lib/api.ts. A production build (`pnpm --filter admin build` without NEXT_PUBLIC_E2E_STAFF_BEARER) must not contain the string 'E2E_STAFF' in .next/static (grep).
- **Risk of fix:** High. Adds a test-only auth seam to the admin bundle; it must be compile-time gated so it cannot leak into production. Increases CI time by a few minutes. No runtime behaviour change for real users if gated correctly.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-02] QUOTE_WITHDRAWAL_POLICY still documented as TEST-only / must-not-set in production although it is required and set live
- **Severity:** 🟡 Medium
- **Category:** Code quality
- **Location:** docs/ENV.md:47, docs/RUNBOOKS/catalogue-sync.md:29, docs/MIGRATION/RAILWAY_BACKEND.md:332-336, apps/backend/src/catalogue/policy.ts:4-8, docs/LAUNCH_CHECKLIST.md:262-265, docs/OPEN_INPUTS.md:23
- **Problem:** ENV.md says `QUOTE_WITHDRAWAL_POLICY` 'is a TEST policy only while OPEN_INPUTS #14 is unresolved ... do not set it in production until the owner records the decision'. catalogue-sync.md calls it 'the TEST-only QUOTE_WITHDRAWAL_POLICY'. RAILWAY_BACKEND.md section 10 lists `QUOTE_WITHDRAWAL_POLICY` and `ORDER_OPERATIONAL_TRANSITIONS` under 'Must NOT be set on this service'. OPEN_INPUTS #14 was resolved on 21 Sep 2026 (`honour_until_expiry`) and LAUNCH_CHECKLIST 3.3 records the value set on Railway; `ORDER_OPERATIONAL_TRANSITIONS=1` was set on 22 Oct (7.4). Code: `loadQuoteWithdrawalPolicy` returns `'unresolved'` for any value other than the two policies, and the API docs/runbooks confirm `unresolved` returns `503 priced_checkout_disabled` on quotes and orders.
- **Impact (plain English):** An owner or future AI agent cleaning up Railway variables against ENV.md or the migration plan would remove the variable, and the storefront would stop issuing quotes and taking orders (every checkout returns 'priced checkout disabled') with no code change to point at. Removing `ORDER_OPERATIONAL_TRANSITIONS` on the same advice would stop Dispatch/Activate in admin.
- **Evidence:**
  ```text
  docs/ENV.md:47: 'This is a **TEST policy only** while OPEN_INPUTS #14 is unresolved. ... do not set it in production until the owner records the decision.' apps/backend/src/catalogue/policy.ts:7: `return value === 'immediate' || value === 'honour_until_expiry' ? value : 'unresolved';` docs/MIGRATION/RAILWAY_BACKEND.md:332-334: '**Must NOT be set on this service:** `OUTBOX_ADAPTERS` ..., `ORDER_OPERATIONAL_TRANSITIONS`, `QUOTE_WITHDRAWAL_POLICY` (until OPEN_INPUTS #14 is resolved)'.
  ```
- **Fix steps:**
  1. docs/ENV.md line 47: rewrite the bullet to: '`QUOTE_WITHDRAWAL_POLICY` — `immediate` or `honour_until_expiry`. OPEN_INPUTS #14 resolved this to `honour_until_expiry` on 21 Sep 2026 and it is set on the production backend; it is required for priced checkout. Unset/unknown becomes `unresolved` and every quote/order returns `503 priced_checkout_disabled`.'
  2. docs/RUNBOOKS/catalogue-sync.md line 29: delete the words 'the TEST-only' before `QUOTE_WITHDRAWAL_POLICY`.
  3. docs/MIGRATION/RAILWAY_BACKEND.md lines 332-336: remove `QUOTE_WITHDRAWAL_POLICY` and `ORDER_OPERATIONAL_TRANSITIONS` from the 'Must NOT be set' list and add both to the section 10 table with values `honour_until_expiry` and `1`, each with the note 'required in production; see docs/ENV.md'.
- **Acceptance criteria:** `git grep -n -i 'TEST.only' -- docs/ENV.md docs/RUNBOOKS/catalogue-sync.md` no longer matches on the QUOTE_WITHDRAWAL_POLICY lines, and `grep -n 'Must NOT be set' -A4 docs/MIGRATION/RAILWAY_BACKEND.md` does not list QUOTE_WITHDRAWAL_POLICY or ORDER_OPERATIONAL_TRANSITIONS.
- **Risk of fix:** Low. Documentation only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-03] PLATFORM_CONTEXT.md (declared single source of truth) still states SES as the email provider and Sanity as the catalogue source
- **Severity:** 🟡 Medium
- **Category:** Code quality
- **Location:** PLATFORM_CONTEXT.md:13, PLATFORM_CONTEXT.md:25, PLATFORM_CONTEXT.md:39, PLATFORM_CONTEXT.md:42-43, PLATFORM_CONTEXT.md:127, PLATFORM_CONTEXT.md:167, apps/backend/src/jobs/providers.ts:96-110, apps/backend/src/catalogue/provider-resolver.ts:11-50, docs/ENV.md:144-160, docs/OPEN_INPUTS.md:32
- **Problem:** PLATFORM_CONTEXT.md tells every AI session to read it in full and stop if work conflicts with it, but several operational claims are stale: line 43 'Email: EmailAdapter; Amazon SES preferred candidate ... Resend is an alternative' and line 127 repeat SES, while OPEN_INPUTS #23 (21 Sep 2026) selected Resend, ENV.md:164 says `resend` is the live default and providers.ts treats `resend` as the production provider. Lines 25, 42 and 167 describe site-1's catalogue as 'its own Sanity' / 'One Sanity project per site' and never mention the repo catalogue (ADR 0005, `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID`, `packages/adapters/src/static-catalogue/site-1-plans.ts`) that production actually uses while Sanity is deferred (LAUNCH_CHECKLIST 'Decisions recorded 20 Oct'). Line 13 says 'roughly 5–6 staff at launch' while LAUNCH_CHECKLIST 4.4 records owner-only at launch. Line 39 says Supabase 'Canada region' while line 113 of the same file says the database is `us-west-2`.
- **Impact (plain English):** A future AI session following this file as instructed could wire SES, look for prices in Sanity, or plan for staff accounts that do not exist. For the owner it misstates where prices live and which provider sends customer email, which matters when something breaks.
- **Evidence:**
  ```text
  PLATFORM_CONTEXT.md:43: '| Email | **EmailAdapter; Amazon SES preferred candidate** | ... Resend is an alternative if SES is unsuitable'. apps/backend/src/jobs/providers.ts:98-99: '`resend` is the current production provider (OPEN_INPUTS #23: Resend selected for launch)'. apps/backend/src/catalogue/provider-resolver.ts:11: '/** The one workspace that reads its plans from the repo catalogue (ADR 0005). */'.
  ```
- **Fix steps:**
  1. PLATFORM_CONTEXT.md line 43: change the Email row to '| Email | **Resend** via `EmailAdapter` (`EMAIL_PROVIDER=resend`, OPEN_INPUTS #23, 21 Sep 2026) | Sender `orders@canadianplans.com`, replies to `info@canadianplans.com`. AWS SES adapter kept wired but deferred. |'. Line 127: replace the SES sentence with 'Resend is the launch email provider (OPEN_INPUTS #23).'
  2. PLATFORM_CONTEXT.md line 42 (CMS row): append 'Sanity is deferred for launch (20 Oct 2026); site-1 prices and plans come from the repo catalogue `packages/adapters/src/static-catalogue/site-1-plans.ts`, published by the backend catalogue sync for the workspace named by `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID` (ADR 0005). A Sanity registry entry wins when added later.' Make the same one-line note on lines 25 and 167.
  3. PLATFORM_CONTEXT.md line 13: change 'roughly 5–6 staff at launch working in functional areas' to 'owner-only at launch (22 Oct 2026); roles for orders, partners, finance and content exist for later staff'.
  4. PLATFORM_CONTEXT.md line 39: change 'Canada region' to '`us-west-2` (ADR 0004; moving to `ca-central-1` remains open)'.
- **Acceptance criteria:** `grep -n -E 'SES preferred|preferred email candidate|Canada region|5–6 staff' PLATFORM_CONTEXT.md` returns nothing, and `grep -n 'ADR 0005' PLATFORM_CONTEXT.md` returns at least one line.
- **Risk of fix:** Low. Documentation only. Keep the §4 invariants untouched.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-04] Catalogue runbooks and API.md describe Sanity as the only way to change a plan or price; the live source is the repo catalogue
- **Severity:** 🟡 Medium
- **Category:** Code quality
- **Location:** docs/RUNBOOKS/catalogue-sync.md:3-4, docs/RUNBOOKS/catalogue-sync.md:63-67, docs/RUNBOOKS/cms-publishing-and-price-error.md:10-20, docs/API.md:431, docs/RUNBOOKS/README.md:15, apps/backend/src/catalogue/provider-resolver.ts:26-50, docs/ENV.md:144-153
- **Problem:** The runbook index routes 'CMS publishing and price-error handling' to cms-publishing-and-price-error.md, whose 'Normal publishing flow' step 1 is 'Edit the offer/product content in Sanity Studio and Publish', and whose required access is 'Sanity project access'. catalogue-sync.md lists the Sanity project as required access and says 'If Sanity cannot be read ...'. API.md:431 says 'Catalogue editing remains in Sanity.' In production there is no Sanity registry entry (LAUNCH_CHECKLIST 'Decisions recorded 20 Oct', 'Sanity is deferred'); `catalogueProviderResolver` serves site-1 from `site1CommercialOffers` in `packages/adapters/src/static-catalogue/site-1-plans.ts` when `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID` matches. `git grep -i -E 'static.catalogue|ADR 0005|site-1-plans|repo catalogue' -- docs/RUNBOOKS` returns nothing: no runbook explains that a price change is a code edit, backend deploy, and a sync within 300 s, or how to verify it in `/w/<workspace>/settings/catalogue`.
- **Impact (plain English):** When a price is wrong on the live site, the owner or on-call AI following the runbooks will try to fix it in Sanity, which is not connected; nothing changes and customers keep seeing the wrong price. Only ENV.md mentions the real mechanism, and it is not where someone handling a price error looks.
- **Evidence:**
  ```text
  docs/RUNBOOKS/cms-publishing-and-price-error.md:20: '1. Edit the offer/product content in Sanity Studio and **Publish**.' apps/backend/src/catalogue/provider-resolver.ts:41-43: `const fromRepo: CatalogueProvider = { account: 'static-catalogue', catalogue: new StaticCatalogue(site1CommercialOffers, { allowOpenInputs }), ...`. docs/API.md:431: 'Catalogue editing remains in Sanity.'
  ```
- **Fix steps:**
  1. docs/RUNBOOKS/catalogue-sync.md: add a section '## Price or plan change while Sanity is deferred (ADR 0005)' after 'Safe manual invocation' saying: edit `packages/adapters/src/static-catalogue/site-1-plans.ts`, run `pnpm --filter @canadian-plans/adapters test` (the static-catalogue test validates the offers), open a PR, merge to `main`, confirm the Railway backend deployed the new commit, wait for the next 300-second sync (or POST `/api/internal/catalogue/sync` as already documented), then verify in `/w/<workspace>/settings/catalogue` that the product points at a new offer version and `GET /api/v1/website/offers` returns the new price. State that Sanity edits have no effect until a Sanity entry exists in `MACHINE_REGISTRY_JSON`. Change line 3 'Required access: ... Sanity project' to 'Sanity project (only when a Sanity registry entry exists)'.
  2. docs/RUNBOOKS/cms-publishing-and-price-error.md: add a note at the top of 'Normal publishing flow': 'Production site-1 currently uses the repo catalogue, not Sanity — follow catalogue-sync.md "Price or plan change while Sanity is deferred" instead of steps 1-2.'
  3. docs/API.md line 431: change 'Catalogue editing remains in Sanity.' to 'Catalogue editing is in the repo catalogue (ADR 0005) while Sanity is deferred, or in Sanity once a registry entry exists.'
  4. docs/RUNBOOKS/README.md line 15: append '(production uses the repo catalogue, ADR 0005)' to the CMS publishing row.
- **Acceptance criteria:** `git grep -n -i -E 'site-1-plans|ADR 0005' -- docs/RUNBOOKS/catalogue-sync.md docs/RUNBOOKS/cms-publishing-and-price-error.md docs/API.md` returns at least one line in each file, and a reader of cms-publishing-and-price-error.md is redirected before being told to edit Sanity.
- **Risk of fix:** Low. Documentation only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-04] Synthetic seed can overwrite the production site-1 workspace; the only guard is NODE_ENV
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** packages/db/src/seed.ts:208-216, packages/db/src/seed.ts:45-52, packages/db/src/seed.ts:117-125, packages/db/src/seed.ts:130-194
- **Problem:** `pnpm --filter @canadian-plans/db db:seed` runs `seedDatabase()` against `MIGRATION_DATABASE_URL` (the privileged production migration URL in deploy/CI environments) and refuses only when `NODE_ENV === 'production'`. NODE_ENV is typically unset in a developer shell and in ad-hoc CI steps. Production was provisioned from this exact seed: the live site-1 workspace has the seed id `10000000-0000-4000-8000-000000000101` (docs/ENV.md:152, docs/CHECKPOINT.md:93) and docs/LAUNCH_CHECKLIST.md:64/275 records that its DB name had to be renamed from the seed value "Northern Arrival Mobile" to "Canadian Plans". Re-running the seed would `on conflict (id) do update set slug, name` (seed.ts:50-51) and rename the live workspace back, upsert three synthetic partners including an `approved` one with referral code `MAPLE10` (seed.ts:117-125, `do update ... status = excluded.status`), re-create the `demo-2` workspace, and insert TEST products/offer versions (`starter-5gb`, `unlimited-plus`) into the production catalogue tables.
- **Impact (plain English):** One mistaken command by the owner or an AI agent with the production migration URL in its environment silently renames the live workspace, makes a fake referral code (MAPLE10) valid on the public site so real orders get attributed and commission lines earned for a non-existent partner, and plants TEST plans in the production catalogue. Nothing warns, and the audit trail does not record it.
- **Evidence:**
  ```text
  seed.ts:209 `if (process.env.NODE_ENV === 'production') { throw ... }` is the sole guard; seed.ts:50-51 `on conflict (id) do update set slug = excluded.slug, name = excluded.name`; seed.ts:123-124 `on conflict (id) do update set name = ..., referral_code = ..., status = excluded.status`.
  ```
- **Fix steps:**
  1. In packages/db/src/seed.ts CLI block (lines 208-216), after the NODE_ENV check add: require `process.env.DB_SEED_ALLOW_SYNTHETIC === '1'`, otherwise throw `new Error('Set DB_SEED_ALLOW_SYNTHETIC=1 to run the synthetic seed; it must never target a hosted Supabase database.')`.
  2. In the same block, parse `new URL(connectionString).hostname` and throw if it ends with `supabase.co` or `supabase.com` (covers both direct and pooler hosts) unless the database name (pathname without leading slash) ends with `_test` or `_dev`.
  3. Document the new flag and the hostname refusal in packages/db/README.md:31 and docs/ENV.md.
  4. Also update packages/db/src/seed.ts:48 to leave the live workspace name alone on conflict: change the workspaces upsert to `on conflict (id) do nothing` (the integration tests at packages/db/tests/rls.integration.test.ts:304-322 run on an empty database, so their expectations still hold).
- **Acceptance criteria:** Running `pnpm --filter @canadian-plans/db db:seed` with `MIGRATION_DATABASE_URL` pointing at any host ending in supabase.com/supabase.co exits non-zero with the refusal message before opening a connection; running it against the local disposable `_test` database with `DB_SEED_ALLOW_SYNTHETIC=1` still seeds and `rls.integration.test.ts` passes.
- **Risk of fix:** Low. CI's integration workflow must export `DB_SEED_ALLOW_SYNTHETIC=1` wherever it calls `seedDatabase` via the CLI (the test files call `seedDatabase()` directly, bypassing the CLI guard, so they are unaffected).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-06] Typed client turns non-JSON or timed-out backend responses into SyntaxError/TimeoutError instead of BackendError
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** packages/contracts/src/client.ts:469-490, packages/contracts/src/client.ts:205-215, apps/backend/src/app.ts:108-158
- **Problem:** `call()` does `const payload: unknown = await response.json()` (line 478) before looking at `response.ok` or the content-type. Any response whose body is not JSON therefore throws a raw `SyntaxError` from the JSON parser, not the documented `BackendError` ("Thrown for any non-2xx response", line 205). Non-JSON responses are realistic: the Express app in apps/backend/src/app.ts registers no catch-all JSON 404 handler after its routers (lines 108-158; `createInvalidBodyError` is an error handler only), so a path the deployed backend does not know returns Express's default `text/html` "Cannot GET/POST ..." page; Railway/Vercel edges return HTML or empty bodies for 502/503/504; an empty 2xx body makes `response.json()` throw as well. Likewise `AbortSignal.timeout(timeoutMs)` (line 475) rejects with a DOMException named `TimeoutError`, which is also not a `BackendError`. Every consumer branches on `error instanceof BackendError` (e.g. apps/site-1/src/app/(storefront)/order/actions.ts:499, apps/admin/src/components/orders/orders-list.tsx:168), so the HTTP status and request id are lost and the failure collapses into a generic message.
- **Impact (plain English):** When the storefront or admin talks to a backend that is behind (exactly the current situation: Railway is still running an older commit) or to a gateway error page, the customer sees a generic 'try again' message with no request id for support to look up, and the admin sees 'Reason: internal_error' even for a plain 404. Support cannot trace these failures, and retries are suggested for conditions that will never succeed.
- **Evidence:**
  ```text
  client.ts:478 `const payload: unknown = await response.json();` then line 479 `if (!response.ok) {`; client.ts:475 `signal: config.signal ?? AbortSignal.timeout(timeoutMs)`; app.ts:157-158 ends with `app.use(createInvalidBodyError(errorTracker)); return app;` with no `app.use((req, res) => ...)` 404 fallback.
  ```
- **Fix steps:**
  1. In packages/contracts/src/client.ts, inside `createBackendClient` -> `call()`, hoist the generated request id into a variable before building headers: `const requestIdHeader = globalThis.crypto.randomUUID();` and use it in the `new Headers({ ... 'x-request-id': requestIdHeader })` literal (line 453).
  2. Wrap the `doFetch(...)` call (lines 469-476) in try/catch; in the catch, `throw new BackendError('internal_error', 0, requestIdHeader)` (optionally pass the original error as `{ cause }` by extending the BackendError constructor to call `super(code, { cause })`). This covers `TimeoutError`/`AbortError`/network failures.
  3. Replace line 478 with: `const text = await response.text(); let payload: unknown; try { payload = text.length === 0 ? undefined : JSON.parse(text); } catch { payload = undefined; }`.
  4. In the `!response.ok` branch keep `apiErrorResponseSchema.safeParse(payload)`; the existing fallback `throw new BackendError('internal_error', response.status, 'unavailable')` should use `requestIdHeader` instead of the literal 'unavailable'.
  5. After the `!response.ok` block add: `if (payload === undefined) throw new BackendError('internal_error', response.status, requestIdHeader);` before `return config.responseSchema.parse(payload);`.
  6. Add tests in packages/contracts/src/client.test.ts (see acceptance).
- **Acceptance criteria:** Add three tests to packages/contracts/src/client.test.ts: (a) a fetch stub returning `new Response('<html>Cannot GET /api/v1/health</html>', { status: 404, headers: { 'content-type': 'text/html' } })` makes `client.health()` reject with a `BackendError` whose `status` is 404 and `code` is 'internal_error'; (b) a stub returning `new Response('', { status: 502 })` rejects with a `BackendError` with status 502; (c) a stub that never resolves, with `timeoutMs: 10`, rejects with a `BackendError` (not a DOMException). `pnpm --filter @canadian-plans/contracts test` passes.
- **Risk of fix:** Low. Only the error path changes; successful JSON responses are parsed identically. Consumers that specifically caught DOMException timeouts (none found via git grep for TimeoutError/AbortError in apps/) would need updating. A `status` of 0 for transport failures is a new convention that should be documented in the BackendError JSDoc.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-07] Website route failures (except /orders) are swallowed: no log line, no Sentry event, so a database outage on lead/quote/tracking paths is invisible
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/routes/website.ts:193-195, apps/backend/src/routes/website.ts:385-387, apps/backend/src/routes/website.ts:419-421, apps/backend/src/routes/website.ts:456-458, apps/backend/src/routes/website.ts:509-511, apps/backend/src/routes/website.ts:545-547, apps/backend/src/routes/website.ts:619-621, apps/backend/src/routes/website.ts:685-687, apps/backend/src/routes/website.ts:741-743, apps/backend/src/routes/website.ts:823-825, apps/backend/src/routes/website.ts:887-889, apps/backend/src/routes/website.ts:929-931
- **Problem:** Only the `/orders` handler (lines 296-322) classifies the thrown error with `isConnectionLevelError` and emits a scrubbed `logRequestError` record. Every other website handler uses a bare `catch { sendDomainError(res, req.id, 'internal_error', 500); }` (or, for /tracking/otp, an empty catch). Because the error never reaches `next(error)`, the app-level `createInvalidBodyError` tracker in app.ts is never invoked either. A connection failure, RLS denial, Zod parse failure on a stored row (`leadContactSchema.parse` in leads/store.ts:216, `leadFormSchema.parse` line 222) or any logic bug produces a 500 with zero diagnostics, and connection-level failures are reported as non-retryable `internal_error` instead of the retryable 503 the orders route returns.
- **Impact (plain English):** If lead saving, quoting, uploads or tracking start failing for customers, the owner's Sentry and Railway logs will show nothing: the only evidence will be customers reporting 'An internal error occurred'. Diagnosing the cause would require reproducing it by hand.
- **Evidence:**
  ```text
  website.ts:419-421 `} catch {\n        sendDomainError(res, req.id, 'internal_error', 500);\n      }` repeated for every handler; contrast website.ts:302-321 which calls `logRequestError({ requestId: req.id, workspaceId, route: '/api/v1/orders', code: ..., flag: ... })`.
  ```
- **Fix steps:**
  1. In apps/backend/src/routes/website.ts add a small helper near `requireDraftGrant` (line 328): `function failRequest(req: Request, res: Response, route: string, error: unknown): void { const workspaceId = req.websiteContext?.workspaceId; if (isConnectionLevelError(error)) { logRequestError({ requestId: req.id, workspaceId, route, code: 'persistence_unavailable', flag: 'retryable' }); res.setHeader('retry-after', '2'); sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true }); return; } logRequestError({ requestId: req.id, workspaceId, route, code: 'internal_error', flag: 'not_retryable' }); sendDomainError(res, req.id, 'internal_error', 500); }` (import `Response` from express alongside `Request` on line 2).
  2. Replace each bare `catch { sendDomainError(res, req.id, 'internal_error', 500); }` listed in the location field with `catch (error) { failRequest(req, res, '<route literal>', error); }` using route literals such as '/api/v1/quotes', '/api/v1/website/offers', '/api/v1/website/leads', '/api/v1/website/leads/:leadId', '/api/v1/website/region-waitlist', '/api/v1/website/uploads/intents', '/api/v1/website/uploads/:uploadId/finalize', '/api/v1/website/files/:fileId/download-link', '/api/v1/website/tracking/verify', '/api/v1/website/tracking' (literals must match `IDENTIFIER_PATTERN` in http/logger.ts: letters, digits, `_./:-`).
  3. For `/tracking/otp` (lines 823-825) keep the neutral 200 response but replace the empty catch with `catch (error) { logRequestError({ requestId: req.id, workspaceId: req.websiteContext?.workspaceId, route: '/api/v1/website/tracking/otp', code: isConnectionLevelError(error) ? 'persistence_unavailable' : 'internal_error', flag: 'not_retryable' }); }`.
  4. Optionally reuse `failRequest` in the `/orders` catch (lines 296-322) to remove the duplicate.
  5. Add a test: build the app with a `leads.store.createLead` that throws `Object.assign(new Error('x'), { code: 'ECONNREFUSED' })`, spy on `console.error`, POST /api/v1/website/leads, expect 503 with `retry-after: 2` and one console.error call whose JSON has `event: 'request_error'` and `code: 'persistence_unavailable'`.
- **Acceptance criteria:** New test passes; `git grep -n "catch {" -- apps/backend/src/routes/website.ts` returns no matches.
- **Risk of fix:** Low. Connection failures on non-order routes change from 500 to 503+retryable; site-1 already handles 503 from the orders route. Log records are scrubbed by `logRequestError` so no PII can be introduced.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-08] A Turnstile outage or missing TURNSTILE_* configuration blocks every customer write with a misleading 403 and no log or startup warning
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/website/session.ts:72-81, apps/backend/src/website/turnstile.ts:19-24, apps/backend/src/website/turnstile.ts:41-44, apps/backend/src/routes/website.ts:80-93, apps/backend/src/http/website-errors.ts:10
- **Problem:** `createTurnstileVerifier` returns false (correctly, fail-closed) when `TURNSTILE_SECRET_KEY` is unset, `TURNSTILE_HOSTNAMES` is empty or contains an uppercase/invalid host, the action is missing, Cloudflare is unreachable, or the response is malformed — and swallows every exception silently. `requireHumanProof` likewise swallows exceptions and answers `caller_forbidden` 403, whose message is 'This endpoint is not available to a website credential.' Nothing is logged and nothing is validated at boot (`server.ts` only validates the scheduler). The orchestrator's `createDefaultWebsiteRouteDependencies` builds verifiers eagerly but never warns when the configuration makes them permanently deny.
- **Impact (plain English):** If the owner forgets or mistypes the Turnstile variables on a redeploy, or Cloudflare has an incident, every lead save, quote, order, upload and tracking request fails with an error that blames the website credential, and there is no log line to tell the owner why. Given the live backend is already waiting on a manual redeploy, a mis-set variable at that moment would silently take checkout down.
- **Evidence:**
  ```text
  session.ts:73-77 `try { admitted = await deps.botCheck(req, action); } catch { /* fail closed */ }` ; turnstile.ts:20 `if (!config.secret || !configuredHosts || !config.action || !token || token.length > 2048) { return false; }` ; turnstile.ts:41-44 `} catch { // Neither the token, provider response nor exception belongs in logs. return false; }` ; website-errors.ts:10 `caller_forbidden: 'This endpoint is not available to a website credential.'`.
  ```
- **Fix steps:**
  1. In apps/backend/src/website/session.ts `requireHumanProof`: import `logRequestError` from '../http/logger.js'; in the catch (line 75-77) call `logRequestError({ requestId: req.id, route: \`website:${action}\`, code: 'bot_check_error', flag: 'not_retryable' });` and after `if (!admitted)` (line 78) call `logRequestError({ requestId: req.id, route: \`website:${action}\`, code: 'bot_check_denied', flag: 'not_retryable' });` before sending the 403 (no token or body is passed, so invariant 12 holds).
  2. In apps/backend/src/website/turnstile.ts, add an optional `onFailure?: (code: 'unconfigured' | 'provider_unreachable' | 'provider_rejected') => void` to the config object and invoke it at line 20 ('unconfigured'), line 33 and the catch at line 41 ('provider_unreachable'), and when `result.success` is false or hostname/action mismatch ('provider_rejected'). Keep returning false.
  3. In apps/backend/src/routes/website.ts `createDefaultWebsiteRouteDependencies` (lines 80-93): compute `secret` and `hostnames` once; if `!secret || hostnames.length === 0` call `logRequestError({ requestId: 'startup', route: 'website:turnstile', code: 'bot_check_unconfigured', flag: 'not_retryable' })` once; pass `onFailure: (code) => logRequestError({ requestId: 'turnstile', route: \`website:${action}\`, code: \`bot_check_${code}\`, flag: 'not_retryable' })` to each verifier.
  4. Add to apps/backend/tests/turnstile.test.ts a case asserting `onFailure` is called with 'unconfigured' when the secret is missing and with 'provider_unreachable' when fetch rejects.
- **Acceptance criteria:** `pnpm --filter backend test -- turnstile website-auth` passes; starting the backend locally with TURNSTILE_SECRET_KEY unset prints one JSON line containing `"code":"bot_check_unconfigured"`; a failed bot check prints `request_error` with `bot_check_denied`.
- **Risk of fix:** Low. Logging only; no behavioural change for customers. Keep log codes within `ERROR_CODE_PATTERN` (lowercase, underscore).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-11] Umami server-side events are sent with Node's default User-Agent and may be silently discarded by Umami's bot filter
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** packages/adapters/src/analytics.ts:91-99, apps/backend/src/jobs/providers.ts:80-84
- **Problem:** UmamiAnalyticsSink.capture() POSTs `{type:'event', payload:{website,url:'/',name,data:{subjectId}}}` to the collect endpoint with only `content-type` and `accept` headers. Umami's `/api/send` handler runs an `isbot(user-agent)` check (unless the self-hosted `DISABLE_BOT_CHECK` env is set) and answers 200 'ok' without recording when the agent looks automated. Node's fetch sends `user-agent: node`. The sink treats any 2xx as `{status:'delivered'}`, so a filtered event is marked delivered in the outbox and never retried. This would make the REQ 35 'counted exactly once' conversion events read as zero in Umami.
- **Impact (plain English):** The owner's conversion dashboard (lead saved, order submitted) could show nothing even though orders are flowing, and the outbox would report every analytics job as successfully delivered, so nobody would notice.
- **Evidence:**
  ```text
  analytics.ts:93 `headers: { 'content-type': 'application/json', accept: 'application/json' }`; analytics.ts:98-99 `if (!response.ok) return {status:'uncertain'...}; return { status: 'delivered', providerId: ... }` — a 200 'ok' from the bot filter is indistinguishable from a recorded event.
  ```
- **Fix steps:**
  1. First verify (see verificationNote). If events are missing: in packages/adapters/src/analytics.ts, UmamiAnalyticsSink.capture(), add a `'user-agent'` header set from a new optional `userAgent?: string` option (default `'Mozilla/5.0 (compatible; CanadianPlansServer/1.0)'` — avoid the words 'bot', 'crawler', 'spider' and any URL, which isbot matches).
  2. In apps/backend/src/jobs/providers.ts loadUmamiAnalyticsSink(), pass `userAgent: env.UMAMI_USER_AGENT?.trim() || undefined` so the owner can tune it without a code change.
  3. If Umami is self-hosted instead, set `DISABLE_BOT_CHECK=1` on the Umami deployment and leave the code unchanged.
  4. Add a unit test in packages/adapters/src/analytics.test.ts asserting the captured fetch init includes a non-empty `user-agent` header.
- **Acceptance criteria:** Owner check: run one real `analytics_order_submitted` job (or a synthetic submission) against the configured UMAMI_EVENTS_URL and confirm the `order_submitted` event appears in the Umami site's Events view within a minute. Unit test passes.
- **Risk of fix:** Low. Adding a header cannot break delivery; the only risk is choosing a UA string isbot still flags, which the live check catches.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm by sending one event through the sink to the production Umami endpoint and checking the Umami UI; alternatively curl the collect endpoint once with `-A node` and once with a browser UA and compare whether the event is recorded. If Umami records the 'node' UA event, downgrade this to Low/no-action.

### [REL-12] Every staff route handler swallows exceptions silently; failures never reach Sentry or logs
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/routes/staff.ts:307-309, 352, 389, 437, 470, 517, 563, 613, 640, 674, 693, 782, 806, 830, 862, 896, 923, 955, 985, 1022, 1032, 1076, 1129, 1158, 1204, 1242-1249, 1291, 1330, 1363, 1404, 1440, 1489, 1543, 1580, 1616, 1658
- **Problem:** All ~36 handlers in createStaffRouter end with `catch { sendStaffAuthError(res, req.id, 'internal_error', 500); }`. The thrown error is discarded: it is not passed to `logRequestError` (apps/backend/src/http/logger.ts, which website.ts uses at lines 303-320) and not given to the ErrorTracker. The app-level handler in app.ts:88-101 only sees errors forwarded with `next(error)`, which these handlers never do. A database outage, a Zod parse failure in `orderDetailSchema.parse` (staff.ts:237), or a bug in any store therefore produces an anonymous 500 with no server-side trace.
- **Impact (plain English):** When the admin panel shows 'The request could not be completed', nobody can find out why: Sentry stays empty and the Railway logs contain only the access-log line. Outages and bugs in order processing, deletion, invitations and documents go undiagnosed, and the REQ 40 alerting stack never fires for them.
- **Evidence:**
  ```text
  staff.ts:307-309: `} catch {\n      sendStaffAuthError(res, req.id, 'internal_error', 500);\n    }`. `git grep -n "captureException\|logRequestError" -- apps/backend/src/routes apps/backend/src/app.ts` matches only website.ts and app.ts.
  ```
- **Fix steps:**
  1. In apps/backend/src/routes/staff.ts add imports: `import { createErrorTrackerFromEnv, type ErrorTracker } from '@canadian-plans/adapters';` and `import { isConnectionLevelError, logRequestError } from '../http/logger.js';`.
  2. Add `errorTracker?: ErrorTracker;` to `StaffRouteDependencies` and set `errorTracker: createErrorTrackerFromEnv()` in `createDefaultStaffRouteDependencies()`.
  3. Inside `createStaffRouter`, next to the `decide` helper, add: `function reportFailure(req: Request, error: unknown): void { const workspaceId = typeof req.params['workspaceId'] === 'string' ? req.params['workspaceId'] : undefined; const route = `${req.baseUrl}${req.route?.path ?? req.path}`; const connection = isConnectionLevelError(error); logRequestError({ requestId: req.id, workspaceId, route, code: connection ? 'persistence_unavailable' : 'internal_error', flag: connection ? 'retryable' : 'not_retryable' }); dependencies.errorTracker?.captureException(error, { requestId: req.id, workspaceId, actorId: req.staffSession?.actorId, route, release: process.env['RELEASE_SHA'] ?? 'unknown', environment: process.env['DEPLOYMENT_ENV'] ?? process.env['NODE_ENV'] }); }` (same context shape app.ts:90-97 already passes to captureException; never include the body, headers or error message in the log record).
  4. Replace every `} catch {` in the file with `} catch (error) {` followed by `reportFailure(req, error);` as the first line, keeping the existing `sendStaffAuthError(...)` line. In the invitations handler (lines 1242-1249) call `reportFailure` only when `!isUniqueViolation(error)`.
- **Acceptance criteria:** Add a test to apps/backend/tests/staff-routes.test.ts: create the app with `staff.errorTracker = { captureException: vi.fn() }` (shape per the `ErrorTracker` interface in @canadian-plans/adapters) and a lead store whose `listLeads` throws `new Error('boom')`; GET /api/v1/staff/workspaces/{WORKSPACE}/leads with `Bearer aal1-token` returns 500 with error code `internal_error`, and `captureException` was called once with `expect.objectContaining({ requestId: expect.any(String), workspaceId: WORKSPACE, actorId: ACTOR })`. Existing tests still pass.
- **Risk of fix:** Low. Only adds logging/reporting; responses are unchanged. `logRequestError` already scrubs to fixed-shape identifiers so invariant 12 holds. Tests that construct the app without an errorTracker keep working because the field is optional.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-13] Synthetic check provisioning docs are wrong: the product row must have product_key 'synthetic-check' or every run fails with quote:product_not_found and alerts the owner every 15 minutes
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** docs/ENV.md:226, docs/RUNBOOKS/alerts.md:109-112, apps/backend/src/synthetic/provider.ts:21-28, apps/backend/src/catalogue/store.ts:160-176, apps/backend/src/catalogue/store.ts:660-663, apps/backend/src/synthetic/check.ts:94-104
- **Problem:** docs/ENV.md says SYNTHETIC_PRODUCT_ID may point at a products row with "any product_key", and alerts.md repeats it. The code disagrees: CatalogueService.createQuote calls store.prepareQuote (returns the provisioned row's productKey), the synthetic provider ignores the requested key and always returns an offer whose commercial.productKey is 'synthetic-check' (provider.ts:21,28), and store.issueQuote then runs persistPublishedInTransaction which upserts a product by `input.content.productKey` ('synthetic-check') and compares that product id with `expectedProductId` (SYNTHETIC_PRODUCT_ID). If the provisioned row's product_key is anything other than 'synthetic-check' the ids differ and issueQuote returns `{ status: 'product_not_found' }`; the check reports `failed` at step 'quote' with code product_not_found and the route/scheduler sends a synthetic_check_failed alert. It also silently inserts a second product row keyed 'synthetic-check' into the synthetic workspace.
- **Impact (plain English):** If the owner follows the runbook as written, the production monitor will report a failure every 15 minutes and email the owner each time, even though the order flow is healthy. That trains the owner to ignore alerts, which defeats the purpose of the synthetic check.
- **Evidence:**
  ```text
  docs/ENV.md:226  `SYNTHETIC_PRODUCT_ID` — backend-only UUID of one `app.products` row in that workspace (any `product_key` is fine; ...)
  
  store.ts:660-663
    const persisted = await persistPublishedInTransaction(tx, input);
    if (persisted.productId !== input.expectedProductId) {
      return { status: 'product_not_found' };
    }
  
  provider.ts:21  export const SYNTHETIC_PRODUCT_KEY = 'synthetic-check';
  provider.ts:28  productKey: SYNTHETIC_PRODUCT_KEY,
  ```
- **Fix steps:**
  1. In docs/ENV.md line 226 replace "(any `product_key` is fine; ...)" with "(its `product_key` MUST be exactly `synthetic-check`, the value of SYNTHETIC_PRODUCT_KEY in apps/backend/src/synthetic/provider.ts; any other key makes every run fail with quote:product_not_found)".
  2. In docs/RUNBOOKS/alerts.md step 2 (line 110) replace "(any `product_key`)" with "with `product_key = 'synthetic-check'`".
  3. Defensive code change in apps/backend/src/synthetic/provider.ts: make `createSyntheticCatalogueProvider()` echo the requested key, i.e. change `fetchPublishedByProductKey()` to `async fetchPublishedByProductKey(productKey) { const offer = syntheticPublishedOffer(); return { ...offer, commercial: { ...offer.commercial, productKey } }; }` so the provisioned row's key is used. (syntheticPublishedOffer() parses through commercialOfferSchema, so the override must be applied after parsing exactly as shown.)
  4. If the production synthetic workspace is already provisioned, check `select product_key from app.products where workspace_id = <SYNTHETIC_WORKSPACE_ID>` and rename it to 'synthetic-check' (or apply step 3) before relying on the alert.
- **Acceptance criteria:** Add a unit test in apps/backend/tests/synthetic-check.test.ts that provisions a fake product with product_key 'anything-else' and asserts runSyntheticOrderCheck returns status 'ok' after the fix (fails with product_not_found before). Manual: POST /api/internal/synthetic-check/run on staging returns {"status":"ok",...}.
- **Risk of fix:** Low. Step 3 changes only the synthetic provider; the real Sanity/static providers are untouched. Docs changes carry no risk.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-14] Catalogue sync failures are swallowed by the scheduler; customers can see an empty plan list for hours with no alert
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/scheduler.ts:296, apps/backend/src/catalogue/runner.ts:71-104, apps/backend/src/catalogue/service.ts:348-422, apps/backend/src/catalogue/provider-resolver.ts:31-33, apps/site-1/src/app/(storefront)/order/page.tsx:55-62
- **Problem:** CatalogueSyncRunner.run catches every drain/reconcile error, records it in `summary.failures` and resolves normally. The scheduler wiring `runCatalogueSync: (input) => catalogue.run(input)` discards that summary, so a failing sync never reaches onError, never logs and never alerts. Concrete failure modes that go silent: SITE_1_STATIC_CATALOGUE_WORKSPACE_ID unset or mistyped (resolver returns undefined -> `provider_unavailable`), a `TEST-` placeholder left in site-1-plans.ts in production (`catalogue_open_inputs`), a DB error during reconcile. The only trace is the `catalogue_sync_state.last_error_code` column shown on the admin settings/catalogue page, which nobody is paged to look at. Because /order renders the normal form with an empty offers list when the backend returns zero offers (page.tsx only shows 'Plans are unavailable' on a fetch *error*), a never-populated catalogue shows customers 'no plans' with no error anywhere.
- **Impact (plain English):** Exactly the situation the owner is in now: the live /order page shows no plans and nobody was told by the system. After launch, a bad deploy or env change could leave the store unable to sell for a whole day before someone notices.
- **Evidence:**
  ```text
  scheduler.ts:296  runCatalogueSync: (input) => catalogue.run(input),
  
  runner.ts:95-101
    } catch (error) {
      failures.push({ workspaceId, stage: 'reconcile', errorCode: safeFailureCode(error, 'reconcile_failed') });
    }
  
  service.ts:351-352
    const provider = this.resolveProvider(workspaceId);
    if (!provider) throw new Error('provider_unavailable');
  ```
- **Fix steps:**
  1. In packages/adapters/src/alerts.ts add 'catalogue_sync_failed' to the `ownerAlertKinds` array and a case in `alertSubject`: `case 'catalogue_sync_failed': return 'Canadian Plans: catalogue sync is failing';`.
  2. In apps/backend/src/scheduler.ts, createDefaultSchedulerDependencies, replace `runCatalogueSync: (input) => catalogue.run(input)` with an edge-triggered wrapper: keep `let catalogueFailing = false;` in the closure; `runCatalogueSync: async (input) => { const summary = await catalogue.run(input); const failing = summary.failures.length > 0; if (failing && !catalogueFailing) { await alerts.send({ kind: 'catalogue_sync_failed', detail: summary.failures.map((f) => `${f.stage}:${f.errorCode}`).slice(0, 5).join(','), occurredAt: new Date().toISOString() }).catch(() => {}); } catalogueFailing = failing; if (failing) logRequestError({ requestId: 'scheduler:catalogue_sync', route: 'scheduler', code: summary.failures[0]?.errorCode ?? 'catalogue_sync_failed', flag: 'not_retryable' }); return summary; }` (errorCode values are already bounded by safeFailureCode, so they are log/alert-safe).
  3. Add a unit test next to the existing 'alerts for a persisted failed queue' test that calls the wrapper twice with a failing summary and asserts alerts.send is called once, then once more only after a clean run followed by a new failure.
- **Acceptance criteria:** Unit test passes. Staging check: unset SITE_1_STATIC_CATALOGUE_WORKSPACE_ID on a staging backend, wait for one 300s tick, confirm an owner email 'catalogue sync is failing' with detail 'reconcile:provider_unavailable' arrives once (not every 5 minutes), and a `request_error` log line with code provider_unavailable is emitted.
- **Risk of fix:** Low. Adds one alert kind; existing alert tests enumerate ownerAlertKinds only via the type, so check packages/adapters/src/alerts.test.ts for a hard-coded list. Alert content contains only bounded error codes.
- **Depends on:** Synthetic check orders enqueue real outbox jobs that can never succeed; following the runbook also makes the scheduler count them, producing recurring job_queue_stuck alerts and endless catalogue-sync failures
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-15] Scheduler fails open at startup with only a log line: a misconfigured production backend serves traffic while no emails are sent and no catalogue sync runs
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/server.ts:24-40, apps/backend/src/scheduler.ts:211-232, docs/ADR/0004-backend-on-railway.md:132-144
- **Problem:** startScheduler catches SchedulerConfigurationError (missing CRON_SECRET, wrong selector, missing scope, preview env, malformed registry) and continues without a scheduler, emitting a single console.error record. ADR 0004 records this as a known limitation ('nothing alerts on that today', T25 must replace the manual log check). The owner alert channel now exists (createOwnerAlertChannelFromEnv) but is not used here. The health endpoint stays green, Railway reports the deploy healthy, and outbox jobs (order acknowledgement emails, tracking OTP emails) silently accumulate as pending.
- **Impact (plain English):** After any env/registry change that breaks the scheduler, customers place orders and never get confirmation or tracking-code emails, and plan changes stop syncing, until someone reads the logs. The runbook relies on a human remembering to check after every deploy.
- **Evidence:**
  ```text
  server.ts:28-36
    } catch (error) {
      logRequestError({ requestId: 'scheduler', route: 'scheduler', code: error instanceof SchedulerConfigurationError ? error.code : 'scheduler_start_failed', ... });
      return undefined;
    }
  
  ADR 0004:137-138  The trade is that the service looks healthy while no jobs run, and nothing alerts on that today.
  ```
- **Fix steps:**
  1. In packages/adapters/src/alerts.ts add 'scheduler_not_started' to `ownerAlertKinds` and an `alertSubject` case: `return 'Canadian Plans: background scheduler did not start';`.
  2. In apps/backend/src/server.ts, inside the `catch (error)` block of startScheduler, after logRequestError, add: `void createOwnerAlertChannelFromEnv().send({ kind: 'scheduler_not_started', detail: error instanceof SchedulerConfigurationError ? error.code : 'scheduler_start_failed', occurredAt: new Date().toISOString() }).catch(() => {});` and import `createOwnerAlertChannelFromEnv` from '@canadian-plans/adapters'.
  3. Update docs/ADR/0004-backend-on-railway.md 'Known limitation' and docs/RUNBOOKS/outbox-jobs.md section 'Confirm the scheduler actually started' to say an owner alert is now sent, keeping the manual check as a fallback.
- **Acceptance criteria:** Staging: set CRON_SECRET to a wrong value, redeploy, confirm the owner receives 'background scheduler did not start' with detail scheduler_identity_invalid within a minute of boot and HTTP routes still respond. Restore the secret and confirm no alert on the next boot.
- **Risk of fix:** Low. Alert send is fire-and-forget and cannot block boot. If OWNER_ALERT_EMAIL is unset the channel is a no-op that logs owner_alert_channel_unconfigured, same as today.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-21] Admin server-side error hook is never loaded (instrumentation.ts is in the wrong directory)
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/admin/instrumentation.ts:9-15, apps/admin/src/app/global-error.tsx:19-24, apps/admin/README.md:16-19
- **Problem:** Next.js 16 only scans the directory that contains `app/` (here `apps/admin/src`) for `instrumentation.ts` — see apps/admin/node_modules/next/dist/build/index.js:703 (`rootDir = path.join(pagesDir || appDir, '..')`) and :709 (`getFilesInDir(rootDir)`), and the dev bundler does the same (dist/esm/server/lib/router-utils/setup-dev-bundler.js:202-205). The admin app keeps its hook at `apps/admin/instrumentation.ts`, one level above `src/`, so `hasInstrumentationHook` is false and `onRequestError` is never registered. Only the client boundary `global-error.tsx` reports anything.
- **Impact (plain English):** Any error thrown while the admin renders on the server (server components, the `/denied` page, route params handling) is silently dropped: it never reaches the Sentry project the owner set up, so the team believes the admin is healthy when it is not. REQ 40 (errors from admin reach the tracker) is only half met.
- **Evidence:**
  ```text
  apps/admin/instrumentation.ts lives at the app root while pages live under apps/admin/src/app. next/dist/build/index.js:703-709: `const rootDir = path.join(pagesDir || appDir, '..'); const rootPaths = Array.from(await getFilesInDir(rootDir)).filter(...)` — only files directly inside apps/admin/src are considered.
  ```
- **Fix steps:**
  1. Move the file: `git mv apps/admin/instrumentation.ts apps/admin/src/instrumentation.ts` (keep the same content).
  2. In the moved file change the dynamic import path from `'./src/lib/error-tracking'` to `'./lib/error-tracking'`.
  3. Update apps/admin/README.md to mention `src/instrumentation.ts` if it documents the hook (optional).
- **Acceptance criteria:** Run `pnpm --filter admin exec next build` and confirm the build output lists `ƒ Middleware`/instrumentation or that `.next/server/instrumentation.js` exists. Then temporarily throw inside a server component (e.g. `apps/admin/src/app/denied/page.tsx`), request the page with `NEXT_PUBLIC_SENTRY_DSN` set, and confirm an event with tag `route` arrives in the `canadian-plans-admin` Sentry project; remove the throw.
- **Risk of fix:** Low. Moving the file only changes whether Next registers the hook. ESLint boundaries already allow admin code to import `src/lib/error-tracking`. No runtime behaviour changes for successful requests.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-22] Every tab focus or token refresh resets the whole admin screen and discards in-progress form state
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/admin/src/components/staff-session-provider.tsx:41-45, apps/admin/src/components/staff-session-provider.tsx:75-78, apps/admin/src/components/protected-workspace-shell.tsx:41-46
- **Problem:** `StaffSessionProvider.load()` unconditionally sets `accessToken` to undefined, `workspaces` to [] and `status` to 'loading' before re-fetching `/staff/workspaces`. It is invoked from `onAuthStateChange` for every event that carries a session. supabase-js (auth-js 2.116.0) emits `SIGNED_IN` with the existing session every time the tab goes hidden→visible (`_onVisibilityChanged` → `_recoverAndRefresh` → `_notifyAllSubscribers('SIGNED_IN', currentSession)`, GoTrueClient.js:4165, 4768) and `TOKEN_REFRESHED` roughly hourly (GoTrueClient.js:4282). While `status !== 'signed_in'`, `ProtectedWorkspaceShell` renders the 'Checking workspace access' placeholder instead of `{children}`, so every page component (orders list, order detail with open Dispatch/Cancel dialogs, change-request form, deletion confirmation) is unmounted and remounted with fresh state; the orders list also loses its filters and page.
- **Impact (plain English):** Staff who switch to another tab (e.g. to copy a tracking number or check email) and come back find the order page flash to 'Checking workspace access', the dialog they were filling in closed, typed notes/courier/tracking fields emptied, and list filters reset. During a long shift this happens constantly and makes order processing error-prone (re-typing dispatch details, losing a half-written cancellation reason).
- **Evidence:**
  ```text
  staff-session-provider.tsx:41-45 `const load = useCallback(async (token) => { ... setAccessToken(undefined); setWorkspaces([]); setStatus('loading'); ...` and :75-78 `auth.onAuthStateChange((_event, nextSession) => { ... ++generation.current; if (nextSession) void load(nextSession.access_token);`. auth-js GoTrueClient.js:4161-4166 `else { // no need to persist currentSession again ... await this._notifyAllSubscribers('SIGNED_IN', currentSession); }`.
  ```
- **Fix steps:**
  1. In apps/admin/src/components/staff-session-provider.tsx, change the `onAuthStateChange` callback so that when `nextSession` is present AND the provider is already `signed_in` for the same user, it only updates the token: replace `if (nextSession) void load(nextSession.access_token);` with logic like: `if (nextSession) { if (statusRef.current === 'signed_in' && nextSession.user?.id === userIdRef.current) { setAccessToken(nextSession.access_token); } else { void load(nextSession.access_token); } }` where `statusRef`/`userIdRef` are `useRef`s kept in sync with `status` and the signed-in user id (store `session.user.id` in `load` by passing the session, or read it from `nextSession` in the first successful load).
  2. Keep the full `load()` path for `SIGNED_IN` events whose user id differs (account switch) and for the initial load; keep the existing `SIGNED_OUT` handling unchanged.
  3. Add a unit test in staff-session-provider.test.tsx: after `signed_in:old`, fire `mocks.changed('TOKEN_REFRESHED', { access_token: 'new', user: { id: 'u1' } })` and assert the text goes directly to `signed_in:new` without ever rendering `loading` and without a second `getStaffWorkspaces` call.
- **Acceptance criteria:** Sign in, open an order, open the Dispatch dialog and type a courier, switch to another browser tab for a few seconds and come back: the dialog and typed text must still be there and no 'Checking workspace access' flash must appear. The new unit test passes (`pnpm --filter admin test`).
- **Risk of fix:** Low. Workspace membership is still re-read on real sign-in and account switch; it is no longer re-read on every tab focus, so a membership revoked mid-session is detected by the next backend request (which the backend already enforces) rather than by the tab-focus refresh. Components already read `accessToken` from context on each call, so the updated token is used immediately.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-23] Revoking a website service credential is one unconfirmed click away from taking the storefront offline
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/admin/src/components/service-credentials-manager.tsx:158-169, apps/admin/src/components/service-credentials-manager.tsx:78-92
- **Problem:** Each credential row renders a `Revoke` button that calls `revokeServiceCredential` directly. The storefront (site-1) authenticates to the backend with one of these credentials for every lead, quote and order request; revocation is immediate and irreversible. The list shows only the credential id and scopes, so the live one is not distinguishable from a test one, and there is no confirmation step.
- **Impact (plain English):** A mis-click by the owner instantly breaks the public website's order form (leads, quotes, order submission all fail) until a new credential is issued and the Vercel environment variable is updated and redeployed — a customer-facing outage caused by a single click in settings.
- **Evidence:**
  ```text
  service-credentials-manager.tsx:161-168 `<Button type="button" variant="outline" disabled={busy} onClick={() => void revoke(credential.id)}>Revoke</Button>`; `revoke()` at :78-92 issues the DELETE immediately.
  ```
- **Fix steps:**
  1. In service-credentials-manager.tsx add `const [revokeTarget, setRevokeTarget] = useState<ServiceCredentialSummary>();` and change the Revoke button to `onClick={() => setRevokeTarget(credential)}`.
  2. Import `Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle` from '@canadian-plans/ui' and render `<Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => { if (!open) setRevokeTarget(undefined); }}>` with title 'Revoke credential', description 'Any storefront using credential {revokeTarget.id} will stop working immediately. This cannot be undone.', a Close button, and a destructive 'Revoke credential' button that calls `await revoke(revokeTarget.id); setRevokeTarget(undefined);`.
  3. Optionally show `credential.createdAt`/`lastUsedAt` in the row if the contract exposes them, so the live credential is recognisable.
- **Acceptance criteria:** Clicking Revoke opens the dialog and sends no request; confirming sends exactly one DELETE and the row shows 'revoked'. Closing the dialog sends nothing. Component test: Revoke click does not call `revokeServiceCredential` until the dialog's confirm button is clicked.
- **Risk of fix:** Low. UI-only; backend endpoint unchanged.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-26] Vercel ignoreCommand cancels same-commit redeploys, so NEXT_PUBLIC_* changes need a code commit; rollback runbook gives misleading advice
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** scripts/affected-builds.mjs:89-95, apps/admin/vercel.json:5, apps/site-1/vercel.json:4, apps/backend/vercel.json:11, docs/RUNBOOKS/release-rollback.md:65-69
- **Problem:** `affected-builds.mjs --vercel <app>` diffs `VERCEL_GIT_PREVIOUS_SHA..HEAD` and exits 0 (skip build) when the app is not in the affected set. On a Vercel 'Redeploy' of the current commit (the normal way to pick up a changed environment variable) the diff is empty, so every app is unaffected and the build is cancelled. There is no override hook. `NEXT_PUBLIC_*` values are inlined at build time, so the only way to apply one today is to push a code change under apps/<app>/ or a shared package. docs/RUNBOOKS/release-rollback.md:65-69 tells the owner to just update the env var because 'server-rendered output can still read the current environment variables for anything not baked in at build time', which is wrong for NEXT_PUBLIC_* and does not mention that a redeploy will be cancelled. apps/backend/vercel.json still carries an ignoreCommand although the backend now deploys from Railway (stale, harmless).
- **Impact (plain English):** The owner changes a public setting (e.g. the Supabase anon key, the backend URL, a Sentry DSN) in Vercel, clicks Redeploy, and the site keeps serving the old value with no error — the build was skipped. During an incident this costs time and confusion.
- **Evidence:**
  ```text
  affected-builds.mjs:92-95: `if (args[0] === '--vercel') { const selected = ...; process.exit(selected && !apps.includes(selected) ? 0 : 1); }`; apps/site-1/vercel.json:4: `"ignoreCommand": "node ../../scripts/affected-builds.mjs --vercel site-1"`
  ```
- **Fix steps:**
  1. In scripts/affected-builds.mjs inside the `--vercel` branch (line 92), before computing the exit code, add: `if (process.env['VERCEL_FORCE_BUILD'] === '1') { console.info('VERCEL_FORCE_BUILD=1: building regardless of changed files'); process.exit(1); }`.
  2. Add a test to scripts/affected-builds.test.mjs that spawns `node scripts/affected-builds.mjs --vercel site-1` with env `VERCEL_FORCE_BUILD=1` and `VERCEL_GIT_PREVIOUS_SHA=HEAD` and asserts exit code 1 (build proceeds), and without the variable asserts exit code 0.
  3. In docs/RUNBOOKS/release-rollback.md step 4 (lines 65-69) replace the sentence about server-rendered output with: 'NEXT_PUBLIC_* values are baked in at build time. To apply a changed value without a code change, set the project env var VERCEL_FORCE_BUILD=1 (Production scope), Redeploy, then remove it; or deploy from the CLI (`vercel deploy --prod`), which does not run the Ignored Build Step.'
  4. Remove the now-unused `ignoreCommand` and `rewrites` from apps/backend/vercel.json or delete the file, since the backend deploys from Railway (railway.json).
- **Acceptance criteria:** `pnpm run test:tooling` passes including the new test; manually: set VERCEL_FORCE_BUILD=1 on the site-1 project, Redeploy the current commit, and confirm the build log shows the 'building regardless' message and the deployment is created.
- **Risk of fix:** Low. Leaving VERCEL_FORCE_BUILD=1 set permanently would build every push again; the runbook step tells the owner to remove it.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-27] CI cancels in-progress runs on main, and the cancelled commit's changes are never built because BASE_SHA only covers the newest push
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** .github/workflows/ci.yml:8-10, .github/workflows/ci.yml:75-78, .github/workflows/ci.yml:12-13
- **Problem:** `concurrency.group` includes `github.ref` and `cancel-in-progress: true` applies to pushes on `main` too. Two merges in quick succession cancel the first run. The second run computes `BASE_SHA: github.event.before`, i.e. only its own commit range, so `build:affected` never builds apps affected solely by the cancelled commit, and that commit never gets a CI status at all. The verify job also has no `timeout-minutes` (GitHub default is 6 hours).
- **Impact (plain English):** A commit on main — the branch the owner releases from — can end up with no CI result or an incomplete build check, so a broken release candidate may look fine because the only green run belongs to a later, unrelated commit.
- **Evidence:**
  ```text
  ci.yml:8-10: `concurrency:\n  group: ci-${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true`; ci.yml:77: `BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}`
  ```
- **Fix steps:**
  1. In .github/workflows/ci.yml change line 10 to `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` so PR runs still supersede each other but every main push completes.
  2. Add `timeout-minutes: 60` under `jobs.verify` (after `runs-on: ubuntu-24.04`) so a hung e2e run cannot block the queue for 6 hours.
- **Acceptance criteria:** Push two commits to main within a minute: both runs complete (Actions UI shows no 'cancelled' run for main); PR pushes still cancel the previous run for that PR.
- **Risk of fix:** Low. Queued main runs consume more Actions minutes when merges are frequent.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-29] An idempotency_conflict after a dropped-but-committed order is shown as 'Your order was not saved' with an endless 'Try again' loop
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/site-1/src/app/(storefront)/order/actions.ts:138-174, apps/site-1/src/app/(storefront)/order/actions.ts:492-502, apps/site-1/src/app/(storefront)/order/order-form.tsx:720-728, apps/backend/src/routes/website.ts:248-251, apps/backend/src/orders/fingerprint.ts:25-28
- **Problem:** The backend fingerprints the entire submit body (quoteId, termsVersion, form, consent) and returns 409 `idempotency_conflict` when the same idempotency key is reused with a different payload. The storefront keeps ONE key per draft cookie for 30 days (by design, so retries find the existing order). But `failureFrom()` has no branch for `idempotency_conflict`, so it falls through to `notSaved()` ('Your order was not saved. Please try again.'), and the review step renders a 'Try again' button for code `not_saved` that re-sends the same key with the same changed payload, producing the same 409 forever. The payload changes whenever the customer, after a submit whose response was lost (the REQ 18 case the e2e suite proves exists), toggles the marketing checkbox, goes Back to edit details, or re-quotes (new quoteId). `draft_already_submitted` never fires because the key lookup happens first.
- **Impact (plain English):** A customer whose first 'Place order' lost its response and who then changes anything before retrying is told their order was not saved, even though it was. They may give up, order again by phone (duplicate), or keep clicking 'Try again' with no way out. Staff see an order the customer believes does not exist.
- **Evidence:**
  ```text
  actions.ts failureFrom: handles draft_already_submitted, draft_expired, quote_*, terms_version_unsupported, offer_unavailable, region_not_served, priced_checkout_disabled then `return notSaved();` — no `idempotency_conflict`. order-form.tsx: `{orderError.code === 'not_saved' || orderError.code === 'transport_retry' ? (<Button onClick={performSubmit}>Try again</Button>) : null}`. website.ts: `if (outcome.status === 'idempotency_conflict') { sendDomainError(res, req.id, 'idempotency_conflict', 409); }`.
  ```
- **Fix steps:**
  1. In `apps/site-1/src/app/(storefront)/order/actions.ts`, function `failureFrom`, add before the `draft_already_submitted` check: `if (error.code === 'idempotency_conflict') return { ok: false, code: 'draft_expired', message: 'We already received an order for these details. Check your email for the confirmation, or use Track order. To buy another plan, start a new order.' };` (reusing the existing `draft_expired` code so the form shows the message without a retry button).
  2. In the same file, function `submitOrder`, inside the `catch` after `if (!(error instanceof BackendError)) ...`, add: `if (error.code === 'idempotency_conflict') await clearOrderDraft();` before `return failureFrom(error);` so the next visit to /order starts a fresh draft/key instead of looping (the already-created order is reachable via /track and the confirmation email).
  3. Add a unit test in `apps/site-1/src/app/(storefront)/order/actions.test.ts`: mock `orders.submit` to throw `new BackendError('idempotency_conflict', 409, 'r1')`; assert the result is `{ ok: false, code: 'draft_expired', message: /already received an order/ }` and that the draft cookie is cleared (mock `cookies().set` called with maxAge 0).
- **Acceptance criteria:** Unit test passes. Manual/e2e: arm the harness with `/__e2e__/drop-next-orders?count=1`, place the order, when 'We could not confirm your order' appears tick the marketing checkbox and click 'Place order' again: the page must show the 'already received an order' message (not 'Your order was not saved') and no 'Try again' button; `/__e2e__/orders` shows exactly one order.
- **Risk of fix:** Low. Only changes the mapping of one backend error code and clears the cookie in that one case. The REQ 18 retry path (same payload, same key) is untouched and still returns the existing order.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-30] The e2e harness truncates tenant tables and resets the app_runtime password on whatever database E2E_TEST_DATABASE_URL points to, with no local-only guard
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/tests/e2e/harness.ts:92, apps/backend/tests/e2e/harness.ts:437-469, apps/backend/tests/e2e/harness.ts:525-534, packages/db/src/test-helpers.ts:16-21, apps/site-1/playwright.config.ts:25-30, apps/site-1/playwright.config.ts:62-67
- **Problem:** `playwright.config.ts` passes `TEST_MIGRATION_DATABASE_URL: process.env.E2E_TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/canadian_plans_e2e_test'` and `DATABASE_SSL_MODE: 'disable'` to the harness. The harness then runs `applyMigrations`, `setTestRuntimePassword` (which executes `ALTER ROLE app_runtime PASSWORD 'local_ci_runtime_password'`, a value committed to the repo), deletes the workspace's service credentials, and `truncate table app.orders, app.quotes, app.leads, ... restart identity cascade` across 22 tables. Nothing checks that the target host is local or that the database name is a test database. A developer or CI job with `E2E_TEST_DATABASE_URL` (or an `E2E_DATABASE_URL`) pointing at the Supabase production/staging connection string would wipe tenant data and replace the production runtime role password with a public one. Supabase does not enforce SSL by default, so `sslmode=disable` would not stop the connection.
- **Impact (plain English):** One wrong environment variable on a laptop or CI runner deletes every order, lead, quote, email record and audit event in the real database and sets the production database password to a value anyone can read on GitHub. There is no production-grade backup to restore from (memory: backup gate still open). This is a safety rail missing on an otherwise good test harness.
- **Evidence:**
  ```text
  harness.ts: `await admin.unsafe(`truncate table ${DATA_TABLES.join(', ')} restart identity cascade`);` and `await setTestRuntimePassword(admin);`. test-helpers.ts: `await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);` with `TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password'`. playwright.config.ts: `DATABASE_SSL_MODE: 'disable'`.
  ```
- **Fix steps:**
  1. In `apps/backend/tests/e2e/harness.ts`, directly after the `if (!ADMIN_URL) {...}` block (line ~116), add a guard: `const adminTarget = new URL(ADMIN_URL); const localHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(adminTarget.hostname); const testName = /(_test|_e2e|e2e_test)$/i.test(adminTarget.pathname.replace(/^\//, '')); if (!(localHost || testName) && process.env['E2E_ALLOW_REMOTE_DATABASE'] !== 'yes-i-understand') { process.stderr.write('Refusing to run the e2e harness: TEST_MIGRATION_DATABASE_URL must point at localhost or a database whose name ends in _test/_e2e (set E2E_ALLOW_REMOTE_DATABASE=yes-i-understand to override).\n'); process.exit(1); }`.
  2. Apply the same guard to the runtime URL the backend will use: read `process.env['DATABASE_URL']` in the harness and refuse unless its hostname is local or its database name matches the same test pattern (same override variable).
  3. In `packages/db/src/test-helpers.ts`, function `setTestRuntimePassword`, add a first line: `const dbName = (await admin`select current_database() as name`)[0]?.name ?? ''; if (!/(_test|_e2e|e2e_test)$/i.test(dbName) && process.env['E2E_ALLOW_REMOTE_DATABASE'] !== 'yes-i-understand') throw new Error(`setTestRuntimePassword refused for database "${dbName}"`);` so the password reset itself is fenced even when called from other integration tests.
  4. Document the override variable in `apps/site-1/README.md` next to the existing `createdb canadian_plans_e2e_test` instructions.
- **Acceptance criteria:** Run `E2E_TEST_DATABASE_URL=postgresql://u:p@db.example.supabase.co:5432/postgres pnpm --filter site-1 test:e2e` (no network needed): the harness exits 1 with the refusal message before connecting. The normal `pnpm --filter site-1 test:e2e` against `canadian_plans_e2e_test` on localhost still runs green. The existing db integration tests (`pnpm --filter @canadian-plans/db test`) still pass because they use a `*_test` database.
- **Risk of fix:** Low. Only adds pre-flight checks; the CI database is named `canadian_plans_e2e_test` on localhost so it passes both conditions. Verify the unit/integration test database name used in CI also ends in `_test` before adding the test-helpers guard (check `.github/workflows` for `TEST_MIGRATION_DATABASE_URL`).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-31] ENV.md and secret-rotation runbook name Backblaze B2 variables that no workflow or job reads
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** docs/ENV.md:247-252, docs/RUNBOOKS/secret-rotation.md:102-103, .github/workflows/backup.yml:62-66, jobs/src/backup/cli.ts:34-45, jobs/src/monitor/cli.ts:44-48, jobs/src/retention/cli.ts:28-34, jobs/src/restore/cli.ts:60-71
- **Problem:** docs/ENV.md section 'Backblaze B2 backups' lists `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT`, and secret-rotation.md says the daily backup writer is `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY` on the `backup` GitHub Environment. `git grep B2_APPLICATION_KEY -- apps packages jobs scripts .github` returns nothing. The code and workflows use a different, role-specific set: backup.yml forwards `B2_ARCHIVE_ENDPOINT`, `B2_ARCHIVE_REGION`, `B2_ARCHIVE_BUCKET`, `B2_ARCHIVE_WRITER_KEY_ID`, `B2_ARCHIVE_WRITER_APPLICATION_KEY`, plus `SOURCE_DATABASE_URL`, `BACKUP_LEASE_DATABASE_URL`, `SUPABASE_PROJECT_REF`, `RECOVERY_AGE_RECIPIENT` (jobs/src/backup/cli.ts:34-45 call `requiredEnv` on exactly these); the monitor needs `B2_ARCHIVE_READER_*`; retention needs `B2_ARCHIVE_RETENTION_*` and `RECOVERY_PRIVATE_KEY_PATH`; restore needs `RESTORE_RUN_ID`, `B2_ARCHIVE_READER_*`, `RECOVERY_PRIVATE_KEY_PATH`, `LEDGER_CHECKPOINT_VERIFICATION_KEY`. Only docs/RUNBOOKS/restore.md uses the real names; ENV.md (the file the launch checklist points the owner to) does not.
- **Impact (plain English):** Backups do not exist yet (LAUNCH_CHECKLIST 4.1). When the owner provisions them following ENV.md or the rotation runbook, they will create GitHub secrets with the wrong names, the Backup workflow will fail on its first run with 'B2_ARCHIVE_ENDPOINT is required', and the owner may believe a backup exists when none does. The same wrong names would make a key rotation silently ineffective.
- **Evidence:**
  ```text
  docs/ENV.md:249-252: `- B2_APPLICATION_KEY_ID` / `- B2_APPLICATION_KEY` / `- B2_BUCKET` / `- B2_ENDPOINT`. jobs/src/backup/cli.ts:37-41: `requiredEnv('B2_ARCHIVE_ENDPOINT') ... requiredEnv('B2_ARCHIVE_WRITER_APPLICATION_KEY')`. .github/workflows/backup.yml:62-66 forwards `B2_ARCHIVE_*` secrets.
  ```
- **Fix steps:**
  1. In docs/ENV.md, replace the four bullets under '## Backblaze B2 backups' (lines 249-252) with the names the jobs read, grouped by GitHub Environment: backup (`SOURCE_DATABASE_URL`, `BACKUP_LEASE_DATABASE_URL`, `SUPABASE_PROJECT_REF`, `RECOVERY_AGE_RECIPIENT`, `B2_ARCHIVE_ENDPOINT`, `B2_ARCHIVE_REGION`, `B2_ARCHIVE_BUCKET`, `B2_ARCHIVE_WRITER_KEY_ID`, `B2_ARCHIVE_WRITER_APPLICATION_KEY`, plus the `R2_*` and `SANITY_PROJECT_ID`/`SANITY_DATASET`/`SANITY_SITE_FILTER` source values); backup-monitor (`B2_ARCHIVE_READER_KEY_ID`, `B2_ARCHIVE_READER_APPLICATION_KEY`, `B2_ARCHIVE_ENDPOINT`, `B2_ARCHIVE_REGION`, `B2_ARCHIVE_BUCKET`, `OWNER_ALERT_*`, `RESEND_*`); backup-retention (`B2_ARCHIVE_RETENTION_KEY_ID`, `B2_ARCHIVE_RETENTION_APPLICATION_KEY`, `RECOVERY_PRIVATE_KEY`, `RECOVERY_PRIVATE_KEY_PATH`, `RETENTION_DRY_RUN`); restore (`RESTORE_RUN_ID`, `B2_ARCHIVE_READER_*`, `RECOVERY_PRIVATE_KEY_PATH`, `LEDGER_CHECKPOINT_VERIFICATION_KEY`). Keep the 'names only, no values' rule.
  2. In docs/RUNBOOKS/secret-rotation.md lines 102-103, change '`B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY`' to '`B2_ARCHIVE_WRITER_KEY_ID` / `B2_ARCHIVE_WRITER_APPLICATION_KEY`', and name the reader (`B2_ARCHIVE_READER_*`) and retention (`B2_ARCHIVE_RETENTION_*`) pairs in the two bullets that follow.
  3. Add a one-line pointer from the ENV.md section to docs/RUNBOOKS/restore.md, which already uses the correct names.
- **Acceptance criteria:** Run `git grep -n -E 'B2_[A-Z_]+' -- docs/ENV.md docs/RUNBOOKS/secret-rotation.md` and confirm every name printed also appears in `git grep -o -h -E 'B2_[A-Z_]+' -- .github/workflows jobs/src | sort -u`. The reverse check (every `B2_ARCHIVE_*` name read by jobs/src/*/cli.ts appears in docs/ENV.md) also passes.
- **Risk of fix:** Low. Documentation only; no code change. Nothing else references the old names.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-32] Analytics component is mounted per route group and missing from legal, system, track-order and both order-form route groups, so those page views are never recorded
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/site-1/src/app/(legal)/layout.tsx:3-5, apps/site-1/src/app/(system)/layout.tsx:3-5, apps/site-1/src/app/(track-order)/layout.tsx:4-6, apps/site-1/src/app/(internet-order)/layout.tsx:3-5, apps/site-1/src/app/(pre-arrival-order)/layout.tsx:3-5, apps/site-1/src/app/not-found.tsx:14, apps/site-1/src/app/layout.tsx:36-40
- **Problem:** `<Analytics />` (apps/site-1/src/components/analytics.tsx) is rendered inside 13 individual route-group layouts ((home), (about), (business-internet), (contact), (faq), (guides), (guides-index), (home-internet), (landing-arrival), (landing-internet), (mobile-plans), (pre-arrival), (storefront)) instead of once in the root layout. The (legal), (system), (track-order), (internet-order) and (pre-arrival-order) layouts and the 404 page do not render it, so /privacy, /terms, /accessibility, /search, /track-order, /order/home-internet, /order/pre-arrival and every 404 produce no Umami page view even with consent.
- **Impact (plain English):** Launch step 6.2 ('Umami recording visits and order starts') will under-count: visits to the two dedicated order forms, the tracking page, legal pages and 404s are invisible, so the owner cannot see drop-off on order starts or which broken links people hit.
- **Evidence:**
  ```text
  (legal)/layout.tsx: `export default function Layout({ children }) { return <div className="cp-design cp-legal">{children}</div>; }` (no Analytics) vs (faq)/layout.tsx:6-12 which renders `<Analytics />`. Root layout.tsx:36-40 renders only `CookieConsentProvider` and `PlanFinderProvider`.
  ```
- **Fix steps:**
  1. In apps/site-1/src/app/layout.tsx add `import { Analytics } from '@/components/analytics';` and render `<Analytics />` as the last child inside `<CookieConsentProvider>` (after `<PlanFinderProvider>{children}</PlanFinderProvider>`).
  2. Remove the `import { Analytics } ...` line and the `<Analytics />` element from these 13 layouts: (home), (about), (business-internet), (contact), (faq), (guides), (guides-index), (home-internet), (landing-arrival), (landing-internet), (mobile-plans), (pre-arrival), (storefront).
  3. Run `git grep -n '<Analytics' apps/site-1/src` and confirm the only hit is src/app/layout.tsx.
- **Acceptance criteria:** With `NEXT_PUBLIC_UMAMI_SCRIPT_URL` and `NEXT_PUBLIC_UMAMI_WEBSITE_ID` set and analytics consent granted, opening /privacy and /order/pre-arrival in the browser issues one Umami `send` request each (visible in the Network tab); navigating / → /faq still sends exactly one page view per route (no duplicates). `pnpm --filter site-1 typecheck` and `pnpm lint` pass.
- **Risk of fix:** Low. Analytics is a client component using usePathname and only renders a Script when consent and env are present; moving it to the root layout keeps it under CookieConsentProvider. The lastTracked ref now survives cross-group navigation, which removes a theoretical double-count rather than adding one.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-33] The live Contact page's 'Message us' and 'Track your order' forms are UI stubs that discard every submission
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/site-1/src/app/(contact)/actions.ts:28-39, apps/site-1/src/components/contact/interactive.tsx:148, apps/site-1/src/components/contact/interactive.tsx:250, apps/site-1/src/components/shared/newsletter-action.ts:6-8
- **Problem:** `contactPreviewAction` validates the input and returns `{ status: 'preview', previewOnly: true }`; nothing is stored, emailed or looked up (its own comment: 'UI stub: ... no storage, logging, mail, chat or order lookup'). Both contact forms call it. The success copy tells the visitor 'Message preview complete. No message was sent and your details have not been saved.' (content/contact.ts:105) and 'Tracking preview complete. No live order lookup was performed.' (content/contact.ts:75). The footer newsletter (`newsletterPreviewAction`) is the same kind of stub ('Thanks! Email sign-ups open soon. Nothing was sent or saved.'). The site is launching with these on every page.
- **Impact (plain English):** A customer who fills in the main support form on canadianplans.com types their whole message and then is told nothing was sent. Support requests are lost unless they notice and switch to WhatsApp, phone or email; the tracking form on /contact is a dead end even though a real tracking flow exists at /track.
- **Evidence:**
  ```text
  actions.ts:28-29: `/** UI stub: validates and returns a preview; no storage, logging, mail, chat or order lookup. */ export async function contactPreviewAction(` — content/contact.ts:105: `result: 'Message preview complete. No message was sent and your details have not been saved.',`
  ```
- **Fix steps:**
  1. OWNER APPROVAL: wiring the message form needs a backend endpoint that writes an outbox row (invariant 7) to email info@canadianplans.com with Turnstile verification and rate limiting; effort about half a day. Until then, choose the interim option in step 2.
  2. Interim (no new backend): in apps/site-1/src/components/contact/interactive.tsx `ContactTrackingForm`, replace the form's submit with a plain link to the real tracking page — render `<CpButton asChild scale="large"><a href="/track">{contactCopy.track.submit}</a></CpButton>` instead of the two inputs and the stub submit, keeping the heading and description; and in `ContactOptionAction` route `id === 'email'` to `window.location.assign('mailto:info@canadianplans.com')` (or keep focusMessage once the message form is real).
  3. When the backend endpoint exists: in apps/site-1/src/app/(contact)/actions.ts call it (server-side, with the site service credential like the order actions) and return `{ status: 'sent' }`; change content/contact.ts:105 `message.result` to a real confirmation; remove `previewOnly`.
  4. Leave the footer newsletter stub as is (copy is honest) or hide `FooterNewsletter` by setting `newsletter: undefined` in content/site-chrome.ts until an email provider exists.
- **Acceptance criteria:** Submitting the Contact message form on the live site results in an email arriving at info@canadianplans.com (or, for the interim, the tracking panel links to /track and the email option opens the mail client); no visible text on /contact says 'No message was sent'.
- **Risk of fix:** High. The full fix adds a backend route and outbox job; the interim changes only the contact page UI and removes two stub forms. Either way, keep the Turnstile pattern used by the order form to avoid spam.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-05] Database TLS uses ssl:'require', which disables server certificate verification in postgres.js
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** packages/db/src/index.ts:66-72, packages/db/src/index.ts:151-156, packages/db/src/migrations.ts:20-24, packages/db/src/seed.ts:37-41
- **Problem:** All three Postgres clients (runtime pool, migration runner, seed) pass `ssl: 'require'` to postgres.js. In postgres 3.4.9 (`node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/connection.js:283-284`) the values 'require' | 'allow' | 'prefer' set `rejectUnauthorized = false`, so the connection is encrypted but the server certificate is never validated. Only an object (`{ rejectUnauthorized: true, ca? }`) enables verification. The `DATABASE_SSL_MODE` / `MIGRATION_DATABASE_SSL_MODE` env parsing (`runtimeSsl`, `migrationSsl`, migrate.ts:6-9) only allows 'require' or 'disable', so an operator cannot turn verification on. README.md:21 claims "Both connections require TLS by default" without noting that the server identity is unchecked.
- **Impact (plain English):** If anything between Railway/CI and Supabase can intercept traffic (compromised network path, DNS poisoning), an attacker could present a fake certificate and read every customer record and the privileged migration credentials in transit without the backend noticing. Today this is a latent weakness rather than a demonstrated exploit, but it is below ordinary production practice for a system holding customer PII.
- **Evidence:**
  ```text
  index.ts:70 `ssl: options.ssl ?? 'require',` ; postgres.js connection.js:283-284 `if (ssl === 'require' || ssl === 'allow' || ssl === 'prefer') options.rejectUnauthorized = false`
  ```
- **Fix steps:**
  1. In packages/db/src/index.ts, widen `DatabaseClientOptions.ssl` to `'require' | 'verify' | false` (or accept `{ rejectUnauthorized: boolean; ca?: string }`) and in `createClient()` map the verifying mode to `ssl: { rejectUnauthorized: true, ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA } : {}) }` instead of the string 'require'.
  2. In `runtimeSsl()` (index.ts:151-156) accept a new value `DATABASE_SSL_MODE=verify-full` that selects the verifying object; keep 'require' and 'disable' behaving as today so nothing breaks on deploy, then switch Railway's `DATABASE_SSL_MODE` to `verify-full` once step 5 passes.
  3. Apply the same change in packages/db/src/migrations.ts (`applyMigrations`, lines 20-24, `MigrationOptions.ssl`) and packages/db/src/migrate.ts:6-9 for `MIGRATION_DATABASE_SSL_MODE`, and in packages/db/src/seed.ts:37-41 / `migrationSsl()` (seed.ts:201-206).
  4. Document `DATABASE_SSL_MODE=verify-full` and the optional `DATABASE_SSL_CA` (PEM contents of the Supabase CA certificate from Dashboard > Settings > Database > SSL) in docs/ENV.md and packages/db/README.md:21.
  5. Verify against the real Supabase pooler and direct hosts: run a one-off `node -e` connecting with `{ rejectUnauthorized: true }`; if it fails with a CA error, set `DATABASE_SSL_CA` to the downloaded Supabase CA and retry.
- **Acceptance criteria:** With `DATABASE_SSL_MODE=verify-full` the backend health endpoint on Railway returns OK and a `select 1` succeeds; a deliberately wrong `DATABASE_SSL_CA` (or pointing at a host whose cert does not match) makes the connection fail with a certificate error instead of silently connecting. Existing integration tests still pass with `ssl: false` on the disposable CI database.
- **Risk of fix:** Medium. If the Supabase pooler certificate chain is not trusted by Node's default store, enabling verification without the CA will break every DB connection at startup; that is why the change is gated behind a new mode value and verified against the live host before the env switch.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm whether the Supabase Supavisor pooler host (`*.pooler.supabase.com`) and the direct host present a publicly trusted chain or require the Supabase-issued CA; this determines whether `DATABASE_SSL_CA` is mandatory.

### [SEC-06] Turnstile siteverify is called before any rate limit or credential check, giving unauthenticated callers free outbound-call amplification
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/backend/src/website/session.ts:63-84, apps/backend/src/routes/website.ts:134-139, apps/backend/src/routes/website.ts:212-217, apps/backend/src/routes/website.ts:342-345, apps/backend/src/routes/website.ts:781-786, apps/backend/src/routes/website.ts:833-838, apps/backend/src/website/turnstile.ts:26-32
- **Problem:** Every write route is wired as `requireHumanProof` → `requireWebsiteCredential` → `requireScope` → `requireEndpointRateLimit`. `requireHumanProof` only checks that the Authorization header is well-formed (`parseCredentialSecret`: prefix + 16 chars) and then awaits `deps.botCheck`, which performs an HTTPS POST to challenges.cloudflare.com with a 5 s timeout. No durable limiter and no credential validation has run at that point. A caller with a junk bearer and any `x-turnstile-token` therefore makes the backend open one outbound Cloudflare request per inbound request, with no cap. Those calls carry the production TURNSTILE_SECRET_KEY, so a flood can also exhaust Cloudflare-side siteverify quota for the real secret, after which genuine customers' tokens fail and they get 403.
- **Impact (plain English):** Someone can make the backend spend an unbounded number of outbound calls and sockets (each up to 5 seconds) without ever presenting a valid credential, slowing or stalling real order and lead traffic, and can potentially get the business's Turnstile secret throttled by Cloudflare so real customers are blocked from saving or ordering.
- **Evidence:**
  ```text
  session.ts:68 `if (!parseCredentialSecret(req.get('authorization'))) { ... 401 }` then line 74 `admitted = await deps.botCheck(req, action);` ; website.ts:136-139 order of middlewares `requireHumanProof(...), requireWebsiteCredential(...), requireScope(...), requireEndpointRateLimit(...)`; test website-auth.test.ts:192-201 asserts `limiter.inputs` is empty when admission fails, confirming no limiter runs first.
  ```
- **Fix steps:**
  1. In apps/backend/src/routes/website.ts swap the first two middlewares on every write route so the credential (which includes the bootstrap IP, credential and visitor limiters) runs first: lines 136-137 (`/quotes`), 214-215 (`/orders`), 783-784 (`/tracking/otp`), 835-836 (`/tracking/verify`); and in `createWebsiteRouter` change `admit` (lines 342-345) to `const admit = (action) => [authenticate, requireHumanProof(dependencies.auth, action)];`.
  2. In apps/backend/src/website/session.ts `requireHumanProof`, the inline `parseCredentialSecret` check (lines 68-71) can stay as defence in depth; no other change needed.
  3. Update apps/backend/tests/website-auth.test.ts: in 'denies an asynchronous admission exception without database work' (182-191) and 'denies failed admission before touching database-backed dependencies' (192-201) replace `expect(limiter.inputs).toHaveLength(0)` with `expect(leadStore.createCalls).toHaveLength(0)` and keep `expect(response.status).toBe(403)`. In apps/backend/tests/tracking-routes.test.ts the `botChecks` expectation (line 270) is unchanged.
  4. Add one test: a POST /api/v1/website/leads with `Authorization: Bearer cplsk_0000000000000000` (unknown credential) must return 401 and the fake `botCheck` must not have been called.
- **Acceptance criteria:** `pnpm --filter backend test -- website-auth tracking-routes website-endpoint-rate-limit` passes, and the new test shows `botCheck` is not invoked for an unknown credential.
- **Risk of fix:** Medium. Changes the documented ordering ('human admission before tenant DB work'). The credential lookup is a bootstrap read, not tenant work, and is itself rate limited, so the invariant is preserved. A Turnstile token is still consumed once per request as before.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-07] Staff document download-link issuance writes no audit event (invariant 11, REQ 23 gate 5)
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/backend/src/routes/staff.ts:1621-1661, apps/backend/src/documents/service.ts:264-289, apps/backend/src/documents/store.ts:425-441
- **Problem:** POST /workspaces/:workspaceId/files/:fileId/download-link authorizes `document.download`, then DocumentService.issueDownload only calls store.getFile and r2.issueDownload and returns the presigned URL. No audit_events row is written anywhere on this path: DatabaseDocumentStore.writeAudit is invoked only for file.intent_created, file.attached, file.rejected, file.reviewed and file.deleted, the R2 adapter (packages/adapters/src/r2-s3.ts:301-312) just presigns, and `git grep -n "file.download" -- apps/backend/src packages/adapters/src packages/db` returns nothing. The same gap exists for the website (customer) download path, which calls the same service method.
- **Impact (plain English):** When a staff member downloads a customer's identity document, there is no record of who downloaded which file or when. If a document is ever leaked or a customer asks who accessed their ID, the business cannot answer, even though the platform explicitly gates downloads behind a separate permission for exactly this reason.
- **Evidence:**
  ```text
  service.ts:281-288: `const link = await this.r2.issueDownload({...}); return { status: 'issued', url: link.url, expiresAt: link.expiresAt };` with no store write. store.ts writeAudit call sites: lines 280, 382, 412, 535, 581 only.
  ```
- **Fix steps:**
  1. In apps/backend/src/documents/store.ts, add to the `DocumentRecordStore` interface: `recordDownloadIssued(input: { workspaceId: string; actorId: string; requestId: string; fileId: string; audience: 'staff' | 'website' }): Promise<void>;`
  2. In `DatabaseDocumentStore` (same file) implement it: `return this.database.withTenantTx({ workspaceId: input.workspaceId, actorId: input.actorId }, async (tx) => { await writeAudit(tx, { workspaceId: input.workspaceId, actorId: input.actorId, requestId: input.requestId, action: 'file.download_issued', fileId: input.fileId, after: { audience: input.audience } }); });` (writeAudit already exists at the bottom of the file; do not put the filename or any customer data in `after`).
  3. In apps/backend/src/documents/memory-store.ts add `readonly audits: { action: string; fileId: string; audience: string }[] = [];` to InMemoryDocumentRecordStore and implement `async recordDownloadIssued(input) { this.audits.push({ action: 'file.download_issued', fileId: input.fileId, audience: input.audience }); }`.
  4. In apps/backend/src/documents/service.ts `issueDownload`, add `requestId: string` to the input type, and after `const link = await this.r2.issueDownload(...)` insert `await this.store.recordDownloadIssued({ workspaceId: input.workspaceId, actorId: input.actorId, requestId: input.requestId, fileId: file.id, audience: input.ownedLeadId === undefined ? 'staff' : 'website' });` before the return.
  5. Update both callers to pass the request id: apps/backend/src/routes/staff.ts:1640-1644 add `requestId: req.id`; in apps/backend/src/routes/website.ts find the handler that calls `documentService.issueDownload` (near the `admit('file-download')` route at line ~693) and add `requestId: req.id` to its input.
- **Acceptance criteria:** Add a test to apps/backend/src/documents/service.test.ts that creates and finalizes a file with InMemoryDocumentRecordStore (as the existing tests do), calls `service.issueDownload({ workspaceId, actorId, fileId, requestId: 'req-1' })`, and asserts `store.audits` equals `[{ action: 'file.download_issued', fileId, audience: 'staff' }]`; with `ownedLeadId` set it must record audience 'website'. `pnpm --filter @canadian-plans/backend typecheck` and `pnpm test` pass.
- **Risk of fix:** Low. Adds one audit insert per download link in its own short tenant transaction after the R2 presign (no external call inside a transaction, so invariant 7 holds). The fake document service in apps/backend/tests/documents-route.test.ts accepts any input shape and needs no change.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-08] Individually granted privileged permissions bypass the MFA (aal2) requirement for non-Owner/Finance members
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/backend/src/staff/authorization.ts:143-146, apps/backend/tests/authorization.test.ts:54-63, apps/backend/tests/documents-route.test.ts:66-72 and 124-135
- **Problem:** createAuthorize requires aal2 only when the member holds the owner or finance role: `const mfaRole = access.roles.some((role) => role === 'owner' || role === 'finance'); if (mfaRole && privilegedActions.has(input.action) && options.assuranceLevel !== 'aal2') ...`. A member whose roles are Orders/Viewer/Content/Partners but who has an individual `deletion`, `document_download`, `financial_data`, `bulk_export`, `invoice_approval` or `integration_management` grant is allowed the privileged action with a password-only (aal1) session. tests/documents-route.test.ts codifies this: a Viewer with `document_download: allow` at aal1 gets 200 from the download-link route.
- **Impact (plain English):** A password-only account that has been given an extra permission can permanently delete a customer's data, download identity documents, mark partner commissions as paid, create website API credentials or retry outbox jobs without ever completing two-factor authentication. If that staff member's password is phished, the attacker gets those powers too.
- **Evidence:**
  ```text
  authorization.ts:143-146: `const mfaRole = access.roles.some((role) => role === 'owner' || role === 'finance');\n    if (mfaRole && privilegedActions.has(input.action) && options.assuranceLevel !== 'aal2') {\n      return { allowed: false, reason: 'mfa_required' };`
  ```
- **Fix steps:**
  1. In apps/backend/src/staff/authorization.ts replace lines 143-146 with: `if (privilegedActions.has(input.action) && options.assuranceLevel !== 'aal2') { return { allowed: false, reason: 'mfa_required' }; }` and delete the `mfaRole` constant.
  2. In apps/backend/tests/authorization.test.ts lines 54-63 ('explicit allow grant overrides a role denial'), change `assuranceLevel: 'aal1'` to `'aal2'` for that authorize instance, and add a new `it` asserting that `orders` + `{ name: 'document_download', effect: 'allow' }` at `aal1` resolves to `{ allowed: false, reason: 'mfa_required' }`.
  3. In apps/backend/tests/documents-route.test.ts set the 'token' session at lines 68-72 to `assuranceLevel: 'aal2'`, and add a test registering a second token with `assuranceLevel: 'aal1'` that asserts the granted-permission download request returns 403 with error code `mfa_required`.
  4. Confirm the admin already handles the `mfa_required` error code generically (run `git grep -n mfa_required -- apps/admin`); no admin change is expected.
- **Acceptance criteria:** `pnpm test` passes with the updated and added tests; manual check: a staff member with role Orders plus an individual `document_download` grant, logged in without completing MFA, gets 403 `mfa_required` from POST .../files/:fileId/download-link and succeeds after MFA.
- **Risk of fix:** Medium. Any existing non-Owner/Finance member relying on an individual grant must enrol and complete MFA before those actions work again; `workspace.read` and `order.manage` are unaffected. The email delivery route hard-codes aal1 (routes/email.ts:46) but only checks `workspace.read`, so it is unaffected.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** PLATFORM_CONTEXT.md invariant 11 literally says 'Owner and Finance privileged actions require a verified aal2 session', so the current code may be intentional. The owner must decide whether privileged individual grants to other roles should also require MFA. If the current behaviour is intended, record that decision in PLATFORM_CONTEXT §4 and close this finding.

### [SEC-09] Lead list returns full contact PII (name, email, phone) to every workspace.read role, including Viewer, Content and Partners
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/backend/src/routes/staff.ts:357-392, apps/backend/src/leads/store.ts:421-452, packages/contracts/src/workspace-leads.ts:25-36
- **Problem:** GET /workspaces/:workspaceId/leads authorizes only `workspace.read` (granted to every role: owner, orders, partners, finance, content, viewer per authorization.ts:30-37) and returns `result.leads` unchanged. DatabaseLeadStore.listLeads selects `fullName`, `email`, `phone`, `countryCode` and the contract's `contact: leadContactSchema` carries them to the client. By contrast the orders list deliberately limits contact search to members with `order.manage` or `financial.read` (staff.ts:165-178, 603 `includeContactSearch: capabilities.canSearchContact`), showing the intent that read-only roles should not browse customer contact details. Invariant 14 requires explicit per-audience response fields.
- **Impact (plain English):** Anyone invited as a Viewer, Content editor or Partners-role user can page through every prospective customer's name, email address and phone number. If such an account is shared, compromised or belongs to an external partner, the whole lead book leaks.
- **Evidence:**
  ```text
  leads/store.ts:426-429: `fullName: leads.fullName, email: leads.email, phone: leads.phone, countryCode: leads.countryCode,`; staff.ts:371-375 authorizes `action: 'workspace.read'` only; staff.ts:388 `res.json({ leads: result.leads, ... })`.
  ```
- **Fix steps:**
  1. In apps/backend/src/routes/staff.ts leads handler (lines 357-392), after the `workspace.read` decision passes, add: `const [manage, finance] = await Promise.all([authorize({ actorId: actor.actorId, workspaceId: workspaceId.data, action: 'order.manage' }), authorize({ actorId: actor.actorId, workspaceId: workspaceId.data, action: 'financial.read' })]); const canViewContact = manage.allowed || finance.allowed;`
  2. Change the response to `res.json({ leads: canViewContact ? result.leads : result.leads.map((lead) => ({ ...lead, contact: {} })), page: result.page, requestId: req.id });` (verify in packages/contracts/src that every field of `leadContactSchema` is optional; apps/backend/tests/staff-routes.test.ts:120 builds a lead with `contact: { email }` only, so name/phone already are; if `email` is required, make it optional in the schema).
  3. Add a test in apps/backend/tests/staff-routes.test.ts: with `store.access.roles = ['viewer']` GET /leads returns leads whose `contact` is `{}`; with `['orders']` it returns `sampleLead` unchanged.
- **Acceptance criteria:** New staff-routes tests pass; manual check in the admin leads page: a Viewer-role login sees lead rows without name/email/phone, an Orders-role login sees them.
- **Risk of fix:** Medium. The admin leads page will render blank contact cells for read-only roles; check apps/admin for components that assume `contact.email` is present. If the Partners role is meant to work leads, add `partners` to the allowed set explicitly.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner must confirm which roles are meant to see lead contact details. The code is unambiguous; only the intended policy is unverified.

### [SEC-10] Backend container runs as root
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/backend/Dockerfile:29-38
- **Problem:** The runtime stage never adds a `USER` instruction, so the Express process runs as uid 0 inside the container. The official node image ships a non-root `node` user (uid 1000) for exactly this purpose. Running as root means any code-execution bug in the app or its dependencies (express, postgres driver, zod, the hand-rolled HTTP adapters) gives an attacker root inside the container, which widens the blast radius of a container escape and lets the process modify its own /repo files.
- **Impact (plain English):** If an attacker ever gets code execution on the API server, they get it as the most powerful user in the container instead of an unprivileged one. This is a standard hardening gap that security reviewers and partner questionnaires will flag.
- **Evidence:**
  ```text
  Dockerfile:29-38
  FROM base AS runtime
  ENV NODE_ENV=production
  COPY --from=build /repo /repo
  WORKDIR /repo/apps/backend
  CMD ["node", "dist/src/server.js"]
  ```
- **Fix steps:**
  1. In apps/backend/Dockerfile runtime stage, change `COPY --from=build /repo /repo` to `COPY --from=build --chown=node:node /repo /repo`.
  2. Add the line `USER node` immediately before `CMD ["node", "dist/src/server.js"]`.
  3. Nothing in the app writes to disk at runtime (the only fs write is the build-time scripts/write-vercel-handler-dts.mjs), so no writable directory is needed.
- **Acceptance criteria:** Build the image locally (`docker build -f apps/backend/Dockerfile .`), run it with the staging env, and confirm `docker exec <container> id -u` prints 1000 and GET /api/v1/health returns 200. Railway deploy health check passes.
- **Risk of fix:** Low. PORT is 4000 (unprivileged), so no port-binding issue. If any future code tries to write under /repo it will now fail with EACCES, which is desirable.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-11] Legacy Vercel backend entry (vercel.json, api/index.ts, vercelHandler bundle) is still deployable a month after the Railway cutover
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/backend/vercel.json:1-11, apps/backend/api/index.ts:15, apps/backend/src/vercelHandler.ts:8, apps/backend/tsup.config.ts:26, apps/backend/scripts/write-vercel-handler-dts.mjs, apps/backend/package.json:9, docs/ADR/0004-backend-on-railway.md:66-69
- **Problem:** ADR 0004 D6 kept the Vercel backend only 'until cutover is verified'; the cutover was completed in September 2026 but the files remain and the build script still produces dist/vercelHandler.js and its .d.ts on every build. If the Vercel project that built apps/backend still exists and is linked to the repo, every push to main also deploys a second, unmanaged backend on Vercel with whatever production env vars it was given (DATABASE_URL, CRON_SECRET, MACHINE_REGISTRY_JSON, RESEND_API_KEY). That instance has no graceful shutdown, exceeds function limits on the 120s runners, and accepts the scheduler-authenticated internal routes if its env still carries CRON_SECRET and DEPLOYMENT_ENV/VERCEL_ENV=production. The sfo1 region pin ADR 0004 said would be removed is still there.
- **Impact (plain English):** A forgotten second copy of the API could keep running old code against the production database with production secrets, and anyone who still has its URL can reach it. Even if the project was deleted, the dead code and extra build step confuse the next engineer and keep the hand-written .d.ts hack alive for nothing.
- **Evidence:**
  ```text
  vercel.json:3-9  "regions": ["sfo1"], "rewrites": [{ "source": "/(.*)", "destination": "/api" }]
  api/index.ts:15  export { default } from '../dist/vercelHandler.js';
  package.json:9  "build": "tsup && node scripts/write-vercel-handler-dts.mjs"
  ADR 0004:66-69  D6 — Keep the Vercel backend deployed until cutover is verified ... retained until a separate post-cutover change removes them.
  ```
- **Fix steps:**
  1. Owner/operator: in the Vercel dashboard confirm whether a project whose root directory is apps/backend still exists. If it does, delete it (or at minimum remove all production environment variables from it and disconnect the git integration) and rotate CRON_SECRET and the service credentials it held, following docs/RUNBOOKS/secret-rotation.md.
  2. Delete apps/backend/vercel.json, apps/backend/api/index.ts, apps/backend/src/vercelHandler.ts and apps/backend/scripts/write-vercel-handler-dts.mjs.
  3. In apps/backend/tsup.config.ts change `entry` to `{ 'src/server': 'src/server.ts' }` and remove the vercelHandler comment block; in apps/backend/package.json change the build script to `"build": "tsup"`.
  4. Check scripts/affected-builds.mjs for a `--vercel backend` branch and remove it if present; update ADR 0004 D6 with a one-line note that the Vercel backend surface was removed on the date of the change.
- **Acceptance criteria:** `pnpm --filter backend build` succeeds and dist/ contains only src/server.js (no vercelHandler.*); `pnpm typecheck` and `pnpm lint` pass; Railway deploy from the Dockerfile still starts (`CMD node dist/src/server.js` unchanged). Owner confirms no Vercel project builds apps/backend.
- **Risk of fix:** Low. Removing the Vercel entry cannot affect Railway, which runs dist/src/server.js. If the Vercel project still exists and is still relied on as a rollback target (ADR D6), removal should be a deliberate owner decision.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Could not check from the repo whether a Vercel project for apps/backend still exists; confirm in the Vercel dashboard (or `vercel project ls`). The dead-code part of the finding is verified in the repo.

### [SEC-13] CSP allows inline scripts and any https destination while the Supabase session token sits in localStorage
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/admin/next.config.ts:39-44, apps/admin/src/lib/supabase-auth.ts:12-18
- **Problem:** The staff access/refresh tokens are persisted by supabase-js in `localStorage` (auth-js default `persistSession: true`, storage `globalThis.localStorage`, GoTrueClient.js:21,255; no custom storage is passed). The CSP meant to 'pin the origins admin actually talks to' then grants `script-src 'unsafe-inline'`, `connect-src ... 'https:'` and `img-src ... 'https:'`. With `'unsafe-inline'` any injected script runs, and with `https:` in connect-src/img-src it can read `localStorage` and POST or beacon the token to any https host. The pinned API/Supabase/Sentry origins are therefore decorative.
- **Impact (plain English):** If any cross-site-scripting bug is ever introduced (a future dependency, a rendered CMS string, a markdown note), an attacker can steal a staff member's login token — including an Owner's MFA-verified session — and operate the admin from their own machine. The CSP that exists today would not stop the theft.
- **Evidence:**
  ```text
  next.config.ts:42 `'script-src': dedupe(["'self'", "'unsafe-inline'", ...scriptExtra])`, :44 `'connect-src': dedupe(["'self'", apiOrigin, supabaseOrigin, sentryOrigin, 'https:'])`, :39 `'img-src': ["'self'", 'data:', 'blob:', 'https:']`. supabase-auth.ts:12-18 passes no `storage` option.
  ```
- **Fix steps:**
  1. In apps/admin/next.config.ts `buildCsp()`, remove the trailing `'https:'` from `connect-src` so it reads `dedupe(["'self'", apiOrigin, supabaseOrigin, sentryOrigin])`.
  2. In the same function remove `'https:'` from `img-src` (admin only loads `/brand/canadian-plans-icon.png` and a `data:` QR code) so it reads `["'self'", 'data:', 'blob:']`.
  3. Add a guard after the origin constants: `if (isProduction && (!apiOrigin || !supabaseOrigin)) throw new Error('NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_SUPABASE_URL must be set for the production CSP');` so a missing env var fails the build instead of silently blocking the API at runtime.
  4. Follow-up (larger, optional): replace `'unsafe-inline'` with a per-request nonce via a `src/proxy.ts` that sets the CSP header with `'nonce-…'` and `'strict-dynamic'`; Next 16 forwards the nonce to its inline scripts when the header is present. Treat as a separate task and test the login page, Supabase redirects and Sentry posting afterwards.
- **Acceptance criteria:** After deploy, open DevTools → Network on the admin: the `Content-Security-Policy` response header contains no bare `https:` in `connect-src` or `img-src`. Sign in, load orders, trigger a Sentry test error, and enrol MFA (QR renders): no CSP violations in the console. A build with `NEXT_PUBLIC_API_BASE_URL` unset must fail.
- **Risk of fix:** Medium. Removing `https:` means every origin the browser contacts must be listed; today those are the backend, Supabase and Sentry, all derived from env. If Vercel Analytics/Speed Insights or another external script is added later, its origins must be added explicitly. The nonce step is the risky one and is deliberately split out.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-14] No defined least-privilege database roles for the backup job; lease table RLS means a dedicated role would be denied unless it bypasses RLS
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** .github/workflows/backup.yml:52-54, jobs/src/backup/lease.ts:25-40, jobs/src/backup/sources.ts:85-98, packages/db/drizzle/0019_backup_leases.sql:6-9, docs/RUNBOOKS/restore.md:43-61
- **Problem:** Invariant 13 says the backup workflow 'gets only the read/export + archive-write access it needs'. The workflow needs two Postgres URLs: SOURCE_DATABASE_URL for `supabase db dump` (must read every schema including auth) and BACKUP_LEASE_DATABASE_URL to INSERT/DELETE in app.backup_leases. Neither docs/ENV.md nor the runbooks define which roles these should be (git grep for BACKUP_LEASE_DATABASE_URL in docs returns nothing). Migration 0019 enables and FORCEs RLS on app.backup_leases with no policy and revokes app_runtime, so a purpose-built lease role without BYPASSRLS is denied on INSERT; the only role that works out of the box is Supabase's `postgres` owner role, which can also drop every table. `PgBackupLease.acquire` (lease.ts:48-49) additionally discards psql's real stderr and reports every non-lease failure as `backup_lease_unavailable`, hiding a permission or RLS error.
- **Impact (plain English):** The practical path for the owner is to paste the full `postgres` connection string into the backup environment, giving a nightly third-party-action-running job full write/drop power over production, which the invariant explicitly forbids; and if a restricted role is used instead, the job fails with an unhelpful error.
- **Evidence:**
  ```text
  0019_backup_leases.sql:6-9: `ALTER TABLE "app"."backup_leases" ENABLE ROW LEVEL SECURITY; ... FORCE ROW LEVEL SECURITY; REVOKE ALL ON TABLE "app"."backup_leases" FROM app_runtime;` (no CREATE POLICY); lease.ts:48-49: `if (!result.stderr.includes('document_cleanup_active') || attempt === 24) throw new CommandFailedError('psql', result.exitCode, 'backup_lease_unavailable');`
  ```
- **Fix steps:**
  1. Add a Drizzle migration creating two login roles: `backup_reader` with `GRANT pg_read_all_data TO backup_reader` (and `GRANT USAGE ON SCHEMA auth, storage, supabase_migrations, app TO backup_reader` if needed), and `backup_lease_writer` with `GRANT INSERT, UPDATE, DELETE, SELECT ON app.backup_leases TO backup_lease_writer` plus `CREATE POLICY backup_leases_writer_policy ON app.backup_leases FOR ALL TO backup_lease_writer USING (true) WITH CHECK (true)` (this table holds no tenant data, so a permissive policy for this single role is acceptable; document why next to invariant 2). Passwords are set out-of-band by the owner, never in the migration.
  2. Document in docs/ENV.md and docs/RUNBOOKS/restore.md 'Required access' that BACKUP_SOURCE_DATABASE_URL must use `backup_reader` and BACKUP_LEASE_DATABASE_URL must use `backup_lease_writer`, never `postgres`.
  3. In jobs/src/backup/lease.ts line 49 pass `result.stderr.slice(0, 200)` (psql does not echo the connection string) instead of the constant 'backup_lease_unavailable' so permission errors are visible in the run log; keep the retry loop for `document_cleanup_active`.
- **Acceptance criteria:** Against the CI Postgres, after migrating: `psql postgresql://backup_lease_writer:...@localhost/canadian_plans_test -c "insert into app.backup_leases values ('t', now()+interval '1 minute')"` succeeds and the same role cannot `select * from app.orders`; `backup_reader` can `pg_dump` the auth schema but `insert into app.orders ...` is denied; lease.test.ts asserts the thrown message contains the psql stderr text.
- **Risk of fix:** Medium. New roles and a policy on a non-tenant table; must be reviewed against invariant 2 wording. `supabase db dump --role-only` may need the reader to see pg_authid-adjacent catalog views; test the five dump commands with the new role before switching the secret.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm which role the owner intends for the two URLs (if a role with BYPASSRLS other than postgres already exists, the migration can be reduced to grants). Also confirm `supabase db dump` works with a non-owner read-only role.

### [SEC-15] check:preview-isolation passes vacuously: the inventory says no deployments exist, while PR preview deployments are live on Vercel
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** docs/DEPLOYMENT_INVENTORY.json:4-13, docs/DEPLOYMENT_INVENTORY.json:112-128, scripts/check-preview-isolation.mjs:139-141, scripts/check-preview-isolation.mjs:184-207, .github/workflows/ci.yml:49-50, apps/admin/vercel.json, apps/site-1/vercel.json
- **Problem:** The CI step 'Verify preview credentials target isolated non-production resources' validates a self-declared JSON file. That file (reviewedAt 2026-09-14) says `vercelProjectCount: 0`, `foundationInfrastructureReady: false`, every deployment `not_provisioned` with zero credential bindings. Reality (release-rollback.md:18-21 and the deployment-state memory): two Vercel projects are live and the `ignoreCommand` builds a preview for any PR touching the app. The script's rule at lines 139-141 only forbids listing credentials for a not_provisioned deployment, so the current inventory passes while asserting nothing about the real preview deployments' env vars. Invariant 13 ('No production credentials in preview') is therefore unenforced; whether Vercel's Preview-scoped env vars differ from Production is unknown.
- **Impact (plain English):** A pull request from any branch builds a public preview URL of admin and site-1; if their Preview environment variables are the production ones (default when a variable is added to 'All environments'), that preview talks to the production backend/Supabase with production keys, and untested PR code can create or read real orders.
- **Evidence:**
  ```text
  DEPLOYMENT_INVENTORY.json:9-13: `"vercelProjectCount": 0, ... "foundationInfrastructureReady": false`; :112-127 three deployments with `"status": "not_provisioned", "credentialNames": []`; check-preview-isolation.mjs:139-141 only rejects credentials when not provisioned.
  ```
- **Fix steps:**
  1. Owner checks in Vercel → each project → Settings → Environment Variables that every variable listed under `credentialCatalog` for admin and site-1 (NEXT_PUBLIC_SUPABASE_ANON_KEY, SITE_1_SERVICE_CREDENTIAL, SANITY_API_TOKEN, SENTRY_AUTH_TOKEN, plus the backend URL) has a distinct Preview-scope value pointing at non-production resources, or disables preview deployments for the project (Settings → Git → 'Ignored Build Step' always skip for non-production, or Deployment Protection).
  2. Update docs/DEPLOYMENT_INVENTORY.json to the real state: set each `previewDeployments[].status` to `provisioned` with the credential names actually set for Preview, add `resources` entries (SHA-256 of the provider's immutable id, e.g. a separate Supabase project ref and a preview service credential id) and `previewCredentialBindings` for each, and add `productionResourceFingerprints` for the production Supabase project and backend credential so the script's cross-check (lines 88-93) actually runs. Refresh `providerObservation` and `reviewedAt`.
  3. If preview deployments are disabled instead, record that decision in the inventory `notes` and in docs/RUNBOOKS/release-rollback.md so the vacuous pass is a documented choice.
- **Acceptance criteria:** `pnpm run check:preview-isolation` prints `N/N deployments provisioned, M credential bindings` with M > 0 (or the inventory notes document that previews are disabled and a Vercel PR deployment is confirmed not to be created); a PR preview of site-1, when it exists, shows a non-production backend URL in its network calls.
- **Risk of fix:** Low. Documentation/inventory change plus Vercel settings; no application code changes.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm in the Vercel dashboard whether Preview deployments are created for PRs and whether their environment variables are production values. The stale inventory and the vacuous pass are verified in the repo.

### [SEC-16] 'No contract on anything' claims conflict with the catalogue's 2-year price lock, 15-day trial and provider service agreement
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/site-1/content/home-redesign.ts:299,332,342,396,521,569,739,881, apps/site-1/content/components.ts:369, apps/site-1/content/home-internet.ts:119-122, packages/adapters/src/static-catalogue/site-1-plans.ts:126-135, apps/site-1/content/legal-published.ts:45-48
- **Problem:** The homepage asserts 'No contract on anything', 'No contract' chips/stickers, 'Unlimited data, free installation and no contract' for home internet and 'No contract on any of our plans' in the FAQ. The internet offers in the static catalogue carry a 'No upfront payment and a 2-year price lock' promotion with a 15-day trial, the Terms say the service agreement is with the provider, and the home-internet FAQ itself answers 'Is there a contract?' with 'Your service agreement is with the provider… price is locked for 2 years'. Whether the provider imposes a term commitment is not recorded anywhere in the owner inputs.
- **Impact (plain English):** If the provider's 2-year price lock is tied to a term commitment (common for Canadian internet promos), customers were told the opposite on the homepage and could dispute early-cancellation fees, citing the site. Even if no term exists, the site says two different things about the same question.
- **Evidence:**
  ```text
  home-redesign.ts:342  eyebrow: 'No contract on anything',
  home-redesign.ts:396  features: ['Unlimited data', 'Free installation', 'No contract'],
  home-internet.ts:121  'Your service agreement is with the provider, and an advisor explains it before anything is booked. In Manitoba, British Columbia and Alberta your monthly price is locked for 2 years.'
  site-1-plans.ts:128  headline: 'No upfront payment and a 2-year price lock',
  ```
- **Fix steps:**
  1. OWNER APPROVAL: ask the owner whether any internet or BYOD mobile plan carries a term commitment with the provider. Until answered, make the homepage match the FAQ wording that is already live:
  2. apps/site-1/content/home-redesign.ts line 342: change `eyebrow: 'No contract on anything'` to `eyebrow: 'Nothing to pay today'`.
  3. Line 299: change `chips: ['✓ No contract', '✓ Keep your number']` to `chips: ['✓ Bring your own phone', '✓ Keep your number']`; line 332: change `sticker: 'No contract'` to `sticker: '$0 to order'`.
  4. Line 396: change 'No contract' in the Home Internet column features to 'Free WiFi router & modem'; line 521: replace 'free installation and no contract' with 'free installation and no upfront payment'; line 569: replace 'Free installation, unlimited data, no contract.' with 'Free installation, unlimited data, no upfront payment.'; line 739: replace 'No contract, no store visit.' with 'No payment online, no store visit.'
  5. Line 881 is covered by the bracketed-FAQ finding (answer becomes 'There is no contract with Canadian Plans. Your service agreement is with the provider…').
  6. If the owner confirms there is genuinely no term on every plan, add that sentence to `internetTerms` in site-1-plans.ts and to the Terms (version bump) instead, and the homepage copy can say 'No term contract'.
- **Acceptance criteria:** `git grep -n -i 'no contract' apps/site-1/content/home-redesign.ts` returns nothing; the home-internet FAQ answer about contracts and the homepage say the same thing; typecheck passes.
- **Risk of fix:** Low. Copy only. Pre-arrival plan cards also say 'No contract' (pre-arrival.ts:194,219,245, site-1-plans.ts:525,545,565); those come from the owner's canadaesim source and were left alone, but the owner should confirm them in the same question.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner must state whether the provider's 2-year price lock / 15-day trial on MB, BC and AB internet involves a term commitment, and whether BYOD mobile postpaid plans are month-to-month.

### [SEC-17] Provider naming is inconsistent: site-wide 'Authorized Rogers, Fido & Chatr dealer' and 'Rogers' internet copy versus catalogue/Terms that leave the internet and mobile provider unnamed
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/site-1/content/home-internet.ts:32,94, apps/site-1/content/internet-order.ts:38, apps/site-1/content/home-redesign.ts:294,310,420,636,650,859, apps/site-1/content/site-chrome.ts:45, apps/site-1/content/components.ts:101,169,203, apps/site-1/content/about.ts:12-14,26,35,86,93,121, apps/site-1/content/faq.ts:124,129, apps/site-1/content/system.ts:179, apps/site-1/content/emails.ts:28,66, packages/adapters/src/static-catalogue/site-1-plans.ts:28-33, apps/site-1/content/legal-published.ts:45-48, docs/LAUNCH_PLANS.md:113-116
- **Problem:** The owner's inputs (LAUNCH_PLANS.md 'Filled from the owner's other sites') say the internet/TV and BYOD mobile provider is NOT named: Canadian Plans is an 'authorised sales agent' and each plan says the provider is confirmed by the advisor (internet) or at order approval (mobile). The static catalogue and the published Terms follow that. Yet the header/footer/about/homepage call the company an 'Authorized Rogers, Fido & Chatr dealer' for everything, the home-internet hero says '✓ Authorized Rogers dealer in Surrey, BC', the TV block sells 'Rogers TV', the internet order form says 'Rogers needs this to set up your account', the homepage says 'Your plan is a real Rogers, Fido or Chatr account in your name' (including internet/mobile), and the search result for Vancouver says 'Rogers-network internet'.
- **Impact (plain English):** Either the internet/mobile provider is Rogers and the catalogue/Terms under-disclose it, or it is not and the site is telling internet customers they are buying a Rogers account when the service may come from another provider, which is a misrepresentation and may breach the dealer agreement. A customer who is later told 'your provider is X' after reading 'Authorized Rogers dealer' on the internet page has grounds to complain.
- **Evidence:**
  ```text
  site-1-plans.ts:32  const INTERNET_PROVIDER = 'The provider is confirmed by your advisor before installation';
  home-internet.ts:32  '✓ Authorized Rogers dealer in Surrey, BC',
  internet-order.ts:38  hint: 'Rogers needs this to set up your account.',
  legal-published.ts:45  'For internet, TV and mobile we act as an authorised sales agent for the providers we work with. For pre-arrival plans we are an authorised reseller of Rogers, Fido and chatr.'
  ```
- **Fix steps:**
  1. OWNER APPROVAL: ask the owner one question: 'Is the internet/TV and BYOD-mobile provider Rogers (so we may say so), or must it stay unnamed as on Canada Wide?'
  2. If it must stay unnamed: apps/site-1/content/home-internet.ts line 32 change to '✓ Authorized dealer in Surrey, BC'; line 94 change 'Add Rogers TV' to 'Add TV'; apps/site-1/content/internet-order.ts line 38 change to 'The provider needs this to set up your account.'; apps/site-1/content/home-redesign.ts lines 294 and 310 change the eyebrow to 'Authorized dealer · Surrey, BC', line 420 and 859 change 'a real Rogers, Fido or Chatr account' to 'a real account with the provider', lines 636 and 650 keep (mobile comparison) only if the mobile provider is one of the three; apps/site-1/content/system.ts line 179 change 'Rogers-network internet' to 'Home internet'; apps/site-1/content/site-chrome.ts line 45 and components.ts line 101/169 change the dealer line to 'Authorized dealer for Rogers, Fido & Chatr pre-arrival plans · Surrey, BC' or simply 'Authorized dealer · Surrey, BC'.
  3. If the owner confirms Rogers: update `INTERNET_PROVIDER` and `MOBILE_PROVIDER` in packages/adapters/src/static-catalogue/site-1-plans.ts lines 32-33 to name Rogers, update Terms section 1 in apps/site-1/content/legal-published.ts line 45 and bump BOTH `version` (line 259/265) and `TERMS_VERSION` (site-1-plans.ts line 38) to v3 per docs/legal/README.md, and add docs/legal/terms-v3.md.
- **Acceptance criteria:** The provider named (or deliberately not named) is identical in: the catalogue specs.carrier, the Terms section 1, the home-internet hero, the internet order form hint and the homepage explorer info card. `git grep -n -i rogers apps/site-1/content/home-internet.ts apps/site-1/content/internet-order.ts` returns no hits if the provider stays unnamed.
- **Risk of fix:** Medium. Touches brand copy on every page (header/footer dealer line). If the owner picks 'name Rogers', the legal version bump changes what new orders record; existing orders keep v2.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner must confirm the actual internet/TV and BYOD mobile provider. LAUNCH_PLANS.md:115 says 'The provider is not named on Canada Wide'.

### [SEC-18] Fictional author and reviewer personas ('Ananya R.', 'Priya') published as real people, including in Article JSON-LD and Open Graph
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/site-1/content/guides.ts:147-161, apps/site-1/src/lib/guide-content.ts:26-27, apps/site-1/src/app/(guides)/guides/[slug]/page.tsx:28,65-79, apps/site-1/content/track-order.ts:120, apps/site-1/content/home.ts:274
- **Problem:** The live guide /guides/best-sim-for-students-from-india shows 'Written by Ananya R. · Student · moved Pune → Toronto in 2023' and 'Reviewed by Priya · Plan advisor, Canadian Plans', with an image caption '(real photo, with consent)' over an empty image slot. guide-content.ts emits both as schema.org Person (author / reviewedBy) and the page puts the author in openGraph.authors. The content file is marked previewOnly and the personas appear to be design fixtures (the same 'Priya' is the fixture advisor in track-order.ts and home.ts).
- **Impact (plain English):** If these people do not exist, the site is fabricating authorship and expert review to gain trust (and search engines read it as E-E-A-T signals). A reader asking to speak to 'Priya' cannot. If they do exist, the owner must have their consent to be named.
- **Evidence:**
  ```text
  guides.ts:148-149  name: 'Ananya R.',  label: 'Written by Ananya R.',  detail: 'Student · moved Pune → Toronto in 2023',
  guides.ts:161  imageCaption: 'Student from India at airport arrivals, phone in hand (real photo, with consent)',
  guide-content.ts:26-27  author: { '@type': 'Person', name: article.author.name },  reviewedBy: { '@type': 'Person', name: article.reviewer.name },
  ```
- **Fix steps:**
  1. OWNER APPROVAL: confirm whether Ananya R. and Priya are real, consenting people. If not:
  2. apps/site-1/content/guides.ts lines 147-157: set author to `{ name: 'Canadian Plans', label: 'Written by the Canadian Plans team', detail: 'Plan advisors in Surrey, BC', avatar: <keep> }` and reviewer to `{ name: 'Canadian Plans', label: 'Checked against carrier plan pages', detail: 'October 2026', avatar: <keep> }`.
  3. apps/site-1/src/lib/guide-content.ts line 26: change author to `{ '@type': 'Organization', name: siteChrome.brand }` and delete the `reviewedBy` line 27.
  4. apps/site-1/content/guides.ts line 161: remove ' (real photo, with consent)'.
  5. apps/site-1/src/app/(guides)/guides/[slug]/page.tsx line 28: remove `authors: [article.author.name]` from openGraph (Organization authors are not valid there).
- **Acceptance criteria:** View source of /guides/best-sim-for-students-from-india: the JSON-LD author is an Organization and there is no reviewedBy Person; the byline no longer names an individual unless the owner confirmed them; guide-content.test.ts updated to the new shape passes.
- **Risk of fix:** Low. guide-content.test.ts may assert the Person shape and needs the expectation updated.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner to confirm whether the named author/reviewer exist and consented. If yes, keep names but still remove '(real photo, with consent)' until a real photo is present.

### [SEC-19] Marketing email template lacks CASL sender identification (name, mailing address, contact) and transactional emails carry no business identity or 'you have not been charged' line
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** packages/adapters/src/messaging.ts:228-271, apps/site-1/content/emails.ts:7-11, apps/site-1/src/emails/render.tsx:8, apps/site-1/src/app/(email-previews)/dev/emails/page.tsx:48-49
- **Problem:** The backend's live templates are one-line plain text. 'abandoned_form_marketing' (a commercial electronic message) includes an unsubscribe URL but no sender name, mailing address or phone/email, which CASL s.6(2) requires in every CEM. The transactional templates ('order_acknowledgement' etc.) give no business identity, no contact route, no 'nothing has been charged' statement and no tracking link, even though the order flow promises a confirmation with a reference and the site promises 'We will never ask for your password or card number by email'. The designed React Email templates in apps/site-1/src/emails (with a proper footer in content/emails.ts) are only used by the /dev/emails preview page; the backend never renders them.
- **Impact (plain English):** A marketing email without identification is a CASL violation (penalties per message). Customers receiving 'Thanks — we received your order CP-… We'll email you as it progresses.' from an unidentified sender may treat it as phishing, and have no way to track or cancel.
- **Evidence:**
  ```text
  messaging.ts:236-240  case 'order_acknowledgement': return { subject: `We received your order ${ref}`, text: `Thanks — we received your order ${ref}. We'll email you as it progresses.` };
  messaging.ts:263-269  case 'abandoned_form_marketing': … text: `You started a plan application but didn't finish. Pick up where you left off.\n\nUnsubscribe: ${message.unsubscribeUrl ?? ''}`,
  ```
- **Fix steps:**
  1. In packages/adapters/src/messaging.ts add above renderTemplate: `const SENDER_FOOTER = '\n\nCanadian Plans · 9981 Whalley Blvd, Surrey, BC V3T 0A8 · info@canadianplans.com · +1 778-682-3771';` (these are the owner-confirmed details already in legal-published.ts).
  2. Change renderTemplate so every returned `text` ends with SENDER_FOOTER (simplest: compute the object as `const result = …; return { ...result, text: result.text + SENDER_FOOTER }` by wrapping the switch in an inner function).
  3. For 'order_acknowledgement' change the text to: `Thanks — we received your order ${ref}. Nothing has been charged. An advisor will contact you (Mon–Sat, 9am–9pm Pacific) to confirm your plan. Track your order at https://canadianplans.com/track with this reference. Didn't place this order? Reply to this email and we will cancel it.`
  4. For 'abandoned_form_marketing' keep the unsubscribe line; the footer added in step 2 supplies the identification.
  5. Extend the adapters unit tests to assert every template's text contains 'Surrey, BC' and that the acknowledgement contains 'Nothing has been charged'.
- **Acceptance criteria:** adapters vitest passes with the new assertions; sending a test acknowledgement through the fake adapter shows the footer and the not-charged sentence; no template text is empty of sender identification.
- **Risk of fix:** Low. Text-only change. The hard-coded canadianplans.com/track URL matches the confirmed domain (OPEN_INPUTS #2); if a staging domain is used the link still points to production tracking, which is acceptable for a text footer.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Whether a pure order confirmation is a CEM under CASL is a legal question; the marketing template's missing identification is not in doubt. A Canadian lawyer should confirm the footer wording.

### [SEC-20] saveDetails records whatever consentVersion the browser sends instead of the server's configured privacy-policy version
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/site-1/src/app/(storefront)/order/actions.ts:266-275, apps/site-1/src/app/(storefront)/order/types.ts:46-47, apps/site-1/src/app/(storefront)/order/order-form.tsx:208-228, apps/site-1/src/app/(storefront)/order/page.tsx:101
- **Problem:** The server component passes `siteConfig.legal.consentVersion` to the client `OrderForm`, which sends it back in `SaveDetailsInput.consentVersion`; the `saveDetails` server action then forwards `input.consentVersion` verbatim to `client.leads.create(...)`. The backend only checks it is a 1-64 char string (`consentVersionSchema`). The server already knows the correct value (`siteConfig` is imported in actions.ts for `creditCheckConsentVersion`), so there is no reason to trust the browser. Compare `waitlist.ts:26`, which correctly uses `siteConfig.legal.waitlistConsentVersion` server-side.
- **Impact (plain English):** The consent/disclosure version stored on every lead (a CASL/privacy record the business relies on) can be set to any string by anyone who edits the request in their browser, e.g. an old policy version or garbage. The compliance record would then not reflect what the customer was actually shown, which matters if a complaint or audit ever happens.
- **Evidence:**
  ```text
  actions.ts: `const created = await client.leads.create({ contact, form, productId: productId.data, attribution: input.attribution, consentVersion: input.consentVersion }, ...)`. waitlist.ts does it right: `consentVersion: siteConfig.legal.waitlistConsentVersion`.
  ```
- **Fix steps:**
  1. In `apps/site-1/src/app/(storefront)/order/actions.ts`, function `saveDetails`, change `consentVersion: input.consentVersion,` (inside the `client.leads.create` call) to `consentVersion: siteConfig.legal.consentVersion,`.
  2. In `apps/site-1/src/app/(storefront)/order/types.ts`, remove `consentVersion: string;` from `SaveDetailsInput` (and its doc comment).
  3. In `apps/site-1/src/app/(storefront)/order/order-form.tsx`, remove `consentVersion,` from both `saveDetails({...})` calls in `handleDetails` (lines ~215 and ~225). Keep the `consentVersion` prop if it is used for display; if it is now unused, remove it from `OrderFormProps`, the destructuring, and the `<OrderForm consentVersion=...>` prop in `page.tsx`.
  4. Update `apps/site-1/src/app/(storefront)/order/actions.test.ts`: assert the mocked `leads.create` is called with `consentVersion: 'privacy-2026-10-v2'` even when the input carries a different value.
- **Acceptance criteria:** `pnpm --filter site-1 typecheck` passes (no leftover references); the new unit test passes; manually, submitting the details step with the browser request body edited to `consentVersion: 'x'` still produces a lead whose `consent_version` is `privacy-2026-10-v2` in the admin lead view / DB.
- **Risk of fix:** Low. Pure server-side substitution; the value sent is the same one the page was already passing in the honest case. The e2e suite (`apps/site-1/e2e/order.spec.ts`) does not reference this field.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-21] Design-preview order and tracking pages are live in production; /order/pre-arrival asks real visitors for passport number, date of birth and ID scans on a form that goes nowhere
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/site-1/src/app/(pre-arrival-order)/order/pre-arrival/page.tsx:10-22, apps/site-1/src/components/pre-arrival-order/flow.tsx:572-589, apps/site-1/content/pre-arrival-order.ts:66-72, apps/site-1/content/pre-arrival-order.ts:161-165, apps/site-1/src/app/(internet-order)/order/home-internet/page.tsx:20-27, apps/site-1/src/app/(track-order)/track-order/page.tsx:16-49, apps/site-1/content/metadata.ts:12-14
- **Problem:** Three Figma-fixture flows ship as real routes with no production gate: `/order/pre-arrival` (two-step form collecting name, phone, email, arrival date, passport number, date of birth, passport and permit file uploads, persisted in sessionStorage/IndexedDB, then posted to `preArrivalPreviewAction` which only validates), `/order/home-internet` (full personal + address form, `OrderConfirmation kind="preview"`), and `/track-order` (fixture order for 'Aarav Sharma' with fake email/phone/number; any real order number returns 'We couldn't find that order'). The copy does say 'Preview only · no order sent' on the final screens, but step 2 of pre-arrival says 'Rogers requires ID to activate a Canadian number' and the pages are noindex-but-200 at URLs that look like the real `/order` and `/track`. They are not linked from navigation, so they are reachable only by URL guessing or stale links. No visitor would be charged, but sensitive identity data is solicited by a dead form on the production domain.
- **Impact (plain English):** A visitor who finds `/order/pre-arrival` (e.g. from an old shared link) can spend ten minutes typing their passport number and uploading ID scans, then be told it was a preview and nothing was sent; some will not read that and will wait for a call that never comes. A visitor who lands on `/track-order` with a real order number is wrongly told the order does not exist. These are reputational and privacy-perception risks rather than data leaks (nothing is stored server-side).
- **Evidence:**
  ```text
  flow.tsx: `<FileSlot name="passportFile" .../> <FileSlot name="permitFile" .../> <OrderField name="passportNumber" .../> <OrderField name="birthDate" .../>`; pre-arrival-order.ts: `intro: 'Rogers requires ID to activate a Canadian number. A clear phone photo is fine.'` and `status: 'Preview only · no order sent'`; tracking-preview.ts `lookupTrackingFixture` returns `'not-found'` for anything but the fixture reference; metadata.ts labels both /order/* routes 'Preview the … order form.' but `/track-order` as 'Look up a Canadian Plans order and review its status.'
  ```
- **Fix steps:**
  1. In `apps/site-1/src/app/(pre-arrival-order)/order/pre-arrival/page.tsx`, at the top of the default export (before `await searchParams`), add `if (process.env.VERCEL_ENV === 'production') notFound();` and add `import { notFound } from 'next/navigation';`.
  2. Apply the same two lines to `apps/site-1/src/app/(internet-order)/order/home-internet/page.tsx` (it already imports `notFound`) and to `apps/site-1/src/app/(track-order)/track-order/page.tsx` (add the import).
  3. In `apps/site-1/content/metadata.ts` change the `/track-order` description to 'Preview the order tracking design.' so the metadata matches the other two previews.
  4. If the owner wants the previews to stay public, instead of steps 1-2 add a persistent visible banner at the top of each page: `<p role="note" className="cp-preview-banner">Design preview — nothing you enter here is sent or saved. To order, use /order.</p>` and remove the 'Rogers requires ID…' sentence from `preArrivalOrderCopy.stepTwo.intro`.
- **Acceptance criteria:** On the production deployment `curl -s -o /dev/null -w '%{http_code}' https://canadianplans.com/order/pre-arrival`, `/order/home-internet` and `/track-order` return 404, while a Vercel preview deployment still returns 200 for all three. `pnpm --filter site-1 typecheck` passes.
- **Risk of fix:** Low. The three routes are not linked from any site navigation, content file or email template (verified with `git grep` across apps/site-1/content, apps/backend/src, packages/*/src). `apps/site-1/scripts/verify-track-order.mjs` and `audit-pages.mjs` reference /track-order for local design checks and will keep working against non-production builds.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.

### [SEC-22] Content-Security-Policy allows 'unsafe-inline' scripts and any https connect/img origin, which defeats most of its XSS protection
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/site-1/next.config.ts:54, apps/site-1/next.config.ts:64, apps/site-1/next.config.ts:67-74, apps/site-1/src/app/layout.tsx:31-34
- **Problem:** `script-src` includes `'unsafe-inline'` (next.config.ts:69), `connect-src` includes the bare scheme `https:` (line 54, justified by signed R2 URLs) and `img-src` includes `https:` (line 64). With `'unsafe-inline'`, any injected `<script>` runs, and with `connect-src https:` it can exfiltrate to any host, so the CSP provides little beyond blocking plugins and framing. The inline scripts that currently need it are the consent bootstrap in the root layout (`dangerouslySetInnerHTML={{ __html: cookieBootstrapScript }}`) and Next's own hydration scripts; JSON-LD `type="application/ld+json"` blocks are not executed and do not need script-src. Next's documented approach is a per-request nonce set in middleware with `'strict-dynamic'`, which also requires reading the nonce in the root layout and makes pages dynamically rendered.
- **Impact (plain English):** Today no XSS sink was found in the audited storefront code (all user text goes through React), so this is defence-in-depth rather than an active hole. If a future component or a CMS field ever renders untrusted HTML, the current policy would not stop script execution or data theft (e.g. of order drafts in localStorage).
- **Evidence:**
  ```text
  next.config.ts:67-70: `'script-src': dedupe(["'self'", "'unsafe-inline'", umamiOrigin, ...` — line 48-54: `const connect = dedupe(["'self'", apiOrigin, umamiOrigin, sentryOrigin, 'https:', ...`
  ```
- **Fix steps:**
  1. OWNER APPROVAL: moving the CSP to a nonce-based middleware forces every storefront page to render dynamically (no static caching) and needs a regression pass of Turnstile, Umami and the Studio; effort roughly one day.
  2. Create apps/site-1/src/middleware.ts that generates `const nonce = Buffer.from(crypto.randomUUID()).toString('base64')`, builds the storefront CSP string with `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com <umamiOrigin>` (drop 'unsafe-inline'), sets it on both the request headers (`x-nonce`) and the response `Content-Security-Policy`, and excludes `/studio/:path*` and `/_next/static`, `/_next/image`, `/favicon.ico` via `config.matcher`.
  3. In apps/site-1/src/app/layout.tsx read `const nonce = (await headers()).get('x-nonce') ?? undefined;` (make RootLayout async) and pass `nonce={nonce}` to the consent bootstrap `<script>`; Next forwards the nonce to its own inline scripts automatically when the CSP header carries a nonce.
  4. Remove the storefront CSP entry from `headers()` in next.config.ts (keep the Studio block and the non-CSP security headers), and narrow `connect-src` by replacing `'https:'` with the R2 upload/download origin read from an env var (e.g. `NEXT_PUBLIC_R2_ORIGIN`), after confirming that host from the backend's signed-URL configuration.
  5. Update apps/site-1/e2e/security-headers.spec.ts to assert `script-src` contains `'nonce-` and does not contain `'unsafe-inline'`.
- **Acceptance criteria:** `curl -sI https://canadianplans.com/ | grep -i content-security-policy` shows `script-src 'self' 'nonce-...' 'strict-dynamic'` and no `'unsafe-inline'`; the cookie banner still hides for a returning visitor before hydration; the Turnstile widget on /order renders; Umami page views still send with consent; `pnpm --filter site-1 exec playwright test e2e/security-headers.spec.ts` passes.
- **Risk of fix:** High. Nonce-based CSP disables static rendering for all storefront pages (CPU/time cost on Vercel) and can break third-party scripts that inject further scripts without nonce propagation; test Turnstile, Umami and the plan-finder dynamic import. Narrowing connect-src can break document uploads if the R2 origin is wrong.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm the exact R2 host used for browser-side signed uploads/downloads (backend adapters) before narrowing connect-src; confirm with the owner that dynamic rendering is acceptable.

### [A11Y-02] CpReviewCard puts aria-label on a <p>, where ARIA prohibits it, so the star rating is read as symbols
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** packages/ui/src/components/canadian-plans/elements.tsx:300-302
- **Problem:** `<p className="cp-review-stars" aria-label={content.ratingLabel}>{content.stars}</p>` relies on aria-label to name a paragraph. ARIA 1.2 lists `paragraph` among roles for which naming is prohibited; axe flags this as `aria-prohibited-attr`. Browsers/screen readers ignore the label and announce the literal `★★★★★` glyphs (or nothing).
- **Impact (plain English):** Screen-reader users hear "black star black star ..." or silence instead of "Five out of five stars" on testimonial cards. Today the card is only rendered on the /dev/components lab page, so no live customer is affected yet, but it is the shared testimonial primitive for future pages.
- **Evidence:**
  ```text
  elements.tsx:300  <p className="cp-review-stars" aria-label={content.ratingLabel}>
   elements.tsx:301    {content.stars}
   content/components.ts:303-304  stars: '★★★★★', ratingLabel: 'Five out of five stars'
  ```
- **Fix steps:**
  1. In packages/ui/src/components/canadian-plans/elements.tsx, function CpReviewCard, replace the `<p className="cp-review-stars" aria-label={content.ratingLabel}>{content.stars}</p>` element with: `<p className="cp-review-stars"><span className="sr-only">{content.ratingLabel}</span><span aria-hidden="true">{content.stars}</span></p>`.
  2. Keep the `cp-review-stars` class on the `<p>` so the existing CSS (canadian-plans-components.css .cp-review-stars) still applies.
- **Acceptance criteria:** Add a test in packages/ui/src/components/canadian-plans/elements.test.tsx that renders CpReviewCard and asserts `screen.getByText('Five out of five stars')` exists with class `sr-only`, that the stars span has `aria-hidden="true"`, and that `container.querySelector('p.cp-review-stars')?.hasAttribute('aria-label')` is false. `pnpm --filter @canadian-plans/ui test` passes.
- **Risk of fix:** Low. Visual output unchanged; only the a11y tree changes.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [A11Y-03] Stepper hides the step number from screen readers and hard-codes an English, order-specific label
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** packages/ui/src/components/stepper.tsx:23,49,65
- **Problem:** StepMarker renders the step number with `aria-hidden="true"` (line 23) and only completed steps get an sr-only prefix ("Completed: "). Current and upcoming steps are announced as bare labels ("Details") with no position ("step 2 of 5"). The list name `aria-label="Order progress"` (line 49) is hard-coded inside a package whose README says it carries "No content", so the generic Stepper cannot be reused for anything that is not an order without lying to assistive tech.
- **Impact (plain English):** A blind customer filling in the order form hears "Plan, Details, Documents, Review, Confirmation" and "current step" but never how many steps remain. Minor but real friction in the core order flow.
- **Evidence:**
  ```text
  stepper.tsx:22-23  <span aria-hidden="true" ...>{isComplete ? <Check/> : index + 1}</span>
   stepper.tsx:49  aria-label="Order progress"
   stepper.tsx:65  {state === 'complete' ? <span className="sr-only">Completed: </span> : null}
  ```
- **Fix steps:**
  1. In packages/ui/src/components/stepper.tsx, add an optional prop to StepperProps: `label?: string;` and destructure it in Stepper with default `label = 'Order progress'`; pass `aria-label={label}` on the `<ol>` instead of the literal.
  2. Inside the `steps.map` callback, replace the line `{state === 'complete' ? <span className="sr-only">Completed: </span> : null}` with `<span className="sr-only">{state === 'complete' ? 'Completed, step ' : 'Step '}{index + 1} of {steps.length}: </span>`.
  3. Update packages/ui/src/components/stepper.test.tsx expectations for textContent (e.g. 'Completed, step 1 of 3: Choose a plan', 'Step 2 of 3: Your details') — the visible marker still shows the number once because the sr-only text is visually hidden.
- **Acceptance criteria:** `pnpm --filter @canadian-plans/ui test` passes with the updated stepper.test.tsx; in the browser, VoiceOver/NVDA on /order reads "Step 2 of 5: Details, current step".
- **Risk of fix:** Low. Only sr-only text changes; the existing order-form call site (apps/site-1/src/app/(storefront)/order/order-form.tsx:753) needs no change because `label` defaults.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [A11Y-04] FileDrop associates two <label> elements with one input, producing a concatenated accessible name
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** packages/ui/src/components/file-drop.tsx:39-41
- **Problem:** `<Label htmlFor={id}>{label}</Label>` (line 39) and the wrapping `<label htmlFor={id}>` drop area (line 40) both point at the same `<input type="file">`. Per the accessible-name computation, all associated labels are concatenated, so the input's name becomes e.g. "Passport scan Choose a file or drag and drop it here". The test passes only because testing-library matches any one label.
- **Impact (plain English):** Screen-reader users hear a long, awkward name for the upload control. No live impact today: FileDrop is exported but not rendered anywhere in apps (only mentioned in apps/site-1/README.md:155).
- **Evidence:**
  ```text
  file-drop.tsx:39  <Label htmlFor={id}>{label}</Label>
   file-drop.tsx:40  <label htmlFor={id} data-slot="file-drop-area" ...>
   file-drop.tsx:51  <input id={id} ... />
  ```
- **Fix steps:**
  1. In packages/ui/src/components/file-drop.tsx, change the wrapping drop-area element from `<label htmlFor={id} ...>` to `<div ...>` (remove `htmlFor`), keeping its className and data attributes; the `cursor-pointer` class can stay or be dropped.
  2. Give the two inner texts an id and reference them from the input: change `<span className="font-medium text-foreground">Choose a file</span>` to include `id={`${id}-cta`}`, and build `describedBy` as `[`${id}-cta`, hint ? `${id}-hint` : undefined, `${id}-note`]` so the "Choose a file" cue is a description, not part of the name.
  3. Because the drop area is no longer a label, clicking the dashed box must still open the picker: add `onClick={() => document.getElementById(id)?.click()}` is NOT allowed in a server component — instead keep the box as a `<label htmlFor={id}>` but remove the separate `<Label htmlFor={id}>` and move the visible `{label}` text inside the box as the first child `<span className="font-medium text-foreground">{label}</span>`, demoting "Choose a file / or drag and drop it here" to `aria-describedby` text via the ids above. Pick this second variant (single label) as the smallest fix.
- **Acceptance criteria:** In file-drop.test.tsx assert `input.labels?.length === 1` and that `screen.getByLabelText('Passport scan')` resolves; in a browser, the accessibility inspector shows the input's Name as exactly the `label` prop.
- **Risk of fix:** Low. Component is unused in apps; only its own test file is affected.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [A11Y-05] CpSwipeRow is always a focusable region, even on wide screens where it does not scroll
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** packages/ui/src/components/canadian-plans/swipe-row.tsx:39, packages/ui/src/styles/canadian-plans-components.css:1400-1403,1471-1483
- **Problem:** `<div ref={ref} className="cp-swipe-track" role="region" aria-label={label} tabIndex={0}>` is rendered unconditionally. CSS makes the track a plain 4-column grid above 48rem (line 1400) and only becomes an overflow-x scroll container below 48rem (line 1471). On desktop the element is a tab stop with a focus ring that does nothing (nothing to scroll), violating the "no purposeless focusable elements" guidance. The component is also not rendered by any app today (only referenced in apps/site-1/DESIGN_NOTES.md).
- **Impact (plain English):** Keyboard users on desktop would land on an inert box with a visible outline before reaching the cards. Not live yet because the export is unused.
- **Evidence:**
  ```text
  swipe-row.tsx:39  <div ref={ref} className="cp-swipe-track" role="region" aria-label={label} tabIndex={0}>
   canadian-plans-components.css:1400-1402  .cp-swipe-track { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  ```
- **Fix steps:**
  1. In packages/ui/src/components/canadian-plans/swipe-row.tsx, add state `const [scrollable, setScrollable] = useState(false);` and inside the existing useEffect compute `setScrollable(el.scrollWidth > el.clientWidth)` initially and in a `ResizeObserver` on `el` (disconnect in cleanup).
  2. Render `tabIndex={scrollable ? 0 : -1}` and `role={scrollable ? 'region' : undefined}` / `aria-label={scrollable ? label : undefined}` on the track div.
  3. Alternatively (even smaller), remove the component and its CSS if the owner confirms it is not planned; see the dead-exports finding.
- **Acceptance criteria:** Add packages/ui/src/components/canadian-plans/swipe-row.test.tsx: render with children, stub `scrollWidth`/`clientWidth` so scrollWidth <= clientWidth, assert `container.querySelector('.cp-swipe-track')?.getAttribute('tabindex') === '-1'`; stub scrollWidth > clientWidth, re-render, assert `'0'` and `role="region"`.
- **Risk of fix:** Low. ResizeObserver exists in all supported browsers; jsdom needs a small stub in the test.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [A11Y-06] CpPlanCard strikes through the original price with <s> and uses the data allowance as the card heading, both without textual cues
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** packages/ui/src/components/canadian-plans/elements.tsx:155-158,163-170
- **Problem:** The heading `<h3 className="cp-plan-allowance">` contains only the allowance (e.g. "20 GB"), so six pre-arrival cards produce six identical headings; the carrier name is a `<p>` above. The discount is rendered as `<s>{content.originalPrice}</s>` followed by fine print; most screen readers do not announce strikethrough, so "$60/mo $35/mo" is read as two prices with no indication which is current.
- **Impact (plain English):** On /pre-arrival-sim (live page, content/pre-arrival.ts:176,201,276 use originalPrice) a screen-reader user hears two prices for the same plan and cannot tell which one they will pay. Heading navigation lists "20 GB, 20 GB, 50 GB..." without carrier.
- **Evidence:**
  ```text
  elements.tsx:155  <h3 className="cp-plan-allowance">{content.allowance}...</h3>
   elements.tsx:166  <s>{content.originalPrice}</s>{' '}
   content/pre-arrival.ts:176  originalPrice: '$60/mo',
  ```
- **Fix steps:**
  1. In packages/ui/src/components/canadian-plans/elements.tsx, function CpPlanCard, change the original-price fragment to `<><span className="sr-only">Was </span><s>{content.originalPrice}</s>{' '}<span className="sr-only">now </span></>` so the sequence reads "Was $60/mo now $35/mo ...". (Keep copy generic; if the owner prefers content-driven text, add optional `wasLabel`/`nowLabel` to PlanCardContent with these defaults.)
  2. In the same function, inside the `<h3>` add a visually hidden carrier prefix when present: `{content.carrier ? <span className="sr-only">{content.carrier} </span> : null}` before `{content.allowance}`.
- **Acceptance criteria:** Add a test in elements.test.tsx rendering CpPlanCard with `originalPrice: '$60'` and asserting `screen.getByRole('heading', { level: 3 }).textContent` starts with the carrier, and that the card text matches /Was \$60 now/. Visual snapshot of /pre-arrival-sim unchanged (sr-only).
- **Risk of fix:** Low. Only hidden text added; existing CSS selectors unaffected.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [A11Y-07] Automated axe scan covers only four landing routes; order steps, plan detail, pre-arrival and legal pages are never scanned
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** apps/site-1/e2e/accessibility.spec.ts:13-39
- **Problem:** ROUTES is `['/', '/plans', '/order', '/track']`. The multi-step order form (details, documents, review, confirmation), `/plans/test-plan`, `/order/pre-arrival`, `/mobile-plans`, `/privacy` and `/terms` (all of which scaffold.spec.ts and preview-files.spec.ts already load successfully) are not axe-checked, and the 'exactly one h1' test only covers the same four routes.
- **Impact (plain English):** A serious contrast, label or landmark regression on the pages where customers actually type their details and accept terms would not be caught by the WCAG gate.
- **Evidence:**
  ```text
  accessibility.spec.ts:13  const ROUTES = ['/', '/plans', '/order', '/track'] as const;
  ```
- **Fix steps:**
  1. In apps/site-1/e2e/accessibility.spec.ts extend ROUTES to `['/', '/plans', '/plans/test-plan', '/mobile-plans', '/order', '/order/pre-arrival', '/track', '/privacy', '/terms'] as const` (all are routes the existing specs already render with status 200).
  2. Add one additional test that drives the order form to the review step using the same helper sequence as apps/site-1/e2e/order.spec.ts:57-95 (select plan, fill details, acknowledge documents) and runs `new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()` after each step, asserting zero serious/critical violations; import the helpers by copying them or exporting them from a shared e2e helper file.
- **Acceptance criteria:** `pnpm --filter site-1 exec playwright test e2e/accessibility.spec.ts` passes for all listed routes and the three order steps; introduce an unlabeled `<input>` on the details step and the new test fails with an axe 'label' violation.
- **Risk of fix:** Low. May surface existing serious/critical violations on the newly scanned pages, which would turn CI red until fixed (desired).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [A11Y-08] Hand-rolled tables lack header scope and the lead attribution tooltip is mouse-only
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** apps/admin/src/components/leads-list.tsx:101-108, apps/admin/src/components/leads-list.tsx:120, apps/admin/src/components/catalogue-status.tsx:58-66, apps/admin/src/components/jobs-status.tsx:111-124, apps/admin/src/components/source-report.tsx:114-121, apps/admin/src/components/customer-data-deletion.tsx:159-168
- **Problem:** Five components render raw `<table>` markup with `<th>` cells that have no `scope="col"` and no `<caption>`/`aria-label`, unlike the orders/partners lists which use the shared `Table` components. In leads-list.tsx the full attribution detail is exposed only via `title=` on a `<code>` element, which keyboard and screen-reader users cannot reach.
- **Impact (plain English):** Screen-reader users hear cell values without column context on the leads, catalogue, jobs, source-report and deletion tables; keyboard users cannot see lead attribution at all.
- **Evidence:**
  ```text
  leads-list.tsx:104 `<th className="py-2 pr-4 font-medium">Contact</th>`; leads-list.tsx:120 `<code className="text-xs" title={attributionDetail(lead.attribution)}>`.
  ```
- **Fix steps:**
  1. Add `scope="col"` to every `<th>` in the five files listed, and give each `<table>` an `aria-label` (e.g. 'Leads', 'Catalogue offers', 'Pending jobs', 'Attribution report', 'Records for this address').
  2. In leads-list.tsx replace the `title` tooltip with visible text: render `attributionDetail(lead.attribution)` inside a `<details><summary>{lead.source}</summary><pre className="text-xs whitespace-pre-wrap">…</pre></details>` or a second line under the source code so it is reachable by keyboard.
- **Acceptance criteria:** Run the admin e2e with axe (or Lighthouse accessibility) on /w/<slug>/leads, /settings/catalogue, /settings/jobs, /reports/sources: no 'table header missing scope' findings. Tab to a lead row and confirm the attribution detail is readable without hovering.
- **Risk of fix:** Low. Markup only; snapshot tests may need updating.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [A11Y-09] Homepage FAQ accordion always shows the '+' expand symbol, even for the open item
- **Severity:** ⚪ Low
- **Category:** Accessibility
- **Location:** apps/site-1/src/components/home/design/faq.tsx:42-44, apps/site-1/content/home-redesign.ts:816
- **Problem:** `HomeFaq` renders `{f.symbols.expand}` unconditionally; `homeRedesign.faq.symbols.collapse` ('−') exists but is never used, so the open question still displays '+'. `aria-expanded` is correct, so this is a visual affordance bug rather than a screen-reader one.
- **Impact (plain English):** Sighted users get a misleading cue that the already-open answer can be expanded further.
- **Evidence:**
  ```text
  faq.tsx:42-44: `<span className="cp-hd-faq-toggle" aria-hidden="true">{f.symbols.expand}</span>` — home-redesign.ts:816: `symbols: { expand: '+', collapse: '−' },`
  ```
- **Fix steps:**
  1. In apps/site-1/src/components/home/design/faq.tsx line 43 change `{f.symbols.expand}` to `{isOpen ? f.symbols.collapse : f.symbols.expand}`.
- **Acceptance criteria:** On /, the open FAQ item shows '−' and closed items show '+'; toggling swaps them.
- **Risk of fix:** Low. Visual only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-18] Webhook owner alerts are passed through the PII scrubber, which mangles the ISO timestamp
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** packages/adapters/src/alerts.ts:135, packages/observability/src/index.ts:74
- **Problem:** WebhookOwnerAlertChannel.send() does `JSON.stringify(scrubValue(alert))`. scrubValue applies PHONE_PATTERN `/(?:\+?\d[\d\s().-]{6,}\d)/g` to every string, and the date part of an ISO-8601 timestamp (`2026-10-22`) matches it. Verified with node: `scrub('2026-10-22T12:34:56.789Z')` → `'[redacted]T12:34:56.789Z'`. The alert `detail` strings are bounded codes (`failed:3,uncertain:0`, `stale:age_seconds:N`) and survive unless a number reaches 7 digits (`age_seconds` ≥ 1 000 000, about 11.5 days, would be redacted too). The HMAC is computed over the mangled body, so it is consistent, but the receiver gets a useless `occurredAt`.
- **Impact (plain English):** A chat/webhook alert about a stale backup or a stuck queue arrives with the time replaced by '[redacted]', so the owner cannot tell when the problem started.
- **Evidence:**
  ```text
  alerts.ts:135 `const body = JSON.stringify(scrubValue(alert));` ; node check output `"[redacted]T12:34:56.789Z"`.
  ```
- **Fix steps:**
  1. packages/adapters/src/alerts.ts, WebhookOwnerAlertChannel.send(): replace `scrubValue(alert)` with an explicit fixed-shape object `{ kind: alert.kind, detail: alert.detail.slice(0, 200), occurredAt: alert.occurredAt }` (the OwnerAlert contract already forbids free text/PII in `detail`, and `kind` is an enum). Remove the now-unused `scrubValue` import if nothing else uses it.
  2. Add a test in packages/adapters/src/alerts.test.ts sending an alert with `occurredAt: '2026-10-22T12:34:56.789Z'` through WebhookOwnerAlertChannel with a mocked fetch and asserting `JSON.parse(body).occurredAt` equals the input.
- **Acceptance criteria:** New alerts.test.ts case passes; existing HMAC test (if any) still passes because the signature is computed over the same `body` string.
- **Risk of fix:** Low. Receiver-side signature verification is unaffected (signature covers whatever body is sent).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-19] CpBreadcrumb renders an <a> with no href for intermediate items lacking a link, and list keys use labels that may repeat
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** packages/ui/src/components/canadian-plans/elements.tsx:364-369,233
- **Problem:** `BreadcrumbItem.href` is optional, but for every item except the last the component renders `<a href={item.href}>`; when `href` is undefined this yields a bare `<a>` that is neither focusable nor a link but is styled like one. Keys are `key={item.label}` (line 364) and in CpSectionHeading `key={line}` (line 233), so two identical labels/lines trigger React duplicate-key warnings and can mis-reconcile.
- **Impact (plain English):** Edge case today (all content passes hrefs for non-last items, e.g. content/guides.ts:500), but a future content entry with a missing href silently produces a dead, link-looking crumb.
- **Evidence:**
  ```text
  elements.tsx:366-369  {index === items.length - 1 ? (<span aria-current="page">…</span>) : (<a href={item.href}>{item.label}</a>)}
   elements.tsx:364  <li key={item.label}>
  ```
- **Fix steps:**
  1. In packages/ui/src/components/canadian-plans/elements.tsx, function CpBreadcrumb, change the non-last branch to `item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>` and change `key={item.label}` to `key={`${index}-${item.label}`}`.
  2. In CpSectionHeading change `key={line}` to `key={`${index}-${line}`}` by adding the index parameter to the map callback.
- **Acceptance criteria:** Add a test in elements.test.tsx rendering CpBreadcrumb with `[{label:'A'},{label:'B',href:'/b'},{label:'C'}]` and assert the first item is a `<span>` (no anchor) and the last has `aria-current="page"`; no React key warnings in the test output.
- **Risk of fix:** Low. None.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-20] Login page ignores an existing session, so invitation-confirmation and recovery landings show the sign-in form again
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** apps/admin/src/app/login/page.tsx:20-27, apps/admin/src/app/login/page.tsx:41, apps/admin/src/app/recovery/page.tsx:36-39
- **Problem:** The invitation flow redirects the confirmation email to `/login?invited=1` and supabase-js (`detectSessionInUrl: true`) establishes the session from the URL, but `LoginPage` never reads `useStaffSession()` or the `invited` flag; it always renders the empty sign-in form. Likewise after `updateUser({ password })` on /recovery the user is left on the page with a message and no route onward.
- **Impact (plain English):** A newly invited staff member clicks the confirmation link, lands on a sign-in form with no acknowledgement that the account is confirmed and already signed in, and has to sign in a second time; some will assume the invitation failed. Minor, but it is the first impression of onboarding.
- **Evidence:**
  ```text
  login/page.tsx:41 `options: { emailRedirectTo: \`${window.location.origin}/login?invited=1\` }` and no code anywhere reads `invited` or redirects a signed-in visitor.
  ```
- **Fix steps:**
  1. In login/page.tsx import `useStaffSession` and `useEffect`; add `const staff = useStaffSession();` and an effect: `useEffect(() => { if (staff.status === 'signed_in' && staff.accessToken) { void destinationAfterPrimarySignIn(staff.accessToken).then((path) => router.replace(path)); } }, [staff.status, staff.accessToken, router]);`.
  2. Show a short status line when `new URLSearchParams(window.location.search).get('invited') === '1'` (read in a `useEffect` like recovery/page.tsx does): 'Your account is confirmed. Signing you in…' while the redirect resolves.
  3. In recovery/page.tsx after a successful `updateUser`, call `router.replace(await destinationAfterPrimarySignIn(session.access_token))` using `getStaffAuth().getSession()`, falling back to the current message if no session.
- **Acceptance criteria:** With a session present in localStorage, visiting /login redirects to the first workspace (or /mfa/challenge for owner/finance) without user input. Visiting /login?invited=1 shows the confirmation line before redirecting. e2e shell.spec.ts public-route tests still pass (no session present there).
- **Risk of fix:** Low. The redirect only triggers when a session already exists, so the unauthenticated e2e checks are unaffected.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-21] Document download opens the signed URL via window.open after an await, which popup blockers may suppress
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** apps/admin/src/components/orders/order-documents.tsx:84-104
- **Problem:** `download()` awaits `createFileDownloadLink` and then calls `window.open(link.url, '_blank', 'noopener,noreferrer')`. Because the call happens after an async network round trip, it is no longer inside the click's synchronous user-activation in Safari (and in Chrome once the ~5 s transient activation lapses on a slow backend), so the browser may block the popup silently; the UI shows no error because no exception is thrown.
- **Impact (plain English):** Staff on Safari or with strict popup settings click Download and nothing happens, with no message, and may assume they lack the download permission.
- **Evidence:**
  ```text
  order-documents.tsx:88-89 `const link = await createFileDownloadLink(accessToken, workspaceId, file.id); window.open(link.url, '_blank', 'noopener,noreferrer');`.
  ```
- **Fix steps:**
  1. In `download()` open the window synchronously first: `const popup = window.open('', '_blank', 'noopener,noreferrer');` before the await; after the link resolves, if `popup` is non-null set `popup.location.href = link.url;` otherwise fall back to `window.location.assign(link.url)`; on error close the popup (`popup?.close()`).
  2. Alternatively render the returned URL into a visible 'Open document (link valid for a short time)' anchor with `target="_blank" rel="noopener noreferrer"` and let the user click it.
- **Acceptance criteria:** In Safari (or Chrome with popups blocked for the site) clicking Download opens the file in a new tab or shows the fallback link; no silent no-op.
- **Risk of fix:** Low. `noopener` means the opened window cannot reach back into the admin; opening a blank window first briefly shows an empty tab on slow responses.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm on Safari and on Chrome with popups blocked that the current implementation fails silently.

### [BUG-22] List components keep the previous workspace's rows on screen while the new workspace loads
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** apps/admin/src/components/orders/orders-list.tsx:150-173, apps/admin/src/components/leads-list.tsx:41-63, apps/admin/src/components/partners/partners-list.tsx:40-52
- **Problem:** When `workspaceId` changes (workspace switcher), `refresh()` re-runs but `orders`/`leads`/`partners` state is only replaced once the new response arrives; if Next.js preserves the component instance across the dynamic-segment change, the previous workspace's customer rows remain visible under the 'Loading…' indicator and a failed request leaves them permanently.
- **Impact (plain English):** A staff member who switches workspace could briefly (or, on error, indefinitely) see another workspace's customer names/emails on the new workspace's page — a tenant-isolation presentation slip even though the data was legitimately loaded earlier.
- **Evidence:**
  ```text
  orders-list.tsx:150-160 sets `setLoading(true)` but never clears `orders` before the fetch; the catch path leaves old `orders` intact.
  ```
- **Fix steps:**
  1. In each list component's `refresh`/`load`, clear the rows when the workspace changes: add `useEffect(() => { setOrders([]); setPageInfo({ page: 1, pageSize: PAGE_SIZE, total: 0 }); setSelected([]); }, [workspaceId]);` in orders-list.tsx, and the equivalent `setLeads([])` / `setPartners([])` effects in leads-list.tsx and partners-list.tsx.
  2. Or key the page components by workspace in the route files, e.g. in `src/app/w/[workspace]/orders/page.tsx` return `<OrdersList key={workspace} workspaceSlug={workspace} />` (same for leads, partners, reports, settings sub-pages) so React remounts them with fresh state on a workspace switch.
- **Acceptance criteria:** With two workspaces, load Orders in workspace A, switch to B via the switcher while throttling the network: the table must be empty/loading, never showing A's rows; with B's request failing, no rows from A remain.
- **Risk of fix:** Low. Keying by workspace is the simplest and also resets filters/pagination, which is desirable.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Depends on whether Next 16 remounts the `[workspace]` subtree when the param changes; verify by switching workspaces with the network throttled. If it remounts, the finding is moot.

### [BUG-23] One shared 'Resolution reason' state feeds every pending change request
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** apps/admin/src/components/orders/order-collaboration.tsx:209, apps/admin/src/components/orders/order-collaboration.tsx:259-267
- **Problem:** `OrderChangeRequests` holds a single `reason` string but renders one 'Resolution reason' input per pending change request; typing in one fills all of them, and approving request A with a reason written for request B records the wrong audited reason.
- **Impact (plain English):** When a customer has two pending change requests, the audit trail can carry a reason that belongs to the other request.
- **Evidence:**
  ```text
  order-collaboration.tsx:209 `const [reason, setReason] = useState('');` and :262-266 `<Input id={`resolve-reason-${changeRequest.id}`} value={reason} ... onChange={(event) => setReason(event.target.value)} />` inside `order.changeRequests.map(...)`.
  ```
- **Fix steps:**
  1. Change the state to `const [reasons, setReasons] = useState<Record<string, string>>({});`.
  2. In the mapped input use `value={reasons[changeRequest.id] ?? ''}` and `onChange={(event) => setReasons((current) => ({ ...current, [changeRequest.id]: event.target.value }))}`.
  3. In the Approve/Reject handlers read `const reason = (reasons[changeRequest.id] ?? '').trim();` and clear only that key on success.
- **Acceptance criteria:** With two pending change requests on one order, typing in the first reason box leaves the second empty; approving the first sends only its reason (check the request body in Network).
- **Risk of fix:** Low. Local state only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-24] Quote province comes from the unsigned draft cookie / picker and is never cross-checked against the address saved on the lead
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** apps/site-1/src/app/(storefront)/order/draft.ts:24-31, apps/site-1/src/app/(storefront)/order/actions.ts:417-421, apps/backend/src/catalogue/service.ts:181-190, apps/backend/src/catalogue/store.ts:624-645
- **Problem:** Internet plans are priced per province (SK $50 vs BC $70 for the entry tier). `requestQuote` sends `province: draft.province` read from the `cp_order_draft` cookie, which is httpOnly but not signed or encrypted — the owner of the browser can rewrite it in devtools. The backend `createQuote` only checks that the offer is sold in the requested province; `prepareQuote` does not read the lead's saved form (which contains the validated `province` and `address.postalCode` from `parseOrderDetails`). So a BC customer can obtain and freeze an SK-priced quote/order snapshot for a BC address by editing the cookie (or by choosing SK in the picker and typing an SK-looking postal code).
- **Impact (plain English):** A customer could be quoted and have an order frozen at another province's cheaper price; no money changes hands online, but staff would process an order whose snapshot contradicts the service address and have to re-price or cancel, and the mis-priced order sits in reports. Self-inflicted and low volume, but it undercuts 'prices validated server-side'.
- **Evidence:**
  ```text
  actions.ts: `getBackendClient().quotes.create({ leadId: draft.leadId, productId: draft.productId, province: draft.province }, ...)`; service.ts: `if (!regions.includes(NATIONAL_REGION) && (!input.province || !isOfferSoldIn(regions, input.province))) return { status: 'region_not_served' };` with no comparison to the lead; store.ts prepareQuote selects only `products.productKey`.
  ```
- **Fix steps:**
  1. Backend (preferred, authoritative): in `apps/backend/src/catalogue/store.ts`, `prepareQuote`, also select the lead row's `form` for `draftId` in the same transaction and return `leadProvince` parsed as `provinceCodeSchema.safeParse(form?.payload?.province)` (undefined when absent). In `apps/backend/src/catalogue/service.ts`, `createQuote`, after `if (prepared.status !== 'ready') return prepared;` add `if (prepared.leadProvince && input.province && prepared.leadProvince !== input.province) return { status: 'region_not_served' };`.
  2. Storefront belt-and-braces: in `apps/site-1/src/app/(storefront)/order/actions.ts`, `saveDetails`, the cookie `province` is already derived from the validated order (`order.province`), so no change; optionally in `requestQuote` re-read the draft via `getBackendClient().leads.read(draft.leadId, { draftGrant })` and prefer `provinceCodeSchema.safeParse(draft.form?.payload?.province)` over the cookie value when present.
  3. Add a backend unit test in `apps/backend/src/catalogue/service.test.ts` (or the store test): lead saved with `province: 'BC'`, quote requested with `province: 'SK'` -> `region_not_served`.
- **Acceptance criteria:** New backend test passes; e2e `keeps a selected internet province and restores its saved address` still passes; manually editing the `cp_order_draft` cookie province to SK for a BC lead yields 'That plan isn't sold in the province you chose' on the review step.
- **Risk of fix:** Medium. Backend change touches the quote path shared with admin/e2e; mobile and SIM leads have no `province` in their form payload and must keep working (the check only runs when both values exist). This file is in the backend auditor's area; coordinate the fix there.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm `prepareQuote` can read the lead row under the same RLS tenant transaction (it already runs inside `withTenantTx`), and confirm the lead `form` column stores `payload.province` for internet leads (apps/site-1 `parseOrderDetails` puts it there: `fields: { category: 'internet', province: v.province, ... }`).

### [BUG-25] /track-order is a fixture-driven design preview but is routable in production alongside the real /track page
- **Severity:** ⚪ Low
- **Category:** Bug
- **Location:** apps/site-1/src/app/(track-order)/track-order/page.tsx:5-7, apps/site-1/src/app/(track-order)/track-order/page.tsx:22, apps/site-1/src/app/(storefront)/track/page.tsx:1, apps/site-1/content/metadata.ts:14
- **Problem:** `/track-order` renders `trackingFixtures` selected by `parseTrackingState(searchParams.state)` (synthetic order states), while `/track` is the backend-connected tracking flow linked from the header, footer and contact copy (`siteChrome.track.href = '/track'`). Unlike /dev/components and /dev/emails, /track-order has no production `notFound()` guard, and its page description says 'Look up a Canadian Plans order and review its status.' as if it were real. The legacy `/plans` and `/plans/[slug]` placeholder pages are likewise still routable (noindex, 'No offers or prices are published'). All are noindex so there is no duplicate-content SEO issue, but they are reachable by URL.
- **Impact (plain English):** A customer who lands on /track-order (typed, bookmarked, or shared from a preview) sees fake order statuses and a non-functional lookup instead of their order; support may be confused by two tracking pages.
- **Evidence:**
  ```text
  track-order/page.tsx:5: `import { trackingCopy as copy, trackingAssets, trackingFixtures } from '@content/track-order';` and line 22: `const selected = parseTrackingState(state);` — site-chrome.ts:10: `track: { ...chromeContent.track, href: '/track' },`
  ```
- **Fix steps:**
  1. At the top of the `Page` function in apps/site-1/src/app/(track-order)/track-order/page.tsx add `if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') redirect('/track');` with `import { redirect } from 'next/navigation';` (same gating pattern as (component-lab)/dev/components/page.tsx:43), and add `export const dynamic = 'force-dynamic';` so the env check runs per request as the dev routes do.
  2. Apply the same production guard (using `notFound()`) to apps/site-1/src/app/(storefront)/plans/page.tsx and plans/[slug]/page.tsx, or delete those two placeholder routes if nothing links to them (`git grep -n "'/plans"` shows only unused nav config in content/pre-arrival.ts:420 and content/home-internet.ts:543; change both to '/mobile-plans').
  3. Change apps/site-1/content/metadata.ts:14 description for '/track-order' to make clear it is a preview, or remove the entry once the route redirects.
- **Acceptance criteria:** On the production deployment, `curl -sI https://canadianplans.com/track-order` returns a 307 to /track and `/plans` returns 404; on a Vercel preview, /track-order?state=esim-sent still renders the fixture.
- **Risk of fix:** Low. The redesigned tracking UI stays available on previews for design review; nothing else links to /track-order or /plans.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-05] Two orphaned 0016_*.sql migration files are not in the journal, and SCHEMA_HISTORY.md is out of date
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/db/drizzle/0016_famous_ricochet.sql:1, packages/db/drizzle/0016_thick_tombstone.sql:1, packages/db/drizzle/meta/_journal.json:117-123, docs/SCHEMA_HISTORY.md:555, docs/SCHEMA_HISTORY.md:514-533
- **Problem:** The Drizzle journal lists only `0016_bumpy_puppet_master` at idx 16; `0016_famous_ricochet.sql` (email tables) and `0016_thick_tombstone.sql` (files tables) are left over from the T17/T18 branch merges (git: `e20d398 integrate(T18)+migration: ... combined 0018`) whose contents were consolidated into `0018_lowly_dragon_lord.sql`. `migrate()` applies strictly in journal order, so the two files are dead and migration order is deterministic (idx 0-24 contiguous), but they duplicate CREATE TABLE statements that would fail with 'relation already exists' if anyone applied them by hand, and `0016_famous_ricochet.sql` lacks the FORCE RLS/GRANT statements that 0018 adds, so it is also an incorrect template. docs/SCHEMA_HISTORY.md references a file that does not exist (`0016_futuristic_marvel_zombies.sql`, line 555), stops at 0017, and has no entries for 0018-0024 although the file promises "a chronological record of every database migration".
- **Impact (plain English):** No runtime effect. A future engineer or AI agent reading the migrations folder or SCHEMA_HISTORY.md gets a misleading picture of what is applied, which raises the chance of a wrong manual migration against production.
- **Evidence:**
  ```text
  _journal.json entries jump from tag `0016_bumpy_puppet_master` (idx 16) to `0017_worthless_synch` (idx 17); `git log --follow -- packages/db/drizzle/0016_famous_ricochet.sql` → `e20d398 ... combined 0018`; SCHEMA_HISTORY.md:555 `## 0016_futuristic_marvel_zombies.sql`.
  ```
- **Fix steps:**
  1. Delete packages/db/drizzle/0016_famous_ricochet.sql and packages/db/drizzle/0016_thick_tombstone.sql (git rm); do not touch _journal.json or any meta/*_snapshot.json.
  2. In docs/SCHEMA_HISTORY.md rename the heading at line 555 to `## 0018_lowly_dragon_lord.sql` and extend its Change section to list the files, commission, invoice and email tables it creates; then add entries (same template) for 0019_backup_leases, 0020_region_waitlist, 0021_audit_redaction, 0022_wet_the_leader, 0023_customer_deletion_lifecycle and 0024_backup_reference_barrier, each with Change/Why/RLS derived from the SQL file.
  3. Move the template block (SCHEMA_HISTORY.md:534-553) to the end of the file so entries stay chronological.
- **Acceptance criteria:** `git ls-files packages/db/drizzle | grep 0016_` lists only 0016_bumpy_puppet_master.sql; every `tag` in _journal.json has a matching heading in docs/SCHEMA_HISTORY.md (checkable with a one-line node script); `pnpm --filter @canadian-plans/db test` with the disposable database still applies all 25 journaled migrations.
- **Risk of fix:** Low. Deleting the un-journaled files cannot change what `migrate()` applies; only the journal matters.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-06] Partnered activation failure reason is discarded, so staff see a bare 'feature_not_ready'
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/src/orders/transitions.ts:244-255, apps/backend/src/routes/staff.ts:777-779
- **Problem:** DatabaseCommissionActivationHook returns `{ status: 'config_incomplete', reason }` with reason in {'no_effective_rule','unsupported_rule_type','test_rule_barred_from_live'} (activation.ts:36, 105-110). transitions.ts:254 collapses this to `{ status: 'feature_not_ready' }`, and staff.ts:777-779 returns a 409 'feature_not_ready' with no detail. The same code is also returned when ORDER_OPERATIONAL_TRANSITIONS is off, so an admin cannot tell 'the kill switch is off' from 'no commission rule is configured' from 'only a TEST rule exists'. The admin shows the Activate button for partnered orders (allowedTransitionsFor sets commissionConfigured = allowOperationalTransitions, transitions.ts:157), so this failure is reachable from the UI.
- **Impact (plain English):** When the owner clicks Activate on a partner-referred order and no usable commission rule exists, the admin shows a generic 'feature not ready' message and the owner has no way to know they must create a commission rule first; the runbook tells them to guess.
- **Evidence:**
  ```text
  transitions.ts:254 `if (commission.status === 'config_incomplete') return { status: 'feature_not_ready' };` and staff.ts:777-779 `case 'feature_not_ready': sendDomainError(res, req.id, 'feature_not_ready', 409); return;`
  ```
- **Fix steps:**
  1. In apps/backend/src/orders/transitions.ts add `import type { CommissionConfigIncompleteReason } from '../partners/commission-rule.js';` and extend the failure branch of TransitionOrderResult (lines 61-73) with an optional field `reason?: CommissionConfigIncompleteReason | 'operational_transitions_disabled';`.
  2. At transitions.ts:254 return `{ status: 'feature_not_ready', reason: commission.reason }`; at line 245 return `{ status: 'feature_not_ready', reason: 'no_effective_rule' }` is not needed (hook always present in production) — leave as is.
  3. In apps/backend/src/routes/staff.ts:777-779 change to `sendDomainError(res, req.id, 'feature_not_ready', 409, outcome.reason ? { reason: outcome.reason } : undefined);` (sendDomainError already accepts a details object, as used at line 770-772 for missingDocuments; confirm its signature in apps/backend/src/http/domain-errors.ts and pass `{}` instead of undefined if required).
  4. In apps/admin, where the order page renders the 'feature_not_ready' error, show the reason string when present (copy suggestion: no_effective_rule -> 'No commission rule is in effect for this partner; add one under Partners before activating').
- **Acceptance criteria:** In apps/backend/tests/partners-commission.integration.test.ts the test 'activation without any effective rule is rejected' should assert `expect(outcome).toEqual({ status: 'feature_not_ready', reason: 'no_effective_rule' })` and the TEST-rule test should assert reason 'test_rule_barred_from_live'. A route test PATCHing a partnered order with action 'activate' and no rule returns 409 with body.reason === 'no_effective_rule'.
- **Risk of fix:** Low. Purely additive field on an error response; existing clients ignoring it are unaffected.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-07] Reference-collision exhaustion throws instead of returning the retryable 503 the route is written for
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/src/orders/service.ts:33-47, apps/backend/src/routes/website.ts:284-290
- **Problem:** OrderService.submit retries up to MAX_REFERENCE_ATTEMPTS on 'reference_collision' and then `throw new Error('order_reference_generation_failed')`. The route's `outcome.status === 'reference_collision'` branch (website.ts:284-290, returning 503 with retry-after) is therefore unreachable; the thrown error lands in the catch, `isConnectionLevelError` is false, and the customer gets a non-retryable 500 'internal_error' and a 'not_retryable' log line.
- **Impact (plain English):** Practically never happens (96-bit random references, three attempts) but if it did, the customer would see a hard 'something went wrong' instead of an automatic retry; the dead branch also misleads future maintainers.
- **Evidence:**
  ```text
  service.ts:45-47 `if (result.status !== 'reference_collision') return result; } throw new Error('order_reference_generation_failed');` vs website.ts:284 `if (outcome.status === 'reference_collision') {`
  ```
- **Fix steps:**
  1. In apps/backend/src/orders/service.ts replace line 47 `throw new Error('order_reference_generation_failed');` with `return { status: 'reference_collision' };` (SubmitOrderOutcome already includes that status via SubmitOrderStoreResult).
- **Acceptance criteria:** Add a unit test in apps/backend/tests/order-service.test.ts with a store whose submit always returns `{ status: 'reference_collision' }`; `await submit(service, key)` must equal `{ status: 'reference_collision' }` and the store must have been called exactly 3 times.
- **Risk of fix:** Low. None; the route already handles the status.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-08] Consent-gated follow-up email runner is dead code: never wired, never scheduled, never populated
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/src/email/follow-ups.ts:51-118, apps/backend/src/email/follow-ups.ts:25
- **Problem:** FollowUpRunner, LeadOrderStateReader and FollowUpScheduleStore exist only as interfaces/classes with a unit test. `git grep` over apps/backend/src, jobs and scripts finds no production implementation of FollowUpScheduleStore or LeadOrderStateReader, no `new FollowUpRunner`, no scheduler job calling runDue, and no code that inserts into follow_up_schedules (only deletion/unsubscribe update/delete rows). The abandoned_form_marketing template and job type are likewise never enqueued. Additionally terminalOrderStatuses (line 25) lists 'archived', which is not an order status (orderStatuses in packages/types; archive is a separate archivedAt column), so if the runner were wired, archived-but-open orders would still receive follow-ups.
- **Impact (plain English):** The 'consent-gated follow-ups with unsubscribe' item in the Phase A scope (docs/IMPLEMENTATION_PLAN.md:323) does not run; nobody who abandons a form will ever be followed up, even though the storefront collects marketing opt-in. No customer harm, but a planned feature silently does nothing.
- **Evidence:**
  ```text
  git grep -n 'new FollowUpRunner|insert(followUpSchedules)' -- apps jobs scripts returns only apps/backend/src/email/follow-ups.test.ts; follow-ups.ts:25 `new Set(['activated', 'cancelled', 'archived'])`.
  ```
- **Fix steps:**
  1. OWNER APPROVAL: decide whether abandoned-form follow-ups are in launch scope. If yes this is roughly a day of work: implement a DatabaseFollowUpScheduleStore (listDue with FOR UPDATE SKIP LOCKED on follow_up_schedules, markSent/markSkipped/markCancelled), a LeadOrderStateReader over leads.status/orders.status, insert a follow_up_schedules row from DatabaseLeadStore.createLead/updateLead when consent.marketingOptIn is true, and register runDue in apps/backend/src/scheduler.ts. If no, delete follow-ups.ts and its test, or add a one-line comment at the top of follow-ups.ts stating it is not wired for Phase A.
  2. Regardless of the decision, in follow-ups.ts:25 replace `'archived'` with nothing (the set becomes ['activated', 'cancelled']) and, when wiring, have orderState() also return undefined for orders with archived_at set.
- **Acceptance criteria:** If wired: an integration test that saves a lead with marketingOptIn true, advances the clock past the schedule, runs runDue and finds one 'abandoned_form_marketing_email' outbox row; then unsubscribes and confirms a second run sends nothing. If removed: `git grep FollowUpRunner` returns nothing and the unit suite still passes.
- **Risk of fix:** High. Wiring it means real marketing emails start going out; it must be gated on recorded consent (checkMarketing already does this) and needs an unsubscribe URL implementation.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-09] OpenAPI machineSignature security scheme documents the wrong header name
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/contracts/src/openapi.ts:59-64, packages/contracts/src/endpoints.ts:143-147, docs/api/openapi.json
- **Problem:** The generated document's `machineSignature` security scheme is `apiKey` in header `X-Signature`, but the only machine endpoint (`deliverWebhook`, endpoints.ts:692-702) actually requires the `Sanity-Webhook-Signature` header declared at endpoints.ts:143-147. The published OpenAPI document therefore names a header the backend never reads. (The committed docs/api/openapi.json was regenerated in memory during this audit and is byte-identical to the generator output, so the drift is in the generator, not in the file.)
- **Impact (plain English):** Anyone integrating from the API document (a future second website, a contractor, or a tool generating a client) will sign with the wrong header and be rejected; a small but confusing documentation error.
- **Evidence:**
  ```text
  openapi.ts:60-63 `machineSignature: { type: 'apiKey', in: 'header', name: 'X-Signature', ... }` versus endpoints.ts:144 `name: 'Sanity-Webhook-Signature'`.
  ```
- **Fix steps:**
  1. In packages/contracts/src/openapi.ts, `securitySchemes.machineSignature`, change `name: 'X-Signature'` to `name: 'Sanity-Webhook-Signature'`.
  2. Run `pnpm --filter @canadian-plans/contracts build` to regenerate docs/api/openapi.json and commit both files together (CI runs `git diff --exit-code -- docs/api/openapi.json`).
- **Acceptance criteria:** `node -e "const d=require('./docs/api/openapi.json'); console.log(d.components.securitySchemes.machineSignature.name)"` prints `Sanity-Webhook-Signature`; `pnpm --filter @canadian-plans/contracts test` still passes (openapi.test.ts only checks the scheme key names).
- **Risk of fix:** Low. Documentation-only change; no runtime code reads the security scheme.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-12] Error envelope gaps on the website surface: missing messages, misleading reuse of persistence_unavailable, and oversized bodies answered 400 instead of 413
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/src/http/domain-errors.ts:9-50, apps/backend/src/routes/website.ts:846, apps/backend/src/routes/website.ts:886, apps/backend/src/routes/website.ts:899, apps/backend/src/routes/website.ts:175, apps/backend/src/routes/website.ts:295, apps/backend/src/app.ts:88-101
- **Problem:** `sendDomainError` falls back to the message 'Request failed.' for codes absent from its map; `tracking_challenge_invalid` (website.ts:886), `not_found` (175, 905, 912) and `conflict` (295) are all absent. `persistence_unavailable` has the message 'The order could not be saved. Retry with the same idempotency key.' but is reused for the tracking service being unconfigured (846, 899) and for limiter failures in session.ts:161/251. `createInvalidBodyError` maps every Express error path, including body-parser's 413 (body over the 64 kB `express.json` limit), to 400 `invalid_request`, although `payload_too_large` exists in `WebsiteAuthErrorCode` (website-errors.ts:12) and is never used.
- **Impact (plain English):** Customers and the storefront code see wrong or generic explanations for some failures (for example a tracking code rejection says 'Request failed.' and an over-size upload metadata request is reported as an invalid body), making support and debugging slower. No security impact.
- **Evidence:**
  ```text
  domain-errors.ts:60 `message: messages[code] ?? 'Request failed.'`; domain-errors.ts:24 `persistence_unavailable: 'The order could not be saved. Retry with the same idempotency key.'`; app.ts:99 `sendStaffAuthError(res, req.id, 'invalid_request', 400);`.
  ```
- **Fix steps:**
  1. In apps/backend/src/http/domain-errors.ts add to `messages`: `tracking_challenge_invalid: 'The code is not valid for this order. Request a new code.'`, `not_found: 'The requested item does not exist.'`, `conflict: 'The request conflicts with the current state.'`, and change `persistence_unavailable` to 'The service is temporarily unavailable. Retry shortly.' (the orders route already sets `retry-after` and `details.retryable`).
  2. In apps/backend/src/app.ts `createInvalidBodyError`, before the final `sendStaffAuthError` add: `const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 400; if (status === 413) { res.status(413).json({ error: { code: 'payload_too_large', message: 'The request body is too large.', requestId: req.id } }); return; }`.
  3. Add a test posting a 70 kB JSON body to /api/v1/website/leads with a valid credential and asserting status 413 and code `payload_too_large`.
- **Acceptance criteria:** New test passes; a POST /tracking/verify with a wrong code returns `error.message` that is not 'Request failed.'.
- **Risk of fix:** Low. Messages only; site-1 branches on `error.code`, not message text.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-13] Stale comments and dead code in the adapters package misdescribe its state
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/adapters/src/index.ts:5-9, packages/adapters/src/messaging.ts:135-137, packages/adapters/README.md:5-6
- **Problem:** index.ts header says 'No provider is wired yet' and exports a leftover `ADAPTERS_PACKAGE_PLACEHOLDER` constant although Resend, R2, Umami, Sentry and alerts are all wired. SesEmailAdapter.send() builds `FromEmailAddress` with a ternary whose two branches are identical. README still says 'Real providers are wired in later tasks (T9–T20)'.
- **Impact (plain English):** Future contributors (human or AI) reading the package header will assume providers are not live and may re-implement or misconfigure them.
- **Evidence:**
  ```text
  index.ts:9 `export const ADAPTERS_PACKAGE_PLACEHOLDER = true as const;`; messaging.ts:135-137 `FromEmailAddress: this.config.sender.replyToAddress ? \`${fromName} <${fromAddress}>\` : \`${fromName} <${fromAddress}>\``.
  ```
- **Fix steps:**
  1. packages/adapters/src/index.ts: replace the header comment with one sentence stating that the package holds the server-only provider adapters (Resend, SES, R2 via SigV4, Sanity, Umami, Sentry HTTP, owner alerts, deletion ledger) plus in-memory fakes; delete the `ADAPTERS_PACKAGE_PLACEHOLDER` export after confirming `git grep -n ADAPTERS_PACKAGE_PLACEHOLDER` finds no consumer.
  2. packages/adapters/src/messaging.ts, SesEmailAdapter.send(): replace the ternary with `FromEmailAddress: \`${this.config.sender.fromName} <${this.config.sender.fromAddress}>\``.
  3. packages/adapters/README.md: replace lines 5-6 with 'Providers currently wired: Resend (email), Cloudflare R2 (documents), Umami (analytics), Sentry HTTP (errors), Resend/webhook owner alerts; Sanity and SES are implemented but not selected.'
- **Acceptance criteria:** `pnpm typecheck` and `pnpm lint` pass; `git grep -n "No provider is wired\|ADAPTERS_PACKAGE_PLACEHOLDER" -- packages apps jobs` returns nothing.
- **Risk of fix:** Low. Comment and dead-branch cleanup only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-14] listFilesForRecord issues one review-event query per file (N+1)
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/src/documents/store.ts:463-496
- **Problem:** After selecting the file rows, the loop runs a separate `select ... from fileReviewEvents ... limit 1` for each file to find its latest review. GET /workspaces/:workspaceId/orders/:orderId/files calls this twice (lead files + order files), so an order with N documents costs 2 + N queries.
- **Impact (plain English):** Slightly slower document panel loads; harmless today because an order carries only a handful of documents, but wasteful.
- **Evidence:**
  ```text
  store.ts:464-482: `for (const row of rows) { const file = toFileRow(row); const [review] = await tx.select({...}).from(fileReviewEvents).where(...eq(fileReviewEvents.fileId, file.id)).orderBy(sql`${fileReviewEvents.createdAt} desc`).limit(1);`
  ```
- **Fix steps:**
  1. In DatabaseDocumentStore.listFilesForRecord (apps/backend/src/documents/store.ts), after fetching `rows`, if `rows.length > 0` run one query: `tx.select({ id, fileId: fileReviewEvents.fileId, decision, note, actorId, createdAt }).from(fileReviewEvents).where(and(eq(fileReviewEvents.workspaceId, input.workspaceId), inArray(fileReviewEvents.fileId, rows.map((r) => r.id)))).orderBy(sql`${fileReviewEvents.createdAt} desc`)` (import `inArray` from drizzle-orm).
  2. Build `const latest = new Map<string, ReviewEventRow>()` keeping only the first (newest) event per fileId, then map `rows` to `{ ...toFileRow(row), latestReview: latest.get(row.id) ?? null }`.
- **Acceptance criteria:** `pnpm test` passes (documents tests) and typecheck passes; the function performs exactly two queries regardless of file count.
- **Risk of fix:** Low. Pure query restructuring; output shape unchanged.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-15] Runtime image ships the entire monorepo (admin, site-1, jobs, docs, tests) and all devDependencies
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/Dockerfile:11-27, apps/backend/Dockerfile:31-36, .dockerignore:1-23
- **Problem:** The build stage installs every workspace (Next.js apps, Sanity Studio, Playwright-related dev tooling, tsup, vitest) and `COPY . .` copies the whole repo, then the runtime stage copies /repo wholesale. Only apps/backend/dist plus the external runtime packages (express, drizzle-orm, zod, postgres, @supabase/supabase-js, the optional @aws-sdk/client-sesv2) are needed. The Dockerfile comment explains pruning was avoided because `postgres` lives in packages/db. The result is a multi-hundred-megabyte image with thousands of unneeded packages (including the `braces`, `sprintf-js` and `@vitest/mocker` advisories from pnpm audit, all dev/CLI-only) and all frontend source present on the production API host.
- **Impact (plain English):** Slower deploys and cold starts, larger attack surface (every dev dependency's code is on the production box), and more noise when a dependency advisory appears because the audit cannot distinguish what is actually deployed.
- **Evidence:**
  ```text
  Dockerfile:25-26
  RUN pnpm install --frozen-lockfile
  COPY . .
  Dockerfile:36  COPY --from=build /repo /repo
  ```
- **Fix steps:**
  1. First apply the 'postgres is a devDependency' finding so the backend's own manifest declares its runtime externals.
  2. Replace the runtime stage with a pruned deploy: in the build stage after `RUN pnpm --filter backend build`, add `RUN pnpm --filter backend deploy --prod /out` (pnpm 9 `deploy` copies apps/backend with only its production dependencies into /out). Then in the runtime stage use `COPY --from=build --chown=node:node /out /app`, `WORKDIR /app` and `CMD ["node", "dist/src/server.js"]`.
  3. Because tsup inlines @canadian-plans/* packages, the deployed app needs only the externals listed in apps/backend/package.json dependencies; run the image locally and hit /api/v1/health and one DB-backed route to confirm `postgres` and `drizzle-orm` resolve.
  4. Extend .dockerignore with `docs`, `**/tests`, `**/*.test.ts`, `.github` to shrink the build context.
- **Acceptance criteria:** `docker image ls` shows the new image substantially smaller than the current one; `docker run` of the image with staging env answers GET /api/v1/health 200 and GET /api/v1/website/offers (with a staging credential) 200; `find / -path '*apps/admin*'` inside the container returns nothing.
- **Risk of fix:** Medium. pnpm deploy with workspace packages whose exports point at .ts source is exactly the case the current Dockerfile avoided; the bundle must be verified to resolve every external at runtime (express, drizzle-orm, zod, postgres, @supabase/supabase-js). Keep the current Dockerfile until the pruned image passes the staging smoke test.
- **Depends on:** CQ-16 (postgres driver is a devDependency of the bac…)kend but is required at runtime by the bundled @canadian-plans/db code
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-17] Several public exports have no consumer in any app (Avatar*, DropdownMenuCheckboxItem, SidebarInput, SidebarMenuSkeleton, SidebarSeparator, FileDrop, CpSwipeRow)
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/ui/src/index.ts:8,38,40,80,85,88, packages/ui/src/canadian-plans.ts:46, packages/ui/src/components/sidebar.tsx:454
- **Problem:** `git grep -lw <Name> -- apps` returns 0 files for Avatar, AvatarImage, AvatarFallback, DropdownMenuCheckboxItem, SidebarInput, SidebarMenuSkeleton, SidebarSeparator, FileDrop/FILE_DROP_DEFAULT_NOTE and CpSwipeRow (CpSwipeRow appears only in DESIGN_NOTES.md; FileDrop only in README.md). SidebarMenuSkeleton additionally seeds its width from `Math.random()` inside useMemo (sidebar.tsx:454), which would cause a server/client hydration mismatch if it were ever rendered in a server tree.
- **Impact (plain English):** No user impact. Dead surface area increases maintenance and audit cost and keeps an SSR-unsafe component in the public API.
- **Evidence:**
  ```text
  index.ts:8  export { Avatar, AvatarImage, AvatarFallback } from './components/avatar';
   sidebar.tsx:454  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);
   canadian-plans.ts:46  export { CpSwipeRow } from './components/canadian-plans/swipe-row';
  ```
- **Fix steps:**
  1. OWNER DECISION (not approval-gated, but ask): confirm which of the listed components are planned for upcoming work (FileDrop is referenced as 'T17 placeholder' in apps/site-1/README.md:155; CpSwipeRow in DESIGN_NOTES.md:1259). Keep those.
  2. For the rest, delete the component file(s) and remove the corresponding `export` lines from packages/ui/src/index.ts (lines 8, 38, 80, 85, 88 for Avatar, DropdownMenuCheckboxItem, SidebarInput, SidebarMenuSkeleton, SidebarSeparator). Remove `import { Skeleton }` and `import { Input }` from sidebar.tsx if they become unused.
  3. If SidebarMenuSkeleton is kept, replace `Math.random()` with a deterministic width derived from an optional `index` prop (e.g. `${50 + (index % 5) * 8}%`) so SSR and client agree.
- **Acceptance criteria:** `pnpm -r run typecheck` and `pnpm lint` pass (unused-import rule would flag leftovers); `git grep -w SidebarMenuSkeleton` returns no hits outside tests.
- **Risk of fix:** Low. Removing exports is a breaking change only for code that does not exist; confirm with grep before deleting.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-18] Interactive primitives have no unit tests: sticky-cta, swipe-row, sidebar, use-mobile, dropdown-menu, sheet, tooltip
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/ui/src/components/canadian-plans/sticky-cta.tsx, packages/ui/src/components/canadian-plans/swipe-row.tsx, packages/ui/src/components/sidebar.tsx, packages/ui/src/hooks/use-mobile.ts
- **Problem:** The package has tests for dialog, file-drop, form-field, native-select, review-card, select, stepper, table, textarea, elements (FAQ accordion only) and redesign. The stateful pieces with the most logic are untested: CpStickyCta (IntersectionObserver + keyboard/visualViewport heuristics + `inert`/`aria-hidden` toggling), CpSwipeRow (scroll-to-dot math), SidebarProvider (cookie write, ctrl/cmd+B shortcut, mobile sheet focus return) and useIsMobile (SSR default + matchMedia listener). apps/admin/src/components/app-sidebar.test.tsx only mounts SidebarProvider as a wrapper.
- **Impact (plain English):** Regressions in the floating order CTA (hidden when it should show, or shown over an open keyboard) or in the admin sidebar shortcut would ship unnoticed; CI is green while behaviour silently changes.
- **Evidence:**
  ```text
  git ls-files packages/ui | grep test  → no sticky-cta.test.tsx, swipe-row.test.tsx, sidebar.test.tsx, use-mobile.test.ts
  ```
- **Fix steps:**
  1. Add packages/ui/src/hooks/use-mobile.test.ts: stub `window.matchMedia` returning an object with addEventListener/removeEventListener and set `window.innerWidth`; assert `renderHook(() => useIsMobile()).result.current` is false before effects at width 1024 and true at width 500, and that the change listener is removed on unmount.
  2. Add packages/ui/src/components/canadian-plans/sticky-cta.test.tsx: stub `IntersectionObserver` (capture callback), render `<CpStickyCta floating anchorId="a" content={...}/>` with an element id="a" in the document; invoke the captured callback with `isIntersecting: true` and assert `aria-hidden="true"` + `inert`; with `isIntersecting: false` assert both absent; focus an `<input>` and dispatch `focusin`, assert hidden again; render with `suppressed` and assert hidden.
  3. Add packages/ui/src/components/sidebar.test.tsx: render SidebarProvider + Sidebar + SidebarTrigger; click the trigger and assert `document.cookie` contains `sidebar_state=false`; fire `keydown` {key:'b', ctrlKey:true} on window and assert state toggles back; with useIsMobile mocked to true, open the sheet, press Escape and assert focus returns to `[data-sidebar="trigger"]`.
  4. Use the existing vitest jsdom setup (packages/ui/vitest.config.ts) — no new libraries needed.
- **Acceptance criteria:** `pnpm --filter @canadian-plans/ui test` lists the three new files and passes; coverage for sticky-cta.tsx, use-mobile.ts and sidebar.tsx is non-zero in `pnpm --filter @canadian-plans/ui test -- --coverage`.
- **Risk of fix:** Low. Tests only; no production code changes.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-19] Shared components stylesheet hard-codes storefront page class names and carries two generations of chrome rules that override each other
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/ui/src/styles/canadian-plans-components.css:3-26,565-957,1536-1941
- **Problem:** Lines 3-26 set `--cp-focus-color` for app-level page classes (`.cp-home-hero-card`, `.cp-arrival-final-card`, `.cp-internet-address-card`, `.cp-footer`, ...) that are defined in apps/site-1, coupling the 'content-free' package to page markup it does not own. Lines 565-957 define the legacy utility bar / nav / footer, and lines 1536-1941 ("Final homepage design chrome") redefine most of the same selectors (`.cp-utility`, `.cp-utility .cp-chrome-container`, `.cp-footer`, `.cp-footer-top`, `.cp-footer-group`, `.cp-footer-bottom`, `.cp-footer-legal-separator` — the latter now `display:none` in both branches at 1936-1941). The earlier block is effectively dead CSS shipped to every storefront page.
- **Impact (plain English):** No functional defect; extra CSS bytes on every page and a maintenance trap: editing the first `.cp-footer` block has no visible effect, which will confuse the next agent.
- **Evidence:**
  ```text
  canadian-plans-components.css:810  .cp-footer { padding: var(--cp-space-48) 0 var(--cp-space-32); background: var(--cp-color-navy); ...}
   canadian-plans-components.css:1720  .cp-footer { padding: var(--cp-space-64) 0 var(--cp-space-32); ...}
   canadian-plans-components.css:1936-1941  .cp-footer-legal-separator { display: none; @variant cp-chrome { display: none; } }
  ```
- **Fix steps:**
  1. In packages/ui/src/styles/canadian-plans-components.css, for each selector that appears in both the 565-957 block and the 1536-1941 block (.cp-utility, .cp-utility .cp-chrome-container, .cp-utility-links, .cp-utility-phone, .cp-utility-secondary, .cp-utility-secondary .cp-utility-contact, .cp-utility-secondary a, .cp-nav-inner gap/padding, .cp-brand gap, .cp-nav-links a, .cp-footer, .cp-footer-top, .cp-footer-about, .cp-footer-about > p, .cp-footer-contact, .cp-footer-group, .cp-footer-group ul, .cp-footer-group a, .cp-footer-bottom, .cp-footer-bottom nav ul, .cp-footer-legal-separator), delete the declarations in the earlier block that are fully overridden by the later block, or merge the two into one declaration with the final values. Do this one selector at a time and compare the storefront visually.
  2. Move the `--cp-focus-color` overrides for page classes (lines 3-26) into the app stylesheet that owns those classes (apps/site-1/src/app/(home)/home-design.css etc.), leaving only `.cp-footer` (which the package styles) in the shared file.
- **Acceptance criteria:** Playwright visual snapshots of /, /pre-arrival-sim, /home-internet, /mobile-plans, /faq, /contact and the footer are pixel-identical before/after; `pnpm --filter site-1 build` CSS output shrinks.
- **Risk of fix:** Medium. Cascade order matters; removing a rule that is only partially overridden changes layout. Do it with screenshots open.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-20] Token file mixes px and rem for the same spacing scale and ships hundreds of one-off design-export tokens
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/ui/src/styles/canadian-plans.css:1363-1369,1382-1384,352-404,418-533
- **Problem:** The file's header says 'Lengths use rem (Figma px / 16)' and the main spacing scale is rem (lines 1007-1039), but late appended blocks define `--cp-space-3: 3px`, `--cp-space-34: 34px`, `--cp-space-42: 42px`, `--cp-space-60: 60px`, `--cp-space-110: 110px`, `--cp-space-52: 52px`, so those steps do not scale with user font-size while neighbours do. Separately, 50+ tokens such as `--cp-arrival-art-146-827px`, `--cp-home-length-52-863`, `--cp-radius-718-329` encode single Figma measurements as 'tokens' with their value in the name, which defeats the purpose of a token.
- **Impact (plain English):** Users who enlarge text get inconsistent spacing where px tokens are used; for developers, the 1393-line file is hard to navigate and encourages adding more one-offs. No functional breakage.
- **Evidence:**
  ```text
  canadian-plans.css:1363-1369  :root { --cp-space-3: 3px; --cp-space-34: 34px; --cp-space-42: 42px; --cp-space-60: 60px; --cp-space-110: 110px; }
   canadian-plans.css:402  --cp-arrival-art-146-827px: 9.1766875rem;
  ```
- **Fix steps:**
  1. In packages/ui/src/styles/canadian-plans.css lines 1363-1369 and 1382-1384, convert the px values to rem (3px→0.1875rem, 34px→2.125rem, 42px→2.625rem, 52px→3.25rem, 60px→3.75rem, 110px→6.875rem) and move them into the main spacing list at lines 1007-1039 in numeric order; delete the now-empty trailing `:root {}` blocks.
  2. Leave the one-off `--cp-*-art-*` / `--cp-home-length-*` tokens as they are for now (removing them touches many app CSS files); add a comment above line 352 stating they are export geometry, not design tokens, and that new values must not follow the pattern.
- **Acceptance criteria:** `git grep -n "px;" packages/ui/src/styles/canadian-plans.css` returns only the `--cp-cookie-origin: 0px` / `--cp-track-dialog-origin: 0px` zero values; storefront screenshots at default zoom are unchanged.
- **Risk of fix:** Low. rem equivalents at 16px root are identical; only users with non-default root font-size see (intended) scaling.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-21] scaffold.spec.ts credential-leak assertion is skipped in one run and checks the wrong value in the other
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/e2e/scaffold.spec.ts:28-32, apps/site-1/scripts/verify-client-bundle.mjs:19-27, apps/site-1/playwright.config.ts:23-24, apps/site-1/playwright.config.ts:89-93
- **Problem:** The spec reads `process.env['SITE_1_SERVICE_CREDENTIAL']` from the Playwright test process and only asserts the response/HTML does not contain it `if (credential)`. During `pnpm --filter site-1 run test:e2e` that variable is never set in the test process (CI exports no SITE_1_SERVICE_CREDENTIAL; the playwright config only injects it into the `next start` webServer env), so the check is skipped. During `test:security` the test process has `SITE_1_SERVICE_CREDENTIAL=<random sentinel>` (verify-client-bundle.mjs:19-22), but the storefront server under test is started with `SITE_1_SERVICE_CREDENTIAL: SERVICE_CREDENTIAL` = 'cplsk_e2e_order_journey_secret_0001' (playwright.config.ts:23-24, 92), so the assertion checks that a string the server never saw is absent — always true. The static bundle scan in verify-client-bundle.mjs (lines 39-61) is the meaningful check and it does work; the runtime HTML check is vacuous.
- **Impact (plain English):** If server-rendered HTML ever started including the backend credential (e.g. through an error page or debug prop), the browser test that looks like it guards against it would still pass. The build-time scan would still catch a credential compiled into static assets, but not one rendered at request time.
- **Evidence:**
  ```text
  scaffold.spec.ts:28  const credential = process.env['SITE_1_SERVICE_CREDENTIAL'];
  scaffold.spec.ts:29  if (credential) {
  playwright.config.ts:92  SITE_1_SERVICE_CREDENTIAL: SERVICE_CREDENTIAL,   // server uses the harness secret, not the test-process value
  ```
- **Fix steps:**
  1. In apps/site-1/e2e/scaffold.spec.ts replace lines 28-32 with: `const credential = process.env['E2E_SERVICE_CREDENTIAL'] ?? 'cplsk_e2e_order_journey_secret_0001'; expect(await response?.text()).not.toContain(credential); expect(await page.content()).not.toContain(credential);` (remove the `if (credential)` wrapper so the assertion always runs; the default must match SERVICE_CREDENTIAL in apps/site-1/playwright.config.ts:23-24).
  2. Optionally also keep checking `process.env['SITE_1_SERVICE_CREDENTIAL']` when set, so the sentinel from test:security is still asserted against.
- **Acceptance criteria:** Temporarily add `<p>{process.env.SITE_1_SERVICE_CREDENTIAL}</p>` to a server component on `/track`, run `pnpm --filter site-1 run test:e2e e2e/scaffold.spec.ts`: the `/track` test must now fail. Revert; the test passes.
- **Risk of fix:** Low. Test-only change.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-22] Vitest project configs are inconsistent: site-1 only collects *.test.ts (never .tsx), db project is unnamed, root passWithNoTests hides empty globs
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/vitest.config.ts:12, packages/db/vitest.config.ts:5-11, vitest.config.ts:7-12
- **Problem:** site-1's include is `['src/**/*.test.ts']`, so any React component test written as `.test.tsx` in site-1 is silently ignored (admin and packages/ui use the default include and do run .tsx tests). packages/db/vitest.config.ts is the only project without `name`, so its output lines are unlabeled in the combined run. The root config sets `passWithNoTests: true` for all projects, which is needed for packages without tests but also means a mis-scoped include (as above) produces a green run with zero tests instead of an error.
- **Impact (plain English):** A developer adding a `.test.tsx` file in the storefront would believe it runs when it does not; CI stays green with the test never executed.
- **Evidence:**
  ```text
  apps/site-1/vitest.config.ts:12  test: { ...baseTestConfig, name: 'site-1', environment: 'node', include: ['src/**/*.test.ts'] },
  packages/db/vitest.config.ts:6-10  test: { ...baseTestConfig, environment: 'node', include: ['tests/**/*.test.ts'] }   // no name
  vitest.config.ts:9  passWithNoTests: true,
  ```
- **Fix steps:**
  1. In apps/site-1/vitest.config.ts change `include: ['src/**/*.test.ts']` to `include: ['src/**/*.test.{ts,tsx}']`.
  2. In packages/db/vitest.config.ts add `name: 'db',` inside the `test` object (after `...baseTestConfig,`).
  3. No change to passWithNoTests (still required for packages/types, packages/config); the include fix removes the one case where it would hide missing tests.
- **Acceptance criteria:** Add a trivial `src/components/example.test.tsx` in site-1 with one failing assertion; `pnpm --filter site-1 test` must fail. Remove it. `pnpm run test` output labels db suites with `|db|`.
- **Risk of fix:** Low. If a .test.tsx file already exists in site-1 (none found in git ls-files today) it would start running.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-23] Commission exactly-once is tested only for a sequential retry, not for two concurrent activations
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/tests/partners-commission.integration.test.ts:134-172
- **Problem:** The 'activation creates exactly one commission line, even when retried' test activates once, then retries with expectedVersion 2 and asserts illegal_transition. There is no test where two activation calls with the same expectedVersion race (as orders.integration.test.ts:258-295 does for order submission). The database does carry `UNIQUE("workspace_id","order_id")` on commission_lines (packages/db/drizzle/0018_lowly_dragon_lord.sql:30) and the transition store uses optimistic versioning, so the guarantee is likely sound, but invariant 10 ('created exactly once per order') is not proven under concurrency.
- **Impact (plain English):** If the version check or the unique constraint were ever weakened, a double-click or retried admin request could pay a partner twice; today the schema prevents it, but no test would fail if that protection regressed.
- **Evidence:**
  ```text
  partners-commission.integration.test.ts:150-161  // Retrying activation on the already-activated order is an illegal transition ... expect(retry.status).toBe('illegal_transition');
  ```
- **Fix steps:**
  1. In apps/backend/tests/partners-commission.integration.test.ts add a test after line 172: seed a 'dispatched' order with `seedOrder`, insert RULE_1, create two stores `const a = store(); const b = store();`, run `const outcomes = await Promise.all([a.transition({...activateInput, expectedVersion: 1}), b.transition({...activateInput, expectedVersion: 1})]);`, assert `outcomes.map(o => o.status).sort()` equals `['transitioned', 'version_conflict']` and `await countLines(order.id)` equals 1 and `commission_line_events` for the workspace has exactly one 'earned' row.
  2. If the second outcome surfaces as a unique-violation error instead of version_conflict, that is a finding for the transition store (it should map the race to version_conflict); report it rather than loosening the assertion.
- **Acceptance criteria:** The new test passes against the disposable database in CI (`pnpm --filter backend exec vitest run tests/partners-commission.integration.test.ts` with the DB env set) and fails if the `expectedVersion` check in DatabaseOrderTransitionStore.transition is removed.
- **Risk of fix:** Low. Test-only addition; uses the same fixtures and store wiring as the existing tests.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-25] Sidebar 'Documents' links to a placeholder page although document review is implemented per order
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/admin/src/app/w/[workspace]/documents/page.tsx:3-17, apps/admin/src/components/app-sidebar.tsx:30
- **Problem:** The route says 'No data yet — this is a placeholder route. Verified document review lands once the backend documents endpoints exist.' but the backend endpoints exist and `OrderDocuments` (order-documents.tsx) already lists, reviews and downloads files from the order detail page.
- **Impact (plain English):** Staff clicking the primary nav item land on a dead page with stale text saying the feature does not exist, and may not realise documents are handled inside each order.
- **Evidence:**
  ```text
  documents/page.tsx:10 `<CardDescription>No data yet — this is a placeholder route.</CardDescription>`; app-sidebar.tsx:30 `{ section: 'documents', label: 'Documents', icon: FileTextIcon }`.
  ```
- **Fix steps:**
  1. Either remove the `documents` entry from `NAV_ITEMS` in app-sidebar.tsx and delete `src/app/w/[workspace]/documents/page.tsx`, or
  2. Keep the route but replace the placeholder copy with a short explanation and a link: 'Customer documents are reviewed on each order. Open an order from Orders to approve, reject or download its documents.' with `<Link href={`/w/${workspace}/orders`}>Go to orders</Link>` (make the page async and read `params` like the sibling pages).
- **Acceptance criteria:** The Documents nav item is gone or leads to a page with accurate copy and a working link to the orders list; app-sidebar.test.tsx updated accordingly and passing.
- **Risk of fix:** Low. Copy/navigation only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-27] Vancouver page says 'Internet + TV starts at $115' but $115 is the StreamSaver app-TV plan; the Internet + TV Bundle is $140
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/content/landing/internet.ts:209, packages/adapters/src/static-catalogue/site-1-plans.ts:289-302
- **Problem:** The quick answer on /home-internet/vancouver ends 'Internet + TV starts at $115.' In the catalogue the BC $115 plan is 'Internet + StreamSaver TV' (70+ channels on the app) and the plan literally named 'Internet + TV Bundle' (120+ channels, PVR) is $140.
- **Impact (plain English):** A customer expecting the 120-channel PVR bundle for $115 is quoted $140 by the advisor.
- **Evidence:**
  ```text
  internet.ts:209  '… and a 2-year price lock. Internet + TV starts at $115.'
  site-1-plans.ts:289-302  streamsaver … priceDollars: 115 / tv … priceDollars: 140
  ```
- **Fix steps:**
  1. In apps/site-1/content/landing/internet.ts line 209 change the last sentence to 'Internet + StreamSaver TV starts at $115 and the Internet + TV Bundle at $140.'
- **Acceptance criteria:** /home-internet/vancouver quick answer names both TV plans with their catalogue prices.
- **Risk of fix:** Low. None.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-28] Response-time promises differ across pages (1 business day, 2 business days, 'in minutes', 'same day', '< 2 hrs')
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/content/contact.ts:58, apps/site-1/content/system.ts:57,230, apps/site-1/content/plan-finder.ts:97, apps/site-1/content/emails.ts:19,22, apps/site-1/content/about.ts:63, apps/site-1/content/home.ts:39-40, apps/site-1/content/landing/shared.ts:36
- **Problem:** Email reply time is '1 business day' on /contact but '2 business days' on /accessibility; WhatsApp is 'in minutes' in the finder and search page; order confirmation is 'the same day' in several places and '< 2 hrs' in the unused home.ts.
- **Impact (plain English):** Minor, but customers hold the business to the shortest promise they saw.
- **Evidence:**
  ```text
  contact.ts:58  description: 'We reply within 1 business day.',
  system.ts:230  'We reply within 2 business days and fix issues as quickly as we can.'
  system.ts:57  'or ask an advisor on WhatsApp. We reply in minutes.'
  ```
- **Fix steps:**
  1. OWNER APPROVAL (one-line decision): pick one email reply promise and one confirmation promise.
  2. Apply the chosen wording to contact.ts:58, system.ts:57 and 230, plan-finder.ts:97; delete the stale `'< 2 hrs' / 'to confirm your order'` trust item in home.ts:38-41 (unused but misleading for future reuse).
- **Acceptance criteria:** `git grep -n -E 'reply (within|in) ' apps/site-1/content` shows a single consistent promise.
- **Risk of fix:** Low. Copy only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Owner to choose the service levels.

### [CQ-30] Search fixtures show fake breadcrumbs and a non-existent 'eSIM vs SIM' guide
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/content/system.ts:119-130,157-169,170-182
- **Problem:** searchItems hard-code crumbs such as 'canadianplans.com › guides › best-sim-students-india' (the real slug is best-sim-for-students-from-india) and 'canadianplans.com › guides › esim-vs-sim' for a guide that does not exist (href points to an anchor inside the student guide). The Vancouver result says 'Rogers-network internet' (see provider finding).
- **Impact (plain English):** The /search page shows URLs that do not exist and a guide title the site does not have.
- **Evidence:**
  ```text
  system.ts:124  crumb: 'canadianplans.com › guides › best-sim-students-india',
  system.ts:163  crumb: 'canadianplans.com › guides › esim-vs-sim',
  ```
- **Fix steps:**
  1. apps/site-1/content/system.ts line 124: change crumb to 'canadianplans.com › guides › best-sim-for-students-from-india'.
  2. Lines 157-169: change the item to title 'Is your phone eSIM-ready?' with crumb 'canadianplans.com › guides › best-sim-for-students-from-india › esim' (matching its href), or remove the item.
  3. Line 179: change 'Rogers-network internet for apartments and student housing' to 'Home internet for apartments and student housing'.
- **Acceptance criteria:** Every searchItems crumb corresponds to an existing route/anchor on the site.
- **Risk of fix:** Low. None.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-31] Dead or superseded content with wrong claims is still shipped: v1 legal drafts with brackets, unused homeCopy (ratings, 'Serving ON'), Rogers-hard-coded React Email templates
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/content/legal.ts:26-271, apps/site-1/src/components/legal/page.tsx:13,94, apps/site-1/content/home.ts:4-342, apps/site-1/content/emails.ts:14-78, apps/site-1/src/emails/*.tsx, apps/site-1/content/components.ts:265-331
- **Problem:** legalDrafts (Version 1.0, '[legal company name]', 'authorized Rogers dealer', '[Lawyer to draft liability wording.]') are only rendered when getLegalPage returns source 'test_placeholder', which the function never does (src/lib/legal.ts:98-118), yet the published layout still pulls `draft.contact.title` from it. homeCopy (home.ts) is imported by the live homepage only for `title` and `skip`; its remaining 300 lines carry the fabricated rating, 'Serving BC, ON, AB, MB, SK' and 'home internet launches later' messages. The React Email templates (emails.ts + src/emails) are rendered only on /dev/emails and hard-code 'We set up your plan with Rogers' / 'A Rogers technician' and a dashed 'IMAGE' placeholder, so wiring them to the backend as-is would ship wrong copy.
- **Impact (plain English):** No customer sees these today, but they are a trap: the next AI agent (or the owner) reusing 'approved-looking' copy will resurrect false claims, and the bundle carries dead strings.
- **Evidence:**
  ```text
  legal.ts:45  'Canadian Plans ([legal company name]) is an authorized Rogers dealer…'
  home.ts:258  provinces: ['BC', 'ON', 'AB', 'MB', 'SK'],
  emails.ts:66  `A Rogers technician will arrive on ${date}…`
  ```
- **Fix steps:**
  1. apps/site-1/content/legal.ts: delete the `legalDrafts` object (lines 26-271) and export only `legalCopy`/`legalAssets`; in apps/site-1/src/components/legal/page.tsx remove the `draft` variable and the `preview` branches (getLegalPage never returns test_placeholder), using `copy.publishedHeader`, a fixed contact title string ('Questions about this policy?') and `/contact#contact-options`; update apps/site-1/src/app/(legal)/terms/page.tsx and privacy/page.tsx to stop importing legalDrafts; adjust components/legal/page.test.ts accordingly.
  2. apps/site-1/content/home.ts: reduce `homeCopy` to `{ title, skip }` (the only keys the live page uses) and delete `homeAssets` if nothing imports it (`git grep -n homeAssets apps/site-1/src` first).
  3. apps/site-1/content/emails.ts lines 28 and 66: change 'with Rogers' to 'with your provider' and 'A Rogers technician' to 'A technician from your provider' so the templates are correct if they are ever wired.
  4. Add a one-line header comment to apps/site-1/content/components.ts stating the fixtures (planExamples, sectionHeading, reviewExamples) are for /dev/components only and contain unverified sample claims.
- **Acceptance criteria:** site-1 typecheck, lint and vitest pass; /terms and /privacy render unchanged (version 2, effective 2026-10-21); `git grep -n 'legal company name' apps/site-1` returns nothing.
- **Risk of fix:** Medium. Removing the preview branch touches legal page tests (components/legal/page.test.ts) and sitemap.test.ts which may construct test_placeholder pages; keep `testPlaceholder()` in lib/legal.ts for those tests or update them.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-32] saveDocuments, requestCallback and submitOrder forward documentKeys/acknowledged from the browser without validation (saveDetails validates them)
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/src/app/(storefront)/order/actions.ts:44, apps/site-1/src/app/(storefront)/order/actions.ts:290-313, apps/site-1/src/app/(storefront)/order/actions.ts:429-451, apps/site-1/src/app/(storefront)/order/actions.ts:476-484
- **Problem:** `saveDetails` parses `input.documentKeys` with `documentKeysSchema` (regex, max 32), but `saveDocuments`, `requestCallback` and `submitOrder` pass `input.documentKeys` and `input.acknowledged` straight into `buildOrderForm`, whose `payload.documents.required = [...documentKeys]`. The backend form payload is `z.record(z.string(), z.unknown())`, so arbitrary strings (up to the 64 kB body limit) land in the lead/order form snapshot. In `submitOrder` the body is built outside the `try`, so a non-iterable `documentKeys` throws out of the action and the browser shows the misleading 'couldn't reach our servers' message.
- **Impact (plain English):** Only a tampering client is affected, and the backend's 64 kB body limit bounds the damage, but junk can be written into order snapshots that staff read, and the typed contract between form and server is weaker than the code comments claim.
- **Evidence:**
  ```text
  `form: formFor(checked.order, input.documentKeys, input.acknowledged)` (saveDocuments) and `form: formFor(checked.order, input.documentKeys, true)` built before `try {` in submitOrder; `const documentKeysSchema = z.array(z.string().regex(/^[a-z0-9_]{1,64}$/)).max(32);` is only used in saveDetails.
  ```
- **Fix steps:**
  1. In `apps/site-1/src/app/(storefront)/order/actions.ts` add a helper after `documentKeysSchema`: `function parseDocumentKeys(value: unknown): readonly string[] | undefined { const parsed = documentKeysSchema.safeParse(value); return parsed.success ? parsed.data : undefined; }`.
  2. In `saveDocuments`, `requestCallback` and `submitOrder`, right after the `checkDetails` call, add `const documentKeys = parseDocumentKeys(input.documentKeys); if (!documentKeys) return { ok: false, code: 'validation_error', message: 'The selected plan is invalid.' };` and use `documentKeys` in the `formFor(...)` calls.
  3. In `saveDocuments`, replace `input.acknowledged` with `input.acknowledged === true`.
  4. Add unit tests in `actions.test.ts` for each of the three actions with `documentKeys: 'not-an-array'` expecting `code: 'validation_error'` and no backend call.
- **Acceptance criteria:** New unit tests pass; `pnpm --filter site-1 test:e2e` still passes (the real form always sends a valid string array).
- **Risk of fix:** Low. The real client always sends `selected.commercial.documentChecklist`, which already matches the regex (document checklist keys are lower-case snake_case).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-34] OpenAPI/typed client advertise two unmounted endpoints and omit three mounted ones; API.md misses several live routes
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** docs/API.md:7-11, docs/API.md:21, docs/api/openapi.json:14068, docs/api/openapi.json:14369, packages/contracts/src/endpoints.ts:503-524, packages/contracts/src/client.ts:868-876, apps/backend/src/app.ts:116-156, apps/backend/src/routes/email.ts:197-219, apps/backend/src/routes/staff.ts:357, apps/backend/src/routes/website.ts:515-625, apps/backend/src/routes/synthetic-check.ts:123-124
- **Problem:** (a) `POST /api/v1/staff/workspaces/{workspaceId}/partners/{partnerId}/invoices` and `POST /api/v1/staff/workspaces/{workspaceId}/exports` are defined in endpoints.ts (the second commented 'Phase B seam'), emitted into openapi.json and exposed as methods on `createBackendClient`, but no router mounts them (staff.ts route list has neither; app.ts mounts no other staff router), so a call returns Express's default HTML 404. API.md:9-10 nevertheless says the OpenAPI document covers 'partners/commissions/invoices' and 'exports'. (b) API.md:7-11 claims the OpenAPI file covers 'the full /api/v1 surface', but openapi.json has no `/api/v1/webhooks/resend/{selector}`, `/api/v1/email/unsubscribe` or `/api/v1/email/staff/workspaces/{workspaceId}/delivery`, all mounted in app.ts/email.ts. (c) API.md has no entry for `GET /api/v1/email/unsubscribe`, `GET /api/v1/email/staff/workspaces/{workspaceId}/delivery`, `GET /api/v1/staff/workspaces/{workspaceId}/leads`, `POST /api/v1/website/uploads/intents`, `POST /api/v1/website/uploads/{uploadId}/finalize`, `POST /api/v1/website/files/{fileId}/download-link`, or `GET|POST /api/internal/synthetic-check/run`. (d) API.md:21 still says it documents 'the currently implemented (T5/T6) routes'. The committed openapi.json is byte-identical to the generator output (verified with the orchestrator's compare script), so this is a contracts/docs content gap, not a stale build.
- **Impact (plain English):** A developer or AI using the typed client or OpenAPI file will call two endpoints that do not exist and will not find the unsubscribe, delivery or upload endpoints in the reference. No customer-facing effect today.
- **Evidence:**
  ```text
  packages/contracts/src/endpoints.ts:514-518: `// Staff — exports (Phase B seam)` ... `path: '/api/v1/staff/workspaces/{workspaceId}/exports'`. `git grep -n -E 'invoices|/exports' -- apps/backend/src/routes` returns nothing. docs/API.md:8-11: 'covers the full `/api/v1` surface (leads, quotes, orders, workspace orders, uploads, download links, partners/commissions/invoices, webhooks, exports, tracking, ...)'.
  ```
- **Fix steps:**
  1. packages/contracts/src/endpoints.ts: on the `partnerInvoice` (line ~503) and `createExport` (line ~516) entries, prefix `summary` with 'NOT MOUNTED (Phase B): ' so the generated OpenAPI and client docs say so; regenerate with `pnpm --filter @canadian-plans/contracts build` and commit docs/api/openapi.json.
  2. docs/API.md lines 8-11: change 'partners/commissions/invoices, webhooks, exports' to 'partners/commissions (the invoices and exports operations are Phase B placeholders that return 404), the Sanity webhook' and add 'The Resend webhook and `/api/v1/email/*` routes are documented below but not yet in the OpenAPI file.' Line 21: replace '(T5/T6)' with 'Phase A'.
  3. docs/API.md: add short sections for `GET /api/v1/email/unsubscribe?token=` (200 `{status:'unsubscribed'}`, 400 `missing_token`/`invalid_token`), `GET /api/v1/email/staff/workspaces/{workspaceId}/delivery` (staff session + `workspace.read`; returns `{messages, summary}`), `GET /api/v1/staff/workspaces/{workspaceId}/leads`, the three `/api/v1/website/uploads|files` routes (actions `upload-intent`, `upload-finalize`, `file-download` already listed in ENV.md), and `GET|POST /api/internal/synthetic-check/run` (same auth as the other internal routes).
- **Acceptance criteria:** `node -e "const d=require('./docs/api/openapi.json');console.log(d.paths['/api/v1/staff/workspaces/{workspaceId}/exports'].post.summary)"` starts with 'NOT MOUNTED'; `grep -c 'email/unsubscribe\|synthetic-check/run\|uploads/intents' docs/API.md` is at least 3.
- **Risk of fix:** Low. Changing a summary string regenerates openapi.json; contracts tests that snapshot the document (if any) must be updated in the same change.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-35] ENV.md lists variables nothing in the apps reads and omits several that are read
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** docs/ENV.md:137-140, docs/ENV.md:203, docs/ENV.md:46, docs/ENV.md:82, docs/ENV.md:219, docs/ENV.md:223, docs/RUNBOOKS/secret-rotation.md:70, docs/RUNBOOKS/alerts.md:85, packages/adapters/src/r2-s3.ts:59, apps/backend/src/documents/config.ts:18, apps/admin/src/lib/error-tracking.ts:34, apps/site-1/src/lib/legal.ts:105, apps/backend/src/scheduler.ts:33, scripts/provision-b2-writers.mjs:9-10
- **Problem:** Documented but never read by backend/admin/site-1: `SANITY_API_TOKEN` and `SANITY_API_VERSION` (only apps/site-1/scripts/seed-test-offers.mjs reads them; the backend takes Sanity project/dataset/token from the `sanity` block of `MACHINE_REGISTRY_JSON`, apps/backend/src/machines/registry.ts), so secret-rotation.md:70 'Update `SANITY_API_TOKEN` (Railway backend)' rotates nothing; `UMAMI_WEBSITE_ID` (ENV.md:203) is read nowhere (`NEXT_PUBLIC_UMAMI_WEBSITE_ID` and `UMAMI_WORKSPACE_WEBSITES` are). Read but undocumented: `R2_REGION` (r2-s3.ts:59 and jobs/src/backup/cli.ts:99, default `auto`), `NEXT_PUBLIC_DEPLOYMENT_ENV` (admin error-tracking.ts:34), `NEXT_PUBLIC_SANITY_API_VERSION` (site-1 legal.ts:105, default `2024-01-01`), the jobs-only `BACKUP_RUN_ID`, `RESTORE_RUN_ID`, `RETENTION_DRY_RUN`, `SANITY_SITE_FILTER`, `LEDGER_CHECKPOINT_VERIFICATION_KEY`, and `B2_PROVISION_KEY_ID`/`B2_PROVISION_KEY` (scripts/provision-b2-writers.mjs). Defaults that differ or are missing: `R2_BUCKET` falls back to `canadian-plans-site-1-docs` in apps/backend/src/documents/config.ts:18 (the R2 store in r2-s3.ts:57 requires it) while ENV.md lists no default; `SYNTHETIC_CHECK_INTERVAL_MS` is written in ENV.md:223 and alerts.md:85 as if configurable but is the constant `15 * 60_000` in scheduler.ts:33. Stale sentences: ENV.md:46 'the email handler stays unconfigured until T18 wires its adapter' (T18 shipped); ENV.md:219 says the Resend section is 'below' though it is above (line 169).
- **Impact (plain English):** Minor: an owner may waste time setting or rotating variables that have no effect, or miss that the document cleanup worker has a hard-coded bucket default.
- **Evidence:**
  ```text
  docs/ENV.md:140: `- SANITY_API_TOKEN`; `git grep -n SANITY_API_TOKEN -- apps/backend apps/admin packages jobs` returns nothing. packages/adapters/src/r2-s3.ts:59: `region: env.R2_REGION ?? 'auto',`. apps/backend/src/scheduler.ts:33: `export const SYNTHETIC_CHECK_INTERVAL_MS = 15 * 60_000;`
  ```
- **Fix steps:**
  1. docs/ENV.md '## Sanity' (lines 132-142): under `SANITY_PROJECT_ID`/`SANITY_DATASET` add '(read only by the backup job via `BACKUP_SANITY_PROJECT_ID`; the backend reads Sanity settings from the `sanity` block of `MACHINE_REGISTRY_JSON`)'; mark `SANITY_API_TOKEN` and `SANITY_API_VERSION` as 'local seed script `apps/site-1/scripts/seed-test-offers.mjs` only, not a deployment variable'.
  2. docs/ENV.md line 203: delete `UMAMI_WEBSITE_ID` (keep `NEXT_PUBLIC_UMAMI_WEBSITE_ID` and `UMAMI_WORKSPACE_WEBSITES`).
  3. docs/ENV.md: add `R2_REGION` (optional, default `auto`) under '## Cloudflare R2'; note on `R2_BUCKET` that the backend document cleanup falls back to `canadian-plans-site-1-docs` when unset (apps/backend/src/documents/config.ts); add `NEXT_PUBLIC_DEPLOYMENT_ENV` next to `NEXT_PUBLIC_RELEASE_SHA` (line 202); add `NEXT_PUBLIC_SANITY_API_VERSION` (default `2024-01-01`) under Sanity; add a '## Jobs CLI (GitHub Actions only)' list with `BACKUP_RUN_ID`, `RESTORE_RUN_ID`, `RETENTION_DRY_RUN`, `SANITY_SITE_FILTER`, `LEDGER_CHECKPOINT_VERIFICATION_KEY`, `B2_PROVISION_KEY_ID`, `B2_PROVISION_KEY`.
  4. docs/ENV.md line 223 and docs/RUNBOOKS/alerts.md line 85: change '(`SYNTHETIC_CHECK_INTERVAL_MS`)' to '(the constant `SYNTHETIC_CHECK_INTERVAL_MS` in apps/backend/src/scheduler.ts; not an environment variable)'. Line 46: delete 'until T18 wires its adapter'. Line 219: change 'below' to 'above'.
  5. docs/RUNBOOKS/secret-rotation.md lines 65-73: replace the `SANITY_API_TOKEN` (Railway) instruction with 'rotate the `readToken` inside the Sanity entry of `MACHINE_REGISTRY_JSON` on Railway (only once a Sanity entry exists)'.
- **Acceptance criteria:** Every name produced by `git grep -o -h -E "process\.env\.?\[?['\"]?[A-Z][A-Z0-9_]+|env\[['\"][A-Z][A-Z0-9_]+" -- apps/backend/src apps/admin/src apps/site-1/src packages/adapters/src packages/db/src jobs/src | grep -o -E '[A-Z][A-Z0-9_]+$' | sort -u` (excluding `CI`, `VERCEL`, `VERCEL_ENV`, `npm_execpath`) appears in docs/ENV.md, and `grep -n 'UMAMI_WEBSITE_ID' docs/ENV.md` matches only the `NEXT_PUBLIC_` form.
- **Risk of fix:** Low. Documentation only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-36] Railway migration plan still reads 'Status: not started' and lists stale variable guidance; Vercel backend artifacts never decommissioned
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** docs/MIGRATION/RAILWAY_BACKEND.md:3, docs/MIGRATION/RAILWAY_BACKEND.md:328-329, docs/MIGRATION/RAILWAY_BACKEND.md:277-297, docs/MIGRATION/RAILWAY_BACKEND.md:470-483, docs/LAUNCH_CHECKLIST.md:84-91, apps/backend/package.json:9, apps/backend/src/app.ts:104-106, apps/backend/src/routes/website.ts:86
- **Problem:** The cutover to Railway completed in September (ADR 0004, LAUNCH_CHECKLIST 'Railway fixes'), but the plan's header says 'Status: **not started**'. Its section 10 table names `TURNSTILE_HOSTNAME` (code prefers `TURNSTILE_HOSTNAMES`, website.ts:86, and ENV.md:90 calls the singular 'legacy') and says `SANITY_*` is 'Needed by the catalogue provider' (the backend reads Sanity from `MACHINE_REGISTRY_JSON`). Section 9.2 describes `railway.json`, which LAUNCH_CHECKLIST lines 84-86 record Railway no longer reads (config-as-code moved to `.railway/railway.ts`, which does not exist in the repo). Phase 10 decommission (lines 470-483) was never done: apps/backend/vercel.json, api/index.ts, src/vercelHandler.ts and scripts/write-vercel-handler-dts.mjs are still present, `pnpm --filter backend build` still runs the Vercel d.ts step, and app.ts:105 still documents 'the Vercel function entry'.
- **Impact (plain English):** Confusing for anyone operating the backend: the plan reads as future work, and the repo still carries a dead deployment path that the Dockerfile build pays for. No runtime effect.
- **Evidence:**
  ```text
  docs/MIGRATION/RAILWAY_BACKEND.md:3: 'Status: **not started**'. apps/backend/package.json:9: `"build": "tsup && node scripts/write-vercel-handler-dts.mjs"`. `git ls-files .railway` is empty; `railway.json` exists.
  ```
- **Fix steps:**
  1. docs/MIGRATION/RAILWAY_BACKEND.md line 3: change to 'Status: **completed** (cutover 18-21 Sep 2026; Phase 10 decommission still open). Historical plan; current configuration is in docs/ENV.md and docs/ADR/0004-backend-on-railway.md.'
  2. Line 328: rename `TURNSTILE_HOSTNAME` to `TURNSTILE_HOSTNAMES` with value 'comma-separated hostnames, e.g. `canadianplans.com,www.canadianplans.com`'. Line 329: change the `SANITY_*` note to 'not read by the backend; Sanity settings live in the `sanity` block of `MACHINE_REGISTRY_JSON`'.
  3. Section 9.2: add a note that Railway now ignores `railway.json` and the builder/healthcheck settings were applied on the service (LAUNCH_CHECKLIST 20 Oct); keep the file until `.railway/railway.ts` is added.
  4. Optionally execute Phase 10 as its own PR exactly as lines 470-483 describe (delete the four Vercel files, simplify tsup.config.ts and the `build` script, remove the `--vercel backend` branch from scripts/affected-builds.mjs, update the app.ts comment); run `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run test:tooling && pnpm --filter backend build` after.
- **Acceptance criteria:** `head -5 docs/MIGRATION/RAILWAY_BACKEND.md` no longer says 'not started'; `grep -n 'TURNSTILE_HOSTNAME`' docs/MIGRATION/RAILWAY_BACKEND.md` is empty. If Phase 10 is executed: `git ls-files apps/backend | grep -i vercel` is empty and `pnpm --filter backend build` emits `dist/src/server.js`.
- **Risk of fix:** Low. Documentation edits are risk-free. The optional Phase 10 code removal touches the build script and scripts/affected-builds.mjs; its tests (scripts/affected-builds.test.mjs) must be kept green.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-37] Stale or self-contradictory statements and broken cross-references in LAUNCH_CHECKLIST, OPEN_INPUTS, runbook index and rotation runbook
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** docs/LAUNCH_CHECKLIST.md:207-210, docs/LAUNCH_CHECKLIST.md:41, docs/LAUNCH_CHECKLIST.md:301, docs/LAUNCH_CHECKLIST.md:250, docs/OPEN_INPUTS.md:11, docs/OPEN_INPUTS.md:68, docs/OPEN_INPUTS.md:72, docs/RUNBOOKS/README.md:6, docs/RUNBOOKS/secret-rotation.md:92, docs/RUNBOOKS/secret-rotation.md:144, docs/RUNBOOKS/outbox-jobs.md:96, README.md:3
- **Problem:** LAUNCH_CHECKLIST 2.10 (◐) points to `docs/legal/terms-v1-draft.md` and `privacy-v1-draft.md`, which do not exist (`git ls-files docs/legal` shows terms-v1.md, terms-v2.md, privacy-v1.md, privacy-v2.md, README.md), and contradicts 3.10 (☑ 'live as version 2'). The 22 Oct status table (line 41) says `SENTRY_DSN` is 'Not set' while 4.2 (line 301) says it was set the same day. 3.2 step 4 (line 250) still instructs 'Apply migrations 0021–0024' although the table (line 43) records them applied. OPEN_INPUTS row 2 says the domain is 'not yet pointed at site-1, task 3.1' while 3.1 records it serving since 22 Oct; the 'Answered' rows at lines 68 and 72 still say the backend is 'deployed as Vercel functions' with no superseded marker. RUNBOOKS/README.md:6 cites a PLATFORM_CONTEXT.md section 'Who decides' that does not exist. secret-rotation.md:92 says the Turnstile site key is a '`NEXT_PUBLIC_*` equivalent, if used by site-1' (it is `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, apps/site-1/src/components/shared/human-challenge.tsx:80); line 144 says 'update the three variables together' and lists two. outbox-jobs.md:96 says 'T25 ... must add an alert ... until it lands' although alerts.md documents the shipped REQ 40 channel (no scheduler-start alert exists, so reword rather than delete). README.md:3 still says 'T1–T5 provide ... this is not yet a production-ready platform'.
- **Impact (plain English):** Owner confusion while working the launch list; no runtime effect.
- **Evidence:**
  ```text
  docs/LAUNCH_CHECKLIST.md:209-210: 'are in `docs/legal/` (`terms-v1-draft.md`, `privacy-v1-draft.md`)'. `git ls-files docs/legal`: README.md, privacy-v1.md, privacy-v2.md, terms-v1.md, terms-v2.md. docs/RUNBOOKS/README.md:6: 'escalate to (PLATFORM_CONTEXT.md "Who decides")'.
  ```
- **Fix steps:**
  1. docs/LAUNCH_CHECKLIST.md 2.10: mark ☑ and change the file names to `docs/legal/terms-v2.md` and `docs/legal/privacy-v2.md` (effective 21 Oct 2026, per 3.10 and docs/legal/README.md); keep the 'lawyer review still open' note if desired.
  2. docs/LAUNCH_CHECKLIST.md line 41: change 'Not set: `SENTRY_DSN`' to 'Set later the same day: `SENTRY_DSN` (4.2)'. Line 250: change to 'Migrations 0021–0024 applied (see table); deploy and send a test acknowledgement.'
  3. docs/OPEN_INPUTS.md row 2: replace '(DNS on Cloudflare; not yet pointed at site-1, task 3.1)' with '(serving site-1 since 22 Oct 2026)'. Rows at lines 68 and 72: append 'Superseded 18 Sep 2026 by ADR 0004 (Railway)'.
  4. docs/RUNBOOKS/README.md line 6: change 'PLATFORM_CONTEXT.md "Who decides"' to 'PLATFORM_CONTEXT.md §1 and §7: the owner approves everything'.
  5. docs/RUNBOOKS/secret-rotation.md line 92: replace '`NEXT_PUBLIC_*` equivalent, if used by site-1' with '`NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the Vercel site-1 project'. Line 144: change 'three' to 'two'.
  6. docs/RUNBOOKS/outbox-jobs.md line 96: change to 'REQ 40 (alerts.md) alerts on failed/uncertain job backlog, but there is still no alert for a scheduler that never started; until one exists, this manual check is the only detection.'
  7. README.md line 3: replace the T1–T5 sentence with a one-line current status pointing to docs/LAUNCH_CHECKLIST.md.
- **Acceptance criteria:** `grep -n 'v1-draft' docs/LAUNCH_CHECKLIST.md`, `grep -n 'Who decides' docs/RUNBOOKS/README.md` and `grep -n 'not yet pointed' docs/OPEN_INPUTS.md` all return nothing; every `docs/legal/*.md` path mentioned in LAUNCH_CHECKLIST exists per `git ls-files docs/legal`.
- **Risk of fix:** Low. Documentation only.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-38] apps/site-1/README.md describes uploads, the backend client and analytics as not yet built
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/README.md:5, apps/site-1/README.md:111-112, apps/site-1/README.md:134-136, apps/site-1/README.md:154-155, apps/backend/src/routes/website.ts:515-625, apps/site-1/README.md:142-143, docs/API.md:454-456
- **Problem:** The storefront README says 'catalogue pages are placeholders' (line 5); '`FileDrop` is a labelled placeholder — real R2 uploads are T17' (line 155) although the upload intent/finalize/download routes are mounted (website.ts:515, 556, 625) and ENV.md lists their Turnstile actions; '`src/lib/backendClient.ts` is a server-only fetch transport until the shared typed client exists' (line 111) while the same file's Order form section (lines 142-143) says all data goes through 'the backend typed client from `@canadian-plans/contracts`'; and 'Automatic tracking is disabled until T20 implements sanitized events' (line 135) while API.md:454-456 states the browser now sends page views and `plan_selected`.
- **Impact (plain English):** Misleads a reader about what the storefront can do; no runtime effect.
- **Evidence:**
  ```text
  apps/site-1/README.md:155: '`FileDrop` is a labelled placeholder — real R2 uploads are T17.' apps/backend/src/routes/website.ts:515-517: `router.post('/uploads/intents', ...admit('upload-intent'),`.
  ```
- **Fix steps:**
  1. apps/site-1/README.md line 5: delete 'catalogue pages are placeholders' and describe the current routes (home, category landing pages, `/order`, `/track-order`, legal pages).
  2. Line 155: replace with 'Step 3 uploads documents through `POST /api/v1/website/uploads/intents` and `/uploads/{uploadId}/finalize` (signature-verified, private R2); see docs/API.md.'
  3. Lines 111-116: either delete the `backendClient.ts` paragraph if the file is no longer used (check with `git grep -n backendClient -- apps/site-1/src`), or reword it as 'legacy health-check transport; all order/catalogue calls use `createBackendClient` from `@canadian-plans/contracts`'.
  4. Line 135: replace 'Automatic tracking is disabled until T20 implements sanitized events' with the current behaviour (page views and `plan_selected` only, no search/hash, DNT honoured).
- **Acceptance criteria:** `grep -n -E 'are T17|until the shared typed client exists|until T20|catalogue pages are placeholders' apps/site-1/README.md` returns nothing.
- **Risk of fix:** Low. Documentation only; confirm the backendClient.ts usage before describing it.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Whether `apps/site-1/src/lib/backendClient.ts` is still imported anywhere was not checked; run `git grep -n backendClient -- apps/site-1/src` before rewording that paragraph.

### [CQ-39] README's dependency-advisory note omits the @vitest/mocker advisory that `pnpm audit` now reports
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** README.md:76-77, pnpm audit output (orchestrator audit.log)
- **Problem:** README.md says 'The dependency audit still reports unpatched upstream `braces` and `sprintf-js` advisories'. The orchestrator's `pnpm audit` run also reports two moderate advisories for `@vitest/mocker@5.0.0` (GHSA-qxg6-89mg-rqv8 and GHSA-xp26-3454-mjgp, patched in >=5.0.3), reached only through `sanity@6.20.0 > ... > get-it@9.6.2 > vitest@5.0.0`, i.e. a transitive dev-time path, not the repo's own vitest. `braces` (high, GHSA-vfj7-8cjw-p6xm) and `sprintf-js` (moderate) remain as README states, both via `@sanity/cli`.
- **Impact (plain English):** None at runtime (test-tooling dependency of a transitive package). The README understates what the audit prints, so the owner may think a new advisory appeared unexpectedly.
- **Evidence:**
  ```text
  audit.log: '@vitest/mocker ... Vulnerable versions >=5.0.0-beta.1 <5.0.3 ... Patched versions >=5.0.3 ... Paths apps\admin > @canadian-plans/contracts > sanity@6.20.0 > ... get-it@9.6.2 > vitest@5.0.0 > @vitest/mocker@5.0.0'. README.md:76-77: 'still reports unpatched upstream `braces` and `sprintf-js` advisories'.
  ```
- **Fix steps:**
  1. README.md lines 76-77: change to 'The dependency audit still reports the upstream `braces` (high) and `sprintf-js` advisories via `@sanity/cli`, and `@vitest/mocker` <5.0.3 via `get-it`'s own vitest dependency; none is reachable at runtime.'
  2. Optionally add a pnpm override `"@vitest/mocker@<5.0.3": "5.0.3"` in the root package.json `pnpm.overrides` block (pattern already used there), run `pnpm install --frozen-lockfile=false` locally to refresh the lockfile, then `pnpm run test` and `pnpm run test:tooling`; only commit if both stay green.
- **Acceptance criteria:** `pnpm audit` either no longer lists `@vitest/mocker`, or README.md names it alongside `braces` and `sprintf-js`.
- **Risk of fix:** Low. The override changes the lockfile; the root vitest is `catalog:` and unaffected unless the catalog also pins 5.0.0, in which case the project's own tests run on 5.0.3 — re-run the full test suite.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Whether the root catalog pins vitest 5.0.0 was not checked; read pnpm-workspace.yaml `catalog.vitest` before adding the override.

### [CQ-40] Root metadata sets referrer 'no-referrer' while the Referrer-Policy header (and its e2e test) says strict-origin-when-cross-origin
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/src/app/layout.tsx:22, apps/site-1/next.config.ts:89, apps/site-1/e2e/security-headers.spec.ts:16
- **Problem:** The root layout emits `<meta name="referrer" content="no-referrer">` on every page; the response header says `strict-origin-when-cross-origin`. When both exist the document's effective policy is the meta value, so the header asserted by the e2e test does not describe real behaviour. The /track-order page additionally sets its own `referrer: 'no-referrer'`, suggesting the site-wide meta was not intentional.
- **Impact (plain English):** No user-facing breakage; outbound clicks (WhatsApp, Google Maps) send no referrer and the security test gives a false sense of what is enforced. Confusing for the next engineer.
- **Evidence:**
  ```text
  layout.tsx:22: `referrer: 'no-referrer',` — next.config.ts:89: `{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },`
  ```
- **Fix steps:**
  1. Decide the intended policy. If REQ 12 (no PII in URLs) wants no referrer leakage site-wide, change next.config.ts:89 to `value: 'no-referrer'` and e2e/security-headers.spec.ts:16 to match. Otherwise delete line 22 (`referrer: 'no-referrer',`) from apps/site-1/src/app/layout.tsx and keep the per-page setting on /track-order (and add it to /track and /order metadata if those URLs can carry tokens).
- **Acceptance criteria:** `curl -s https://canadianplans.com/ | grep -o '<meta name="referrer"[^>]*>'` and `curl -sI https://canadianplans.com/ | grep -i referrer-policy` agree; `pnpm --filter site-1 exec playwright test e2e/security-headers.spec.ts` passes.
- **Risk of fix:** Low. Changing to a stricter site-wide policy only removes referrer data sent to third parties; Umami's referrer attribution for the landing visit comes from the previous site and is unaffected.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [PERF-04] Order routes re-read membership/permissions up to three times per request
- **Severity:** ⚪ Low
- **Category:** Performance
- **Location:** apps/backend/src/routes/staff.ts:145-178, 214-250, 580-589
- **Problem:** `decide()` builds a fresh authorize closure and runs `loadStaffAccess` (one tenant transaction). `orderCapabilities()` then runs two more `authorize` calls (two more transactions). Every order mutation ends with `sendOrderDetail`, which calls `orderCapabilities` again, so one PATCH does: authorize (1 tx) + write + getOrder + 2 more access reads. The access snapshot cannot change within a request, so the extra reads are pure overhead.
- **Impact (plain English):** Each order action in the admin performs three identical permission lookups against Postgres; with staff working through orders this adds measurable latency and connection usage for no benefit.
- **Evidence:**
  ```text
  staff.ts:168-171: `const [manage, finance] = await Promise.all([authorize({... action: 'order.manage' }), authorize({... action: 'financial.read' })]);` called from sendOrderDetail (line 234) after `decide` (line 687/707).
  ```
- **Fix steps:**
  1. In createStaffRouter (apps/backend/src/routes/staff.ts), add `const accessCache = new WeakMap<Request, Map<string, ReturnType<StaffStore['loadStaffAccess']>>>();`.
  2. Change `authorizeWith(actor)` to take `req` and build the authorizer with a memoizing access store: `createAuthorize({ accessStore: { loadStaffAccess: (actorId, workspaceId) => { let cache = accessCache.get(req); if (!cache) { cache = new Map(); accessCache.set(req, cache); } const key = `${actorId}:${workspaceId}`; let pending = cache.get(key); if (!pending) { pending = dependencies.store.loadStaffAccess(actorId, workspaceId); cache.set(key, pending); } return pending; } }, assuranceLevel: actor.assuranceLevel })`.
  3. Update the callers `decide` and `orderCapabilities` to pass `req` to `authorizeWith`.
- **Acceptance criteria:** Add a counter to MemoryStaffStore.loadStaffAccess in apps/backend/tests/staff-routes.test.ts and assert that one GET /orders/:orderId request calls it exactly once; all existing staff-route tests (including the revoked-member test, which uses separate requests) still pass.
- **Risk of fix:** Low. Cache lives only for one request object, so a revocation is still seen on the next request (the 'denies a revoked member on the very next request' test guards this).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [PERF-05] Table and Textarea carry an unnecessary 'use client' directive
- **Severity:** ⚪ Low
- **Category:** Performance
- **Location:** packages/ui/src/components/table.tsx:1, packages/ui/src/components/textarea.tsx:1
- **Problem:** Both files are pure presentational wrappers with no hooks, refs, event handlers or browser APIs, yet start with `'use client'`. In Next.js this makes every server-component page that renders a Table or Textarea ship those modules (and their `cn` + tailwind-merge dependency chain) to the browser bundle, and marks the boundary as client even when nothing interactive is needed.
- **Impact (plain English):** Slightly larger JS for admin list pages and storefront forms. No functional effect.
- **Evidence:**
  ```text
  table.tsx:1  'use client';
   textarea.tsx:1  'use client';  (neither file uses React hooks or handlers)
  ```
- **Fix steps:**
  1. Delete line 1 (`'use client';`) and the following blank line in packages/ui/src/components/table.tsx and packages/ui/src/components/textarea.tsx.
  2. Run `pnpm --filter admin build` and `pnpm --filter site-1 build` to confirm no 'client-only' errors (components that pass `onChange` to Textarea are themselves client components, which is fine).
- **Acceptance criteria:** Both Next builds succeed; `pnpm test` passes; in the build output the admin orders list route's First Load JS does not increase.
- **Risk of fix:** Low. If any server component passes an event handler directly to Textarea the build will error loudly — that would itself be a bug to fix at the call site.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [PERF-06] CI runs the entire site-1 Playwright suite three times (test:e2e plus two test:security passes)
- **Severity:** ⚪ Low
- **Category:** Performance
- **Location:** apps/site-1/scripts/verify-client-bundle.mjs:90-101, package.json:35 (test:e2e script), apps/site-1/scripts/test-e2e.mjs:9-16
- **Problem:** `pnpm run test:e2e` runs the admin suite, then site-1 `test:e2e` (one `next build` + full Playwright run over desktop+mobile), then site-1 `test:security`, which does two more full `next build`s and two more full `playwright test` runs (Umami on and off). Only `scaffold.spec.ts` ('Umami loads only with complete public configuration') depends on TEST_UMAMI_ENABLED; the A2 launch-gate journeys, order journeys, axe scans, preview-files and header checks are re-run twice for no additional assertion value. Each pass also restarts the backend harness and truncates/reseeds its database.
- **Impact (plain English):** CI takes roughly three times longer than needed for the storefront browser stage, which slows every PR and increases the chance of unrelated timeouts; no user-facing effect.
- **Evidence:**
  ```text
  verify-client-bundle.mjs:91  for (const enabled of [true, false]) { ... run(['run', 'build'], env); scan(); run(['exec', 'playwright', 'test'], env); }
  ```
- **Fix steps:**
  1. In apps/site-1/scripts/verify-client-bundle.mjs line 100 change `run(['exec', 'playwright', 'test'], env);` to `run(['exec', 'playwright', 'test', 'e2e/scaffold.spec.ts'], env);` so the two security passes only execute the spec that depends on the Umami build flag (scaffold also keeps the credential/robots/skip-link checks).
  2. Update the final console.info on line 102 to say 'credential scan and scaffold journeys' instead of 'desktop/mobile journeys'.
- **Acceptance criteria:** `pnpm --filter site-1 run test:security` output shows only scaffold.spec.ts tests (desktop + mobile) in the two Playwright passes and still prints both PASS lines; total CI time for the e2e stage drops noticeably.
- **Risk of fix:** Low. The full suite still runs once per CI run via test:e2e, so no assertion is lost.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [PERF-08] Partner-code and source filters issue a backend request on every keystroke
- **Severity:** ⚪ Low
- **Category:** Performance
- **Location:** apps/admin/src/components/orders/orders-list.tsx:320-341
- **Problem:** The Partner code and Source inputs call `update({ partnerCode })` / `update({ source })` in `onChange`, which changes `filters`, recomputes `query` and re-runs the fetching effect, so typing 'utm:google/cpc' fires ~15 list requests (each also resetting page and selection). Stale responses are discarded via `requestVersion`, but the requests still hit the backend.
- **Impact (plain English):** Noticeable flicker/'Loading…' while typing and unnecessary load on the backend and database for a small team; with more staff or slower networks it becomes sluggish.
- **Evidence:**
  ```text
  orders-list.tsx:327 `onChange={(event) => update({ partnerCode: event.target.value })}` and :339 `onChange={(event) => update({ source: event.target.value })}`.
  ```
- **Fix steps:**
  1. Mirror the search box pattern already used at orders-list.tsx:131-132 and 247-271: keep `draftPartnerCode`/`draftSource` local state updated on change, and apply them through the existing filter `<form onSubmit>` (move the two inputs inside that form) or on `onBlur`/Enter via `update({ partnerCode: draftPartnerCode, source: draftSource })`.
  2. Alternatively debounce: wrap the two `update` calls in a 300 ms `setTimeout` stored in a `useRef`, cleared on each change.
- **Acceptance criteria:** Typing a 10-character partner code produces one orders request (visible in the Network tab) instead of ten.
- **Risk of fix:** Low. orders-list.test.tsx may need to submit the form instead of typing to trigger a fetch.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-39] R2/S3 endpoint is string-concatenated into signed URLs without normalisation, so a trailing slash or path in R2_ENDPOINT breaks every signature
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** packages/adapters/src/r2-s3.ts:52, packages/adapters/src/r2-s3.ts:156, packages/adapters/src/r2-s3.ts:206, packages/adapters/src/sigv4.ts:101, packages/adapters/src/sigv4.ts:164
- **Problem:** presignUrl()/signRequest() compute the canonical URI as `/${bucket}/${key}` and then build the request URL as `${config.endpoint}${canonicalUri}`. configFromEnv() takes R2_ENDPOINT verbatim. If the owner sets `https://acct.r2.cloudflarestorage.com/` (trailing slash) the actual request path becomes `//docs/...`, which no longer matches the signed canonical URI, and R2 returns 403 SignatureDoesNotMatch for uploads, downloads, verification and deletes. The failure mode is total but non-obvious (every document operation fails with a signature error).
- **Impact (plain English):** A one-character configuration mistake in the Railway environment would make every customer document upload and every staff download fail with an opaque error.
- **Evidence:**
  ```text
  r2-s3.ts:52 `const endpoint = env.R2_ENDPOINT ?? \`https://${accountId}.r2.cloudflarestorage.com\`;` ; r2-s3.ts:156 `return \`${config.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}\`;`
  ```
- **Fix steps:**
  1. packages/adapters/src/r2-s3.ts, configFromEnv(): after computing `endpoint`, do `const parsedEndpoint = new URL(endpoint); if (parsedEndpoint.pathname !== '/' || parsedEndpoint.search || parsedEndpoint.hash) throw new Error('R2_ENDPOINT must be an origin only (no path, query or trailing slash)');` and set `endpoint: parsedEndpoint.origin`.
  2. Apply the same guard in jobs where S3SigningConfig.endpoint is built from env (jobs/src/backup/archive-store.ts), or add an exported `normalizeS3Endpoint(endpoint: string): string` helper in packages/adapters/src/sigv4.ts and call it from both configFromEnv() and the jobs config.
  3. Add a test in r2.test.ts asserting configFromEnv({ R2_ENDPOINT: 'https://x.example/' , ...}) yields endpoint 'https://x.example' and that a path-bearing endpoint throws.
- **Acceptance criteria:** Adapters tests pass; `createR2DocumentStoreFromEnv({ ...env, R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com/' })` no longer produces URLs containing `//`.
- **Risk of fix:** Low. Throwing at construction surfaces a bad value at boot rather than per request; providers.ts:212-216 already tolerates a throwing createR2DocumentStoreFromEnv for the cleanup handler.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-40] MultiOwnerAlertChannel hides which alert channel failed; webhook signature has no timestamp
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** packages/adapters/src/alerts.ts:155-159, packages/adapters/src/alerts.ts:137-141
- **Problem:** send() uses Promise.allSettled and only throws when every channel rejected; a rejected channel (dead OWNER_ALERT_WEBHOOK_URL, expired Resend key) is otherwise discarded without any log line, so a silently broken email channel is never noticed as long as the webhook still works, and vice versa. Separately, the `X-Alert-Signature` HMAC covers only the body, with no timestamp/nonce header, so a captured alert can be replayed to the receiver indefinitely (low impact: alerts carry no instructions).
- **Impact (plain English):** The owner could lose one of their two alert paths (for example alert emails stop arriving) without any indication, and only discover it when the second path also fails.
- **Evidence:**
  ```text
  alerts.ts:156-158 `const results = await Promise.allSettled(...); const allFailed = results.length > 0 && results.every((r) => r.status === 'rejected'); if (allFailed) throw new Error('owner_alert_all_channels_failed');`
  ```
- **Fix steps:**
  1. packages/adapters/src/alerts.ts, MultiOwnerAlertChannel.send(): after allSettled, iterate `results.forEach((result, index) => { if (result.status === 'rejected') console.error(JSON.stringify({ event: 'owner_alert_channel_failed', channel: index, errorCode: result.reason instanceof Error && /^[a-z0-9_]{1,64}$/.test(result.reason.message) ? result.reason.message : 'unknown' })); });` before the allFailed check.
  2. Optional hardening: in WebhookOwnerAlertChannel.send(), include `occurredAt` in the signed body (already present) and document that receivers should reject alerts older than 10 minutes; no code change required beyond the doc comment.
  3. Add an alerts.test.ts case: two channels, first rejects, second resolves; assert send() resolves and console.error was called once with 'owner_alert_channel_failed'.
- **Acceptance criteria:** New alerts.test.ts case passes.
- **Risk of fix:** Low. Adds one structured log line on partial failure; no behaviour change.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-42] HttpDeletionLedger is a bearer-token PUT seam, not the append-only SigV4/object-lock ledger the design calls for
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** packages/adapters/src/deletion-ledger.ts:84-114, packages/adapters/src/deletion-ledger.ts:117-124, apps/backend/src/jobs/providers.ts:229
- **Problem:** The production deletion/suppression ledger is wired from DELETION_LEDGER_ENDPOINT + DELETION_LEDGER_TOKEN into HttpDeletionLedger, which does `PUT <endpoint>/events/<eventId>.json` with `authorization: Bearer <token>`. It has no SigV4 signing, no `x-amz-object-lock-*` headers and a retry overwrites the same key, so the 'write-only, append-only' property the module doc promises is not enforced by this client — it depends entirely on whatever the endpoint is. The jobs workspace already has a SigV4 object-lock writer pattern (sigv4.test.ts:74-89, jobs/src/backup/archive-store.ts), but the backend does not use it. Pointing the two env vars at a Backblaze B2 S3 endpoint with an application key (a natural reading of the variable names) would make every publish 403 and every customer-deletion job fail (closed, per ledger.ts:200-223 — which is the correct fallback, but the deletion never completes).
- **Impact (plain English):** Customer data-deletion and suppression events may never be durably recorded off-site, or may be silently overwritable, which undermines the 'restore a backup, then replay deletions' guarantee. Today it fails closed, so nothing is lost, but deletions cannot complete until the real ledger exists.
- **Evidence:**
  ```text
  deletion-ledger.ts:100-110 `const url = \`${endpoint}/events/${encodeURIComponent(event.eventId)}.json\`; await this.doFetch(url, { method: 'PUT', headers: { authorization: \`Bearer ${this.options.token}\`, ... }, body: JSON.stringify(event) ...})`; module doc lines 7-10: 'The real Backblaze B2 target (with S3 SigV4 signing and write-only credentials) is provisioned by T4R'.
  ```
- **Fix steps:**
  1. OWNER APPROVAL: decide the real ledger target (a dedicated B2 bucket with object lock and a write-only application key, per IMPLEMENTATION_PLAN §13). Effort: about half a day.
  2. Once decided: add `S3DeletionLedger` in packages/adapters/src/deletion-ledger.ts that builds the request with `signS3Request(config, { method: 'PUT', key: `events/v1/${event.workspaceId}/${event.eventId}.json`, headers: { 'content-type': 'application/json', 'x-amz-object-lock-mode': 'COMPLIANCE', 'x-amz-object-lock-retain-until-date': <ISO date 7 years out> }, body })` and treats a 403/412 as a hard error; keep HttpDeletionLedger for local/preview.
  3. Extend createDeletionLedgerFromEnv() to construct S3DeletionLedger when DELETION_LEDGER_S3_ENDPOINT, _BUCKET, _ACCESS_KEY_ID, _SECRET_ACCESS_KEY and _REGION are set, otherwise fall back to the existing bearer seam, otherwise undefined.
  4. Add a deletion-ledger.test.ts case asserting the PUT carries the object-lock headers and an AWS4-HMAC-SHA256 authorization header.
- **Acceptance criteria:** Unit tests pass; in production, trigger one customer-deletion request and confirm `deletion_intents.ledger_ack_id` is populated and the object exists in the ledger bucket with a retention lock.
- **Risk of fix:** High. New infrastructure and credentials; must be provisioned separately from the backup bucket (archive-write without archive-delete, invariant 13).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Check the Railway service variables for DELETION_LEDGER_ENDPOINT/DELETION_LEDGER_TOKEN: if unset, deletions currently fail closed with 'deletion_ledger_not_configured' and this finding is about completing the design; if set to an S3 URL, publishes are failing with 403 and the fix is urgent.

### [REL-43] Email delivery staff route has no error handling and uses a non-standard error envelope
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/routes/email.ts:218-238, apps/backend/src/routes/email.ts:45-49, apps/backend/src/app.ts:88-101
- **Problem:** GET /api/v1/email/staff/workspaces/:workspaceId/delivery (behind requireStaffSession) responds `{ error: 'invalid_request' }` / `{ error: 'forbidden' }` instead of the shared `{ error: { code, message, requestId } }` envelope every other staff route uses, discards the authorization deny reason (membership_pending/revoked vs permission_denied), and has no try/catch: a thrown store error falls through to `createInvalidBodyError`, which reports it to the tracker but answers 400 `invalid_request`.
- **Impact (plain English):** When the email delivery panel fails because the database is down, the admin is told its request was invalid rather than that the server failed, and the error body does not match what the admin client parses for other staff endpoints.
- **Evidence:**
  ```text
  email.ts:227-229: `if (!authorized) { res.status(403).json({ error: 'forbidden' }); return; }`; app.ts:98-99: `if (res.headersSent) return; sendStaffAuthError(res, req.id, 'invalid_request', 400);`
  ```
- **Fix steps:**
  1. In apps/backend/src/routes/email.ts import `sendStaffAuthError` from '../http/staff-errors.js'.
  2. In the delivery handler replace `res.status(400).json({ error: 'invalid_request' })` with `sendStaffAuthError(res, req.id, 'invalid_request', 400)` and `res.status(403).json({ error: 'forbidden' })` with `sendStaffAuthError(res, req.id, 'permission_denied', 403)`.
  3. Wrap the body from `const authorized = ...` through `res.status(200).json(...)` in `try { ... } catch { sendStaffAuthError(res, req.id, 'internal_error', 500); }` (and, once the staff-router reporting helper from the 'swallows exceptions' finding exists, report the error the same way).
  4. Check apps/admin for the client of this endpoint (`git grep -n "email/staff" -- apps/admin`) and make sure it reads `error.code` rather than a top-level `error` string.
- **Acceptance criteria:** Add a test (next to the existing email route tests found via `git ls-files apps/backend/tests | grep -i email`) that a `listDelivery` which throws yields 500 with `apiErrorResponseSchema` code `internal_error`, and that a non-member gets 403 with code `permission_denied`.
- **Risk of fix:** Low. Changes the error body shape of one admin endpoint; the admin client for it must be checked.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-44] Internal job routes and the in-process scheduler run when DEPLOYMENT_ENV is unset (undefined is treated as 'not preview')
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/config/deployment.ts:15-23, apps/backend/src/scheduler.ts:217-219, apps/backend/src/routes/jobs.ts:50-53, apps/backend/src/routes/catalogue-sync.ts:54-57, apps/backend/src/routes/synthetic-check.ts:78-81
- **Problem:** loadDeploymentEnvironment returns undefined for an unset or unknown value, and docs/ENV.md says such a value 'is never treated as production'. But every guard is written as `=== 'preview'`, so undefined passes: the scheduler starts and /api/internal/* accept scheduler calls on any deployment that forgot to set DEPLOYMENT_ENV (for example a Railway PR/ephemeral environment that did not inherit the variable, or a fresh service). The fail-closed intent is only honoured when someone remembers to set preview explicitly.
- **Impact (plain English):** A copied or ephemeral backend with the production secrets but no DEPLOYMENT_ENV would run the outbox and catalogue sync against whatever database it points at, duplicating emails or syncs. Today's production sets the variable, so this is a latent misconfiguration trap rather than a live bug.
- **Evidence:**
  ```text
  deployment.ts:21-22  default: return undefined;
  scheduler.ts:217  if (loadDeploymentEnvironment(env) === 'preview') {
  jobs.ts:50  if (dependencies.deploymentEnvironment === 'preview') {
  ```
- **Fix steps:**
  1. In apps/backend/src/scheduler.ts createBackendScheduler replace `if (loadDeploymentEnvironment(env) === 'preview') { throw new SchedulerConfigurationError('scheduler_preview_refused'); }` with `const deployment = loadDeploymentEnvironment(env); if (deployment === 'preview') throw new SchedulerConfigurationError('scheduler_preview_refused'); if (deployment === undefined) throw new SchedulerConfigurationError('scheduler_environment_unknown');`.
  2. In apps/backend/src/routes/jobs.ts, catalogue-sync.ts and synthetic-check.ts change the guard to `if (dependencies.deploymentEnvironment !== 'production' && dependencies.deploymentEnvironment !== 'development') { sendWebsiteError(res, req.id, 'machine_unknown', 403); return; }`. The existing route tests already pass `deploymentEnvironment: 'production'` by default (tests/jobs-route.test.ts:55, tests/catalogue-sync-route.test.ts:56).
  3. Add `DEPLOYMENT_ENV=development` to the backend's local env example / docs so `pnpm --filter backend dev` keeps working, and add a scheduler test asserting createBackendScheduler throws scheduler_environment_unknown when DEPLOYMENT_ENV is absent.
- **Acceptance criteria:** `pnpm --filter backend test` passes including the new test; on staging with DEPLOYMENT_ENV temporarily removed, the boot log shows scheduler_environment_unknown and GET /api/internal/jobs/run with a valid secret returns 403.
- **Risk of fix:** Low. Any environment that currently relies on DEPLOYMENT_ENV being unset (local dev without .env.local) will need the variable set; verify Railway production has DEPLOYMENT_ENV=production before deploying this change or the scheduler will refuse to start (and, after the scheduler-alert fix, page the owner).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-45] Health endpoint is shallow: a deploy with a broken DATABASE_URL passes Railway's health check and takes traffic
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/routes/health.ts:4-12, railway.json:8-9, docs/ADR/0004-backend-on-railway.md:142-144
- **Problem:** GET /api/v1/health returns `{ ok: true }` without touching the database or any configuration. Railway uses this path to decide a new deployment is healthy before switching traffic. The DB client is created lazily on first use (packages/db/src/index.ts getDefaultClient), so a deploy with a wrong/rotated DATABASE_URL, a missing DATABASE_SSL_MODE value, or a Supavisor outage still reports healthy, replaces the previous good deployment, and then fails every real request. ADR 0004 rejected surfacing scheduler state on this route, which is reasonable, but a basic DB reachability probe at deploy time is a different concern.
- **Impact (plain English):** A bad database setting would be promoted to production automatically instead of being caught before traffic moves, turning a config mistake into an outage that customers see first.
- **Evidence:**
  ```text
  health.ts:5  const body: HealthResponse = { ok: true, requestId: req.id };
  railway.json:8  "healthcheckPath": "/api/v1/health",
  ```
- **Fix steps:**
  1. Add a second route in apps/backend/src/app.ts: `app.get('/api/v1/ready', getReadiness)` where getReadiness (new export in routes/health.ts) runs `await withTenantTx({ workspaceId: '00000000-0000-4000-8000-000000000000', actorId: '00000000-0000-4000-8000-000000000000' }, (tx) => tx.execute(sql`select 1`))` wrapped in `Promise.race` with a 3-second timeout, returning 200 `{ ok: true, requestId }` or 503 `{ ok: false, requestId }` without any error text. Reuse healthResponseSchema for the 200 body; for 503 use sendStaffAuthError(res, req.id, 'internal_error', 503).
  2. Point railway.json `healthcheckPath` at `/api/v1/ready` and keep `/api/v1/health` unchanged for uptime monitors.
  3. Add a test in apps/backend/tests that mounts the app with a failing withTenantTx stub and asserts 503, and with a succeeding stub asserts 200.
- **Acceptance criteria:** Deploy to staging with a deliberately wrong DATABASE_URL: Railway marks the deployment failed (health check never returns 200) and the previous deployment keeps serving. With the correct URL the deploy succeeds.
- **Risk of fix:** Medium. A transient Supavisor blip during the 60-second health window would fail a deploy, which is the intended behaviour but may surprise the owner; the readiness route must never be used by a continuously-polling restart mechanism. Confirm Railway only evaluates healthcheckPath at deploy time.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Verify in Railway docs that healthcheckPath is evaluated only during deployment rollout (not continuously); if Railway also restarts on failing health checks, keep the DB probe out of the configured path and use the readiness route only for manual/post-deploy verification.

### [REL-46] Resend webhook route has no try/catch: a DB or config failure returns 400 invalid_request to Resend and is reported to Sentry as a bad request
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/routes/email.ts:175-189, apps/backend/src/app.ts:88-101
- **Problem:** Unlike the Sanity webhook (which wraps store.acceptEvent in try/catch and returns 500 webhook_rejected) and the internal job routes, createResendWebhookRouter awaits `dependencies.contactHashSecret()` (throws if EMAIL_CONTACT_HASH_SECRET is unset) and `store.applyProviderEvent` (DB) with no handler. Express 5 forwards the rejection to the last-resort error middleware createInvalidBodyError, which captures the exception in Sentry and answers 400 `invalid_request`. A transient database outage during a bounce/complaint delivery is therefore recorded as a malformed-request error and the client gets a 4xx.
- **Impact (plain English):** Bounce and complaint events arriving during a database hiccup look like 'bad request' errors in Sentry, which misdirects debugging. Whether Resend/Svix retries a 4xx the same way as a 5xx is provider-defined; if it does not, suppression updates could be lost and the system would keep emailing bounced addresses.
- **Evidence:**
  ```text
  email.ts:175  const outcome = await dependencies.store.applyProviderEvent({
  email.ts:184  contactHash: hashContact(email.data.to[0]!, dependencies.contactHashSecret()),
  app.ts:98-99  if (res.headersSent) return;
    sendStaffAuthError(res, req.id, 'invalid_request', 400);
  ```
- **Fix steps:**
  1. In apps/backend/src/routes/email.ts createResendWebhookRouter, wrap the block from `const outcome = await dependencies.store.applyProviderEvent({` through the final `res.status(...)` in `try { ... } catch { res.status(503).json({ error: 'webhook_unavailable' }); return; }` so the provider sees a retryable 5xx and nothing reaches the generic 400 handler.
  2. Add a test in apps/backend/tests (next to the existing Resend webhook tests) where applyProviderEvent rejects and assert the response is 503 with body { error: 'webhook_unavailable' }.
- **Acceptance criteria:** New test passes; existing Resend webhook tests unchanged.
- **Risk of fix:** Low. Only the failure path changes; successful events still return 200/503 as before.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm in Resend/Svix docs whether 4xx responses are retried on the same schedule as 5xx; if they are, impact is limited to misleading Sentry/HTTP status.

### [REL-47] Shutdown handler does not catch a closeDatabase() rejection, so the orderly exit(0) is skipped and the process relies on an unhandled-rejection crash
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/shutdown.ts:52-68, apps/backend/src/server.ts:42-48
- **Problem:** createShutdownHandler awaits closeDatabase() inside try/finally with no catch. If `sqlClient.end()` rejects (for example the pool is already broken by a Supavisor failover), the finally block clears the hard-timeout timer and `finish(0)` is never reached; the rejection propagates to `void handler()` in registerShutdownHandlers and becomes an unhandled rejection. Node then terminates with exit code 1 instead of the intended clean 0, and because the timer was cleared there is no longer any explicit exit path if a future change makes the rejection handled. railway.json's ON_FAILURE restart policy counts a non-zero exit as a failure.
- **Impact (plain English):** Mostly cosmetic today (the process still dies), but a shutdown that ends in a crash can be counted as a failed deployment by Railway's restart policy and shows up as an error in logs/Sentry during routine redeploys.
- **Evidence:**
  ```text
  shutdown.ts:60-68
    await Promise.all([...]);
    await dependencies.closeDatabase();
  } finally {
    clearTimeout(timer);
  }
  finish(0);
  ```
- **Fix steps:**
  1. In apps/backend/src/shutdown.ts change the body to: `try { await Promise.all([...]); await dependencies.closeDatabase(); } catch { /* a failed pool close must not prevent exit */ } finally { clearTimeout(timer); finish(0); }` and delete the trailing `finish(0);` line.
  2. Add a test in apps/backend/tests/shutdown.test.ts where closeDatabase rejects and assert exit is called once with 0.
- **Acceptance criteria:** `pnpm --filter backend test -- shutdown` passes with the new rejection test; existing five shutdown tests still pass.
- **Risk of fix:** Low. finish() is already idempotent, so moving it into finally cannot double-exit.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-48] Railway restart policy gives up after 3 failures, leaving the API down until a human redeploys
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** railway.json:7-12
- **Problem:** `restartPolicyType: ON_FAILURE` with `restartPolicyMaxRetries: 3` means a process that exits non-zero four times (an unhandled rejection, an OOM, a boot-time JSON.parse failure of MACHINE_REGISTRY_JSON, a transient DB-driven crash) stops being restarted. For a single-replica production API with no second instance, that converts a transient crash loop into an outage that persists until the owner notices and redeploys. There is no alert on the service being stopped.
- **Impact (plain English):** After a burst of crashes the whole site's order flow stays down indefinitely instead of recovering by itself, and nothing emails the owner about it.
- **Evidence:**
  ```text
  railway.json:9-11
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  ```
- **Fix steps:**
  1. In railway.json change `"restartPolicyMaxRetries": 3` to `"restartPolicyMaxRetries": 10` (or remove the key to use Railway's default), keeping ON_FAILURE so a clean SIGTERM exit during redeploy is not restarted.
  2. Owner: enable Railway's deployment/crash notifications (or the uptime monitor on /api/v1/health) so a crash-looping service is reported rather than silently stopped; note this in docs/RUNBOOKS/release-rollback.md.
- **Acceptance criteria:** `railway.json` validates against the schema referenced on line 2; a staging deploy with a deliberately crashing CMD is restarted more than three times before Railway marks it crashed.
- **Risk of fix:** Low. A genuinely broken build will crash-loop longer before Railway stops it; the health check already prevents a broken build from replacing a good one at deploy time.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm Railway's exact semantics for restartPolicyMaxRetries (whether the counter resets after a successful run and whether a stopped service is reported) in Railway docs before choosing the value.

### [REL-51] Playwright runs with retries: 2 in CI but failOnFlakyTests is off, so flaky journeys are reported green
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** packages/config/playwright.base.ts:9-11
- **Problem:** The shared Playwright config sets `retries: process.env['CI'] ? 2 : 0`. A test that fails twice and passes on the third attempt is marked 'flaky' and the run exits 0. Nothing surfaces flaky counts as a failure, so intermittent breakage in the order journey, the dropped-response retry test or the OTP tracking flow can accumulate unnoticed. Playwright 1.63 (installed) supports `failOnFlakyTests` (node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/types/test.d.ts:1274).
- **Impact (plain English):** Intermittent real bugs (race conditions in order submission, timing in the Turnstile fixture) can hide behind retries; the suite keeps passing while reliability quietly degrades.
- **Evidence:**
  ```text
  playwright.base.ts:9  retries: process.env['CI'] ? 2 : 0,
  (no failOnFlakyTests anywhere in the repo)
  ```
- **Fix steps:**
  1. In packages/config/playwright.base.ts add `failOnFlakyTests: Boolean(process.env['CI']),` to `basePlaywrightConfig` next to `forbidOnly` (line 10).
  2. Keep `retries: 2` so the trace-on-first-retry artefact is still captured for diagnosis; the run will now fail if any test needed a retry.
- **Acceptance criteria:** CI run on main passes with 0 flaky tests reported by the github reporter. Introduce a deliberately flaky assertion (e.g. `expect(Math.random() > 0.5).toBe(true)`) in a spec: CI must fail even when a retry passes.
- **Risk of fix:** Medium. If any journey is currently flaky, CI turns red until it is fixed. That is the point, but the owner should expect possible red runs after enabling it.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-53] Backend base URL silently falls back to http://localhost:4000 in any build missing NEXT_PUBLIC_API_BASE_URL
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/admin/src/lib/api.ts:57-58
- **Problem:** `API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? process.env['API_BASE_URL'] ?? 'http://localhost:4000'`. In the browser bundle only `NEXT_PUBLIC_*` values are inlined, so `API_BASE_URL` is always undefined there and a preview/production build without the public variable quietly points every staff request at the user's own machine. Errors surface only as 'Reason: internal_error' messages.
- **Impact (plain English):** A misconfigured Vercel preview or a new environment looks deployed and lets staff sign in (Supabase works) but every workspace call fails with an unhelpful generic message; nobody is told the env var is missing.
- **Evidence:**
  ```text
  api.ts:57-58 as quoted.
  ```
- **Fix steps:**
  1. In apps/admin/src/lib/api.ts replace the constant with: `const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000'); if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured.');` (drop the server-only `API_BASE_URL` fallback, which cannot work in client components).
  2. Alternatively, if throwing at module load is undesirable, export `isApiConfigured()` and show a configuration banner in `ProtectedWorkspaceShell` like the existing `configuration_missing` state.
- **Acceptance criteria:** `NEXT_PUBLIC_API_BASE_URL= pnpm --filter admin build` fails (or the app shows a clear 'backend not configured' message), while a build with the variable set behaves as today. api.test.ts still passes.
- **Risk of fix:** Low. Local dev keeps the localhost default. Make sure vitest sets the variable or runs in non-production mode.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-55] Backup job failures are not sent to the owner alert channel; only the monitor notices up to 26 hours later
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** .github/workflows/backup.yml:73-75, jobs/src/backup/cli.ts:104-119, jobs/src/monitor/cli.ts:54-71
- **Problem:** When `runBackup` throws, backup/cli.ts logs a JSON error and calls `createErrorTrackerFromEnv()`, which is a no-op because backup.yml does not pass SENTRY_DSN; the workflow's own failure step just echoes a line. GitHub emails scheduled-workflow failures only to the user who last touched the workflow file, subject to their notification settings. The monitor (which already uses `createOwnerAlertChannelFromEnv`) will alert, but only once the previous heartbeat is older than 26 hours.
- **Impact (plain English):** A broken backup (expired credential, provider outage, schema change) is discovered a day late, and if the monitor environment is not configured it may not be discovered at all until a restore is needed.
- **Evidence:**
  ```text
  backup.yml:75: `run: echo 'Backup run failed — see the "Run the independent daily backup" step output above...' >&2`; cli.ts:112: `createErrorTrackerFromEnv().captureException(error, {...})` with no SENTRY_DSN in the workflow env.
  ```
- **Fix steps:**
  1. In jobs/src/backup/cli.ts import `createOwnerAlertChannelFromEnv` from '@canadian-plans/adapters' and, inside `main().catch`, after the error tracker call add `await createOwnerAlertChannelFromEnv().send({ kind: 'backup_stale', detail: 'backup_failed:' + (error instanceof Error ? error.constructor.name : 'unknown_error'), occurredAt: new Date().toISOString() }).catch(() => console.error(JSON.stringify({ event: 'backup_alert_delivery_failed' })));` (same pattern as monitor/cli.ts:88-92; make the catch handler `async`).
  2. In .github/workflows/backup.yml add to the backup step env: `OWNER_ALERT_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `OWNER_ALERT_WEBHOOK_URL`, `OWNER_ALERT_WEBHOOK_SECRET` from secrets (the same names backup-monitor.yml uses) and optionally `SENTRY_DSN: ${{ secrets.BACKUP_SENTRY_DSN }}`.
- **Acceptance criteria:** Dispatch backup.yml with a deliberately wrong B2_ARCHIVE_BUCKET secret in a test environment: the owner receives a 'backup_stale' alert email whose detail starts with `backup_failed:` within a minute of the run failing.
- **Risk of fix:** Low. Adds Resend credentials to the backup environment; the alert channel is already in use by the monitor and backend.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-57] requestTrackingCode reports 'code sent' even when the backend is unreachable or returns 5xx
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/site-1/src/app/(storefront)/track/actions.ts:45-52, apps/backend/src/routes/website.ts:781-830
- **Problem:** The storefront swallows every error from `tracking.otp` except `caller_forbidden` and returns `{ ok: true, data: { sent: true } }` 'so the response must not reveal whether the order exists'. But the backend already answers a neutral 200 `challenge_sent` whether or not the reference/email matched (with a timing floor), so the only errors the storefront can see are transport failures, timeouts, 429s and 5xxs — none of which carry existence information. Hiding them turns an outage into a silent failure.
- **Impact (plain English):** When the Railway backend is down or restarting (as it was during the known outage), a customer is told 'If we found your order, a six-digit code has been sent' and waits for an email that will never arrive, then assumes they typed something wrong. Surfacing 'try again in a moment' costs nothing in enumeration resistance.
- **Evidence:**
  ```text
  track/actions.ts: `} catch (error) { if (error instanceof BackendError && error.code === 'caller_forbidden') return {...verification_failed}; // Neutral: the response must not reveal whether the order exists. } return { ok: true, data: { sent: true } };`. website.ts: `res.status(200).json({ status: 'challenge_sent', requestId: req.id });` for every outcome.
  ```
- **Fix steps:**
  1. In `apps/site-1/src/app/(storefront)/track/actions.ts`, function `requestTrackingCode`, inside the `catch (error)` block after the `caller_forbidden` check, add: `if (!(error instanceof BackendError) || error.status >= 500 || error.code === 'rate_limited') { return { ok: false, code: 'unavailable', message: error instanceof BackendError && error.code === 'rate_limited' ? 'Too many requests. Please wait a minute and try again.' : 'We could not send a code right now. Please try again in a moment.' }; }` and keep the neutral success return for any remaining 4xx.
  2. Add a unit test (new file `apps/site-1/src/app/(storefront)/track/actions.test.ts` mirroring the order actions test setup): mock `tracking.otp` to throw `new BackendError('internal_error', 503, 'r')` and assert `ok: false, code: 'unavailable'`; mock it to resolve and assert `ok: true`.
- **Acceptance criteria:** Unit tests pass; manually stop the backend locally and submit /track: the page shows the 'could not send a code right now' message instead of the neutral 'code has been sent' text.
- **Risk of fix:** Low. 4xx responses other than rate limiting still get the neutral success, so enumeration resistance is unchanged.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-23] All four pnpm audit advisories enter through contracts' hard runtime dependency on `sanity`; the @vitest/mocker ones are patchable
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** packages/contracts/package.json:17, pnpm-workspace.yaml:18, pnpm-workspace.yaml:36, apps/backend/Dockerfile:36-41
- **Problem:** `pnpm audit` (audit.log) reports 1 high (`braces` <=3.0.3, GHSA-vfj7-8cjw-p6xm) and 3 moderate (`sprintf-js` <=1.1.3, `@vitest/mocker` <5.0.3 twice: GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp). Every listed path is `@canadian-plans/contracts > sanity@6.20.0 > ...` (@sanity/cli codegen/chokidar/globby, @vercel/frameworks js-yaml, get-it > vitest@5.0.0). `sanity` is a `dependencies` entry of the contracts package (package.json:17) even though only the `./cms` subpath (src/cms/schema-types.ts) imports it and only apps/site-1 consumes `@canadian-plans/contracts/cms` (site-1 already declares `sanity` itself). The contracts root index never imports `./cms`, so the backend's tsup bundle does not include Sanity code; the vulnerable packages are CLI/codegen/test tooling and are not reachable at backend runtime. `braces` and `sprintf-js` show 'Patched versions <0.0.0' (no upstream fix); `@vitest/mocker` is fixed at >=5.0.3 while the catalog pins vitest 5.0.0.
- **Impact (plain English):** No exploitable path was found for the live backend or sites; the practical cost is that the backend container (Dockerfile ships the whole unpruned install) and every app carry the full Sanity toolchain and its advisories, and security scans will keep flagging the repo. Resolving the two patchable advisories is cheap.
- **Evidence:**
  ```text
  audit.log paths e.g. `apps\backend > @canadian-plans/adapters > @canadian-plans/contracts > sanity@6.20.0 > @sanity/cli@8.22.0 > @sanity/codegen@8.2.0 > chokidar@3.6.0 > braces@3.0.3`; `Patched versions >=5.0.3` for @vitest/mocker; packages/contracts/package.json:17 `"sanity": "catalog:"` under `dependencies`.
  ```
- **Fix steps:**
  1. In pnpm-workspace.yaml catalog, bump `vitest` and `'@vitest/coverage-v8'` from 5.0.0 to the latest 5.0.x (>=5.0.3), and add to the root package.json `"pnpm": { "overrides": { "@vitest/mocker": ">=5.0.3" } }` so the nested copy under `get-it` is also lifted; run `pnpm install` and commit the lockfile.
  2. In packages/contracts/package.json move `"sanity": "catalog:"` from `dependencies` to `peerDependencies` (and add it to `devDependencies` so the package's own typecheck/tests still resolve it). apps/site-1 already lists `sanity`, so the only consumer of `./cms` keeps working; apps/admin and apps/backend do not import `./cms`.
  3. Accept `braces`/`sprintf-js` as unpatchable tooling-only advisories and record that decision in docs/SECURITY or the launch board so the next audit run is not a surprise.
- **Acceptance criteria:** `pnpm audit` no longer lists the two `@vitest/mocker` advisories; `pnpm why braces --filter backend` shows no path through `@canadian-plans/contracts` (if step 2 is applied); `pnpm typecheck && pnpm test` pass.
- **Risk of fix:** Medium. Catalog bumps touch every workspace's test runner; run the full `pnpm test` afterwards. Moving `sanity` to a peer dependency changes resolution for any future package that imports `@canadian-plans/contracts/cms` (it must declare `sanity` itself). The backend image will not shrink from step 2 alone because the Dockerfile installs all workspace manifests (site-1 still pulls `sanity`); pruning the image is a separate deploy change outside this area.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm a vitest 5.0.x >= 5.0.3 release exists in the registry and that `pnpm install` with the override resolves without peer conflicts before committing.

### [SEC-24] TRACKING_OTP_MIN_LATENCY_MS accepts an empty string or 0 in production, silently disabling the OTP timing floor
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** apps/backend/src/routes/website.ts:750-761, apps/backend/src/routes/website.ts:826-828
- **Problem:** `trackingMinLatencyMs` does `Number(env.TRACKING_OTP_MIN_LATENCY_MS)`; an empty string becomes 0, which passes `raw >= 0` and sets the enumeration-resistance floor to 0 ms. The variable exists for tests but is read from the live environment, so a stray empty variable on Railway removes the timing protection that the route comment relies on.
- **Impact (plain English):** A misconfigured environment variable would let an attacker measure response times on the tracking code request and work out which order reference and email combinations exist. Only matters if the variable is set in production; by default it is not.
- **Evidence:**
  ```text
  website.ts:756-758 `const raw = Number(env.TRACKING_OTP_MIN_LATENCY_MS); if (Number.isFinite(raw) && raw >= 0 && raw <= TRACKING_OTP_MIN_LATENCY_MAX_MS) { return Math.round(raw); }`.
  ```
- **Fix steps:**
  1. In apps/backend/src/routes/website.ts `trackingMinLatencyMs`, replace the body with: `const value = env.TRACKING_OTP_MIN_LATENCY_MS?.trim(); if (!value) return TRACKING_OTP_MIN_LATENCY_DEFAULT_MS; const raw = Number(value); if (!Number.isFinite(raw)) return TRACKING_OTP_MIN_LATENCY_DEFAULT_MS; const bounded = Math.min(Math.round(raw), TRACKING_OTP_MIN_LATENCY_MAX_MS); return env.NODE_ENV === 'production' ? Math.max(bounded, TRACKING_OTP_MIN_LATENCY_DEFAULT_MS) : Math.max(bounded, 0);`.
  2. Export the function (or add a unit test via the route) asserting `trackingMinLatencyMs({ TRACKING_OTP_MIN_LATENCY_MS: '' })` is 500 and `trackingMinLatencyMs({ NODE_ENV: 'production', TRACKING_OTP_MIN_LATENCY_MS: '0' })` is 500.
- **Acceptance criteria:** New unit test passes; existing tracking-routes tests (which set 200 ms outside production) still pass.
- **Risk of fix:** Low. None beyond tests that lower the floor; they run with NODE_ENV=test.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-25] Malformed JSON bodies are forwarded to Sentry with V8's parse message, which can embed a fragment of the raw body
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** apps/backend/src/app.ts:88-100, packages/observability/src/index.ts:231-253
- **Problem:** `createInvalidBodyError` calls `errorTracker.captureException(error, ...)` for every error on the Express error path, including body-parser's `entity.parse.failed` errors. `buildErrorEvent` sends `error.message` after `scrubStringContent`, which redacts email and phone patterns only. Modern V8 `JSON.parse` messages include a quoted fragment of the input (for example `Unexpected token 'x', "{"fullName":"Jane..." is not valid JSON`), so a customer's name or free-text form field from a truncated or malformed request body can reach Sentry (invariant 12). It also turns every malformed request into a Sentry event, which an attacker can use to fill the error quota.
- **Impact (plain English):** Pieces of what a customer typed could end up in the owner's Sentry error dashboard when their browser or network sends a broken request, and an abuser could flood Sentry with junk events by sending bad JSON.
- **Evidence:**
  ```text
  app.ts:90 `errorTracker.captureException(error, { ... })` with no check on error type; observability index.ts:237-238 `const rawMessage = error instanceof Error ? error.message : String(error); const message = scrubStringContent(rawMessage).slice(0, 500);`.
  ```
- **Fix steps:**
  1. In apps/backend/src/app.ts `createInvalidBodyError`, before calling `captureException`, add: `const type = typeof (error as { type?: unknown })?.type === 'string' ? (error as { type: string }).type : undefined; const reportable = type?.startsWith('entity.') ? new Error(\`invalid_body:${type}\`) : error;` and pass `reportable` to `captureException` instead of `error` (body-parser sets `type` to values like 'entity.parse.failed' and 'entity.too.large').
  2. Add a test in apps/backend/tests (app-level) that POSTs the body `{"fullName":"Jane Example"` (unterminated) to /api/v1/website/leads with a `FakeErrorTracker` and asserts the captured event value does not contain 'Jane'.
- **Acceptance criteria:** New test passes; typecheck passes.
- **Risk of fix:** Low. Only changes what is sent to Sentry for body-parser errors; the client response is unchanged.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm the installed Node version's JSON.parse error message includes an input fragment: run `node -e "try{JSON.parse('{\"fullName\":\"Jane Example\"')}catch(e){console.log(e.message)}"` and check whether 'Jane' appears.

### [SEC-26] Customer-data subject search by email is not audited
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** apps/backend/src/routes/staff.ts:1134-1161, apps/backend/src/deletion/store.ts:208-273
- **Problem:** POST /workspaces/:workspaceId/customer-data/search looks up every lead, order and waitlist entry matching an email address and returns the subject list. DatabaseDeletionStore.findSubjects runs only SELECTs; no audit_events row records that a privileged user searched personal data. Invariant 11 requires every staff action to be audited (who, when, what), and the request deliberately carries `requestId` nowhere into the store.
- **Impact (plain English):** A privileged staff member can repeatedly look up which customers exist by email with no trace, so misuse of the deletion tool as a customer lookup cannot be detected afterwards.
- **Evidence:**
  ```text
  deletion/store.ts:214-272 contains only `tx.select(...)` calls; routes/staff.ts:1151-1155 passes `{ workspaceId, actorId, ...body.data }` with no requestId.
  ```
- **Fix steps:**
  1. In apps/backend/src/deletion/store.ts add `requestId: string` to the `findSubjects` input type on the `DeletionStore` interface and the class method.
  2. Inside the `withTenantTx` callback of `findSubjects`, after computing `drafts` and `waitlist`, insert: `await tx.insert(auditEvents).values({ workspaceId: input.workspaceId, actorId: input.actorId, actorLabel: 'staff', action: 'customer_data.searched', entity: 'workspace', entityId: input.workspaceId, requestId: input.requestId, after: { page, resultCount: Math.min(drafts.length, 100) + Math.min(waitlist.length, 100) } });` (never include the searched email; invariant 12).
  3. In apps/backend/src/routes/staff.ts:1151-1155 pass `requestId: req.id` to `findSubjects`; update the `MemoryDeletionStore.findSubjects` mock expectation in apps/backend/tests/staff-routes.test.ts:378-380 to include `requestId: expect.any(String)`.
- **Acceptance criteria:** staff-routes test 'protects private subject discovery' passes with the requestId assertion; typecheck passes. Manual: after one search in the admin, `select action from app.audit_events order by created_at desc limit 1` shows `customer_data.searched` with no email in `after`.
- **Risk of fix:** Low. One extra insert per search inside the same transaction; the route already sets `cache-control: private, no-store`.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-27] ADMIN_ORIGIN defaults to http://localhost:3000 in every environment instead of failing closed in production
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** apps/backend/src/app.ts:59-75, docs/ENV.md:41
- **Problem:** adminCors reads `process.env.ADMIN_ORIGIN ?? 'http://localhost:3000'` with no regard to NODE_ENV/DEPLOYMENT_ENV. In production an unset variable silently allows cross-origin browser calls from http://localhost:3000 (any page served on a staff member's local port 3000) and denies the real admin origin. Because staff auth is a bearer token rather than a cookie, this is not an authentication bypass, but it is a production default that should be deny-all, consistent with the rest of the backend's fail-closed configuration style (MACHINE_REGISTRY_JSON unset = deny-all, EMAIL_PROVIDER unset = fail closed).
- **Impact (plain English):** If the variable is lost during an env change the admin UI stops working with an opaque CORS error, and a developer's local tool could call the production API from a browser. Low practical risk because bearer tokens are still required.
- **Evidence:**
  ```text
  app.ts:60  const allowedOrigin = process.env.ADMIN_ORIGIN ?? 'http://localhost:3000';
  ```
- **Fix steps:**
  1. In apps/backend/src/app.ts adminCors, replace the first line with: `const allowedOrigin = process.env.ADMIN_ORIGIN ?? (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000');` and change the two comparisons to `allowedOrigin !== undefined && origin === allowedOrigin`.
  2. Add a test in apps/backend/tests that builds the app with NODE_ENV=production and no ADMIN_ORIGIN and asserts an OPTIONS request with Origin http://localhost:3000 receives 403 and no access-control-allow-origin header.
- **Acceptance criteria:** New test passes; with ADMIN_ORIGIN set to the real admin URL the existing CORS tests still pass and the admin app can call the backend on staging.
- **Risk of fix:** Low. Railway production already sets ADMIN_ORIGIN (the September drift was fixed), so behaviour there is unchanged; only the unset case becomes deny-all.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-28] Sidebar state cookie is written without SameSite or Secure attributes
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** packages/ui/src/components/sidebar.tsx:75
- **Problem:** `document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`` sets a first-party cookie on the admin origin with no `SameSite` or `Secure` flag. The value is a non-sensitive boolean, so there is no confidentiality risk, but the admin app otherwise runs over HTTPS with a strict cookie posture and security scanners (e.g. Mozilla Observatory, ZAP) will flag it.
- **Impact (plain English):** No practical risk to users or data; a noisy finding in any future penetration test or compliance scan of admin.canadianplans.com.
- **Evidence:**
  ```text
  sidebar.tsx:75  document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  ```
- **Fix steps:**
  1. In packages/ui/src/components/sidebar.tsx, function SidebarProvider, change line 75 to: `document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;`
- **Acceptance criteria:** In the admin app over HTTPS, DevTools → Application → Cookies shows `sidebar_state` with SameSite=Lax and Secure checked; on http://localhost it is still set (without Secure) so local dev keeps working.
- **Risk of fix:** Low. None; the cookie is only read client-side (if at all).
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-29] Admin Content-Security-Policy `connect-src` includes blanket `https:`, which cancels the origin pinning the runbook describes
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** apps/admin/next.config.ts:43-44, docs/RUNBOOKS/web-security-headers.md:25-28
- **Problem:** `buildCsp()` in admin sets `connect-src 'self' <api> <supabase> <sentry> https:`. The trailing `https:` scheme source permits fetch/XHR/WebSocket to any HTTPS origin, so the three pinned origins add nothing. The site-1 config has a stated reason for `https:` (browser PUT to signed R2 upload URLs, see apps/site-1/src/app/(storefront)/order/document-uploads.tsx:101) but the admin comment lists only backend, Supabase and Sentry, and the only `fetch(` in apps/admin/src is the Sentry tracker (apps/admin/src/lib/error-tracking.ts:60).
- **Impact (plain English):** If an XSS ever lands in admin (the policy still allows `'unsafe-inline'` scripts), the CSP would not stop the injected script from sending staff tokens or order data to an attacker's HTTPS server. Defence-in-depth only; no direct user-visible effect.
- **Evidence:**
  ```text
  apps/admin/next.config.ts:43-44: `// Backend API, Supabase Auth (token verification + refresh), and Sentry.\n'connect-src': dedupe(["'self'", apiOrigin, supabaseOrigin, sentryOrigin, 'https:']),`
  ```
- **Fix steps:**
  1. In apps/admin/next.config.ts line 44 remove the `'https:'` entry so it reads `'connect-src': dedupe(["'self'", apiOrigin, supabaseOrigin, sentryOrigin]),`.
  2. Run the admin app locally with real NEXT_PUBLIC_* values and exercise login, order list, order detail and document download; if a document download is performed with `fetch()`/XHR to a signed R2 URL rather than a plain link/navigation, add that R2 origin (derived from an env var such as NEXT_PUBLIC_DOCUMENT_ORIGIN) instead of restoring `https:`.
- **Acceptance criteria:** `curl -sI https://<admin-host>/` shows a `Content-Security-Policy` whose `connect-src` has no bare `https:`; admin login, order processing and document download work with no CSP violations in the browser console; `apps/site-1/e2e/security-headers.spec.ts`-style check for admin (if present) passes.
- **Risk of fix:** Low. If an admin feature fetches from an origin not in the list (e.g. a signed R2 URL), that call would be blocked by CSP until the origin is added; verify in the browser before shipping.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm by grepping apps/admin/src for any client-side fetch/XHR/EventSource to origins other than the API, Supabase and Sentry (only error-tracking.ts:60 was found) and by exercising document download in the admin UI.

### [SEC-30] MFA gate is enforced only at sign-in; owner/finance aal1 sessions reach privileged screens and get dead-end errors
- **Severity:** ⚪ Low
- **Category:** Security
- **Location:** apps/admin/src/components/protected-workspace-shell.tsx:22-29, apps/admin/src/lib/auth-navigation.ts:13-30, apps/admin/src/components/orders/order-write.ts:25
- **Problem:** `destinationAfterPrimarySignIn` routes Owner/Finance users to /mfa/challenge only when they log in through the form. A user who opens `/w/<slug>/...` directly (bookmark, back button, confirmation-email landing) with a persisted aal1 session is let into the shell because `ProtectedWorkspaceShell` only checks `status === 'signed_in'` and workspace membership; aal is never re-checked. The backend correctly denies privileged actions (`apps/backend/src/staff/authorization.ts:143-146`), but the order-write error map renders 'Verify multi-factor access before this action.' with no link to the challenge, unlike `customer-data-deletion.tsx:144-148` which does link.
- **Impact (plain English):** Not a bypass (the server enforces aal2), but an Owner can land on settings/orders at aal1, click Invite staff or Record payment, be told to verify MFA, and have no button to do so; they must know to type /mfa/challenge. Confusing onboarding for the exact people who hold the most privileged roles.
- **Evidence:**
  ```text
  protected-workspace-shell.tsx:26-28 only redirects on `signed_out`, `error`, or missing workspace. order-write.ts:25 `mfa_required: 'Verify multi-factor access before this action.'` (text only).
  ```
- **Fix steps:**
  1. In protected-workspace-shell.tsx, after the workspace lookup, add an effect: if `staff.status === 'signed_in'` and `workspace.roles` includes 'owner' or 'finance', call `getStaffAuth().mfa.getAuthenticatorAssuranceLevel()`; if `currentLevel !== 'aal2'` then `router.replace(factorsVerified ? '/mfa/challenge' : '/mfa/enroll')` using `listFactors()` as in auth-navigation.ts. Simplest is to extract the aal/factor check from `destinationAfterPrimarySignIn` into an exported helper `mfaRedirectFor(workspaces)` returning `'/mfa/challenge' | '/mfa/enroll' | undefined` and call it from both places.
  2. In order-detail.tsx, where `write.message` is rendered (lines 106-125), add next to the Reload button: `{write.code === 'mfa_required' ? <Button asChild size="sm"><Link href="/mfa/challenge">Verify MFA</Link></Button> : null}` — this requires `useOrderWrite` to also expose the last `BackendError.code` (add a `code` field set in the catch block).
- **Acceptance criteria:** Sign in as an Owner, complete nothing at /mfa/challenge, manually navigate to /w/<slug>/settings: the app must redirect to /mfa/challenge. After verifying, settings loads. Trigger an `mfa_required` error on an order write and confirm a 'Verify MFA' link appears.
- **Risk of fix:** Low. Adds one Supabase call per shell mount for owner/finance users. Viewer/orders roles are unaffected.
- **Depends on:** REL-22 (Every tab focus or token refresh resets the w…)hole admin screen and discards in-progress form state
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEO-04] Page titles are inconsistent: the homepage and most pages omit the brand while landing pages append '| Canadian Plans' by hand
- **Severity:** ⚪ Low
- **Category:** SEO
- **Location:** apps/site-1/src/app/layout.tsx:13, apps/site-1/src/lib/page-metadata.ts:8, apps/site-1/content/home.ts:5, apps/site-1/content/landing/internet.ts:170
- **Problem:** Root metadata sets `title: siteConfig.name` as a plain string (no `template`), so a page's string title replaces it entirely. The homepage title becomes 'Canadian phone & internet plans, with real prices.' with no brand, while content/landing/internet.ts:170 and metadataCopy.missingTitle hard-code ' | Canadian Plans'. Search results and browser tabs therefore show the brand on some pages and not on others.
- **Impact (plain English):** Weaker brand recognition in search results and tabs for the homepage and category pages; no functional breakage.
- **Evidence:**
  ```text
  layout.tsx:13: `title: siteConfig.name,` — home.ts:5: `title: 'Canadian phone & internet plans, with real prices.',` — landing/internet.ts:170: `title: 'Home Internet in Vancouver: Plans from $70, Installed in ~3 Days | Canadian Plans',`
  ```
- **Fix steps:**
  1. In apps/site-1/src/app/layout.tsx change line 13 to `title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },`.
  2. In apps/site-1/src/lib/page-metadata.ts, before `return`, compute `const suffix = ` | ${siteConfig.name}`;` and set `title: typeof metadata.title === 'string' && metadata.title.endsWith(suffix) ? { absolute: metadata.title } : metadata.title` in the returned object (place it after `...metadata`), so content titles that already carry the brand are not doubled.
  3. Run `pnpm vitest run apps/site-1/src/lib/page-metadata.test.ts` and update expectations if they assert the raw title.
- **Acceptance criteria:** Built site: `<title>` on / is 'Canadian phone & internet plans, with real prices. | Canadian Plans'; on /home-internet/vancouver it is unchanged (single '| Canadian Plans'); on the 404 page it is 'Page not found | Canadian Plans' (not doubled).
- **Risk of fix:** Low. Open Graph titles come from pageMetadata's own `title` variable and are unaffected by the template.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEO-05] The 404 page declares the homepage as its canonical URL and og:url
- **Severity:** ⚪ Low
- **Category:** SEO
- **Location:** apps/site-1/src/app/not-found.tsx:9-13, apps/site-1/src/lib/page-metadata.ts:11-15
- **Problem:** `not-found.tsx` calls `pageMetadata('/', …)`, and `pageMetadata` always writes `alternates.canonical = path` and `openGraph.url = <base>/`. Every 404 response therefore carries `<link rel="canonical" href="https://canadianplans.com/">`. The page is noindex and returns HTTP 404, so the damage is limited, but a canonical pointing from error pages to the homepage is a conflicting signal Google explicitly warns about.
- **Impact (plain English):** Minor: search engines receive contradictory signals (404 + noindex + canonical-to-home) for every mistyped URL; shared 404 links preview as the homepage.
- **Evidence:**
  ```text
  not-found.tsx:9: `export const metadata = pageMetadata('/', {` — page-metadata.ts:15: `alternates: { ...metadata.alternates, canonical: path },`
  ```
- **Fix steps:**
  1. In apps/site-1/src/app/not-found.tsx replace the `pageMetadata('/', {...})` call with a plain object: `export const metadata: Metadata = { title: metadataCopy.missingTitle, description: metadataCopy.missingDescription, robots: { index: false, follow: false } };` (add `import type { Metadata } from 'next';` and drop the now-unused `pageMetadata` import).
- **Acceptance criteria:** `curl -s -o /dev/null -w '%{http_code}' https://canadianplans.com/does-not-exist` is 404 and `curl -s https://canadianplans.com/does-not-exist | grep -c 'rel="canonical"'` is 0, while the robots meta tag is still present.
- **Risk of fix:** Low. Only the 404 page's head changes.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.


---

## 4. "Will Break Later" Risks

Things that work today and fail with more traffic, more data, dependency updates or time.

### [PERF-01] Backend runs on a single-connection Postgres pool (max: 1), serializing every request and the scheduler
- **Severity:** 🟠 High
- **Category:** Performance
- **Location:** packages/db/src/index.ts:66-72, packages/db/src/index.ts:158-164, apps/backend/src/server.ts:15-40, apps/backend/src/routes/staff.ts:165-178
- **Problem:** createClient() sets `max: options.maxConnections ?? 1` and getDefaultClient() never passes maxConnections, so the long-lived Railway process (HTTP server + in-process scheduler for outbox, catalogue sync and synthetic check) shares exactly one Postgres connection. Every withTenantTx/withActorTx, every rate_limit_hit call (3 per public request), every staff authorization read (one transaction per `authorize` call; the orders list does three plus the list and count), and every outbox claim/recordOutcome transaction queue behind each other in postgres.js. One slow statement (orders search over strpos(lower(...)) on 10k rows, the 8-query source report, a FOR UPDATE wait in order submission) stalls all other requests; the contracts client times out at 10s (packages/contracts/src/client.ts:439), so queued requests surface as storefront/admin failures. The comment on createDatabaseClient still describes a warm Vercel serverless instance, which is no longer the deployment model (docs/ADR/0004-backend-on-railway.md).
- **Impact (plain English):** Today with a handful of staff and a few orders an hour nobody notices. As traffic grows (several staff in the admin while customers submit orders and the outbox tick runs), requests start waiting on each other; customers will see 'something went wrong' on order submission or quote creation and staff will see slow or failed page loads, even though the database itself is idle.
- **Evidence:**
  ```text
  packages/db/src/index.ts:68 `max: options.maxConnections ?? 1,` and :162 `defaultClient = createDatabaseClient({ connectionString, ssl: runtimeSsl() });` (no maxConnections). apps/backend/src/website/session.ts:97-148 issues three rateLimit() DB calls per authenticated website request before the handler runs.
  ```
- **Fix steps:**
  1. In packages/db/src/index.ts, function getDefaultClient(): read `process.env.DATABASE_POOL_MAX`, parse with Number(), and if it is an integer between 1 and 50 pass it as `maxConnections`; otherwise default to 8. Concretely replace line 162 with: `const poolMax = Number(process.env.DATABASE_POOL_MAX); defaultClient = createDatabaseClient({ connectionString, ssl: runtimeSsl(), maxConnections: Number.isInteger(poolMax) && poolMax >= 1 && poolMax <= 50 ? poolMax : 8 });`
  2. Keep `prepare: false` (required for Supavisor transaction mode). Do not change createClient().
  3. Update the JSDoc above createDatabaseClient (lines 74-78) to say the backend is a long-lived Railway process sharing a small pool sized by DATABASE_POOL_MAX, connecting through the Supabase transaction-mode pooler.
  4. Document DATABASE_POOL_MAX in apps/backend/.env.example (or wherever backend env vars are listed) with default 8 and a note that it must stay well below the Supabase pooler client limit for the project's compute tier.
  5. Set DATABASE_POOL_MAX=8 on the Railway service (owner action; no code change).
- **Acceptance criteria:** Add a unit test in packages/db (next to existing tests) that sets process.env.DATABASE_POOL_MAX='5', stubs `postgres` via vi.mock, calls withTenantTx once, and asserts the postgres() options object received `max: 5`; and a second case with the variable unset asserting `max: 8`. Manual check after deploy: run 10 concurrent `GET /api/v1/staff/workspaces/<id>/orders` requests; p95 latency should not grow linearly with concurrency as it does today.
- **Risk of fix:** Low. Supavisor transaction mode caps client connections per project (the exact number depends on the Supabase compute tier and is not visible in this repo). A pool of 8 from one Railway replica is far below any tier's limit, but if the service is ever scaled to N replicas the total becomes 8×N; keep DATABASE_POOL_MAX × replicas under the tier limit. The catalogue/manual.ts CLI opens its own 1-connection client; unaffected.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.
- **[NEEDS VERIFICATION]** Confirm in the Supabase dashboard (Project Settings > Database > Connection pooling) the pooler's max client connections for this project's compute tier, and confirm DATABASE_URL on Railway points at the transaction-mode pooler (port 6543) so the comment and the `prepare: false` setting stay correct.

### [REL-01] Pre-auth bootstrap IP rate bucket collapses to the proxy address (no trust proxy), so one unauthenticated client can 429 the whole storefront API
- **Severity:** 🟠 High
- **Category:** Reliability
- **Location:** apps/backend/src/website/session.ts:50-54, apps/backend/src/website/session.ts:97-108, apps/backend/src/website/session.ts:133-137, apps/backend/src/app.ts:109-115
- **Problem:** `clientIp()` returns `req.ip ?? req.socket.remoteAddress` and `createApp()` never calls `app.set('trust proxy', ...)`. Behind Railway's edge proxy every request therefore reports the proxy's internal address, so the pre-authentication bucket `bootstrap:ip:<proxyIp>` (maxCount 1200/min by DEFAULT_WEBSITE_RATE_LIMITS.bootstrapMaxCount) is one global counter shared by all callers, legitimate or not. `requireWebsiteCredential` consults this bucket before the credential is resolved, so a caller only needs an Authorization header that passes `parseCredentialSecret` (prefix `cplsk_` + 16 chars; no validity required) to increment it. Once the 1200th hit lands inside a 60 s window, every genuine request from site-1 is answered 429 `rate_limited` until the window rolls. The same collapse applies to the `network:<ip>` visitor fallback when site-1 sends no `x-website-visitor-id` (visitor.ts returns undefined off-Vercel). Separately, `cred:<hash>` is already a single hot row for the whole storefront (300/min) with a 75 ms `lock_timeout` inside `rate_limit_hit`, so concurrency bursts turn into 503 `persistence_unavailable` rather than queuing.
- **Impact (plain English):** Anyone who knows the backend URL (it is public; site-1 calls it) can take the entire order/lead/tracking API offline with a trivial script sending about 20 requests per second with a junk bearer token: real customers would see 'Too many requests' on every save, quote, order and tracking action for as long as the script runs. Even without an attacker, the whole site shares a single 300-requests-per-minute ceiling, which will be hit as traffic grows.
- **Evidence:**
  ```text
  session.ts:53 `return req.ip ?? req.socket.remoteAddress ?? 'unknown';` ; session.ts:98 `bucketKey: \`bootstrap:ip:${clientIp(req)}\`` evaluated before `deps.resolveCredential` (line 111); app.ts has no `trust proxy` (git grep 'trust proxy' -- apps/backend returns nothing); migration 0004 `SET LOCAL lock_timeout = '75ms';` and `ON CONFLICT (bucket_key, window_start) DO UPDATE SET request_count = bucket.request_count + 1`.
  ```
- **Fix steps:**
  1. In apps/backend/src/app.ts inside `createApp()`, immediately after `const app = express();`, add: `const trustProxyHops = Number(process.env['TRUST_PROXY_HOPS'] ?? 0); if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) app.set('trust proxy', trustProxyHops);` (default 0 keeps the existing 'ignores spoofed forwarding headers' test behaviour).
  2. Set the Railway variable `TRUST_PROXY_HOPS=1` for the backend service (Railway's edge sets X-Forwarded-For with one hop). Document it in the backend env example file next to RATE_LIMIT_* variables.
  3. In apps/backend/src/website/session.ts `requireWebsiteCredential`, keep the bootstrap bucket but make the ceiling per-credential-hash as well as per-IP so a junk bearer cannot share the bucket with the real credential: change line 98 to `bucketKey: \`bootstrap:ip:${clientIp(req)}:${hashServiceSecret(secret).slice(0, 16)}\`` (compute `secretHash` once above and reuse it on line 110).
  4. Add a test in apps/backend/tests/website-auth.test.ts: with `TRUST_PROXY_HOPS` unset, two requests with different `x-forwarded-for` values still share one `bootstrap:ip:` bucket (existing test); with `app.set('trust proxy', 1)` applied (create the app with env TRUST_PROXY_HOPS=1), the two requests produce two different `bootstrap:ip:` bucket keys.
- **Acceptance criteria:** Run `pnpm --filter backend test -- website-auth`: both the existing spoofing test and the new trust-proxy test pass. Manual: on Railway with TRUST_PROXY_HOPS=1, send 1300 GET /api/v1/website/offers with `Authorization: Bearer cplsk_0000000000000000` from one machine in one minute, then a genuine request from site-1 — the genuine request must return 200, not 429.
- **Risk of fix:** Medium. If TRUST_PROXY_HOPS is set higher than the real hop count, X-Forwarded-For becomes spoofable again for the pre-auth bucket only (post-auth limits key on the credential and the site-asserted visitor id, so tenant limits are unaffected). Keep the default 0 so tests and local dev behave as today.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.
- **[NEEDS VERIFICATION]** Confirm on the Railway deployment that `req.socket.remoteAddress` is the proxy's address for all requests (e.g. temporarily log `req.ip` for one request from two different networks, or check Railway docs for X-Forwarded-For). If Railway hands the container the real client socket, the global-collapse part does not apply, but the junk-bearer sharing of the bucket still does.

### [REL-02] Synthetic order check writes real outbox side effects every 15 minutes: an acknowledgement email to a non-existent .internal address plus two analytics events, and ~12 permanent rows per run
- **Severity:** 🟠 High
- **Category:** Reliability
- **Location:** apps/backend/src/synthetic/check.ts:18, apps/backend/src/synthetic/check.ts:84-91, apps/backend/src/orders/store.ts:391-421, apps/backend/src/leads/store.ts:290-297, apps/backend/src/scheduler.ts:33, apps/backend/src/scheduler.ts:249-261, apps/backend/src/jobs/providers.ts:178-195, packages/adapters/src/analytics.ts:76-78
- **Problem:** runSyntheticOrderCheck creates a lead with contact email `synthetic-check@canadianplans.internal`, issues a quote, submits an order and cancels it, through the same stores the real flow uses. Because the lead has an email, DatabaseOrderStore.submit enqueues an `order_acknowledgement_email` outbox job to that address (store.ts:394-410) and an `analytics_order_submitted` job; createLead enqueues `analytics_lead_saved`. Nothing in the check or the handlers recognizes the synthetic workspace. With SYNTHETIC_CHECK_INTERVAL_MS = 15 min that is 96 runs/day. Per run the outbox either (a) sends a real email through Resend to a domain that does not exist (if the synthetic workspace has a Resend mapping in MACHINE_REGISTRY_JSON) producing a hard bounce each time, or (b) fails permanently with `email_account_not_configured` (providers.ts:189); and the two analytics jobs become `uncertain` with `analytics_site_unmapped` unless UMAMI_WORKSPACE_WEBSITES maps the synthetic workspace (analytics.ts:78), or `provider_not_configured` failures if Umami is unset. Failed/uncertain jobs are terminal and never pruned, so they accumulate and keep the queue-health monitor alerting (queueMonitor.ts:55-68). Each run also leaves a lead, draft_grant, quote, order, two order_status_history rows, idempotency_key, 3 outbox_jobs and 4-5 audit_events permanently in the production database (~1,100 rows/day, ~400k/year).
- **Impact (plain English):** Either Canadian Plans' sending domain accumulates roughly 96 hard bounces a day to a fake address, which damages Resend sender reputation and can get real customer emails (order confirmations, tracking codes) throttled or spam-foldered; or the Jobs page fills with hundreds of failed/uncertain jobs a day and the owner receives constant 'job queue stuck' alerts that hide real failures. In both cases the database grows by hundreds of junk rows per day forever.
- **Evidence:**
  ```text
  check.ts:88 `contact: { email: SYNTHETIC_CONTACT_EMAIL },` ; orders/store.ts:394 `const acknowledgementJob = grant.leadEmail ? [ { ... jobType: 'order_acknowledgement_email', ... toAddress: grant.leadEmail, ... } ] : [];` ; analytics.ts:78 `if (!website) return { status: 'uncertain', errorCode: 'analytics_site_unmapped' };` ; jobs/src/index.ts:413-418 maps that to outcome `uncertain`.
  ```
- **Fix steps:**
  1. In apps/backend/src/synthetic/check.ts, remove the email from the synthetic lead: change line 88 from `contact: { email: SYNTHETIC_CONTACT_EMAIL },` to `contact: {},` (LeadContact fields are all optional per leadContactSchema). This alone stops the acknowledgement email job because orders/store.ts:394 only enqueues it when `grant.leadEmail` is set. Keep the SYNTHETIC_CONTACT_EMAIL export if tests reference it, otherwise delete it.
  2. In apps/backend/src/jobs/store.ts, DatabaseOutboxStore.claim(): no change. Instead, in apps/backend/src/jobs/providers.ts createOutboxJobHandlers(), after `const handlers = new Map(base);` (line 210) wrap the two analytics handlers so the synthetic workspace is skipped: read `const syntheticWorkspaceId = env.SYNTHETIC_WORKSPACE_ID;` and for each of 'analytics_order_submitted' and 'analytics_lead_saved' replace the handler with `async (job, signal) => job.workspaceId === syntheticWorkspaceId ? { status: 'completed', providerId: 'skipped:synthetic_workspace' } : original(job, signal)`.
  3. Add a unit test in apps/backend (next to the existing synthetic check tests) asserting that after a successful runSyntheticOrderCheck no outbox job with jobType 'order_acknowledgement_email' exists for the synthetic workspace, and a providers.ts test asserting analytics jobs for SYNTHETIC_WORKSPACE_ID complete with providerId 'skipped:synthetic_workspace'.
  4. OWNER APPROVAL (separate, optional): decide a retention window for synthetic-workspace rows (leads, orders, quotes, audit_events) and add a prune step; see the retention finding.
- **Acceptance criteria:** Run the backend test suite (`pnpm --filter @canadian-plans/backend test`) with the two new tests passing. Manual: after deploy, trigger `/api/internal/synthetic-check/run` once and confirm in the admin Jobs page that no new failed/uncertain job appears and that Resend's logs show no send to canadianplans.internal.
- **Risk of fix:** Low. Removing the email means the synthetic check no longer exercises the acknowledgement-email enqueue path; it still exercises lead → quote → order → cancel, which is what REQ 40 asks for. Skipping analytics for the synthetic workspace changes nothing for real workspaces.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.
- **[NEEDS VERIFICATION]** The enqueue itself is certain from code. Which branch happens in production depends on Railway env: check whether MACHINE_REGISTRY_JSON has a resend entry for SYNTHETIC_WORKSPACE_ID (then bounces are real) and whether UMAMI_WORKSPACE_WEBSITES maps it (otherwise analytics jobs go uncertain). Check Resend's bounce log for canadianplans.internal and the admin Jobs page for uncertain `analytics_*` jobs in the synthetic workspace.

### [SEC-02] Backup workflow runs an unpinned third-party action (supabase/setup-cli@v1, version: latest) with production credentials, and records fake tool versions in the manifest
- **Severity:** 🟠 High
- **Category:** Security
- **Location:** .github/workflows/backup.yml:41-47, .github/workflows/backup.yml:36-39, jobs/src/backup/cli.ts:71
- **Problem:** Invariant 13 (PLATFORM_CONTEXT.md:70) requires the backup workflow to use pinned actions. backup.yml pins checkout/pnpm/setup-node to commit SHAs but uses `supabase/setup-cli@v1` (mutable tag) and `version: latest` for the CLI binary it downloads; `age` is installed from apt with no version. This step runs in the job whose env holds SOURCE_DATABASE_URL, BACKUP_LEASE_DATABASE_URL, R2 read keys and the B2 writer key. Additionally jobs/src/backup/cli.ts:71 writes `toolVersions: { age: 'pinned-by-runner-image', supabaseCli: 'pinned-by-runner-image' }` into every manifest, which is false provenance (nothing is pinned) and makes restore-time version matching impossible. The TODO at backup.yml:42-44 acknowledges the pin is missing but nothing enforces it.
- **Impact (plain English):** If the `v1` tag or the 'latest' Supabase CLI release is ever compromised or simply changes behaviour, the daily job will run untrusted code with read access to the whole production database (including auth password hashes) and write access to the backup archive. A restore operator also cannot tell which dump/encryption tool version produced a given snapshot.
- **Evidence:**
  ```text
  backup.yml:45-47: `uses: supabase/setup-cli@v1` / `with: version: latest`; cli.ts:71: `toolVersions: { age: 'pinned-by-runner-image', supabaseCli: 'pinned-by-runner-image' }`
  ```
- **Fix steps:**
  1. In .github/workflows/backup.yml replace `uses: supabase/setup-cli@v1` with `uses: supabase/setup-cli@<full 40-char commit SHA of a reviewed release> # vX.Y.Z` and replace `version: latest` with an explicit CLI version string (e.g. the version the owner tests the restore with). Remove the TODO comment once pinned.
  2. In the same file, after installing age and the CLI, add a step `run: echo "AGE_VERSION=$(age --version)" >> "$GITHUB_ENV"; echo "SUPABASE_CLI_VERSION=$(supabase --version)" >> "$GITHUB_ENV"` and pass `AGE_VERSION` and `SUPABASE_CLI_VERSION` to the 'Run the independent daily backup' step env.
  3. In jobs/src/backup/cli.ts line 71 replace the placeholder object with `toolVersions: { age: process.env.AGE_VERSION?.trim() || 'unknown', supabaseCli: process.env.SUPABASE_CLI_VERSION?.trim() || 'unknown' }`.
  4. Optionally pin `age` by installing a specific release tarball with a checksum instead of `apt-get install -y age`, or at least record the apt version via `AGE_VERSION` above.
- **Acceptance criteria:** `grep -n '@v1\|latest' .github/workflows/backup.yml` returns no action/CLI references; a dispatched backup run's manifest (decrypted during a restore drill) shows real version strings under toolVersions; `pnpm --filter @canadian-plans/jobs typecheck` passes.
- **Risk of fix:** Low. A pinned SHA must be refreshed manually when the action is updated (there is no Dependabot/Renovate config in the repo).
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.

### [BUG-03] order_dispatch email says the order 'has shipped' via a courier, contradicting the no-shipping decision
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** packages/adapters/src/messaging.ts:251-257, jobs/src/index.ts:25, jobs/src/index.ts:314-320
- **Problem:** renderTemplate() renders the `order_dispatch` template as subject `Your order ${ref} has shipped` and body `Order ${ref} was dispatched via ${variables.courier ?? 'courier'}. Tracking: ${variables.trackingReference ?? 'n/a'}.` The owner decided there is no SIM shipping (provider handoff), so this copy is wrong for every product in the catalogue. Today nothing in apps/backend enqueues `order_dispatch_email` (git grep over apps/ and jobs/ finds only the registry mapping in jobs/src/index.ts), so the template is dead code; the defect becomes live the moment the Dispatched transition (apps/backend/src/orders/transitions.ts) is wired to enqueue the email, which the job registry already supports.
- **Impact (plain English):** If the dispatch email is ever switched on, customers will receive an email saying their order has shipped with a courier and 'Tracking: n/a', when in reality nothing is posted and the provider simply takes over. That causes confusion and support tickets and misrepresents the service.
- **Evidence:**
  ```text
  messaging.ts:253 `subject: \`Your order ${ref} has shipped\``; messaging.ts:254 `text: \`Order ${ref} was dispatched via ${message.variables?.courier ?? 'courier'}. Tracking: ...`; `git grep -n "order_dispatch_email" -- apps jobs packages` returns only jobs/src/index.ts.
  ```
- **Fix steps:**
  1. In packages/adapters/src/messaging.ts, function renderTemplate(), case 'order_dispatch': replace the subject with `Your order ${ref} has been handed to your provider` and the text with `Order ${ref} has been passed to your service provider for activation. They will contact you directly with the next steps. Reply to this email if you have questions.` Keep reading `message.variables?.courier` and `trackingReference` only if present, appended as an optional sentence `Reference from the provider: ${trackingReference}.` when `trackingReference` is set; otherwise omit the sentence entirely (never print 'n/a').
  2. Ask the owner to confirm the exact wording before merging (copy decision); do not change the template name or the EmailTemplate union.
  3. Add a test in packages/adapters/src/messaging.test.ts that stubs global fetch, sends a message with template 'order_dispatch' through ResendEmailAdapter, and asserts the JSON body's `subject` does not contain 'shipped' and `text` does not contain 'Tracking: n/a'.
- **Acceptance criteria:** `pnpm --filter @canadian-plans/adapters test` passes with the new messaging.test.ts case; grep `shipped` and `n/a` in packages/adapters/src/messaging.ts returns nothing.
- **Risk of fix:** Low. Copy-only change inside one switch case; no callers pass courier variables today. Owner must approve wording.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [BUG-04] Sanity webhook signature verifier treats the timestamp as seconds; real Sanity deliveries (millisecond timestamps) are always rejected
- **Severity:** 🟡 Medium
- **Category:** Bug
- **Location:** apps/backend/src/machines/registry.ts:139-143, apps/backend/tests/sanity-webhook.test.ts:14-15, apps/backend/tests/sanity-webhook.test.ts:122-127
- **Problem:** verifySanitySignature parses `t=` from the `sanity-webhook-signature` header and computes `ageMs = Math.abs(nowMs - Number(timestamp) * 1_000)`, i.e. it assumes a seconds-precision Unix timestamp. Sanity's own verifier (installed at node_modules/.pnpm/@sanity+webhook@4.0.4/node_modules/@sanity/webhook/dist/index.js line 16 `MINIMUM_TIMESTAMP = 16094592e5` and lines 81-83 "Invalid signature timestamp, must be a unix timestamp with millisecond precision") defines `t` as milliseconds. A genuine header such as `t=1761100000000` therefore yields an age of ~1.7e15 ms, fails the 5-minute replay window, and every authentic delivery is answered 401 `machine_signature_invalid` before the HMAC is even compared. The HMAC input (`${timestamp}.${rawBody}`) is correct, so only the window check is wrong. The unit test encodes the same mistake (`TIMESTAMP = String(NOW / 1_000)`), so the suite is green while production would reject 100% of real webhooks. Sanity's header regex also permits a space as separator (`/^t=(\d+)[, ]+v1=([^, ]+)$/`); the code splits on ',' only.
- **Impact (plain English):** Today Sanity is not connected (the static repo catalogue is used), so nothing is broken yet. The moment Sanity is wired up, every price/plan publish webhook will be rejected as a bad signature. Plan changes would only reach customers via the 5-minute reconcile pass instead of immediately, Sanity's webhook log would show 100% failures, and whoever debugs it will be misled into rotating secrets because the test suite says the verifier works.
- **Evidence:**
  ```text
  registry.ts:141-143
    if (!timestamp || !received || !/^\d+$/.test(timestamp)) return false;
    const ageMs = Math.abs(nowMs - Number(timestamp) * 1_000);
    if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1_000) return false;
  
  @sanity/webhook dist/index.js:16  const MINIMUM_TIMESTAMP = 16094592e5 ...
  @sanity/webhook dist/index.js:81-83  if (typeof timestamp != "number" || isNaN(timestamp) || timestamp < MINIMUM_TIMESTAMP) ... "Invalid signature timestamp, must be a unix timestamp with millisecond precision"
  
  sanity-webhook.test.ts:15  const TIMESTAMP = String(NOW / 1_000);
  ```
- **Fix steps:**
  1. In apps/backend/src/machines/registry.ts, function verifySanitySignature, replace `const ageMs = Math.abs(nowMs - Number(timestamp) * 1_000);` with `const ageMs = Math.abs(nowMs - Number(timestamp));` (the header value is already milliseconds).
  2. Optionally, in the same function, replace `header.split(',')` with `header.split(/[, ]+/)` so a space-separated header (allowed by Sanity's regex) is also parsed; keep everything else unchanged.
  3. In apps/backend/tests/sanity-webhook.test.ts change line 15 to `const TIMESTAMP = String(NOW);` and in the stale-timestamp test (line 124) change `String((NOW - 6 * 60_000) / 1_000)` to `String(NOW - 6 * 60_000)`. The HMAC helper already signs `${TIMESTAMP}.${body}` so no other test change is needed.
  4. Add one test that signs with a real-shaped 13-digit millisecond timestamp equal to NOW and asserts 200, so the unit can never regress to seconds again.
- **Acceptance criteria:** Run `pnpm --filter backend test -- sanity-webhook` and confirm the existing tests plus the new millisecond-timestamp test pass. Manually: build a request with `t=<Date.now()>` and `v1=base64url(HMAC-SHA256(secret, `${t}.${body}`))` and confirm the route returns 200; with `t=<Date.now()-6*60*1000>` it returns 401 machine_signature_invalid.
- **Risk of fix:** Low. Only the replay-window arithmetic changes. Any client that was (wrongly) sending seconds would start being rejected, but no such client exists; Sanity is the only sanity-provider sender.
- **Depends on:** None
- **Verification status:** Lead auditor re-read the cited code and confirmed it.

### [PERF-02] Partner detail returns every referred order and every commission line for the partner in one unbounded response
- **Severity:** 🟡 Medium
- **Category:** Performance
- **Location:** apps/backend/src/partners/store.ts:166-203, apps/backend/src/routes/staff.ts:1445-1492, apps/admin/src/components/partners/partner-detail.tsx:153-168, apps/admin/src/components/partners/partner-detail.tsx:203-243
- **Problem:** getPartnerDetail selects all orders where partner_id = X and all commission_lines for the partner with no LIMIT or pagination, and the admin renders both arrays as full tables. Referral partners are exactly the channel expected to bring volume; a single agency referring 20 orders/day has 7,000 rows per year, and the page fetches and renders all of them (plus the commissions join) on every load and after every 'Mark carrier paid' click (load() is re-run).
- **Impact (plain English):** The partner page gets slower every month for the most successful partners and eventually times out (client timeout 10s) or freezes the browser tab, exactly when Finance needs it to mark commissions paid.
- **Evidence:**
  ```text
  partners/store.ts:166-175 `.from(orders).where(and(eq(orders.workspaceId, workspaceId), eq(orders.partnerId, partnerId))).orderBy(orders.submittedAt);` and :177-203 the commission query, both without .limit; partner-detail.tsx:85 `await load();` after each state change.
  ```
- **Fix steps:**
  1. In apps/backend/src/partners/store.ts getPartnerDetail(): order both queries newest-first (`desc(orders.submittedAt)`, `desc(commissionLines.earnedAt)`) and add `.limit(200)` to each; add two count queries (`count(*)::int` with the same where clauses) and return `referredOrderTotal` and `commissionTotal` alongside the arrays (extend PartnerDetail).
  2. In the route at staff.ts:1479-1488 include `referredOrderTotal` and `commissionTotal` in the JSON; add `referredOrderTotal: z.int().nonnegative()` and `commissionTotal: z.int().nonnegative()` to partnerDetailResponseSchema in packages/contracts/src/partners.ts.
  3. In partner-detail.tsx render 'Showing newest 200 of N' under each table when N > rows.length, and link 'All referred orders' to `/w/${workspaceSlug}/orders?partnerCode=${detail.partner.referralCode}` (the orders list already supports the partnerCode filter and server-side pagination).
  4. Update the existing partner store/route tests to assert the totals and the 200-row cap.
- **Acceptance criteria:** Tests pass; with a seeded partner of 300 referred orders in a test DB, `GET /partners/:id` returns 200 referredOrders and referredOrderTotal 300, and the admin page shows the 'Showing newest 200 of 300' hint.
- **Risk of fix:** Low. Response shape gains two fields; keep existing fields so older admin builds keep working. Ordering changes to newest-first, which is what staff expect.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [PERF-03] The entire snapshot (all DB dumps, every R2 document, the Sanity tarball, plus their ciphertexts) is held in runner memory at once
- **Severity:** 🟡 Medium
- **Category:** Performance
- **Location:** jobs/src/backup/run.ts:84-124, jobs/src/backup/run.ts:152-156, jobs/src/backup/sources.ts:64-98
- **Problem:** `runBackup` materialises `db.roles/schema/data/historySchema/historyData` as `Uint8Array`s, then every referenced R2 object into `r2Artifacts` (line 108), then the Sanity archive, and only afterwards encrypts and uploads them one by one, with `namedArtifacts` keeping every plaintext alive until the function returns. Each R2 document is a PDF/JPG/PNG of several MB; with hundreds of orders the resident set reaches gigabytes on a 7-16 GB GitHub runner, and `supabase db dump` output is additionally read fully into memory (`readFile(path)`).
- **Impact (plain English):** As order volume grows the daily backup will crash with an out-of-memory error instead of producing a snapshot, at exactly the point where there is the most customer data to lose. Until then it silently uses time and memory proportional to the whole document set every night.
- **Evidence:**
  ```text
  run.ts:108: `r2Artifacts.set(`r2/${object.workspaceId}/${object.objectKey}`, bytes);` inside the loop over every referenced object; run.ts:116-124 builds `namedArtifacts` holding all of them; run.ts:152-156 encrypts/uploads only afterwards.
  ```
- **Fix steps:**
  1. OWNER APPROVAL: this is a structural change of about half a day. In jobs/src/backup/run.ts move encryption and upload of each R2 object into the loop at lines 94-109 (encrypt+put immediately after the checksum passes, keep only `manifestArtifact(name, bytes)` and the key in memory, drop the plaintext), and do the same for each DB dump right after it is produced. Keep the rule that the manifest and heartbeat are written last, so a partial run still never looks successful; retention already deletes abandoned prefixes.
  2. Update jobs/tests/backup-restore-rehearsal.test.ts second case (lines 171-202), which asserts `backend.size()` is 0 on a missing source object: either reorder the referenced-object presence check (a HEAD/exists pass) before any upload, or change the assertion to 'no manifest and no heartbeat exist' which is the actual safety property.
  3. Alternatively, as an interim measure, add a documented size guard: sum `sizeBytes` from `listReferencedObjects()` and fail fast with a clear error (`backup_snapshot_too_large_for_runner`) above a configurable limit (e.g. 2 GB) so the failure mode is explicit rather than an OOM.
- **Acceptance criteria:** A run.test.ts case with a fake R2 reader returning 200 objects of 8 MB each completes with `process.memoryUsage().rss` staying well below the sum of object sizes (assert < 1 GB), and the existing run.test.ts/rehearsal tests still pass.
- **Risk of fix:** Medium. Changes upload ordering; the heartbeat-last invariant must be preserved. The 'no upload of a partial snapshot' test expectation changes meaning.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-05] Approving a change request can deadlock with any concurrent action on the same order (FOR SHARE lead lock upgraded to UPDATE)
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/deletion/restriction.ts:16-22, apps/backend/src/orders/staff-actions.ts:176-200, apps/backend/src/orders/staff-actions.ts:652-658, apps/backend/src/orders/staff-actions.ts:806-811
- **Problem:** Every staff order write first calls lockCustomerLeadForOrder, which takes `SELECT ... FOR SHARE` on the lead row (restriction.ts:21), then `SELECT ... FOR UPDATE` on the order row (staff-actions.ts:198, transitions.ts:202). resolveChangeRequest (approve) then runs applyContactPatch, which executes `UPDATE leads` (staff-actions.ts:807-810), i.e. it upgrades its own share lock to an exclusive row lock. If a second transaction (assign, archive, recordPayment, note, a status transition, another approve) on the same order is in flight at that moment, it already holds FOR SHARE on the same lead and is waiting on the order FOR UPDATE held by the approver; the approver's UPDATE leads waits for that share lock to be released. Postgres detects the cycle and aborts one transaction with SQLSTATE 40P01, which the route turns into a 500 (staff.ts catch blocks).
- **Impact (plain English):** When two staff members act on the same order within the same instant (one approving a customer-detail change, one doing anything else), one of them gets a generic 'internal error' and must retry. No data is corrupted because the aborted transaction rolls back, but it is a confusing failure in a flow the owner will use for every customer correction.
- **Evidence:**
  ```text
  restriction.ts:21 `.for('share')`; staff-actions.ts:198 `.for('update')` on orders; staff-actions.ts:807-810 `await tx.update(leads).set({ ...updates, updatedAt: now }).where(...)` inside the same transaction.
  ```
- **Fix steps:**
  1. In apps/backend/src/deletion/restriction.ts change the signature of lockCustomerLeadForOrder to `export async function lockCustomerLeadForOrder(tx: TenantTransaction, workspaceId: string, orderId: string, mode: 'share' | 'update' = 'share'): Promise<boolean>` and replace `.for('share')` on line 21 with `.for(mode)`.
  2. In apps/backend/src/orders/staff-actions.ts change lockOrder (line 176) to accept a fourth parameter `leadLock: 'share' | 'update' = 'share'` and pass it through: `if (!(await lockCustomerLeadForOrder(tx, workspaceId, orderId, leadLock))) return undefined;` (line 181).
  3. In resolveChangeRequest (staff-actions.ts:656) call `const current = await lockOrder(tx, input.workspaceId, input.orderId, 'update');` so the lead row is taken FOR UPDATE before the order lock, making the later `UPDATE leads` a no-op upgrade. All other callers keep the default 'share'.
- **Acceptance criteria:** Integration test (disposable DB, same harness as orders-transitions.integration.test.ts): seed an order with a pending change request whose patch has `contact: { fullName: 'New Name' }`. On the admin connection `begin`, run `select id from app.leads where id = <lead> for share`. Start `store.resolveChangeRequest({... decision: 'approve', expectedVersion: 1})` in parallel (do not await). Wait with vi.waitFor until pg_stat_activity shows the store's backend blocked by the admin pid (pattern at orders.integration.test.ts:625-634). Then on the admin tx run `select id from app.orders where id = <order> for update` — with the fix this returns immediately (the store is still waiting for the lead lock, before the order lock); commit the admin tx; the awaited store promise resolves `{ status: 'updated' }` with no error. Without the fix the same sequence produces a 40P01 deadlock on one side.
- **Risk of fix:** Low. Taking the lead FOR UPDATE in resolveChangeRequest serialises it with concurrent draft saves and deletion on that lead (which already lock the lead FOR UPDATE), which is the intended order. No other caller changes behaviour.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-09] Resend send, owner-alert email/webhook and Sentry POSTs have no timeout and follow redirects
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** packages/adapters/src/messaging.ts:192-208, packages/adapters/src/alerts.ts:96-111, packages/adapters/src/alerts.ts:142, packages/adapters/src/error-tracking.ts:82-88
- **Problem:** Every other adapter in the package passes `signal: AbortSignal.timeout(...)` and `redirect: 'error'` (sanity.ts:147-148, analytics.ts:95-96, deletion-ledger.ts:108-109, r2-s3.ts:357-358), but ResendEmailAdapter.send, EmailOwnerAlertChannel.send, WebhookOwnerAlertChannel.send and SentryHttpErrorTracker.captureException call fetch with no signal and default redirect handling. A stalled TCP connection to api.resend.com therefore blocks the outbox email handler (jobs/src/index.ts:252) indefinitely, holding the job lease; owner alerts can hang the scheduler/synthetic-check path; Sentry requests can pile up as pending promises. Default `redirect: 'follow'` also means a redirected Resend/webhook URL would be followed with the bearer token/HMAC body re-sent.
- **Impact (plain English):** A slow or hung email provider can stall order-acknowledgement and tracking-code emails for every customer until the runner's lease expires, instead of failing fast and retrying. Owner alerts (the thing that tells the owner something is broken) can themselves hang.
- **Evidence:**
  ```text
  messaging.ts:192 `const response = await fetch(`${this.config.apiUrl ?? 'https://api.resend.com'}/emails`, { method: 'POST', headers: {...}, body: ... });` — no `signal`, no `redirect`. alerts.ts:142 `await this.fetchImpl(this.config.url, { method: 'POST', headers, body });`. error-tracking.ts:82-88 `void this.fetchImpl(this.endpoint, { method: 'POST', headers: {...}, body: JSON.stringify(event) }).catch(() => {});`
  ```
- **Fix steps:**
  1. packages/adapters/src/messaging.ts, class ResendEmailAdapter, method send(): add `redirect: 'error', signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000)` to the fetch init object; add an optional `timeoutMs?: number` to the constructor config type. The existing catch block already maps a thrown AbortError/TimeoutError to `{ status: 'uncertain', errorCode: error.name }`, which is the correct outbox outcome.
  2. packages/adapters/src/alerts.ts, EmailOwnerAlertChannel.send() and WebhookOwnerAlertChannel.send(): add `redirect: 'error', signal: AbortSignal.timeout(10_000)` to both fetch init objects.
  3. packages/adapters/src/error-tracking.ts, SentryHttpErrorTracker.captureException(): add `redirect: 'error', signal: AbortSignal.timeout(5_000)` to the fetch init object (the trailing `.catch(() => {})` keeps it fire-and-forget).
  4. Add a test in messaging.test.ts asserting `init.signal` is an AbortSignal and `init.redirect === 'error'` on the captured Resend call (same pattern as r2.test.ts:35).
- **Acceptance criteria:** `pnpm --filter @canadian-plans/adapters test` passes including the new assertions; `git grep -n "fetch(" -- packages/adapters/src` shows every call site passing a `signal`.
- **Risk of fix:** Low. A genuinely slow Resend call that exceeds 15 s now returns 'uncertain' and is retried with the same Idempotency-Key (messaging.ts:197), so no duplicate email is sent within Resend's 24 h idempotency window.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-10] Sentry tracker ignores the HTTP response, so a rejected DSN/endpoint is silently invisible
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** packages/adapters/src/error-tracking.ts:39-41, packages/adapters/src/error-tracking.ts:82-88, packages/adapters/src/error-tracking.test.ts:42
- **Problem:** captureException() posts to `https://<host>/api/<projectId>/store/?sentry_key=...&sentry_version=7` and discards the Response entirely; only a rejected promise is caught (also silently). A 400 (invalid payload), 401/403 (bad key), 404 (wrong project id, e.g. a DSN with a trailing slash leaves projectId as '456/'), 410 (if Sentry retires the legacy /store/ endpoint for this org) or 429 (rate limit) produces no log line at all. The only test (error-tracking.test.ts:42) mocks `{ ok: true }` and never exercises a non-2xx response. Per memory, Sentry was 'not connected' in September and DSNs were recorded in October; nothing in the code would reveal if events are being rejected.
- **Impact (plain English):** The owner can believe error tracking is live while every backend/jobs exception is being dropped by Sentry. Production errors then go unnoticed until a customer reports them.
- **Evidence:**
  ```text
  error-tracking.ts:82-88: `void this.fetchImpl(this.endpoint, {...}).catch(() => { // Best-effort delivery only });` — the resolved Response is never inspected.
  ```
- **Fix steps:**
  1. packages/adapters/src/error-tracking.ts, SentryHttpErrorTracker.captureException(): change the fetch chain to `.then((response) => { if (!response.ok) console.error(JSON.stringify({ event: 'error_tracker_delivery_rejected', status: response.status })); }).catch(() => { console.error(JSON.stringify({ event: 'error_tracker_delivery_failed' })); })`. Do not log the body or the endpoint (it contains the public key).
  2. packages/adapters/src/error-tracking.ts, parseSentryDsn(): change `url.pathname.replace(/^\//, '')` to `url.pathname.replace(/^\/+|\/+$/g, '')` so a trailing slash in SENTRY_DSN cannot corrupt the project id.
  3. Add a test in error-tracking.test.ts: fetchImpl resolves `{ ok: false, status: 401 }`; spy on console.error and assert it was called with a string containing 'error_tracker_delivery_rejected' and 401.
- **Acceptance criteria:** New unit test passes. Owner check: with SENTRY_DSN set on Railway, trigger one test exception (e.g. the synthetic-check failure path) and confirm the event appears in the Sentry project; if Railway logs show `error_tracker_delivery_rejected`, the DSN/endpoint is wrong.
- **Risk of fix:** Low. Adds one structured log line per rejected delivery; no behavioural change on success.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** The silent-swallow is confirmed in code. Whether Sentry still accepts the legacy /api/<id>/store/ endpoint with sentry_version=7 for this organisation must be confirmed by sending one real event and seeing it in the Sentry UI; if it does not arrive, the fix is to switch to the envelope endpoint (`/api/<id>/envelope/`), which is a larger change.

### [REL-16] All 20 Postgres integration suites silently skip when the DB env vars are missing; only isolation.spec.ts fails loudly under CI
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/tests/orders.integration.test.ts:13-25, apps/backend/tests/outbox-store.integration.test.ts:8-20, apps/backend/tests/orders-staff-actions.integration.test.ts:10-22, apps/backend/tests/orders-transitions.integration.test.ts:10-22, apps/backend/tests/partners-commission.integration.test.ts:11-23, apps/backend/tests/catalogue-drain.integration.test.ts:10-11, apps/backend/tests/catalogue-scheduled-pass.integration.test.ts:13-14, apps/backend/tests/catalogue-store.integration.test.ts:15-16, apps/backend/tests/catalogue-sync.integration.test.ts:14-15, apps/backend/tests/documents-store.integration.test.ts:11-12, apps/backend/tests/leads-store.integration.test.ts:8-9, apps/backend/tests/region-waitlist-store.integration.test.ts:9-10, apps/backend/tests/reports-store.integration.test.ts:9-10, apps/backend/tests/tracking-store.integration.test.ts:21-22, apps/backend/tests/deletion-store.integration.test.ts:38-46, apps/backend/tests/email-store.integration.test.ts:13-28, packages/db/tests/rls.integration.test.ts:9-29, packages/db/tests/catalogue.integration.test.ts:10-13, packages/db/tests/partners.integration.test.ts:10-13, packages/db/tests/website-auth.integration.test.ts:11-13, apps/backend/tests/isolation.spec.ts:21
- **Problem:** Each integration file gates itself with `if (!url && !allowed) return undefined;` followed by `const databaseDescribe = databaseUrl ? describe : describe.skip;` (or `describe.skipIf(!migrationUrl)` in email-store). When TEST_MIGRATION_DATABASE_URL and DB_TEST_ALLOW_DESTRUCTIVE are both absent the whole file is reported as skipped and Vitest exits 0. Only apps/backend/tests/isolation.spec.ts:21 adds `&& !process.env.CI`, so it throws under CI when the variables are missing. The local run captured in unit-tests.log confirms the behaviour: `Test Files 140 passed | 21 skipped (161)`, `Tests 1112 passed | 156 skipped` — the 21 skipped files are exactly these suites. CI currently sets both variables at job level (.github/workflows/ci.yml:17-18), so the suites run today, but nothing asserts that they did: a future edit to ci.yml (renaming the env, moving steps into a matrix/job without the env block, a reusable workflow) would turn the entire order-submission, idempotency, RLS, outbox, commission and transition coverage into silent skips while CI stays green.
- **Impact (plain English):** The tests that prove the most important business rules (one order per draft, RLS denial, commission exactly once, outbox retry) can be switched off by accident and nobody would notice: CI would keep passing while those guarantees go unverified.
- **Evidence:**
  ```text
  orders.integration.test.ts:16  if (!url && !allowed) return undefined;
  orders.integration.test.ts:25  const databaseDescribe = databaseUrl ? describe : describe.skip;
  isolation.spec.ts:21           if (!migrationUrl && !enabled && !process.env.CI) return undefined;   // the only file with the CI guard
  unit-tests.log:9               Test Files  140 passed | 21 skipped (161)
  ```
- **Fix steps:**
  1. In every `disposableDatabaseUrl()` / `getDisposableTestDatabaseUrl()` helper listed in location, change the early-return line from `if (!url && !allowed) return undefined;` (or `if (!migrationUrl && !destructiveTestsEnabled) return undefined;`) to `if (!url && !allowed && !process.env.CI) return undefined;` (keep each file's own variable names). This mirrors apps/backend/tests/isolation.spec.ts:21 exactly.
  2. For the two files that use a top-level `if (databaseUrl || process.env.DB_TEST_ALLOW_DESTRUCTIVE) { ... throw }` pattern (apps/backend/tests/deletion-store.integration.test.ts:39 and apps/backend/tests/email-store.integration.test.ts:14), change the condition to `if (databaseUrl || process.env.DB_TEST_ALLOW_DESTRUCTIVE || process.env.CI) {` (resp. `migrationUrl || ... || process.env.CI`) so CI also throws when the variables are absent.
  3. As a belt-and-braces check, add one CI step in .github/workflows/ci.yml immediately before `- run: pnpm run test` (line 70): `- name: Integration suites must not be skipped\n  run: test -n "$TEST_MIGRATION_DATABASE_URL" && test "$DB_TEST_ALLOW_DESTRUCTIVE" = '1'`.
- **Acceptance criteria:** Run `CI=1 pnpm --filter backend exec vitest run tests/orders.integration.test.ts` with TEST_MIGRATION_DATABASE_URL and DB_TEST_ALLOW_DESTRUCTIVE unset: the file must FAIL with the 'Both disposable database test settings are required' error instead of reporting 'skipped'. Run `pnpm run test` locally without the variables (CI unset): the 21 files are still skipped and the run passes. Run the CI workflow: `Test Files` must show 0 skipped.
- **Risk of fix:** Low. Mechanical one-line change per file. Anyone who sets CI=1 locally without a disposable database will now get a hard failure, which is the intended behaviour.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-17] Staff routes have no rate limit and every request (even with a garbage token) makes two outbound Supabase Auth calls
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/auth/session.ts:34-54, apps/backend/src/auth/session.ts:63-83, apps/backend/src/routes/staff.ts:140, apps/backend/src/routes/email.ts:218
- **Problem:** `requireStaffSession` accepts any `Authorization: Bearer <anything up to 8200 chars>` and immediately calls `SupabaseStaffSessionVerifier.verify`, which performs `auth.getUser(accessToken)` and `auth.mfa.getAuthenticatorAssuranceLevel(accessToken)` over HTTP to Supabase for every request. Unlike the website routes (`requireWebsiteCredential` has IP/credential/visitor buckets), nothing in `createStaffRouter` or the `/api/v1/email/staff` sub-router applies a rate limit, and there is no cheap local shape check on the token before the network calls.
- **Impact (plain English):** An unauthenticated flood against /api/v1/staff/* turns into double that number of requests from the backend to Supabase Auth. If Supabase throttles or slows the project's Auth API, real staff logins and admin pages start failing (401/invalid_session or timeouts) while the attack runs, and the backend's own event loop/connection budget is spent on outbound calls.
- **Evidence:**
  ```text
  session.ts:38-45: `const auth = authClient(); const userResult = await auth.getUser(accessToken); ... const assurance = await auth.mfa.getAuthenticatorAssuranceLevel(accessToken);` ; session.ts:56-61 `bearerToken` only checks `authorization.length > 8_200` and the `Bearer` prefix; staff.ts:140 `router.use(requireStaffSession(dependencies.sessionVerifier));` with no limiter; git grep for rateLimit/ipLimit in apps/backend/src/routes/staff.ts and apps/backend/src/auth returns nothing.
  ```
- **Fix steps:**
  1. In apps/backend/src/auth/session.ts `bearerToken()` (line 56), after extracting `match?.[1]`, reject tokens that are not JWT-shaped before any network call: `const token = match?.[1]; if (!token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return undefined; return token;` (a Supabase access token is always a three-segment base64url JWT).
  2. Add an optional IP limiter to `requireStaffSession`: change its signature to `requireStaffSession(verifier: StaffSessionVerifier, rateLimit?: (input: RateLimitInput) => Promise<RateLimitResult>)` (import the two types from '@canadian-plans/db'). At the top of the returned handler, if `rateLimit` is provided, call `await rateLimit({ bucketKey: \`staff:ip:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}\`, windowSeconds: 60, maxCount: 300 })` and on `!allowed` respond with `res.setHeader('retry-after', String(retryAfterSeconds)); sendStaffAuthError(res, req.id, 'invalid_session', 429)` (or add a `rate_limited` code to apps/backend/src/http/staff-errors.ts if its code union is closed) and return.
  3. In apps/backend/src/routes/staff.ts:140 and apps/backend/src/routes/email.ts:218 pass the limiter: `requireStaffSession(dependencies.sessionVerifier, rateLimitHit)` where `rateLimitHit` is imported from '@canadian-plans/db' (already imported that way in apps/backend/src/routes/website.ts:3). For tests that build the router with fakes, leave the second argument undefined so behaviour is unchanged.
  4. Add a test in apps/backend/tests (next to the existing staff auth tests) asserting that a request with `Authorization: Bearer not-a-jwt` returns 401 WITHOUT the fake verifier being called, and that when a fake limiter denies `staff:ip:` the response is 429.
- **Acceptance criteria:** `pnpm --filter backend test` passes; with a fake verifier that records calls, a request with a non-JWT bearer token gets 401 and the verifier call count stays 0; with the limiter denying, the response is 429 with a `retry-after` header; a valid staff flow through admin still works end to end (`pnpm run test:e2e` admin journey).
- **Risk of fix:** Medium. Depends on the trust-proxy fix so the IP bucket is per client rather than per proxy; without it the 300/min bucket is shared by all staff users behind Railway, so either land both together or set a generous max. The JWT-shape check must not reject real Supabase tokens (they are standard three-segment JWTs).
- **Depends on:** Pre-credential IP rate-limit bucket is shared by every caller behind the Railway proxy (no trust proxy), enabling cheap storefront API denial of service
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Whether Supabase actually throttles `/auth/v1/user` and `/auth/v1/factors`-level calls for the project tier is not verified; the amplification itself (2 outbound calls per inbound request, no limiter) is verified in code.

### [REL-18] Expired upload intents are never swept: DocumentService.runCleanup has no caller, so abandoned uploads and their R2 staging objects accumulate forever
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/documents/service.ts:335-352, apps/backend/src/documents/store.ts:594-624, apps/backend/src/scheduler.ts:233-244, apps/backend/src/documents/config.ts:15
- **Problem:** The documents module implements an expiry sweep (cleanupExpired marks `uploading`/`verifying` rows past expires_at + 24h grace as rejected and returns their staging/candidate object keys) and the schema has an index for it (files_workspace_status_expires_idx), but `git grep runCleanup` across apps/, jobs/ and packages/ finds only the definition. The in-process scheduler registers only outbox, catalogue_sync and synthetic_check tasks. Nothing calls runCleanup, and even its return value (cleanedObjects) is not fed to an R2 delete anywhere. Every customer who starts an upload and abandons it leaves a `files` row in status 'uploading' forever and a presigned-PUT staging object in R2 forever.
- **Impact (plain English):** R2 storage and the files table grow with every abandoned or failed upload (people often retry uploads several times). Over months this becomes a real storage bill and a growing table of dead rows, and the private bucket fills with unverified customer documents that were never meant to be kept.
- **Evidence:**
  ```text
  Repository-wide search: `git grep -n runCleanup -- apps jobs packages` returns only apps/backend/src/documents/service.ts:85 (comment) and :335 (definition). scheduler.ts:233-244 builds `tasks` with exactly two entries plus the optional synthetic check.
  ```
- **Fix steps:**
  1. In apps/backend/src/scheduler.ts add `export const DOCUMENT_CLEANUP_INTERVAL_MS = 60 * 60_000;` and extend `SchedulerTaskName` with 'document_cleanup' and SCHEDULER_ERROR_PREFIXES with `document_cleanup: 'scheduler:document_cleanup'`.
  2. In BackendSchedulerDependencies add `runDocumentCleanup(input: SchedulerRunInput): Promise<unknown>;`. In createBackendScheduler, after the catalogue task, push `{ name: 'document_cleanup', intervalMs: DOCUMENT_CLEANUP_INTERVAL_MS, run: () => dependencies.runDocumentCleanup(outbox) }` (reuse the `outbox` identity, which already carries the authorized workspace ids and the verified actor id).
  3. In createDefaultSchedulerDependencies, build `const documents = createDocumentServiceFromEnv();` (import from './documents/factory.js') and `const r2 = (() => { try { return createR2DocumentStoreFromEnv(); } catch { return undefined; } })();` and implement `runDocumentCleanup: async (input) => { if (!documents) return { skipped: 'feature_not_ready' }; for (const workspaceId of new Set(input.authorizedWorkspaceIds)) { const result = await documents.runCleanup({ workspaceId, actorId: input.actorId }); for (const key of result.cleanedObjects) { await r2?.deleteObject(key).catch(() => undefined); } } }` — use the actual delete method name exposed by R2DocumentStore in packages/adapters (the same one apps/backend/src/deletion/objects.ts uses).
  4. Pass `backupLease: { isActive: isBackupInProgress }` (imported from @canadian-plans/db) into the DocumentService constructed in apps/backend/src/documents/factory.ts so the sweep defers physical deletes during a backup, as the service already supports.
  5. Add a scheduler unit test (apps/backend/src/scheduler.test.ts pattern) asserting createBackendScheduler registers a 'document_cleanup' task and that its run calls runDocumentCleanup with the outbox identity.
- **Acceptance criteria:** Unit test from step 5 passes. Integration/manual: create an upload intent, do not finalize it, set its expires_at to 2 days ago in a staging DB, trigger one scheduler tick (or call runDocumentCleanup directly), and confirm the files row is now status 'rejected' with reject_reason 'expired' and the staging object is gone from the staging bucket.
- **Risk of fix:** Medium. Deleting R2 objects is irreversible; the 24h grace plus the backup-lease gate are already designed for this. Keep the deletes best-effort (catch and continue) so one R2 error never aborts the sweep. Scheduler ticks share the DB pool, so land the pool-size fix first.
- **Depends on:** PERF-01 (Backend runs on a single-connection Postgres …)pool (max: 1), serializing every request and the scheduler
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-19] No retention for operational tables: completed outbox jobs, alerts, tracking challenges, quotes, catalogue sync inboxes, provider events and idempotency keys grow forever
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/jobs/store.ts:175-255, apps/backend/src/tracking/store.ts:170-191, apps/backend/src/catalogue/store.ts:664-681, apps/backend/src/catalogue/store.ts:345-356, apps/backend/src/email/store.ts:351-364, apps/backend/src/orders/store.ts:284-296, packages/db/drizzle/0011_lovely_blur.sql:304-314, packages/db/drizzle/0017_worthless_synch.sql:36, packages/db/drizzle/0012_dashing_bug.sql:45
- **Problem:** Every order creates 2-3 outbox_jobs plus later status-email jobs; every lead creates one; every tracking OTP request creates a tracking_challenges row and an outbox job; every quote request creates a quotes row and an audit event; every CMS webhook creates a catalogue_sync_events row with the full payload JSONB; every Resend webhook creates an email_provider_events row. recordOutcome only flips status to completed/failed/uncertain (trimming the tracking payload) and nothing ever deletes rows. The only 'retention' code in the repo (jobs/src/retention/run.ts) prunes backup archives in R2, not database rows. The app_runtime role has no DELETE grant on outbox_jobs, outbox_job_alerts, tracking_challenges, catalogue_sync_events, idempotency_keys, files or email_provider_events, so pruning cannot be added in application code without a migration. Hot-path indexes (outbox_jobs_workspace_status_available_idx, tracking_challenges_workspace_order_status_idx) keep claims fast, but table size, backup size and vacuum cost grow without bound, and listActive/queueHealth scans of failed/uncertain rows never shrink.
- **Impact (plain English):** Nothing visible breaks in the first months. Over a year or two at the 100-orders/day target the database holds hundreds of thousands of dead job, challenge and quote rows: backups get slower and larger (the owner's backup gate is already open), Supabase storage costs rise, and any query that is not perfectly indexed slows down.
- **Evidence:**
  ```text
  jobs/store.ts:225-243 updates status only; `git grep -n -i 'delete from\|\.delete(' -- apps/backend/src` shows deletes only inside deletion/cleanup.ts (per-customer erasure) and catalogue_sync_leases. Grants: 0011_lovely_blur.sql:314 `GRANT SELECT, INSERT, UPDATE ON TABLE "app"."outbox_jobs" TO "app_runtime";` (no DELETE).
  ```
- **Fix steps:**
  1. OWNER APPROVAL: agree retention windows. Suggested: completed outbox_jobs and resolved outbox_job_alerts after 30 days; consumed or expired tracking_challenges after 7 days; expired-and-unconsumed quotes after 90 days; completed/ignored catalogue_sync_events after 90 days; email_provider_events with applied_at set after 180 days. Do NOT prune audit_events, orders, order_status_history, commission tables or completed idempotency_keys tied to orders (invariant 11 and the 24h retry window are satisfied by keeping them).
  2. Add a new Drizzle migration (packages/db/drizzle/0025_operational_retention.sql) that creates a SECURITY DEFINER function `app.prune_operational_rows(p_workspace_id uuid, p_now timestamptz) RETURNS TABLE(table_name text, deleted integer)` with `SET search_path = ''`, which runs the five bounded DELETEs above each with `LIMIT 1000` via a ctid subselect (same pattern as app.rate_limit_hit in 0004_simple_hellfire_club.sql:73-79), restricted to `workspace_id = p_workspace_id`; `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO app_runtime;`. This keeps DELETE off the runtime role's table grants.
  3. In packages/db/src/index.ts add `pruneOperationalRows(workspaceId: string, now: Date): Promise<{ tableName: string; deleted: number }[]>` to DatabaseClient, implemented with `db.execute(sql\`select table_name as "tableName", deleted from app.prune_operational_rows(${workspaceId}, ${now.toISOString()})\`)`, and export a module-level wrapper like the other helpers.
  4. In apps/backend/src/scheduler.ts add a daily task 'retention_prune' (intervalMs 24 * 60 * 60_000) that loops the outbox identity's authorizedWorkspaceIds and calls pruneOperationalRows for each, logging counts through the PII-safe logger.
  5. Add a packages/db integration test (pattern: packages/db/tests/outbox-migration.test.ts) that inserts a completed outbox job dated 40 days ago and a pending one, calls the function, and asserts only the old completed row is gone.
- **Acceptance criteria:** Migration applies cleanly on a fresh database (`pnpm --filter @canadian-plans/db migrate` in the test environment); the integration test passes; after one scheduler day in staging `select status, count(*) from app.outbox_jobs group by 1` shows no completed rows older than 30 days.
- **Risk of fix:** Medium. Deleting data is irreversible; the function must never touch orders, leads, audit_events or commission tables, and must be workspace-scoped and LIMITed so one tick cannot lock a table for long. The backup gate (no restorable backup yet) means pruning should be enabled only after the first verified backup.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-20] Admin Jobs page loads every active/failed/uncertain outbox job with no limit, and uncertain jobs are terminal with no resolution path, so the list and the queue alert never clear
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/backend/src/jobs/store.ts:257-281, apps/backend/src/jobs/store.ts:283-298, apps/backend/src/routes/staff.ts:475-520, apps/admin/src/components/jobs-status.tsx:58-61, apps/admin/src/components/jobs-status.tsx:91-93, apps/backend/src/jobs/queueMonitor.ts:55-68
- **Problem:** listActive() selects all outbox_jobs with status in (pending, processing, failed, uncertain) with no LIMIT and the route returns them all; the admin filters client-side. retry() returns 'not_failed' for any status other than 'failed', and the UI shows 'Reconcile before retry' for uncertain jobs with no action available, so an uncertain job (handler timeout, Umami unmapped, Resend 5xx) stays in the list forever. trackQueueHealth treats any failed+uncertain > 0 as 'struggling', so once a single uncertain job exists the monitor is permanently in the alerted state and re-alerts on every later failure. During a provider outage (Resend down for an hour → every email job times out after 30s → 'uncertain') hundreds of rows pile up in one day.
- **Impact (plain English):** After the first provider hiccup the Jobs page becomes a growing wall of uncertain rows staff cannot act on, the response payload grows without bound (eventually slow or failing to render), and the owner's 'job queue stuck' alert stays effectively permanent so a genuine new outage is indistinguishable from old noise.
- **Evidence:**
  ```text
  jobs/store.ts:272-278 `.where(and(eq(outboxJobs.workspaceId, workspaceId), inArray(outboxJobs.status, ['pending','processing','failed','uncertain']))).orderBy(...)` (no .limit); jobs/store.ts:298 `if (existing[0].status !== 'failed') return 'not_failed';`; jobs-status.tsx:92 `<span ...>Reconcile before retry</span>`.
  ```
- **Fix steps:**
  1. In apps/backend/src/jobs/store.ts listActive(): add `.limit(500)` after orderBy and change the ordering to `desc(outboxJobs.updatedAt)` so the newest problems are always included; add a second query `select count(*)` with the same where and return `{ jobs, total }` (adjust the JobAdminStore interface and the route at staff.ts:500-516 to include `total` in the response; add `total: z.int().nonnegative()` to listWorkspaceJobsResponseSchema in packages/contracts/src/jobs.ts).
  2. In jobs-status.tsx show `Showing {jobs.length} of {total}` above the tables when total > jobs.length.
  3. Add an 'acknowledge' action for uncertain jobs: in DatabaseOutboxStore add `acknowledgeUncertain({ workspaceId, actorId, jobId, requestId })` that updates the job from status 'uncertain' to 'failed' with lastErrorCode 'acknowledged_uncertain' (keeping providerId/outcome), resolves its open alerts (same update as retry() lines 321-330) and writes an audit event 'outbox_job.acknowledged'. Expose it as `POST /workspaces/:workspaceId/jobs/:jobId/acknowledge` gated on 'integration.manage' next to the retry route (staff.ts:522-566), add the contract schema and client method, and render an 'Acknowledge' button in jobs-status.tsx where 'Reconcile before retry' is shown. After acknowledging, staff can use the existing Retry (now allowed because status is 'failed') or leave it.
  4. Add unit tests mirroring the existing retry tests for acknowledgeUncertain (only uncertain → failed; other statuses return 'not_uncertain').
- **Acceptance criteria:** Backend and admin unit tests pass; manually set one job to status 'uncertain' in staging, open Settings > Jobs, click Acknowledge, confirm it moves to failed with a Retry button, and that `GET /jobs` returns at most 500 rows plus a total.
- **Risk of fix:** Low. Acknowledging an uncertain email job and retrying it could send a duplicate email if the provider did deliver the first; the existing uncertain semantics already require a human to check the provider log first, so keep the UI copy saying so. Capping the list changes the response shape (adds `total`), so update the contract, OpenAPI snapshot and client together.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-24] Scheduled retention runs are permanently dry-run, so the 30-daily/12-monthly policy never deletes anything
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** .github/workflows/backup-retention.yml:54-56, .github/workflows/backup-retention.yml:3-6, jobs/src/retention/cli.ts:38
- **Problem:** The weekly cron (`43 7 * * 1`) triggers the job with `github.event_name == 'schedule'`, where `github.event.inputs` is empty. The expression `${{ github.event.inputs.dry_run == 'false' && 'false' || 'true' }}` therefore evaluates to 'true' on every scheduled run, and cli.ts:38 treats anything but 'false' as dry-run. Only a human clicking workflow_dispatch and unticking dry_run ever deletes. The workflow header (lines 4-5) and restore.md:179-184 describe the weekly job as actually pruning.
- **Impact (plain English):** Backups accumulate forever: B2 storage cost grows without bound, and customer data (ID documents, contact details) that the business has promised to delete stays in the archive indefinitely instead of ageing out after the documented 30 days/12 months. Abandoned partial runs are also never cleaned up.
- **Evidence:**
  ```text
  backup-retention.yml:56: `RETENTION_DRY_RUN: ${{ github.event.inputs.dry_run == 'false' && 'false' || 'true' }}`; cli.ts:38: `const dryRun = process.env.RETENTION_DRY_RUN?.trim().toLowerCase() !== 'false';`
  ```
- **Fix steps:**
  1. Owner first runs backup-retention.yml via workflow_dispatch with dry_run=true after the first real backups exist and reviews the `candidateDeletions` in the run log.
  2. Then change line 56 of .github/workflows/backup-retention.yml to `RETENTION_DRY_RUN: ${{ github.event_name == 'workflow_dispatch' && github.event.inputs.dry_run != 'false' && 'true' || 'false' }}` so scheduled runs delete for real while manual runs keep defaulting to dry-run.
  3. Update the comment above the step (line 54) to say 'scheduled runs delete; manual dispatch defaults to dry-run'.
- **Acceptance criteria:** After the change, a scheduled run's log shows `"dryRun":false` in the `retention_completed` JSON line and a manual dispatch with the default input shows `"dryRun":true`; `node -e` evaluation is not possible for GitHub expressions, so verify on the next Monday run.
- **Risk of fix:** Medium. Enables real deletion on a schedule. The code's safety rails (grace period, retained-set union, unreadable-manifest fail-safe) are unit-tested, but the first live deletion should be observed by the owner. Depends on finding 'Retention workflow keeps the escrowed age PRIVATE key...' if that fix changes how retention derives run metadata.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-25] Every archive PUT/GET and every R2 source download is bounded by a fixed 30-second timeout
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** jobs/src/backup/archive-store.ts:35-49, jobs/src/backup/archive-store.ts:111-127, jobs/src/backup/sources.ts:168-187, jobs/src/backup/cli.ts:47-53, jobs/src/backup/cli.ts:65
- **Problem:** `s3Send` uses `AbortSignal.timeout(timeoutMs)` with a default of 30_000 ms covering the whole request including body transfer, and the production wiring in cli.ts never overrides it (neither for `S3ArchiveWriter` nor `S3R2SourceReader`). The `data.sql` dump (whole database with COPY data) and the Sanity tarball are single PUTs; on a GitHub runner's egress to Backblaze a few hundred MB can exceed 30 s. An abort rejects the fetch, `runBackup` throws, no heartbeat is published, and the monitor alerts.
- **Impact (plain English):** Backups will start failing silently-but-alertingly once the database or document set grows past what can be uploaded in 30 seconds (realistic within months of real orders with multi-MB ID scans), and will keep failing every day until someone changes code.
- **Evidence:**
  ```text
  archive-store.ts:47: `signal: AbortSignal.timeout(timeoutMs),` with `private readonly timeoutMs = 30_000` at line 115; cli.ts:47-53 constructs `new S3ArchiveWriter({...})` with no timeout argument.
  ```
- **Fix steps:**
  1. In jobs/src/backup/cli.ts pass an explicit long timeout to both clients: `new S3ArchiveWriter(config, fetch, 15 * 60_000)` and `new S3R2SourceReader(() => requiredR2Config(), fetch, 10 * 60_000)` (the job already has `timeout-minutes: 30`).
  2. Optionally make the writer timeout scale with body size inside `S3ArchiveWriter.putObject`: compute `Math.max(this.timeoutMs, Math.ceil(body.byteLength / 100_000) * 1000)` (≈100 KB/s floor) and pass it to `s3Send`.
- **Acceptance criteria:** Unit test in archive-store.test.ts: construct `S3ArchiveWriter` with a fake fetch that resolves after 100 ms and a timeout of 50 ms and assert it rejects; with the cli's new 15-minute value, a dispatched backup of the real database completes (observe `backup_completed` with `durationMs`).
- **Risk of fix:** Low. Longer timeouts only delay failure reporting on a truly hung connection; the job-level 30-minute timeout still bounds the run.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-28] A newer Sanity legal page would be shown to customers while orders keep recording the hard-coded terms-2026-10-v2
- **Severity:** 🟡 Medium
- **Category:** Reliability
- **Location:** apps/site-1/src/lib/legal.ts:111-114, packages/adapters/src/static-catalogue/site-1-plans.ts:34-38, apps/site-1/src/site.config.ts:20,30, apps/site-1/content/legal-published.ts:3-10, docs/legal/README.md:9-12
- **Problem:** getLegalPage falls back to the repo text only when the Sanity document's version is LOWER than publishedLegal.version; any Sanity legalPage with version >= 2 is rendered as /terms and /privacy. The terms version frozen into every quote (TERMS_VERSION = 'terms-2026-10-v2') and the lead consent versions ('privacy-2026-10-v2') are independent string constants. Once Sanity is connected, publishing a v3 legal page shows customers v3 while orders snapshot v2, breaking invariant 11 (terms version recorded at capture must be the text accepted).
- **Impact (plain English):** Orders would record acceptance of a terms text the customer never saw, which defeats the whole versioning scheme in a dispute. Works today only because Sanity is not connected.
- **Evidence:**
  ```text
  legal.ts:113  if (!parsed || parsed.version < publishedLegal[slug].version) return repoLegalPage(slug);
  site-1-plans.ts:38  const TERMS_VERSION = 'terms-2026-10-v2';
  ```
- **Fix steps:**
  1. In apps/site-1/src/lib/legal.ts line 113 change `parsed.version < publishedLegal[slug].version` to `parsed.version !== publishedLegal[slug].version`, so a Sanity page is used only when it is the same release the catalogue and consent constants reference; add a comment: '// The catalogue TERMS_VERSION and site.config consent versions are pinned to the repo release; a different Sanity version must be released together with them.'
  2. Update the doc comment at lines 8-15 and docs/legal/README.md to say that a CMS legal version is honoured only when it equals the repo release.
  3. Add a unit test for getLegalPage/parse logic (or extend an existing legal test) covering version 3 from Sanity → repo page returned.
- **Acceptance criteria:** Unit test: a parsed Sanity doc with version 3 returns source 'repo' and version 2; version 2 returns source 'sanity'; version 1 returns 'repo'. site-1 vitest passes.
- **Risk of fix:** Low. Sanity-driven legal updates then require a coordinated repo bump, which docs/legal/README.md already mandates.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [SEC-12] Abandoned incomplete leads holding customer PII are kept forever; only the draft grant expires (30 days), never the lead row
- **Severity:** 🟡 Medium
- **Category:** Security
- **Location:** apps/backend/src/leads/store.ts:33, apps/backend/src/leads/store.ts:242-288, apps/site-1/src/app/(storefront)/order/actions.ts:266-284, packages/db/src/schema.ts:596-641
- **Problem:** saveDetails in the storefront calls leads.create on the first completed step, so every visitor who gets past step one creates a leads row with full_name, email, phone and the form payload. DEFAULT_DRAFT_GRANT_TTL_SECONDS (30 days) only expires the draft_grants token; nothing ever deletes or restricts a lead that stays `incomplete`. The only deletion path is the staff-driven per-subject erasure in deletion/cleanup.ts. There is no retention policy for abandoned drafts, so personal data of people who never became customers accumulates indefinitely, and the staff leads list (default filter 'all') grows with it.
- **Impact (plain English):** Personal data of people who never ordered is retained forever, which is a privacy liability (PIPEDA/CASL expectations of retaining only as long as needed) and makes the leads table and the admin Leads page grow with mostly dead drafts; a data-breach or access request later exposes far more people than necessary.
- **Evidence:**
  ```text
  leads/store.ts:33 `const DEFAULT_DRAFT_GRANT_TTL_SECONDS = 60 * 60 * 24 * 30;` applies only to draftGrants.expiresAt (store.ts:282-288). `git grep -n '\.delete(leads\|delete(leads' -- apps/backend/src` returns nothing outside deletion/cleanup.ts's per-subject path.
  ```
- **Fix steps:**
  1. OWNER APPROVAL: choose an abandoned-draft retention window (suggest 90 days after updated_at for leads still `incomplete` with no order and no quote consumed) and decide between hard delete and the existing restriction mechanism (set customer_data_restricted_at and null the contact/payload columns, which the code already treats as 'redacted').
  2. Implement as a workspace-scoped `UPDATE app.leads SET full_name = null, email = null, phone = null, payload = null, customer_data_restricted_at = now() WHERE workspace_id = $1 AND status = 'incomplete' AND customer_data_restricted_at IS NULL AND updated_at < $2 LIMIT via ctid subselect 1000` inside the same SECURITY DEFINER prune function proposed in the operational-retention finding (the runtime role already has UPDATE on leads per 0008_first_garia.sql:67, so this could alternatively be a plain Drizzle update in a new method DatabaseLeadStore.expireAbandonedDrafts).
  3. Also delete the matching expired draft_grants rows (runtime role has DELETE on draft_grants per 0008_first_garia.sql:67) in the same step.
  4. Add an integration test (pattern packages/db/tests/orders-migration.test.ts) covering: an incomplete lead updated 100 days ago is restricted; an incomplete lead updated yesterday is untouched; a submitted lead is never touched.
- **Acceptance criteria:** Integration test passes; in staging, after the daily prune runs, `select count(*) from app.leads where status='incomplete' and updated_at < now() - interval '90 days' and customer_data_restricted_at is null` returns 0.
- **Risk of fix:** Medium. Must never touch leads referenced by an order (status 'submitted') or by a consumed quote; the status filter guarantees that. Restricting instead of deleting keeps analytics counts and audit references intact (reports already exclude restricted rows).
- **Depends on:** REL-19 (No retention for operational tables: complete…)d outbox jobs, alerts, tracking challenges, quotes, catalogue sync inboxes, provider events and idempotency keys grow forever
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [ARCH-01] Customer-facing POST /orders response reuses the staff OrderSummary shape (recordVersion, archiveState, workspaceId), contrary to invariant 14's per-audience responses
- **Severity:** ⚪ Low
- **Category:** Architecture
- **Location:** apps/backend/src/routes/website.ts:241-246, packages/contracts/src/orders.ts:32-46, packages/contracts/src/orders.ts:61-65, apps/backend/src/orders/store.ts:77
- **Problem:** `createOrderRouter` returns `outcome.order` directly, which `orders/store.ts:77` builds with `orderSummarySchema` — the same schema documented as carrying the staff optimistic-concurrency token (`recordVersion`) and `archiveState`. The customer audience only needs reference, statuses, totals and timestamps. No PII is exposed, but the contract does not define a distinct customer response as invariant 14 requires, so any field later added to `orderSummarySchema` for staff automatically reaches the storefront.
- **Impact (plain English):** Today nothing sensitive leaks, but the next staff-only field added to the order summary (for example an internal flag or assignee) would be sent to the public website automatically, because there is no customer-specific response shape to stop it.
- **Evidence:**
  ```text
  website.ts:242-245 `res.status(201).json({ order: outcome.order, requestId: req.id });` ; orders.ts:42 `recordVersion: z.int().nonnegative(),` inside `orderSummarySchema` used by `submitOrderResponseSchema` (line 62).
  ```
- **Fix steps:**
  1. In packages/contracts/src/orders.ts add `export const customerOrderSummarySchema = orderSummarySchema.pick({ id: true, reference: true, fulfilmentStatus: true, paymentState: true, deliveryState: true, total: true, amountPayableToday: true, createdAt: true, updatedAt: true });` and change `submitOrderResponseSchema` to `z.object({ order: customerOrderSummarySchema, requestId: requestIdSchema })`.
  2. In apps/backend/src/routes/website.ts line 242-245 respond with `order: customerOrderSummarySchema.parse(outcome.order)` (import from '@canadian-plans/contracts').
  3. Run `git grep -n "recordVersion\|archiveState\|workspaceId" -- apps/site-1/src` and remove any storefront use of those fields from the submit-order response (none expected).
- **Acceptance criteria:** `pnpm typecheck` passes for contracts, backend and site-1; `pnpm --filter contracts test` schemas test passes; a submitted order response no longer contains `recordVersion`.
- **Risk of fix:** Medium. If site-1 reads `workspaceId` or `recordVersion` from the submit response, its typecheck will fail and must be adjusted; confirm with the grep in step 3 first.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm site-1 does not consume `recordVersion`, `archiveState` or `workspaceId` from the POST /orders response before narrowing the schema.

### [ARCH-02] peerDependencies are mis-scoped: `next` is required by every consumer although only the ./canadian-plans subpath needs it, while tailwindcss and tw-animate-css are undeclared
- **Severity:** ⚪ Low
- **Category:** Architecture
- **Location:** packages/ui/package.json:19-23, packages/ui/src/components/canadian-plans/elements.tsx:2, packages/ui/src/components/dialog.tsx:33, packages/ui/src/styles/tokens.css:97
- **Problem:** `next/image` is imported only by elements.tsx, reachable solely via the `./canadian-plans` export (admin imports only the root entry, verified: `git grep "from '@canadian-plans/ui/" apps/admin` returns nothing). Yet `next` is a hard peer of the whole package. Conversely the components rely on Tailwind v4 at-rules (`@theme`, `@custom-variant`, `@utility`, `@variant` in tokens.css / canadian-plans*.css) and on tw-animate-css utility classes (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-right` in dialog.tsx, sheet.tsx, dropdown-menu.tsx, select.tsx, tooltip.tsx) without declaring either as a peer. Both apps happen to import them (apps/*/globals.css lines 1-2) so nothing breaks today.
- **Impact (plain English):** No user-facing effect now. A future non-Next consumer (e.g. an email preview tool or Storybook) is told it needs Next; a future frontend that forgets `@import 'tw-animate-css'` gets dialogs/sheets that never animate in and may render invisible, with no install-time warning.
- **Evidence:**
  ```text
  package.json:19-23  "peerDependencies": { "next": "^16.3.8", "react": "^19.0.0", "react-dom": "^19.0.0" }
   elements.tsx:2  import Image from 'next/image';
   dialog.tsx:33  'fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out ...'
  ```
- **Fix steps:**
  1. In packages/ui/package.json add `"peerDependenciesMeta": { "next": { "optional": true } }` and a comment-free README line under "Must never import" stating that `./canadian-plans` requires Next (next/image).
  2. Add to peerDependencies: `"tailwindcss": "^4.1.0"` and `"tw-animate-css": "^1.4.0"` (versions from pnpm-workspace.yaml catalog: tailwindcss 4.1.16, tw-animate-css 1.4.0). Add both to devDependencies as `"catalog:"` so the package's own tests/typecheck resolve them.
  3. Run `pnpm install` (lockfile update only) and confirm no new warnings for apps/admin and apps/site-1.
- **Acceptance criteria:** `pnpm install` completes without peer warnings for apps/admin or apps/site-1; `pnpm -r run typecheck` and `pnpm test` still pass (orchestrator logs show both green today).
- **Risk of fix:** Low. Manifest-only change; no runtime code touched.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-10] PII scrubber over-redacts ordinary diagnostic keys and ISO dates (substring fragments 'name', 'sin', 'dob', 'document')
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/observability/src/index.ts:24-64, packages/observability/src/index.ts:74-92, packages/observability/src/index.ts:80-83
- **Problem:** `isPiiFieldName` uses `normalized.includes(fragment)` with very short fragments. Verified by pure computation: `processingCount`, `singleUse`, `businessId`, `missingFields` are redacted because they contain 'sin'; `documentId`, `eventName`, `hostname`, `adobeAsset` are redacted via 'document', 'name', 'dob'. Separately, `PHONE_PATTERN` (line 74) matches an ISO date, so a message like 'failed at 2026-10-22T12:36:29Z' is logged as 'failed at [redacted]T12:36:29.000Z' (also applied to every Sentry event message via `buildErrorEvent`, line 238). Redaction errs on the safe side, so this is not a PII leak, but it quietly removes the identifiers an operator needs (Sanity `documentId` in a webhook failure, counts, timestamps). Today only `{ status, method }` is passed as `extra` (requestLog.ts:29), so the impact grows as logging is added.
- **Impact (plain English):** When something goes wrong in production, the error report may say '[redacted]' where the Sanity document id, a count, or the timestamp should be, making incidents slower to diagnose. No customer-facing effect.
- **Evidence:**
  ```text
  node -e demo with the exact fragment list and normalizer from index.ts: `processingCount -> REDACTED`, `documentId -> REDACTED`, `eventName -> REDACTED`; `'failed at 2026-10-22T12:36:29.000Z'.replace(PHONE_PATTERN,'[redacted]')` -> `'failed at [redacted]T12:36:29.000Z'`.
  ```
- **Fix steps:**
  1. In packages/observability/src/index.ts, split the list: keep the existing `PII_FIELD_NAME_FRAGMENTS` but remove the four over-broad entries `'name'`, `'sin'`, `'dob'`, `'document'` from it, and add a new `const PII_FIELD_EXACT_NAMES: ReadonlySet<string> = new Set(['name', 'sin', 'dob', 'document', 'socialinsurance', 'sinnumber']);`.
  2. Change `isPiiFieldName` to `return PII_FIELD_EXACT_NAMES.has(normalized) || PII_FIELD_NAME_FRAGMENTS.some((fragment) => normalized.includes(fragment));` so a bare `name`/`sin`/`dob`/`document` key is still fully redacted while `documentId`, `eventName`, `processingCount` survive (their string values are still scanned for email/phone shapes).
  3. Leave `PHONE_PATTERN` unchanged unless the team wants date-safe logging; if so, redact ISO dates back in by first replacing `\b\d{4}-\d{2}-\d{2}\b` matches with placeholders before applying PHONE_PATTERN and restoring them afterwards (bigger change, optional).
  4. Extend packages/observability/src/index.test.ts (see acceptance).
- **Acceptance criteria:** Tests: `scrubRecord({ documentId: 'abc', processingCount: 3, eventName: 'x' })` returns the values unchanged; `scrubRecord({ name: 'Jane', sin: '123456789', fullName: 'J', document: 'p' })` returns '[redacted]' for all four; `scrubRecord({ customerEmail: 'a@b.co' })` still redacts. `pnpm --filter @canadian-plans/observability test` passes.
- **Risk of fix:** Low. Loosening a redaction list must be reviewed for PII keys the team actually logs; the proposed exact-name set keeps every key currently redacted by the four removed fragments when used alone. Existing tests in index.test.ts that assert redaction of e.g. `documentId` (if any) would need updating.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-11] ESLint is not type-aware: no-floating-promises / no-misused-promises are not enforced anywhere
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** packages/config/eslint.js:13-34, eslint.config.js:4-19
- **Problem:** `baseConfig` extends `tseslint.configs.recommended` (line 15), the non-type-checked preset, and adds only `no-explicit-any`, `consistent-type-assertions` and `no-unused-vars`. Nothing enables `@typescript-eslint/no-floating-promises` or `no-misused-promises`, which require `parserOptions.projectService`. The backend (Express 5), the outbox runner, jobs/ and both Next apps are promise-heavy; a forgotten `await` on a DB write, an outbox insert or a `res.json()` inside an async branch compiles and lints clean. `pnpm lint` passes today (lint.log), so this reports a missing guard, not a known violation.
- **Impact (plain English):** A class of bugs (fire-and-forget promises whose rejection is never handled, or a status write that races the response) can reach production without any tool flagging it. No concrete user-facing failure identified in this audit.
- **Evidence:**
  ```text
  packages/config/eslint.js:15 `...tseslint.configs.recommended,` and rules block lines 23-31 containing only `no-explicit-any`, `consistent-type-assertions`, `no-unused-vars`, `no-console`.
  ```
- **Fix steps:**
  1. In packages/config/eslint.js, append a new config object to `baseConfig` (before `eslintConfigPrettier`): `{ files: ['**/*.{ts,tsx,mts,cts}'], languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: new URL('../../', import.meta.url).pathname } }, rules: { '@typescript-eslint/no-floating-promises': 'error', '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }] } }`. Keep JS/MJS files (scripts/, boundaries.js) out of the type-aware block.
  2. Run `pnpm lint`; for each reported site either `await` the promise, or prefix with `void ` only where fire-and-forget is intentional, with a one-line comment saying why.
  3. If lint time becomes a problem on the slow disk, scope `projectService` with `allowDefaultProject` for test files only.
- **Acceptance criteria:** `pnpm lint` passes with the two rules active; a scratch file containing `async function f(){}; f();` under apps/backend/src fails lint with `no-floating-promises` (then delete the scratch file).
- **Risk of fix:** Medium. Type-aware linting is slower and may surface many existing violations across apps/backend, jobs and the Next apps; each must be reviewed individually (an added `await` inside a DB transaction can change timing). Next.js files with Server Actions and event handlers commonly trip `no-misused-promises`, hence the `checksVoidReturn.attributes: false` option.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** The number of existing violations is unknown; run `pnpm lint` with the rules enabled on a branch to size the cleanup before committing to it.

### [CQ-16] postgres driver is a devDependency of the backend but is required at runtime by the bundled @canadian-plans/db code
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/package.json:24-33, apps/backend/tsup.config.ts:32, apps/backend/Dockerfile:31-35
- **Problem:** tsup inlines every @canadian-plans/* package into dist/src/server.js (noExternal), so packages/db's `import postgres from 'postgres'` becomes an import resolved from apps/backend. The backend manifest lists `postgres` only under devDependencies. It works today only because the Docker image ships the full dev install (the Dockerfile comment admits 'naive pruning breaks resolution'). Any production-only install (`pnpm install --prod`, `pnpm deploy --prod`, or a future slimmer image) would crash at boot with ERR_MODULE_NOT_FOUND for 'postgres'.
- **Impact (plain English):** No user-visible effect today; it is a trap that will break the first attempt to slim or prune the production image and blocks the image-size fix.
- **Evidence:**
  ```text
  package.json:28-29
    "devDependencies": { ... "postgres": "3.4.9", ...
  tsup.config.ts:32  noExternal: [/^@canadian-plans\//],
  ```
- **Fix steps:**
  1. In apps/backend/package.json move `"postgres": "3.4.9"` from devDependencies to dependencies (keep the exact version; .npmrc has save-exact).
  2. Run `pnpm install --frozen-lockfile=false` locally to update pnpm-lock.yaml, then commit the lockfile change together with the manifest.
  3. Update the Dockerfile comment at lines 31-35 to say the externals are declared in apps/backend/package.json dependencies.
- **Acceptance criteria:** `pnpm install --frozen-lockfile` succeeds in CI; `pnpm --filter backend deploy --prod /tmp/out && node /tmp/out/dist/src/server.js` (with DATABASE_URL set) starts and serves /api/v1/health without a module-not-found error.
- **Risk of fix:** Low. Manifest-only change; the lockfile diff must be committed or the Docker build's --frozen-lockfile step fails.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-24] Dockerfile install layer omits `packages/observability/package.json`, relying on pnpm tolerating a dangling workspace link
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/backend/Dockerfile:14-26, packages/adapters/package.json:17
- **Problem:** The Dockerfile copies every workspace manifest before `pnpm install --frozen-lockfile` (lines 14-24) but was written on 2026-09-17, before `packages/observability` was added (2026-09-21). `@canadian-plans/adapters` depends on `@canadian-plans/observability: workspace:*`, so during install that project is absent from the workspace; pnpm currently creates the `link:../observability` symlink anyway and `COPY . .` later fills it. The image for commit 6a76a1d (which includes observability) built successfully, so this works today but is accidental.
- **Impact (plain English):** Nothing is broken now. A future pnpm version (or a change making observability carry runtime dependencies) could make the Docker build fail with a lockfile/workspace mismatch, blocking a backend deploy at an inconvenient moment.
- **Evidence:**
  ```text
  Dockerfile:19-24 copies adapters, config, contracts, db, types, ui manifests only; `git ls-tree 6a76a1d packages/` lists packages/observability; `git show 6a76a1d:apps/backend/Dockerfile | grep -c observability` prints 0; pnpm-lock.yaml:513 has importer `packages/observability:`.
  ```
- **Fix steps:**
  1. In apps/backend/Dockerfile add the line `COPY packages/observability/package.json packages/observability/` between the `packages/db` line (22) and the `packages/types` line (23), matching the column alignment of the neighbours.
- **Acceptance criteria:** `docker build -f apps/backend/Dockerfile .` succeeds from the repo root and the `pnpm install --frozen-lockfile` step completes without warnings about `@canadian-plans/observability`.
- **Risk of fix:** Low. Only affects Docker layer caching and install completeness; no runtime change.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-26] CI has no dependency-audit gate and no Dependabot/Renovate; pnpm audit currently reports 1 high and 3 moderate advisories (dev/CLI-time paths)
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** .github/workflows/ci.yml:48-70, package.json:28-40, .github (no dependabot.yml)
- **Problem:** ci.yml runs typecheck, lint, format, tooling tests, unit tests, e2e and a service-role grep, but never `pnpm audit`, and the repository has no dependabot.yml or renovate config, so the SHA-pinned actions and the lockfile are only updated by hand. The orchestrator's `pnpm audit` output lists: braces <=3.0.3 (high, GHSA-vfj7-8cjw-p6xm, reached via sanity → @sanity/cli → chokidar/micromatch), sprintf-js <=1.1.3 (moderate, via @sanity/cli → @vercel/frameworks → js-yaml@3 → argparse), and @vitest/mocker 5.0.0 (two moderates, patched in >=5.0.3). All are dev/CLI-time dependencies, not code the backend serves at runtime; braces/sprintf-js show 'Patched versions <0.0.0' (no fix available yet).
- **Impact (plain English):** New advisories against runtime dependencies would go unnoticed until someone runs an audit by hand; today's findings are tooling-only and low risk.
- **Evidence:**
  ```text
  audit.log: `4 vulnerabilities found / Severity: 3 moderate | 1 high` with paths `... sanity@6.20.0 > @sanity/cli@8.22.0 > @sanity/codegen@8.2.0 > chokidar@3.6.0 > braces@3.0.3` and `get-it@9.6.2 > vitest@5.0.0 > @vitest/mocker@5.0.0`
  ```
- **Fix steps:**
  1. Add a CI step after `pnpm install --frozen-lockfile`: `- name: Audit runtime dependencies\n  run: pnpm audit --prod --audit-level high` with `continue-on-error: true` until the unpatchable braces advisory is resolved upstream, then remove `continue-on-error`.
  2. Bump the root pnpm `overrides` in package.json to add `"@vitest/mocker": ">=5.0.3"` (or upgrade the `vitest` catalog entry to >=5.0.3) and run `pnpm install` to refresh the lockfile.
  3. Add `.github/dependabot.yml` with `package-ecosystem: github-actions` (weekly) so pinned action SHAs receive update PRs; optionally `npm` ecosystem with grouped minor updates.
- **Acceptance criteria:** `pnpm audit --prod --audit-level high` in CI reports no @vitest/mocker advisories; Dependabot opens PRs for action updates on the next cycle.
- **Risk of fix:** Low. Upgrading vitest may require re-running the full test suite; the audit step is non-blocking initially.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Verify after `pnpm install` that no runtime (non-dev) path reaches braces or sprintf-js; the audit paths shown are through contracts → sanity, which is a production dependency of contracts, but the vulnerable modules are only invoked by the Sanity CLI.

### [CQ-29] Phone number the owner says will change is hard-coded in 12 content/source files
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/content/components.ts:104,171, apps/site-1/content/contact.ts:48,140, apps/site-1/content/emails.ts:8, apps/site-1/content/internet-order.ts:20, apps/site-1/content/legal-published.ts:143,252, apps/site-1/content/pre-arrival-order.ts:12,206-207, apps/site-1/content/site-chrome.ts:46, apps/site-1/content/system.ts:211,213,233, apps/site-1/content/track-order.ts:175, apps/site-1/src/app/(system)/accessibility/page.tsx, docs/LAUNCH_PLANS.md:124
- **Problem:** docs/LAUNCH_PLANS.md:124 records 'the owner says this number will change'. '+1 778-682-3771' / 'tel:+17786823771' is written literally in at least 12 files (both display form and tel: form), plus in the versioned legal text.
- **Impact (plain English):** When the number changes some pages, the email footer or the legal text will keep the old number and customers will call a dead line.
- **Evidence:**
  ```text
  git grep -c -E '778-682-3771|17786823771' apps/site-1/content → components.ts:2 contact.ts:2 emails.ts:1 internet-order.ts:1 legal-published.ts:2 legal.ts:1 pre-arrival-order.ts:3 site-chrome.ts:1 system.ts:3 track-order.ts:1
  ```
- **Fix steps:**
  1. In apps/site-1/content/site.ts add `export const contactDetails = { phoneDisplay: '+1 778-682-3771', phoneHref: 'tel:+17786823771', email: 'info@canadianplans.com', address: '9981 Whalley Blvd, Surrey, BC' } as const;`
  2. Replace each literal in components.ts, contact.ts, emails.ts, internet-order.ts, pre-arrival-order.ts, site-chrome.ts, system.ts, track-order.ts and the accessibility page with the constant (template strings where the number is embedded in a sentence). Leave legal-published.ts as literal text: it is versioned and a change there must bump the version per docs/legal/README.md; add a comment there pointing at contactDetails.
  3. Add a note to docs/LAUNCH_PLANS.md that a phone change means: update contactDetails, bump legal version, update Resend/Supabase templates if any.
- **Acceptance criteria:** `git grep -n '778-682-3771' apps/site-1/content apps/site-1/src` returns only site.ts and legal-published.ts; site-1 typecheck and vitest pass; rendered pages show the same number as before.
- **Risk of fix:** Low. Mechanical replacement; `as const` string literal types may need widening to `string` where copy objects are typed `as const` and compared in tests.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [CQ-33] clearTrackingGrant is dead code and would not clear the cookie it targets (path mismatch)
- **Severity:** ⚪ Low
- **Category:** Code quality
- **Location:** apps/site-1/src/app/(storefront)/track/grant.ts:38-45, apps/site-1/src/app/(storefront)/track/grant.ts:47-50
- **Problem:** `writeTrackingGrant` sets `cp_tracking_grant` with `path: '/track'`, but `clearTrackingGrant` calls `store.delete(GRANT_COOKIE)` with no path, which emits an expiring Set-Cookie for path `/`; browsers treat that as a different cookie, so the grant would survive. The function is not referenced anywhere in apps/site-1/src (`git grep clearTrackingGrant` finds only its definition).
- **Impact (plain English):** No user-facing effect today because nothing calls it, but the first developer who wires a 'sign out of tracking' button will get a cookie that never clears.
- **Evidence:**
  ```text
  `store.set(GRANT_COOKIE, JSON.stringify(grant), { httpOnly: true, sameSite: 'lax', secure: ..., path: '/track', maxAge: GRANT_TTL_SECONDS })` vs `store.delete(GRANT_COOKIE);`.
  ```
- **Fix steps:**
  1. In `apps/site-1/src/app/(storefront)/track/grant.ts`, replace the body of `clearTrackingGrant` with `store.set(GRANT_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/track', maxAge: 0 });` (mirroring `clearOrderDraft` in draft.ts), or delete the function if it is not going to be used.
- **Acceptance criteria:** `pnpm --filter site-1 typecheck && pnpm --filter site-1 lint` pass; if kept, a unit test asserting the Set-Cookie includes `Path=/track` and `Max-Age=0`.
- **Risk of fix:** Low. No callers.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [PERF-07] Missing indexes for the actual sort/filter columns: orders by submitted_at (default list order, date filters, reports), leads by created_at (reports) and email_messages by created_at (delivery list)
- **Severity:** ⚪ Low
- **Category:** Performance
- **Location:** packages/db/src/schema.ts:741-747, packages/db/src/schema.ts:636-637, packages/db/src/schema.ts:1992-1993, apps/backend/src/orders/query-store.ts:158-161, apps/backend/src/orders/query-store.ts:191, apps/backend/src/reports/store.ts:52-73, apps/backend/src/email/store.ts:449-452
- **Problem:** The staff orders list defaults to no status filter and orders by submitted_at desc; the only submitted_at index is orders_workspace_status_submitted_idx (workspace_id, status, submitted_at), which Postgres cannot use for ordering when status is not an equality predicate, so every page view sorts all of the workspace's (non-archived) orders and the count(*) scans them. The source report filters leads by created_at and orders by submitted_at but leads has only (workspace_id, status) and (workspace_id, updated_at) indexes. listDelivery orders email_messages by created_at desc limit 200 with only (workspace_id, status) and (workspace_id, contact_hash) indexes, so it sorts the whole table to return 200 rows.
- **Impact (plain English):** Fine at 10,000 orders (tens of milliseconds). At 100,000+ orders or emails each admin list page view and report becomes a full scan and sort of the workspace, which on a single-connection pool slows every other request too.
- **Evidence:**
  ```text
  schema.ts:741-745 `index('orders_workspace_status_submitted_idx').on(table.workspaceId, table.status, table.submittedAt)` is the only submitted_at index; query-store.ts:191 `.orderBy(desc(orders.submittedAt))` with status optional (line 153).
  ```
- **Fix steps:**
  1. In packages/db/src/schema.ts add to the `orders` table extras: `index('orders_workspace_submitted_idx').on(table.workspaceId, table.submittedAt),`; to `leads`: `index('leads_workspace_id_created_at_idx').on(table.workspaceId, table.createdAt),`; to `emailMessages`: `index('email_messages_workspace_created_idx').on(table.workspaceId, table.createdAt),`.
  2. Generate the migration with the repo's drizzle-kit script (`pnpm --filter @canadian-plans/db generate`) and review the SQL; it should contain only three CREATE INDEX statements.
  3. Optionally in query-store.ts listOrders, when `input.archiveState` is undefined or 'active' the predicate is `archived_at IS NULL`; a partial index `CREATE INDEX orders_workspace_active_submitted_idx ON app.orders (workspace_id, submitted_at DESC) WHERE archived_at IS NULL` would be tighter, but the plain index from step 1 is sufficient and simpler.
- **Acceptance criteria:** Migration applies; in a staging DB with >10k orders, `EXPLAIN (ANALYZE) SELECT ... FROM app.orders WHERE workspace_id = $1 AND archived_at IS NULL ORDER BY submitted_at DESC LIMIT 25 OFFSET 0` shows an Index Scan on orders_workspace_submitted_idx instead of Sort + Seq/Bitmap scan.
- **Risk of fix:** Low. Index creation on a small table is instant; on a large one CREATE INDEX takes a share lock for the duration (seconds). No code changes.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [PERF-09] Brand logo and story photos use raw <img>: a 512×512 PNG is served unoptimized twice per page and story images have no intrinsic size
- **Severity:** ⚪ Low
- **Category:** Performance
- **Location:** apps/site-1/src/components/shared/brand-mark.tsx:13, apps/site-1/src/components/home/design/stories.tsx:25
- **Problem:** `BrandMark` renders `<img src="/brand/canadian-plans-icon.png" width={512} height={512}>` (55,926-byte PNG, apps/site-1/public/brand/canadian-plans-icon.png) in both the header and footer of every page; it is displayed at icon size but the full 512px file is downloaded, bypassing Next's image optimizer. `HomeStories` renders `<img src={item.photo} alt={item.alt} />` with no width/height, so when real photos are added (all `photo` values are currently empty strings, so the placeholder slot renders) the cards will shift layout as images load.
- **Impact (plain English):** Slightly slower first paint on mobile (one extra ~56 KB request, cached afterwards) and a future layout-shift (CLS) regression on the homepage once story photos are populated.
- **Evidence:**
  ```text
  brand-mark.tsx:13: `<img src={BRAND_ICON_SRC} alt="" width={512} height={512} decoding="async" />` — stories.tsx:25: `<img src={item.photo} alt={item.alt} />`
  ```
- **Fix steps:**
  1. In apps/site-1/src/components/shared/brand-mark.tsx replace the `<img>` with `import Image from 'next/image';` and `<Image src={BRAND_ICON_SRC} alt="" width={512} height={512} sizes="48px" priority />` so the optimizer serves a small variant (the CSS in packages/ui/src/styles/canadian-plans-components.css:1617 `.cp-brand-mark img` still sizes it; next/image renders an `<img>` so the selector keeps matching).
  2. In apps/site-1/src/components/home/design/stories.tsx replace the `<img>` with `<Image src={item.photo} alt={item.alt} width={640} height={420} sizes="(max-width: 900px) 100vw, 33vw" />` (adjust to the design's aspect ratio) so dimensions are reserved; the fallback placeholder branch is unchanged.
- **Acceptance criteria:** Network panel on / shows the header logo requested as `/_next/image?url=%2Fbrand%2Fcanadian-plans-icon.png&w=96…` (or similar small width) instead of the raw 512px PNG; Lighthouse mobile CLS on / stays at or below the current value after adding a story photo.
- **Risk of fix:** Low. Verify the header/footer logo still renders at the right size (CSS targets `img`, which next/image emits). Remote photo hosts would need `images.remotePatterns` in next.config.ts.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-34] bulkAssign locks orders in caller-supplied order, so two concurrent bulk assigns can deadlock
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/orders/staff-actions.ts:515-549
- **Problem:** bulkAssign iterates `input.orders` in the order the client sent them and takes `FOR UPDATE` on each order (via lockOrder) inside one transaction. Two staff members bulk-assigning overlapping sets in different orders (A locks o1 then o2, B locks o2 then o1) form a lock cycle; Postgres aborts one with 40P01 and the route returns 500 for the whole batch, including rows that had already been processed in that transaction (rolled back).
- **Impact (plain English):** Rarely, when two people bulk-assign overlapping orders at the same time, one of them sees a generic error and none of their assignments stick; they must retry.
- **Evidence:**
  ```text
  staff-actions.ts:515 `for (const item of input.orders) { const current = await lockOrder(tx, input.workspaceId, item.orderId); ...`
  ```
- **Fix steps:**
  1. In apps/backend/src/orders/staff-actions.ts bulkAssign, replace `for (const item of input.orders) {` (line 515) with `const items = [...input.orders].sort((left, right) => left.orderId.localeCompare(right.orderId)); for (const item of items) {` so every transaction acquires order locks in the same global order.
  2. The response `results` array (contract bulkAssignOrderResultSchema carries orderId per row) will now be sorted by orderId; confirm the admin bulk-assign UI matches results by orderId rather than by index (apps/admin, search for 'bulkAssign' / 'results'); if it matches by index, map results back to the request order before returning: `return { status: 'assigned', results: input.orders.map((o) => results.find((r) => r.orderId === o.orderId)!) };`.
- **Acceptance criteria:** Unit/integration test: call bulkAssign with orders [o2, o1] and assert the audit rows are written in the order o1 then o2 (audit_events.created_at ascending) and the response still contains one result per requested orderId. Optional concurrency test as in the deadlock finding above with two bulkAssign calls on reversed lists completing without 40P01.
- **Risk of fix:** Low. Only the processing order changes; results remain per orderId. Check the admin's consumption of the results array as noted in step 2.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** The deadlock is theoretical under concurrent use; the admin's handling of result ordering was not read in this audit.

### [REL-35] EMAIL_CONTACT_HASH_SECRET is only checked at order-submission time, not at startup
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/orders/store.ts:404, apps/backend/src/email/hash.ts:24-30, apps/backend/src/server.ts:15
- **Problem:** requireContactHashSecret() throws when the variable is missing or shorter than 16 characters, and it is called lazily inside the submission transaction (store.ts:404) whenever the lead has an email. server.ts starts listening without validating it, so a deployment with the variable unset (new Railway environment, rotated/removed variable, local run) boots cleanly and only fails when a real customer submits an order, with a 500 'internal_error'.
- **Impact (plain English):** A misconfigured environment is discovered by the first customer who tries to order (every order with an email fails) rather than by the deploy failing to start.
- **Evidence:**
  ```text
  store.ts:404 `contactHash: hashContact(normalizeEmail(grant.leadEmail), requireContactHashSecret()),`; server.ts:15 `const server = createApp().listen(port, ...)` with no env validation; git grep shows no other call site at boot.
  ```
- **Fix steps:**
  1. In apps/backend/src/server.ts add `import { requireContactHashSecret } from './email/hash.js';` and, immediately before `const server = createApp().listen(port, ...)` (line 15), add `requireContactHashSecret();` so the process exits at boot with the existing clear message when the secret is missing or too short.
  2. Confirm apps/backend/.env.example (or the Railway variable list in docs/MIGRATION/RAILWAY_BACKEND.md) documents EMAIL_CONTACT_HASH_SECRET; add it if absent.
- **Acceptance criteria:** Run `EMAIL_CONTACT_HASH_SECRET= node apps/backend/dist/server.js` (or the tsx equivalent): the process must exit non-zero printing 'EMAIL_CONTACT_HASH_SECRET must be set to a value of at least 16 characters.' With a 16+ character value it must log 'backend listening'. Existing tests use createApp() directly and are unaffected.
- **Risk of fix:** Low. Makes the secret mandatory at boot for the Railway process; it is already mandatory for any order with an email, so production must already have it. vercelHandler.ts (serverless entry) is not covered by this change.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-36] TEST commission rules are allowed into live records whenever NODE_ENV is not exactly 'production' (fail-open guard)
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/partners/commission-rule.ts:81-87, apps/backend/src/partners/activation.ts:52
- **Problem:** ruleAllowedForLiveRecords returns true for an isTest rule unless nodeEnv === 'production'. DatabaseCommissionActivationHook captures process.env.NODE_ENV at construction. The production Dockerfile does set NODE_ENV=production (apps/backend/Dockerfile:30), so the guard works today, but any production-like run where the variable is unset or spelled differently (a Railway variable override, a one-off `node dist/server.js` against the production DB, a staging environment sharing rules) silently lets a $0 TEST placeholder rule create an immutable 'earned' commission line.
- **Impact (plain English):** If the environment variable is ever lost, a partner could be credited with a zero-dollar (or placeholder) commission that cannot be edited afterwards, and invariant 10's one-line-per-order rule means the correct amount can never be recorded for that order.
- **Evidence:**
  ```text
  commission-rule.ts:85-86 `if (!rule.isTest) return true; return nodeEnv !== 'production';`
  ```
- **Fix steps:**
  1. In apps/backend/src/partners/commission-rule.ts change ruleAllowedForLiveRecords to fail closed: `if (!rule.isTest) return true; return nodeEnv === 'test' || nodeEnv === 'development';`.
  2. Update the unit test for this function (search apps/backend/src/partners for 'ruleAllowedForLiveRecords' in a *.test.ts file) to assert `ruleAllowedForLiveRecords({ isTest: true }, undefined) === false` and `ruleAllowedForLiveRecords({ isTest: true }, 'test') === true`; apps/backend/tests/partners-commission.integration.test.ts already passes 'test' / 'production' explicitly (line 66, 295) and keeps working.
- **Acceptance criteria:** Unit tests above pass; `pnpm --filter @canadian-plans/backend test` green; partners-commission integration test 'a TEST rule never enters live records in production' still passes and a new case with nodeEnv undefined also yields feature_not_ready with 0 lines.
- **Risk of fix:** Low. Local developers running the backend without NODE_ENV set will now have TEST rules rejected at activation; set NODE_ENV=development locally.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-37] buildLogRecord lets free-form `extra` overwrite the bounded core log fields
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** packages/observability/src/index.ts:172-186
- **Problem:** `buildLogRecord` first builds `record` with `event`, `requestId`, `workspaceId`, `actorId` and `route` passed through `safeIdentifier`/`safeRoute` (which exist to keep unbounded or PII-bearing strings out of logs), then does `Object.assign(record, extra)` (line 184). Any key in `extra` with the same name replaces the bounded value, so a caller passing `extra: { route: req.originalUrl }` or `extra: { requestId: userSuppliedValue }` bypasses the bounding. `scrubRecord` only redacts by field name/email/phone shape, not by length or charset for these keys. No current caller does this (the only `extra` in the repo is `{ status, method }` at apps/backend/src/http/requestLog.ts:29), so this is a latent hazard rather than a live leak.
- **Impact (plain English):** A future log call that happens to reuse one of the five reserved key names in `extra` would silently put an unbounded (possibly PII-bearing, e.g. a URL with query string) value into the log line, defeating the invariant-12 guard. No user-visible effect today.
- **Evidence:**
  ```text
  index.ts:183-184 `const extra = scrubRecord(fields.extra); if (extra) Object.assign(record, extra);` after `record` was built from `safeIdentifier(...)`/`safeRoute(...)` at lines 173-179.
  ```
- **Fix steps:**
  1. In packages/observability/src/index.ts, function `buildLogRecord`, build the record so the bounded fields win: compute `const extra = scrubRecord(fields.extra) ?? {};` first, then `const record: LogRecord = { ...extra, event: safeIdentifier(fields.event) ?? 'unknown_event', requestId: ..., workspaceId: ..., actorId: ..., route: ... };` (same expressions as today), keep the `durationMs` block after it, and delete the `Object.assign(record, extra)` line.
  2. Add a unit test in packages/observability/src/index.test.ts (see acceptance).
- **Acceptance criteria:** New test: `buildLogRecord({ event: 'x', requestId: 'r1', extra: { route: '/a?email=a@b.co', requestId: 'not a safe id!' } })` returns `route === 'unknown'` and `requestId === 'r1'`. `pnpm --filter @canadian-plans/observability test` passes.
- **Risk of fix:** Low. Only changes precedence when keys collide; no caller currently collides, so existing log output is unchanged.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-38] The 10 s R2 request timeout also covers streaming a 10 MB candidate body during finalize
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** packages/adapters/src/r2-s3.ts:223, packages/adapters/src/r2-s3.ts:280-284, packages/adapters/src/r2-s3.ts:354-360, apps/backend/src/documents/config.ts:10
- **Problem:** S3R2DocumentStore.send() applies `AbortSignal.timeout(this.timeoutMs)` (default 10 000 ms) to every request, and the same signal governs reading the response body. verifyUpload() downloads the entire candidate object (up to MAX_DOCUMENT_BYTES = 10 MB) through readBoundedBody(). If the Railway→R2 transfer averages under ~1 MB/s the read aborts with a TimeoutError, which propagates as a thrown error from verifyUpload (not a rejection result), so the customer's finalize request fails with a 500 and the file stays claimed until retried.
- **Impact (plain English):** Large (close to 10 MB) ID document uploads could intermittently fail at the 'finalize' step on a slow network path, showing the customer an error even though the file was uploaded correctly.
- **Evidence:**
  ```text
  r2-s3.ts:354-360 `private send(url, init) { return this.fetchImpl(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) }); }` and r2-s3.ts:281-284 `const candidateResponse = await this.send(get.url, {...}); const candidate = await readBoundedBody(candidateResponse, input.maxBytes);`
  ```
- **Fix steps:**
  1. packages/adapters/src/r2-s3.ts, S3R2DocumentStore: add a fourth constructor parameter `private readonly bodyTimeoutMs = 60_000`.
  2. Change `send()` to accept an optional third argument `timeoutMs = this.timeoutMs` and use it in `AbortSignal.timeout(timeoutMs)`.
  3. In verifyUpload(), change the candidate GET call to `this.send(get.url, { method: 'GET', headers: get.headers }, this.bodyTimeoutMs)`.
  4. Add a unit test in r2.test.ts asserting the GET call's `init.signal` is still an AbortSignal (existing pattern at r2.test.ts:35).
- **Acceptance criteria:** Adapters tests pass; manual check: upload a ~9.9 MB PDF through the storefront document flow on production and confirm finalize returns 'available'.
- **Risk of fix:** Low. Only lengthens the ceiling for one server-side GET; HEAD/copy/delete keep 10 s.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-41] Marketing email omits List-Unsubscribe headers that mailbox providers expect from senders with an unsubscribe link
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** packages/adapters/src/messaging.ts:199-207, packages/adapters/src/messaging.ts:263-269
- **Problem:** The `abandoned_form_marketing` template puts the one-click unsubscribe URL only in the plain-text body. ResendEmailAdapter.send() never sets `headers.List-Unsubscribe` / `List-Unsubscribe-Post`, which Gmail and Yahoo require for bulk senders (RFC 8058 one-click) and which materially improves inbox placement and CASL compliance evidence. Resend's API accepts arbitrary `headers` in the send payload. Not currently exercised (no code enqueues `abandoned_form_marketing_email`), so this only matters once the follow-up emails are switched on.
- **Impact (plain English):** When marketing follow-ups start, they are more likely to land in spam, and the 'unsubscribe' button mail clients show will be missing, which hurts deliverability and looks non-compliant.
- **Evidence:**
  ```text
  messaging.ts:199-207 body contains `from, reply_to, to, subject, text, html, tags` only; messaging.ts:266-268 unsubscribe URL only inside `text`.
  ```
- **Fix steps:**
  1. packages/adapters/src/messaging.ts, ResendEmailAdapter.send(): compute `const marketing = messageClassForTemplate(message.template) === 'marketing' && message.unsubscribeUrl;` and add to the JSON body `...(marketing ? { headers: { 'List-Unsubscribe': `<${message.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {})`.
  2. Confirm the backend unsubscribe route accepts an HTTP POST with body `List-Unsubscribe=One-Click` (RFC 8058) in addition to GET; if it does not, omit the `List-Unsubscribe-Post` header until it does.
  3. Add a messaging.test.ts case sending template 'abandoned_form_marketing' with an unsubscribeUrl and asserting the Resend body has the `List-Unsubscribe` header; and a case for 'order_acknowledgement' asserting no such header.
- **Acceptance criteria:** New messaging.test.ts cases pass; send one marketing message to a Gmail test inbox and confirm the 'Unsubscribe' link appears next to the sender name.
- **Risk of fix:** Low. Headers are ignored by providers that do not use them; transactional mail is unchanged.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Check the unsubscribe route in apps/backend (grep 'unsubscribe' in apps/backend/src/routes) to see whether it handles POST before adding List-Unsubscribe-Post.

### [REL-49] Reconcile withdraws every product (and, under the 'immediate' policy, revokes every open quote) whenever the provider lists zero offers, with no safety threshold
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/catalogue/service.ts:353-359, apps/backend/src/catalogue/service.ts:389-415, apps/backend/src/catalogue/store.ts:553-594
- **Problem:** reconcile() takes listPublished() as the whole truth: products present in the DB but absent from the list are withdrawn one by one. An empty list (for the Sanity adapter: a correctly reachable but empty or wrongly named dataset; a GROQ `_type` rename; an accidental 'unpublish all') is indistinguishable from an intentional removal and wipes the storefront catalogue in one 5-minute tick, and under QUOTE_WITHDRAWAL_POLICY=immediate also revokes every unconsumed quote. The static catalogue cannot be empty today (StaticCatalogue throws on open inputs instead), so this only matters once Sanity is connected.
- **Impact (plain English):** A single CMS configuration mistake could remove every plan from the site and invalidate customers' in-progress quotes within five minutes, before anyone has a chance to notice.
- **Evidence:**
  ```text
  service.ts:389-391
    const known = await this.store.listProductKeys(workspaceId, actorId);
    for (const productKey of known) {
      if (!byProduct.has(productKey)) {
  ```
- **Fix steps:**
  1. In apps/backend/src/catalogue/service.ts reconcile(), immediately after `const published = await provider.catalogue.listPublished();` add: `if (published.length === 0) { const existing = await this.store.listProductKeys(workspaceId, actorId); if (existing.length > 0) throw new Error('reconcile_empty_catalogue'); }` so an empty listing against a populated workspace is recorded as a sync failure (surfaced by the catalogue-sync alert) instead of a mass withdrawal. Individual product removals still withdraw normally.
  2. Add a unit test in the catalogue service tests: provider returns [], store has two known product keys, assert reconcile throws reconcile_empty_catalogue and withdrawProduct is never called.
  3. Document in docs/RUNBOOKS/catalogue-sync.md how to intentionally empty a catalogue (withdraw products one at a time, or set CATALOGUE_ALLOW_EMPTY=1 if the owner wants an override; only add the env flag if the owner asks).
- **Acceptance criteria:** New test passes; existing reconcile tests (partial removal withdraws only the missing product) still pass.
- **Risk of fix:** Low. Prevents a legitimate 'remove all plans' operation from completing in one pass; it must be done product-by-product or with an explicit override.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-50] Backend Dockerfile used by Railway is never built in CI; only the tsup step is exercised
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/Dockerfile:14-28, railway.json:3-6, .github/workflows/ci.yml:75-82, scripts/affected-builds.mjs:96-108
- **Problem:** Railway builds the backend from apps/backend/Dockerfile (railway.json). CI builds the backend with `pnpm --filter backend run build` (tsup) via build:affected but never runs `docker build`. The Dockerfile hand-lists every workspace package.json to COPY (lines 15-24) before `pnpm install --frozen-lockfile`; adding a new workspace package (or renaming one) without updating that list makes the frozen-lockfile install fail inside Docker while CI stays green. The runtime stage copies the whole /repo and runs `node dist/src/server.js`, which also depends on tsup's output path — none of which is verified in CI.
- **Impact (plain English):** A change that passes every CI check can still fail to deploy on Railway (the known-context deploy stall is a separate platform issue, but once that clears, a Dockerfile drift would stall it again). The owner would only find out when the deploy fails.
- **Evidence:**
  ```text
  Dockerfile:15-24  COPY apps/backend/package.json apps/backend/ ... COPY packages/ui/package.json packages/ui/
  Dockerfile:25     RUN pnpm install --frozen-lockfile
  ci.yml:75-78      Build affected applications ... run: pnpm run build:affected   (no docker build step)
  ```
- **Fix steps:**
  1. In .github/workflows/ci.yml add a step after 'Build affected applications and their shared dependencies' (line 78): `- name: Build the backend container image (Railway build path)\n  if: contains(steps.affected.outputs.apps, 'backend') || github.ref == 'refs/heads/main'\n  run: docker build -f apps/backend/Dockerfile -t canadian-plans-backend:ci .` — if the conditional is too involved, run it unconditionally; the ubuntu-24.04 runner ships Docker.
  2. Add a smoke check in the same step: `docker run --rm canadian-plans-backend:ci node -e "require('node:fs').accessSync('dist/src/server.js')"` (runs in WORKDIR /repo/apps/backend) to prove the entrypoint file exists in the image.
  3. Do not push the image anywhere; this is verification only (no registry credentials in CI, per invariant 13).
- **Acceptance criteria:** CI job shows the docker build step succeeding. Temporarily add a new `packages/scratch/package.json` referenced from the workspace and open a PR without touching the Dockerfile: the docker build step must fail on `pnpm install --frozen-lockfile`.
- **Risk of fix:** Low. Adds roughly 3-6 minutes to CI. No production effect.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-52] Queue-health alert state lives in process memory, so it resets on every deploy/restart and is duplicated per replica
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/backend/src/scheduler.ts:285-299, apps/backend/src/jobs/queueMonitor.ts:21-25, docs/ADR/0004-backend-on-railway.md:124-126
- **Problem:** createDefaultSchedulerDependencies keeps `queueHealth` in a closure variable initialized to INITIAL_QUEUE_HEALTH_STATE. After any restart (every Railway deploy, crash or scale event) the 10-minute struggling window restarts and `alerted` is false, so if any failed/uncertain job exists the owner receives a fresh 'job_queue_stuck' alert about 10 minutes after each deploy. With more than one replica (the ADR notes the scheduler runs on each) each replica alerts independently.
- **Impact (plain English):** Alert noise after every deploy that trains the owner to ignore the job-queue alert; combined with never-cleared uncertain jobs this becomes a permanent false alarm.
- **Evidence:**
  ```text
  scheduler.ts:285 `let queueHealth = INITIAL_QUEUE_HEALTH_STATE;` with no persistence; ADR 0004:124-125 'If the service is ever scaled past one replica the scheduler runs on each replica.'
  ```
- **Fix steps:**
  1. In apps/backend/src/scheduler.ts runOutboxWithQueueMonitor, skip alerting when the backlog consists only of jobs older than the current process start: pass `processStartedAt = Date.now()` into createDefaultSchedulerDependencies and, in DatabaseOutboxStore.queueHealth (jobs/store.ts:97-121), add a `since?: Date` filter on `outboxJobs.updatedAt >= since` so only failures that happened or changed after boot are counted for alerting (keep a separate unfiltered count for the admin page).
  2. Alternatively (smaller): in trackQueueHealth callers, initialise `strugglingSinceMs` to `Date.now()` at boot only if the first observation is non-zero and require `backlog > alertedBacklog` where alertedBacklog starts at the boot-time backlog; i.e. in createDefaultSchedulerDependencies set `queueHealth = { strugglingSinceMs: undefined, alerted: true, alertedBacklog: Number.POSITIVE_INFINITY }` until the first observation, then replace alertedBacklog with that first observed backlog. This suppresses the re-alert for pre-existing failures while still alerting on growth.
  3. Add a queueMonitor unit test: boot with an existing backlog of 3 → no alert; backlog grows to 4 → alert.
- **Acceptance criteria:** Unit test passes; deploy the backend twice in staging while one failed job exists and confirm no 'job_queue_stuck' alert email is sent.
- **Risk of fix:** Low. Only affects when the alert fires, never the outbox processing itself.
- **Depends on:** REL-20 (Admin Jobs page loads every active/failed/unc…)ertain outbox job with no limit, and uncertain jobs are terminal with no resolution path, so the list and the queue alert never clear
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.

### [REL-54] Error tracker posts to Sentry's deprecated /store/ endpoint
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** apps/admin/src/lib/error-tracking.ts:59
- **Problem:** Events are sent to `https://<host>/api/<project>/store/?sentry_key=…&sentry_version=7`. Sentry has marked the legacy store endpoint deprecated in favour of the envelope endpoint (`/api/<project>/envelope/`); it still works today but is not guaranteed to.
- **Impact (plain English):** If Sentry retires the store endpoint, admin error reports stop arriving with no error visible anywhere (the fetch is fire-and-forget).
- **Evidence:**
  ```text
  error-tracking.ts:59 `const endpoint = \`https://${parsed.host}/api/${parsed.projectId}/store/?sentry_key=${parsed.publicKey}&sentry_version=7\`;`.
  ```
- **Fix steps:**
  1. Switch to the envelope format in `captureException`: build `const header = JSON.stringify({ event_id: event.event_id, sent_at: event.timestamp, dsn }); const item = JSON.stringify({ type: 'event' }); const body = `${header}\n${item}\n${JSON.stringify(event)}`;` and POST it to `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_key=${parsed.publicKey}&sentry_version=7` with `Content-Type: application/x-sentry-envelope`.
  2. Update error-tracking.test.ts to assert the envelope URL and body shape.
  3. Apply the same change to the backend/jobs tracker in packages/adapters if it uses /store/ (outside this audit's file list).
- **Acceptance criteria:** Trigger a test error in a preview deployment and confirm it appears in the `canadian-plans-admin` Sentry project; error-tracking.test.ts passes.
- **Risk of fix:** Low. Envelope endpoint accepts the same event JSON; only the wrapper changes.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Confirm current Sentry documentation status of the store endpoint before prioritising.

### [REL-56] Retention's S3 DELETE and the heartbeat overwrite assume B2 removes versions; without a bucket lifecycle rule nothing is reclaimed
- **Severity:** ⚪ Low
- **Category:** Reliability
- **Location:** jobs/src/backup/archive-store.ts:178-188, jobs/src/backup/heartbeat.ts:23-28, jobs/src/retention/run.ts:139-145, docs/RUNBOOKS/restore.md:209-226
- **Problem:** `S3ArchiveRetentionAdmin.deleteObject` issues an unversioned S3 DELETE and `runRetention` treats a 2xx/404 as deleted; `publishHeartbeat` PUTs the same key `heartbeat/latest.json` every day. Backblaze B2 buckets default to 'keep all versions': an unversioned DELETE creates a hide marker and every heartbeat PUT adds a version, so listing (ListObjectsV2, current versions only) looks clean while storage and cost keep growing. The runbook documents application-key capabilities but no lifecycle rule for the archive bucket.
- **Impact (plain English):** Storage bills keep rising after retention 'deletes', and customer data the policy says is gone still exists as hidden versions.
- **Evidence:**
  ```text
  archive-store.ts:179-183: `s3Send(this.config, { method: 'DELETE', key, headers: {} }, ...)` with no versionId; heartbeat.ts:27: `await writer.putObject(HEARTBEAT_KEY, ...)`
  ```
- **Fix steps:**
  1. Owner sets a lifecycle rule on the archive bucket (B2 console → Bucket → Lifecycle Settings): 'Keep only the last version' or 'delete hidden files after 1 day', and records it in docs/RUNBOOKS/restore.md under 'Upload the encrypted files...' (around line 209).
  2. Add a sentence to the same runbook section noting that with 'keep only the last version' a compromised writer key could overwrite an existing archive object, so the writer key must stay scoped to `listFiles`+`writeFiles` and the retention/monitor keys must remain separate (already the case).
- **Acceptance criteria:** After a real retention run with dry_run=false, the B2 console shows no hidden versions for deleted run prefixes and the bucket's stored bytes decrease; `heartbeat/latest.json` shows one version.
- **Risk of fix:** Low. Bucket configuration only; no code change.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.
- **[NEEDS VERIFICATION]** Check the archive bucket's Lifecycle Settings in the B2 console; the default behaviour described here is Backblaze's documented default but the owner may already have set a rule.

### [SEO-03] Page meta descriptions describe routes as 'preview' or mobile-only (/plans, /order, /order/*, site description)
- **Severity:** ⚪ Low
- **Category:** SEO
- **Location:** apps/site-1/content/metadata.ts:3,12-13,21-23,28
- **Problem:** pageDescriptions['/plans'] says 'Canadian Plans catalogue preview. Published offers are not yet available.' although /plans is the live catalogue; '/order' says 'Order a Canadian mobile plan.' although /order sells internet, mobile and pre-arrival; '/order/home-internet' and '/order/pre-arrival' say 'Preview the … form'; siteDescription and '/' describe only 'mobile connectivity'. These strings become <meta name=description> and Open Graph descriptions.
- **Impact (plain English):** Harmless while the site is noindex, but as soon as indexing is enabled search results will say 'Published offers are not yet available' under the plans page and under-describe the home page.
- **Evidence:**
  ```text
  metadata.ts:21  '/plans': 'Canadian Plans catalogue preview. Published offers are not yet available.',
  metadata.ts:23  '/order': 'Order a Canadian mobile plan.',
  ```
- **Fix steps:**
  1. apps/site-1/content/metadata.ts: '/plans' → 'All Canadian Plans offers: home internet and TV by province, bring-your-own-device mobile plans and pre-arrival eSIM plans, with prices.'; '/order' → 'Order a home internet, mobile or pre-arrival eSIM plan. Nothing is paid online.'; '/' → 'Canadian phone, pre-arrival eSIM and home internet plans for newcomers and residents, from an authorized dealer in Surrey, BC.'; siteDescription (line 28) → the same as '/'.
  2. Leave '/order/home-internet' and '/order/pre-arrival' as 'Preview' only if those routes stay noindex design previews; otherwise describe the form.
- **Acceptance criteria:** View source of /plans and /order: meta description no longer contains 'preview' or 'not yet available'.
- **Risk of fix:** Low. None.
- **Depends on:** None
- **Verification status:** Found by an area auditor reading the code; not independently re-verified.


---

## 5. Fix Order (Execution Plan)

There are no Critical findings. Phase 1 therefore holds the items that block other fixes or that are actively harmful on the live site today; everything else follows severity.

### Phase 1 — unblock and stop the bleeding (do first, in this order)

1. **REL-26** (Vercel `ignoreCommand` cancels same-commit redeploys) — without this, env-only fixes below never reach production.
2. **SEC-03, SEC-04, BUG-07, BUG-08, BUG-09, BUG-12** — remove fabricated/unverified claims, placeholder testimonials, editor notes and "awaiting content" FAQ answers from live pages (content-only edits).
3. **SEO-01, SEO-02** — make indexability and canonical URL come from `NEXT_PUBLIC_SITE_URL` + `VERCEL_ENV` instead of hard-coded `noindex`; then set the env var and redeploy (owner action, section 8).
4. **REL-01** (trust proxy + per-credential bootstrap bucket), **PERF-01** (pool size), **BUG-01** (enqueue status/dispatch/activation emails), **REL-02** (synthetic check side effects).
5. **SEC-01, SEC-02, REL-03** — backup workflow: pin the action, split the recovery key from the delete-capable credential, make the Sanity export optional until Sanity is connected.

After Phase 1 run:
```bash
pnpm run typecheck && pnpm run lint && pnpm run format && pnpm run test
```
```bash
pnpm --filter backend test -- website-auth scheduler synthetic-check orders-transitions
```
```bash
pnpm --filter site-1 run build && pnpm --filter site-1 run test:e2e
```
Then on the deployed site: `curl -sI https://canadianplans.com | grep -i x-robots`, view source of `/` and confirm `<link rel="canonical" href="https://canadianplans.com/">` and no `noindex`; `https://canadianplans.com/sitemap.xml` lists the commercial pages.

### Phase 2 — remaining High

BUG-01, PERF-01, REL-01, REL-02, REL-03, SEC-01, SEC-02, SEC-03, SEC-04, SEO-01, SEO-02 (any not already done in Phase 1).

Verify: same commands as Phase 1, plus `git diff --exit-code -- docs/api/openapi.json` after `pnpm --filter @canadian-plans/contracts build`.

### Phase 3 — Medium

A11Y-01, BUG-02, BUG-03, BUG-04, BUG-05, BUG-06, BUG-07, BUG-08, BUG-09, BUG-10, BUG-11, BUG-12, BUG-13, BUG-14, BUG-15, BUG-16, BUG-17, CQ-01, CQ-02, CQ-03, CQ-04, PERF-02, PERF-03, REL-04, REL-05, REL-06, REL-07, REL-08, REL-09, REL-10, REL-11, REL-12, REL-13, REL-14, REL-15, REL-16, REL-17, REL-18, REL-19, REL-20, REL-21, REL-22, REL-23, REL-24, REL-25, REL-26, REL-27, REL-28, REL-29, REL-30, REL-31, REL-32, REL-33, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, SEC-12, SEC-13, SEC-14, SEC-15, SEC-16, SEC-17, SEC-18, SEC-19, SEC-20, SEC-21, SEC-22

Suggested grouping inside Phase 3: (a) backend reliability/observability first (REL-07, REL-12, REL-14, REL-15, REL-08, REL-13, REL-29 and the Turnstile-order fix SEC-06), (b) staff security (aal2 bypass, lead PII to all roles, unaudited download links, admin CSP/localStorage), (c) order-flow correctness (consent version, idempotency conflict UX, single-click irreversible actions), (d) content and email copy, (e) database/TLS/retention, (f) docs that would make the owner misconfigure production.

Verify after Phase 3:
```bash
pnpm run typecheck && pnpm run lint && pnpm run format && pnpm run test:tooling && pnpm run test && pnpm run build
```
```bash
pnpm run test:e2e
```

### Phase 4 — Low (optional)

A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07, A11Y-08, A11Y-09, ARCH-01, ARCH-02, BUG-18, BUG-19, BUG-20, BUG-21, BUG-22, BUG-23, BUG-24, BUG-25, CQ-05, CQ-06, CQ-07, CQ-08, CQ-09, CQ-10, CQ-11, CQ-12, CQ-13, CQ-14, CQ-15, CQ-16, CQ-17, CQ-18, CQ-19, CQ-20, CQ-21, CQ-22, CQ-23, CQ-24, CQ-25, CQ-26, CQ-27, CQ-28, CQ-29, CQ-30, CQ-31, CQ-32, CQ-33, CQ-34, CQ-35, CQ-36, CQ-37, CQ-38, CQ-39, CQ-40, PERF-04, PERF-05, PERF-06, PERF-07, PERF-08, PERF-09, REL-34, REL-35, REL-36, REL-37, REL-38, REL-39, REL-40, REL-41, REL-42, REL-43, REL-44, REL-45, REL-46, REL-47, REL-48, REL-49, REL-50, REL-51, REL-52, REL-53, REL-54, REL-55, REL-56, REL-57, SEC-23, SEC-24, SEC-25, SEC-26, SEC-27, SEC-28, SEC-29, SEC-30, SEO-03, SEO-04, SEO-05

Verify after Phase 4: the Phase 3 commands.

---

## 6. Optional / Needs Owner Approval

Do **not** do these without the owner's sign-off. They are bigger than a small safe fix, or they change business behaviour.

- **SEC-04** Unverified 'in-store' comparison prices and savings claims presented as fact on live pages — the owner must either supply the source and date for each in-store price (then keep the claims and add a dated footnote) or drop them. Until then remove the claims as follows.
- **BUG-13** 'No credit check' / 'no Canadian credit history needed' for postpaid pre-arrival plans is not backed by the catalogue or Terms — confirm with the owner (and the canadaesim terms) that no credit check is performed for the pre-arrival Fido/Rogers postpaid plans.
- **BUG-15** Site promises WhatsApp confirmation and 'Chat on WhatsApp' buttons everywhere, but no WhatsApp number exists and the buttons open a 'UI preview' dialog — ask the owner for the WhatsApp Business number (E.164). If supplied, add `whatsappHref: 'https://wa.me/<digits>'` to apps/site-1/content/contact.ts next to `callHref` (line 140) and make the WhatsApp option in apps/site-1/src/components/contact/interactive.tsx open that link instead of the preview dialog; point site-chrome.ts line 47 `social[0].href` at the same URL.
- **CQ-01** Admin order-processing UI (list, detail, transitions, dispatch, activate) has no browser test; only jsdom component tests with the API client mocked — this is a new test harness seam, roughly one to two days of work. Add an env-gated e2e session seam to the admin (e.g. when `NEXT_PUBLIC_E2E_STAFF_BEARER` is set at build time AND the host is 127.0.0.1, `apps/admin/src/components/staff-session-provider.tsx` returns a session whose access token is that bearer instead of calling Supabase; the seam must be compiled out when the variable is absent so it can never exist in a production build).
- **PERF-03** The entire snapshot (all DB dumps, every R2 document, the Sanity tarball, plus their ciphertexts) is held in runner memory at once — this is a structural change of about half a day. In jobs/src/backup/run.ts move encryption and upload of each R2 object into the loop at lines 94-109 (encrypt+put immediately after the checksum passes, keep only `manifestArtifact(name, bytes)` and the key in memory, drop the plaintext), and do the same for each DB dump right after it is produced. Keep the rule that the manifest and heartbeat are written last, so a partial run still never looks successful; retention already deletes abandoned prefixes.
- **REL-33** The live Contact page's 'Message us' and 'Track your order' forms are UI stubs that discard every submission — wiring the message form needs a backend endpoint that writes an outbox row (invariant 7) to email info@canadianplans.com with Turnstile verification and rate limiting; effort about half a day. Until then, choose the interim option in step 2.
- **SEC-16** 'No contract on anything' claims conflict with the catalogue's 2-year price lock, 15-day trial and provider service agreement — ask the owner whether any internet or BYOD mobile plan carries a term commitment with the provider. Until answered, make the homepage match the FAQ wording that is already live:
- **SEC-17** Provider naming is inconsistent: site-wide 'Authorized Rogers, Fido & Chatr dealer' and 'Rogers' internet copy versus catalogue/Terms that leave the internet and mobile provider unnamed — ask the owner one question: 'Is the internet/TV and BYOD-mobile provider Rogers (so we may say so), or must it stay unnamed as on Canada Wide?'
- **SEC-18** Fictional author and reviewer personas ('Ananya R.', 'Priya') published as real people, including in Article JSON-LD and Open Graph — confirm whether Ananya R. and Priya are real, consenting people. If not:
- **SEC-22** Content-Security-Policy allows 'unsafe-inline' scripts and any https connect/img origin, which defeats most of its XSS protection — moving the CSP to a nonce-based middleware forces every storefront page to render dynamically (no static caching) and needs a regression pass of Turnstile, Umami and the Studio; effort roughly one day.
- **CQ-28** Response-time promises differ across pages (1 business day, 2 business days, 'in minutes', 'same day', '< 2 hrs') — OWNER APPROVAL (one-line decision): pick one email reply promise and one confirmation promise.
- **REL-42** HttpDeletionLedger is a bearer-token PUT seam, not the append-only SigV4/object-lock ledger the design calls for — decide the real ledger target (a dedicated B2 bucket with object lock and a write-only application key, per IMPLEMENTATION_PLAN §13). Effort: about half a day.

Additional recommendations (not findings with fix steps, because they change scope):

- **Remove or gate the design-preview routes** `/order/pre-arrival`, `/order/home-internet` and `/track-order` in production (return 404 unless `VERCEL_ENV !== 'production'`, exactly as `/dev/components` already does). They collect passport/permit files and addresses into browser storage and show "order confirmed" screens that create no order. Effort: ~1 hour. Risk: links from marketing pages must be re-pointed to `/order?...`.
- **Delete the legacy Vercel backend entry** (`apps/backend/api/`, `apps/backend/vercel.json`, `src/vercelHandler.ts`, `scripts/write-vercel-handler-dts.mjs`) now that the backend runs on Railway, so a stray Vercel project cannot deploy a second API with its own secrets. Effort: ~1 hour plus one CI run.
- **Move `sanity` out of `@canadian-plans/contracts` runtime dependencies** (only `defineType/defineField` and one type are used) so the backend Docker image stops shipping the Sanity CLI, Vitest and the `braces`/`sprintf-js` advisories. Effort: half a day (introduce `packages/contracts/src/cms` as a `peerDependency` or move the schema types next to the Studio in site-1).
- **Supabase plan.** The owner chose to stay on Free. Free projects pause after 7 days of inactivity and have no point-in-time recovery; combined with REL-03 (backup cannot run) this is the single largest data-loss exposure. Decision needed before real orders.
- **Rate-limit design.** Even after REL-01, the whole storefront shares one credential bucket (300/min). Raising the ceiling per deployment is a config change; a per-visitor design is a small backend change and should be scheduled before any paid traffic campaign.
- **Make `instrumentation.ts` live in admin** (it is outside `src/` so Next never loads it): a one-line move, but it changes what gets reported to Sentry, so confirm with the owner.

---

## 7. Instructions for the Fixing AI

- Read sections 1 and 5 first. Follow the **Fix Order exactly**; inside a phase keep the listed order.
- Before touching code read `AGENTS.md`, `PLATFORM_CONTEXT.md` §4 (invariants) and `.agents/skills/project-workflow/SKILL.md`. Never violate an invariant to make a test pass.
- **One issue per commit**, commit message `fix(<area>): <summary> [<ID>]`, e.g. `fix(backend): trust Railway proxy for pre-auth rate bucket [REL-01]`.
- **Smallest change only.** Do not refactor, rename, reformat unrelated code, upgrade dependencies, or add libraries. If a fix step says "OWNER APPROVAL", stop and ask.
- Every finding's **Acceptance criteria** is the definition of done for that commit. Add the test it names; never delete or weaken an existing test.
- Run the verification commands at the end of each phase. Prettier on Windows reports CRLF noise on unchanged files; CI uses LF, so judge by CI, and run `pnpm run format:fix` only on files you changed.
- Content changes (`apps/site-1/content/*.ts`) must only remove or neutralise claims; do not invent new prices, reviews, timings or guarantees. Where a claim needs a real value, replace it with the catalogue value or remove the sentence and list it in your PR for the owner.
- Any production change outside the repo (env vars, Railway/Vercel settings, GitHub secrets, DNS, Supabase) is the owner's: write exactly what to set and stop.
- Findings marked **[NEEDS VERIFICATION]** must be confirmed as described before the fix is applied; if the check fails, skip the fix and report it.
- Stop and ask the owner before anything in section 6, or if a fix turns out to touch more files than its steps list.

---

## 8. Manual Checklist for Owner

Things only you can do or confirm (none of this is code):

**Production configuration**
- [ ] Vercel → site-1 → Environment Variables: `NEXT_PUBLIC_SITE_URL=https://canadianplans.com` is set for Production (it is), **and** a new build has run since (PR #24 does that). After SEO-02 ships, check `view-source:https://canadianplans.com` has no `noindex`.
- [ ] Railway → backend: click **Deploy latest commit** (the service still runs the 20 Oct code). Then open `https://canadianplans.com/order` and confirm plans are listed.
- [ ] Railway → backend variables: `TRUST_PROXY_HOPS=1` (new, from REL-01), `QUOTE_WITHDRAWAL_POLICY` set to your decision, `ORDER_OPERATIONAL_TRANSITIONS=1` (set), `EMAIL_PROVIDER=resend`, `OWNER_ALERT_EMAIL=<your address>`, `SYNTHETIC_*` either fully provisioned per REL-13 or left unset.
- [ ] Confirm with Railway docs/support that the container sees the proxy address (REL-01 [NEEDS VERIFICATION]).
- [ ] Supabase: decide Free vs Pro (section 6). On Free, open the dashboard at least weekly so the project is not paused.
- [ ] GitHub → Settings → Secrets: after SEC-01/SEC-02, remove `RECOVERY_PRIVATE_KEY` from repository secrets and keep it only in the password manager / escrow; rotate the B2 keys the retention job used.
- [ ] Run the backup workflow manually once REL-03 is fixed and confirm an archive appears in B2; then run the restore rehearsal in `docs/RUNBOOKS/restore.md`.

**Content and legal (you must approve, not the AI)**
- [ ] Google rating badge: either connect a real Google Business profile with real reviews or keep it removed.
- [ ] "In-store" comparison prices and "Save up to $40/mo": supply a dated source or keep them removed.
- [ ] Testimonials: provide real, consented customer quotes or keep the section hidden.
- [ ] WhatsApp: either get a business WhatsApp number and give it to the fixing AI, or approve removing every "Chat on WhatsApp" promise.
- [ ] Provider wording ("Authorized Rogers, Fido & Chatr dealer", "Rogers network", "No contract", "No credit check"): confirm each with your dealer agreement or approve its removal.
- [ ] Response-time promise: pick one (the site currently says five different things).
- [ ] Privacy and Terms: lawyer review is still pending (launch task 2.10); the order flow records `terms-2026-10-v2`.
- [ ] Physical SIM option in the order form (BUG-11): you decided no shipping; confirm the option should go.

**Operational habits**
- [ ] Add yourself to the Sentry alert rules for both projects and confirm you receive an email for a test event.
- [ ] After the backend deploy, place one real test order end to end (launch task 5.2) and check you receive the "order received" email **and** a status email after dispatch/activation (BUG-01).
- [ ] Monthly: open `pnpm audit --prod` output in CI (once added) and the Supabase/Resend/Railway usage pages.

**Known gaps of this audit** (not covered, worth a follow-up pass): dependency end-of-life timeline (Node 22 → April 2027, Next 16, Sanity 6), provider free-tier limits (Resend daily cap, Vercel function duration vs backend timeouts, Railway restart policy after 3 failures), and a systematic env-default review beyond what the other auditors reported.
