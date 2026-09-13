# Canadian Plans — Multi-Website Business Platform Implementation Plan
Engineering architecture, delivery sequence, AI-build conventions, and operating procedures
Version 3.2 | 14 September 2026 | Owner: Takib (sole approver and deployer)

# 0 Document control

| **Item** | **Value** |
| --- | --- |
| Implements | Requirements v2.3 (REQ 01–51). Section 19 maps every REQ to a milestone and an acceptance gate. |
| Builder | Takib with AI coding agents (Claude Code and similar) using available Supabase, Vercel, Sanity, Cloudflare, email-provider, tracker and shadcn tools |
| Phase A target | Backend + admin + website 1 (SIM plans); preserve scope and launch when gates pass. Initial capacity target: 100 orders/day. |
| Status | Reviewed baseline. Technical alternatives require a rationale; business rules remain owner decisions. See docs/ADR/0000-reviewed-planning-baseline.md. |

| **Version** | **Date** | **Change** |
| --- | --- | --- |
| 1.0 | 9 Sep 2026 | Initial draft |
| 2.0 | 9 Sep 2026 | Reframed for Canadian Plans; Phase A/B milestones; Canada region; observability; AI-build conventions; commission/invoice model; traceability matrix |
| 3.0 | 12 Sep 2026 | **Split architecture: standalone Express (strict TS) backend as the only DB client; admin and each storefront are separate frontend apps; one pnpm monorepo with shared workspace packages (no published registry); Sanity Studio embedded per site; strict types and DRY single-source-of-truth; Vitest+Playwright across all apps; backend runs as Vercel functions** |

| 3.1 | 14 Sep 2026 | Technical audit corrections, owner decisions, executable dependencies, scoped machine identities, consistent retry/upload/quote flows, standard recovery baseline and conditional SES selection. |

| 3.2 | 14 Sep 2026 | Company name confirmed as Canadian Plans; align planned repository/package/resource identifiers. |

# 1 Delivery strategy

Build one shared **Express backend** (strict TypeScript) and several **Next.js frontends** — the staff **admin** and one storefront per brand — on Vercel, in one pnpm monorepo. Use one Supabase production project (Canada region) for business records and staff/partner identity, one Sanity project per website (Studio embedded in that website), and one private Cloudflare R2 bucket per website. Every business record is owned by a workspace, so the same software runs for one website or many.

The backend is the **only** app that touches the database. It exposes a versioned API with internal modules for workspaces, catalogue, leads, orders, documents, communications, partners, integrations, and recovery. The admin and every storefront are pure clients of that API. This keeps a hard boundary — data logic in one place, presentation in others — without microservice overhead, and lets a frontend be rebuilt or rebranded without touching business rules.

Deliver in working vertical slices, in two phases. **Phase A** ships the backend, the admin, and website 1 when its evidence gates pass: identity and isolation first, then one complete lead-to-order journey with real CMS pricing and documents, then email, partner attribution, analytics, backup, and hardening. **Phase B** adds websites 2 and 3, the partner portal, invoicing automation, hourly backups, export/import, and external adapters. Anything not in Phase A is disabled behind a feature flag, not half-built.

Everything is built by AI agents under one operator. The plan spends its effort on boundaries, conventions, shared types, and tests that let an agent work one bounded task at a time without reconstructing the architecture. Section 18 is the contract every task follows.

# 2 Architecture and ownership

| **Component** | **Deployment boundary** | **Responsibility** |
| --- | --- | --- |
| backend | One Vercel project (Express as functions) | The only DB client; `/api/v1`; authorisation; business rules; job processing |
| admin | One Vercel project (Next.js) | Staff UI; calls the backend API; holds staff session; no DB access |
| site-1, 2, 3 | One Vercel project each (Next.js) | Branding, public rendering, order form, embedded Sanity Studio; calls the backend API |
| Sanity 1, 2, 3 | One Sanity project per site (Free), Studio embedded at `/studio` | Editorial content, products, published offers, public images |
| Supabase | One project, Canada region | PostgreSQL records and Supabase Auth for staff and (Phase B) partners |
| R2 | One private bucket per website | Immutable document objects and attachments |
| EmailAdapter | External; SES preferred candidate | Transactional and follow-up email, per-website sender identity; selection requires production approval and delivery tests |
| Umami | External or self-hosted | Analytics, one site ID per website |
| Error tracking | External (free tier) | Exceptions, request traces |
| Recovery | Separate account and scheduled runner | Encrypted database, content, and file archives with verification |

Browsers never receive database credentials, workspace service secrets, R2 tokens or Sanity write tokens. Frontend servers hold no database credentials, R2 tokens or Sanity write tokens; a storefront server may hold only its own scoped backend service credential in a server-only module. Keep public site configuration separate from server secrets. Public content may be read from Sanity's CDN; **every** operational request — from a storefront or from the admin — goes through the backend API. Each storefront authenticates to the backend with a credential restricted to that website and to public-form actions. The admin authenticates with a staff Supabase session that the backend verifies on every request.

The admin is the CRM. Supabase Studio is an engineering tool. Sanity Studio is the editorial interface, embedded in each storefront at `/studio`. Their logins are independent.

Region: Supabase project and Vercel function region in Canada. Sanity and R2 are global; R2 jurisdiction restriction is applied where offered.

**Serverless note:** the backend runs as Vercel functions, so it holds no state between requests, connects to Postgres through the **pooled** connection (Supavisor, transaction mode), and does background work through Vercel Cron + the outbox rather than a long-lived worker process.

# 3 Repositories and code organisation

**One private pnpm monorepo** holds every app and every shared package. Shared code is consumed as workspace packages (`workspace:*`), never published to an external registry. Each Vercel project points at one `apps/*` directory.

| **Location** | **Contents** |
| --- | --- |
| apps/backend | Express + TS. `/api/v1`. The only importer of `@canadian-plans/db`. Deploys as Vercel functions. Vercel Cron routes for jobs. |
| apps/admin | Next.js admin (shadcn/ui). API client only. Holds staff Supabase session. |
| apps/site-1 (2, 3) | Next.js storefront: public pages, coded order form, site config, embedded Sanity Studio at `/studio`, CMS schemas. API client only. |
| packages/types | `@canadian-plans/types` — shared domain TypeScript types. |
| packages/contracts | `@canadian-plans/contracts` — Zod request/response schemas, error envelope, generated OpenAPI, typed API client, and browser-safe CMS schema definitions under an explicit `cms` export. No provider secrets/SDK clients. |
| packages/db | `@canadian-plans/db` — Drizzle schema, checked-in SQL migrations, RLS policies, `withTenantTx` helper. Imported **only** by `apps/backend`. |
| packages/adapters | Server-only Sanity/R2/email/delivery/payment/analytics adapters and fakes. Explicit exports and import rules prevent provider implementations entering browser bundles. |
| packages/ui | `@canadian-plans/ui` — shadcn-based shared components and tokens for frontends (no content, no brand). |
| packages/config | `@canadian-plans/config` — shared tsconfig, eslint (incl. import-boundary rules), vitest, prettier presets. |
| jobs | Outbox handlers invoked by backend cron; separately authorized offline backup/restore/retention/provisioning/extraction tooling. |
| docs | ADRs, setup, API docs, schema history, env descriptions, runbooks, evidence, workspace manifests. |

Toolchain: pnpm workspaces; Drizzle for typed PostgreSQL; Zod for runtime schemas; Vitest for unit/component/integration; Playwright for critical journeys in every frontend; ESLint and **TypeScript strict with `noImplicitAny` and `any` banned by lint**. Pin versions and lockfile after checking current docs at setup.

**Boundary rules (lint-enforced):** only `apps/backend` among business apps may import `@canadian-plans/db` or open a database connection. Allowlist the defining DB package and offline migration/backup/restore/test tooling separately. Frontends use browser-safe contracts/types/UI and Supabase Auth session clients; Auth clients cannot perform DB/Storage operations. A frontend needing business data calls a backend endpoint.

**DRY / single source of truth:** domain types and Zod schemas live in `@canadian-plans/types` and `@canadian-plans/contracts`; Drizzle row types in `@canadian-plans/db` are the source for persistence types; request/response schemas derive from or are validated against them. Where a derivation can't be expressed in types alone, add a small codegen script rather than hand-copying. No app redefines a type a package already owns.

# 4 Data model and invariants

Every tenant-owned row carries workspace_id, including joins, file records, integration events, commission lines, invoices, and jobs. Global rows are limited to platform identities and the workspace registry.

| **Entity group** | **Main records** | **Invariant** |
| --- | --- | --- |
| Workspace and access | workspaces, memberships, roles, permissions, service credentials | Every action has a verified actor and allowed workspace |
| Catalogue | products, offer versions, quotes | Stable product identity; immutable commercial versions carrying document checklist and payment setting |
| Acquisition | leads, draft grants, attribution | One draft resumed through its scoped grant; UTM and partner code stored |
| Orders | orders, items, status history, amendments, change requests, dispatch records, payment records | One order per submission key; original terms retained; terms version stored |
| Documents | files, revisions, attachments, review events | Every object belongs to one workspace and one record |
| Operations | notes, assignments, reminders, audit events | Actor, timestamp, ownership attributable |
| Partners | partners, referrals, commission lines, invoices, invoice lines | Commission created on activation with stored rule; one invoice per partner per period |
| Integrations | inbox events, outbox jobs, attempts, email messages | Duplicate delivery never duplicates a business effect |
| Recovery | backup manifests, export jobs, reconciliation reports | Completeness demonstrated before success is declared |

Use UUID primary keys, UTC timestamps, ISO currency codes, and integer minor-unit amounts. Use composite foreign keys (workspace_id, id) so a child cannot reference another workspace's parent. Index by workspace_id first, then status, created_at, assignee, or partner_id.

Keep the order envelope relational; store plan-specific details in a versioned, validated JSONB payload whose shape is a Zod schema in `@canadian-plans/contracts`. Promote fields to columns when they become filters. An order has independent fulfilment, payment, delivery, commission, and archive dimensions; transitions go through explicit functions, not arbitrary status writes. Staff edits carry an expected record version and return a conflict on mismatch.

No cross-brand customer table. Contact data stays in its workspace with permission-aware search. Keep CMS IDs and revision references on snapshots so history is explainable.

Commission model: an activation event inserts a commission line with (order, partner, rule_id, rule snapshot, amount, currency, state = earned). State moves earned → carrier_paid → partner_paid through audited Finance actions. Phase A records earned and carrier-paid states. Partner-paid actions stay disabled while OPEN_INPUTS #18 is unresolved and invoice approval is unavailable; do not invent an interim approval policy. Invoice generation selects earned/carrier_paid lines for a partner and period into a draft invoice; lines link to exactly one invoice; approval freezes it; regeneration for an approved period is a no-op.

# 5 Authentication and workspace isolation

## Staff requests (admin → backend)

The admin holds a Supabase Auth session. It sends that session to the backend on every call. The backend verifies the session server-side, then reads current membership, roles, and individual permissions from the database on every protected request — no role claim in the token is trusted. Require MFA for Owner and Finance. Revocation takes effect on the next request. The admin never talks to Supabase Auth for anything except obtaining/refreshing the session; all authorisation happens in the backend.

Partners (Phase B) are Supabase Auth users with a partner membership type and an ownership predicate on their own records. Customer tracking uses a separate short-lived grant after email one-time-code verification. Bind each challenge to workspace, order and normalized email; store a keyed hash of a cryptographically random code, expire after 10 minutes, cap attempts at five, invalidate on resend, and atomically consume on success. Issue a scoped 30-minute grant. Apply per-IP and per-challenge issuance/verification limits and identical public responses for unknown recipients; never log codes or grants.

## Public website requests (storefront → backend)

Each storefront server uses its own revocable service credential; the backend derives workspace from that credential. Client-supplied workspace IDs, Host, Origin, or CORS are never authentication. The website credential can create or resume its own drafts and request quotes; it cannot list records or perform staff actions. Scoped draft tokens and idempotency keys prevent one customer reaching another's draft. Bot protection and rate limits apply at storefront and backend; CSRF on cookie-authenticated mutations.

## Database enforcement

Dedicated non-owner runtime role without BYPASSRLS; migrations and emergency access on separate credentials. RLS enabled on all operational tables with explicit policies. Because the backend runs serverless over the transaction-mode pooler, **each unit of work is a transaction that sets transaction-local workspace and actor context (`SET LOCAL`) after authorisation**; missing context denies. Never session-wide settings. Never a service-role client in application code. Aggregates and jobs operate over an explicit authorised workspace set.

Machine bootstrap follows PLATFORM_CONTEXT §4b: a server-only registry maps webhook selectors to one account/workspace/verification key and scheduler identities to an explicit workspace/scope set. Authenticate before setting tenant context; reject unregistered/revoked identities and account mismatches. No broad cross-tenant database scan is needed.

Public abuse controls reject oversized requests and apply edge/bot checks before database work. A durable Postgres rate limiter may use bounded per-key buckets initially: short lock timeouts, expiry cleanup, no global hot counter, and measured saturation tests. Distinguish transport abuse limits from new-order limits: authorized completed-order retries bypass new-submission quotas, but not authentication or general abuse protection.

Launch gate: negative tests for altered workspace IDs, foreign record and attachment IDs, removed memberships, expired draft tokens, role escalation, missing database context, and pooled-connection context reuse.

# 6 Sanity content and commercial synchronisation

## Project and schema design

One Sanity project per website, **Studio embedded in that Next.js site** using the official `next-sanity` setup (Studio mounted at `/studio`, Free plan; content staff hold Administrator). Share schema code through the monorepo (`packages/contracts/src/cms/schema-types` is the source of truth); content stays local to each project. Document types: siteSettings, navigation, page, countryPage, post, product, offer, redirect. Page sections are a versioned discriminated union with validation.

Offer documents carry the operational settings the platform needs: paymentRequired (boolean), amountPayableToday, documentChecklist (array of document types), eligibility, availability, billing party, and plan specifications. These are validated on sync and copied into offer versions.

Public editorial images live in Sanity. Never store customer data, identity documents, secrets, or supplier details in Sanity. Draft preview is restricted to authenticated editors on allowlisted routes with caching disabled.

Register a signed webhook per project to the backend inbox. After durable acceptance, dispatch synchronisation and call the website's authenticated revalidate endpoint. Periodic reconciliation (proposed five minutes) repairs missed events.

## Offer synchronisation

On an event, the backend fetches the current published document from Sanity's API rather than trusting the event body. Validate, identify the product by stable CMS ID, and create a new immutable offer version keyed by a canonical commercial-content hash. Persist CMS revision provenance separately and enforce uniqueness on workspace, product and content hash. Serialise processing per workspace and product with a lease. Duplicate and out-of-order webhooks converge on the latest published state. Unpublish marks the offer unavailable for new quotes; history remains.

Checkout always calls the backend, which performs a fresh published-offer read outside a database transaction when issuing a quote. Validate and hash that exact payload, then atomically upsert/select its matching immutable version and insert the quote in one short scoped transaction. The quote's fields and version must come from the same payload even when webhooks lag. Keep availability/revocation in separate mutable records; immutable offer history is not edited on unpublish. If that read fails, the form offers an unpriced callback lead.

## Quote and order consistency

Persist a quote with workspace, product, offer version, charge components, terms, document checklist, payment setting, expiry (proposed 15 minutes), and draft linkage. Validate at acceptance that it belongs to the same draft and workspace, is unexpired, and satisfies the owner-selected withdrawal policy. OPEN_INPUTS #14 is unresolved: exercise both policies in TEST configuration and keep production priced checkout disabled until selected. Withdrawal always blocks new quotes; whether existing quotes survive is not silently decided by code. Accepting the form copies all commercial fields into the order snapshot; payment amounts derive only from that snapshot.

Test: publication during checkout, expired quotes, withdrawn offers, stale webhooks, duplicate events, CMS outage.

# 7 API contracts and order processing

The backend exposes `/api/v1` with documented validation, error codes, request IDs, and authorisation. Every schema is a Zod schema in `@canadian-plans/contracts`; the typed client and OpenAPI are generated from them, so frontends and backend never drift. Version payloads and form schemas; add before removing; keep old behaviour until all websites migrate.

| **Endpoint family** | **Purpose** | **Caller** |
| --- | --- | --- |
| POST /leads, PATCH /leads/:id | Save or resume a draft with attribution | Website credential + draft grant |
| POST /quotes | Issue a validated quote | Website credential |
| POST /orders | Accept one final submission with terms version | Website credential + draft grant + idempotency key |
| GET/PATCH /workspaces/:id/orders | Staff list, detail, transitions, dispatch, activation | Staff session with workspace and action permission |
| POST /uploads/intents, POST /uploads/:id/finalize | Authorise and verify an attachment | Customer grant, partner, or staff |
| POST /files/:id/download-link | Short-lived signed GET | Actor with document permission on the parent record |
| POST /partners/:id/commissions, /invoices | Commission state changes; invoice generate/approve | Partners/Finance/Owner permissions |
| POST /webhooks/:provider | Durable inbox for signed provider events | Verified signature |
| POST /workspaces/:id/exports | Controlled extraction (Phase B) | Owner or export permission |
| POST /tracking/otp, GET /tracking | Customer order tracking | Verified customer grant |

Authenticate the website and customer draft authority first, with provider verification outside the transaction. In one short scoped transaction: look up the completed order by scoped idempotency key and fingerprint; return its stored outcome before checking its consumed/expired quote. A changed fingerprint is a conflict. For a new submission only, validate the draft and quote against the selected withdrawal policy, claim the key, create order/snapshot/terms/history, consume the quote, link the draft and add email/analytics outbox rows. Enforce scoped key and one-order-per-draft uniqueness in the DB; handle concurrent losers by retrieving the committed result or returning a conflict. Commit before returning success. Retain narrowly scoped retry authority after submission so the completed-order lookup remains possible without granting draft edits. Copy partner attribution now; create a commission line only during activation, in the same transaction as that transition. There is no commission placeholder job. An unavailable database or unestablished integrity returns a retryable failure, never success.

Change requests are separate records; approval applies an audited amendment.

# 8 R2 document implementation

One private bucket per workspace. Server-generated random object keys; associations live in PostgreSQL with bucket, key, checksum, size, detected type, verification status, uploader, timestamps, and revision linkage.

Upload flow (all through the backend): authorise actor and parent record against the plan's document checklist → create intent → issue short-lived signed PUT URL → client uploads directly to R2 → finalize through the backend → copy first to a unique private candidate key the uploader cannot overwrite → verify candidate existence, size, file signature and checksum (PDF, JPEG, PNG only; declared Content-Type is not trusted) → atomically attach that exact candidate and mark available. Repeated/concurrent finalize calls resolve to one approved object; never check mutable staging bytes and then attach an unchecked copy. Quarantine until checks pass. No third-party malware scanning at launch (recorded decision; revisit in Phase B). Clean expired intents and staging objects after a grace period.

Downloads: recheck workspace membership and the document permission, then issue a short-lived signed GET URL. Serve originals with attachment disposition, a sanitized filename and nosniff; do not embed untrusted originals. Any future preview needs a separately hardened renderer. Treat it as a bearer capability; use short expiry. Narrow CORS to approved origins; CORS is not authorisation.

Replacement creates a revision; deletion creates an audited tombstone with scheduled cleanup under the retention policy. Keep file access behind an interface (createUpload, verifyUpload, issueDownload, copyForExport).

# 9 Background jobs and external services

PostgreSQL transactional outbox. An authenticated **Vercel Cron** endpoint on the backend (one-minute cadence on Pro) claims short batches with SKIP LOCKED and a lease. Jobs carry workspace, type, payload version, deduplication key, attempts, next attempt, lease, and outcome. Exponential backoff with jitter; exhausted jobs land in a visible failed queue with a retry action and an alert. Execution switches to the job's workspace context and narrowly scoped provider credentials. Because there is no long-lived worker, all background work is cron-triggered and each run is bounded to fit function limits.

Provider webhooks enter a durable inbox before responding. Verify signatures on the raw body, deduplicate by provider event ID + workspace + account, process asynchronously, reconcile periodically.

## Email

Use EmailAdapter with a fake in CI. Amazon SES is the preferred candidate, contingent on OPEN_INPUTS #23: production access in the chosen region, approved quota, verified sender domains and delivery-event integration. Verify SPF/DKIM/DMARC, restrictive sending credentials, provider suppression, bounces/complaints, and an admin delivery-status view before live sending. For SES notifications, validate the supported event transport's authenticity and registered account/topic before storing a scoped inbox event. Account approvals are external prerequisites, not assumed tool capabilities. Keep Resend as a documented alternative; do not implement two providers or automatic failover.

Staff invitations/recovery use a separately configured Supabase Auth SMTP path, which may use SES with its own scoped credential. Verify the provider-supported staff invitation method in T5 without embedding an elevated Supabase secret in the application; record limitations and use owner-operated invitations if necessary. Customer EmailAdapter does not configure Auth mail automatically.

Outbox delivery is at least once. Use a stable logical message ID, provider IDs and deduplication where the provider supports it. After an ambiguous send timeout, mark the attempt uncertain and reconcile against delivery events or require controlled retry; a DB dedup key alone cannot guarantee exactly-once external email. Never silently resend through another provider. Confirmed orders remain saved regardless of email outcome.

Marketing checks consent and suppression immediately before sending, includes unsubscribe, and rechecks lead/order status. Avoid personal data in message bodies beyond necessary transactional content, never attach identity documents. Costs and upgrade triggers are in REQUIREMENTS §15.

## Delivery

Phase A: no adapter. The admin has a Dispatch action (calling the backend) that records courier name, tracking reference, dispatch date, and moves the order to Dispatched. Phase B: a delivery adapter (createShipment, getStatus, handleEvent) with idempotency keys; timeouts query by external reference before retrying; unreconcilable outcomes are flagged uncertain.

## Payments

Phase A: the order shows the payment-required flag and amount from the snapshot; Finance/Orders record manual payment status with method and reference. Phase B: a payment adapter (provider TBD) creates sessions from the snapshot amount and confirms only via signed webhook; browser redirects are not proof; no card data stored. No refund logic.

## Analytics

Umami script per website with the workspace's site ID. Server-side: the storefront forwards UTM, referrer, landing page, and partner code with the lead; the backend allowlists/bounds fields and strips personal/query/token data before persistence, then emits lead_saved and order_submitted through an AnalyticsSink. Use one designated source per event type to avoid counting the same submission twice; never forward raw URLs. Google Ads/Meta conversion forwarding is a Phase B sink over the same data.

## Automation

n8n (Phase B) receives minimal signed events and scoped API credentials; order persistence and retries stay in the backend.

# 10 Observability

Structured JSON logs with request ID, workspace ID, actor ID, and route; never log document contents, tokens, or full personal data (scrubber on known fields, unit-tested). An error-tracking service (free tier, e.g. Sentry) receives exceptions from backend, admin, and jobs with release tags. A synthetic order check runs on a schedule against production with a test workspace and alerts on failure. Alerts route to the owner by email (and optionally a chat channel) for: failed-job queue growth, backup age, synthetic check failure, and error-rate spikes. Log retention follows provider limits; anything needed longer is captured in the audit tables.

# 11 Design system and UI approach

Admin and storefront UI are built on shadcn/ui through the shadcn MCP and its template catalogue. No separate Figma phase; design decisions are made in code:

- The admin starts from a shadcn dashboard template with sidebar navigation per workspace, and uses design tokens (colour, radius, spacing) set once and pulled from `@canadian-plans/ui`.
- Shared primitives live in `@canadian-plans/ui` as shadcn-based components without brand or content; each website applies its own tokens, fonts, and hero imagery from Sanity.
- The order form is a multi-step component: plan → details → documents → review/terms → confirmation; partial-lead save happens at the end of the details step (a backend `/leads` call).
- Accessibility (WCAG 2.1 AA) is enforced with shadcn's accessible primitives plus lint and Playwright checks for labels, focus order, and contrast.
- Any new component added by an agent goes into `@canadian-plans/ui`, documented with props, and reused rather than duplicated.

# 12 Environments, deployment, and safe changes

Use local development, dedicated staging, and production with separate credentials/data. Free services are used only within eligible terms. Vercel Pro is required before commercial hosting and minute-level scheduled-work integration. A staging backend Vercel project's production deployment points only at staging DB, R2, CMS and a fake email sink; this is where deployed cron is tested. PR previews use manual job invocation and never hold production credentials. Keep a Free staging Supabase project in a separate eligible organization or budget an additional project in the paid organization.

CI: strict types, import boundaries, secret scanning, migrations on disposable Postgres, isolation/transactional tests, affected application builds and critical Playwright journeys. Provider tests use sandboxes and synthetic data. Capture deployed environment inventories with secret values redacted; secret variable names alone cannot establish whether a credential points at production.

Each app is a separate Vercel project. Configure and verify affected-project build controls using declared workspace dependencies. Site-only changes affect that site; shared changes test/build every dependent app. The owner explicitly selects production releases. Record Git SHA, lockfile and supported schema/API range, and prove an unchanged frontend still works after an additive backend release.

Migrations use one history in @canadian-plans/db: additive schema first, backend/API next, consumers next, removal only after every consumer migrates. Application rollback requires schema compatibility. Data defects use forward fixes or rehearsed recovery. Production backup automation is separately protected and never exposed to PR-CI; see §13.

# 13 Backup and recovery design

## Phase A — daily

This is the standard baseline authorized on 14 September; exact recovery-time/loss targets and PITR remain deferred. Prefer preserving confirmed orders over accepting new ones when integrity cannot be established. Automated backups do not guarantee zero loss.

Use managed Supabase Pro daily backups plus an independent daily archive in a separately controlled Backblaze B2 account. Before feature work depends on recovery, perform a small synthetic Auth/data/object export-and-restore spike in T4R. Verify the current provider-supported Auth export/import scope, custom-role credentials, staff login, MFA recovery, revoked memberships and sessions. Record exact commands and exclusions in docs/RUNBOOKS/restore.md; a plain app-schema dump does not prove identity recovery. If a factor/secret cannot be restored, define and rehearse owner-controlled re-enrolment and session invalidation without a password-only privileged bypass. Unresolved recovery of real access blocks launch, not unrelated feature development.

The daily runner makes a consistent database export with migration/version and supported Auth data; derives a referenced-file manifest; copies all missing retained R2 objects; exports Sanity content/assets; and records checksums, versions and counts. Independently captured CMS revisions and object manifests must reconcile with immutable order snapshots. Prevent object cleanup racing the archive with a snapshot reference set and lease. Encrypt every dump, object, export and manifest before uploading; use a public encryption recipient for the writer and keep decryption material separately recoverable by the owner. Verify both missing-object and tampering failures during restore.

Use a protected, pinned GitHub Actions workflow with dedicated backup secrets, read/export source permissions and archive-write/list permissions without delete. Archive retention: 30 daily and 12 monthly points. A separate owner-controlled retention job uses a different delete-capable credential, starts in dry-run, computes the union of all retained manifest references, and removes only unreferenced encrypted payloads after a grace period. Simple age-based deletion of shared incremental objects is unsafe. Keep the runner unable to delete existing archives.

A separate monitor alerts when the latest complete verified snapshot exceeds 26 hours. Publish heartbeat only after every component succeeds; record actual delay and restore duration. GitHub scheduled jobs are not a recovery SLA. The owner receives alerts and directs AI using tested runbooks.

### External deletion/suppression ledger

T4R defines and tests the ledger before T21 uses it and T24 rehearses a full restore. Use a dedicated B2 bucket in the recovery account, separate from DB snapshots and archive rotation. A narrowly scoped publisher can create uniquely keyed encrypted events but cannot delete them; recovery reads with separate credentials. Verify actual provider key restrictions, version-retention/immutability controls and operator recovery during the spike; do not infer append-only enforcement from a key name. The owner controls encryption/recovery keys and a separately authenticated heartbeat/checkpoint.

Each event has a unique operation ID, workspace, opaque subject/record IDs, operation (delete, suppress, revoke), timestamp and schema version; a keyed contact digest is used only when suppression needs future matching. Treat identifiers/digests as sensitive. No raw contact details or document bytes. Replays are idempotent.

Commit a local deletion/revocation intent and restrict access/sending immediately; publish the event after commit through the outbox; perform irreversible cleanup and report completion only after durable ledger acknowledgement. Retrying writes the same logical operation; an outage leaves it pending/restricted and alerts. A restore reconciles the independent ledger against its checkpoint before reopening or running jobs. Missing, stale or unverifiable ledger evidence fails closed. Ledger retention and permitted commercial remnants are owner inputs, not inferred from the archive schedule.

## Phase B — hourly

Move the runner to hourly, add incremental object copying, alert above 75 minutes, add 48 hourly retention points, and evaluate a dedicated scheduled runner if GitHub Actions delay is measured. Consider Supabase PITR when the accepted loss window shrinks; it does not cover R2 or Sanity.

## Restore runbook

1. Identify the incident; stop unsafe writes and external dispatch; preserve evidence.
2. Select a verified recovery point; provision an isolated environment; restore migrations, records, identities, configuration, and referenced objects.
3. Rotate credentials if compromise is possible; restore authentication through supported procedures; confirm the owner can sign in.
4. Verify counts, constraints, sample orders, document checksums, isolation, and catalogue synchronisation.
5. Reconcile email, dispatch, payment, and invoice events before resuming jobs; a restored database must not resend yesterday's messages.
6. Perform a test submission and document access; reconnect traffic; record actual loss window and duration.

Rehearse before launch and monthly.

# 14 Website onboarding and separation (Phase B)

## Repeatable onboarding

A provisioning command with a resumable checklist: create workspace; select feature modules; create Sanity project and deploy schema; create R2 bucket and scoped access; create the Vercel project for the new `apps/site-N` and its environment variables; register CMS webhooks; configure the selected email-provider sender identity; create Umami site; seed content; run a sample order. Record every provisioned resource and its rollback in a workspace manifest. Re-running converges rather than duplicates. Domain verification, billing, copy, custom forms, and design remain human inputs.

## Separation procedure

1. Verify single-workspace mode; pin the release and schema used for extraction.
2. Export dry run: workspace-owned rows in dependency order, offer/order history, partner and commission data, audit actor labels, file manifests, Sanity export, configuration inventory. Exclude other workspaces, global secrets, sessions.
3. Provision an independent Supabase project, backend deployment, R2 bucket, frontend, and provider accounts; transfer or recreate the Sanity project.
4. Import into an empty target; preserve business IDs; re-invite staff; retain historical actor labels.
5. Compare counts and checksums; run the functional suite; negative search for every other workspace; reconcile outstanding obligations.
6. For live cutover, freeze writes for that workspace, drain jobs, export the delta, verify, switch frontend and webhooks, keep a rollback window.
7. Rotate old credentials; confirm independent billing and recovery; apply the agreed retention policy to source data.

A synthetic-data separation test is a gate before websites 2 and 3 go live.

# 15 Implementation milestones

Use BUILD_TASKS.md's dependency order and sizing legend as the execution reference. The original 31–51 task-day estimate is rough effort, not a three-week promise. Preserve full Phase A scope; move the date when a gate fails or work overruns. Milestone labels describe deliverables, not permission to run dependent tasks early.

## Phase A

### A0 — Baseline and conventions

Scope: create the monorepo, pnpm workspaces, the five app skeletons (backend, admin, site-1, and placeholders for site-2/3) and shared packages, CI, environment templates, ADR folder, AI task template (Section 18), Linear project with milestones, accounts on eligible tiers (Vercel Pro when required, Supabase Canada, Sanity, R2, conditional SES selection, Umami, error tracking). Establish strict-TS config and import-boundary lint. Review the canadaesim repository only for reusable patterns; copy nothing blindly.

Deliverables: runnable empty backend, admin, and site-1; CI green; docs skeleton; feature-flag list of Phase B items.

Exit gate: early T4R recovery/ledger feasibility is recorded before dependent integration, and an agent can clone, run tests, and complete a sample task from the template without extra explanation; the `any` ban and the "only backend imports @canadian-plans/db" boundary are enforced by lint. Covers REQ 40 (scaffold), Section 18.

### A1 — Identity, workspaces, and isolation

Scope: the backend's Supabase Auth verification, memberships, roles and individual permissions, MFA for Owner/Finance, runtime DB role, RLS with transaction-local context over the pooler, service credentials for websites, typed contracts in `@canadian-plans/contracts`, admin shell from a shadcn template with workspace switcher and denied-access screens (calling the backend). Seed two deliberately different workspaces.

Exit gate: cross-workspace access fails at API and database; revoked member denied on the next request; each role's negative tests pass; previews have no production credentials; migrations run clean; pooled-context reuse cannot leak. Covers REQ 01–03, 05 (grant model), 36, 37.

### A2 — Lead-to-order journey

Scope: website 1 Sanity project with embedded Studio and schemas with offer settings; signed inbox, sync, offer versions, quotes; the coded SIM order form (plan → details → review/terms → confirmation initially with synthetic no-document offers; documents wired in A3) calling the backend, with partial-lead save, attribution capture, terms version; idempotent submission; staff processing (partnered activation completed in A3); staff list/detail/transitions, notes, reminders, assignment, search, audit history, conflict detection; change requests; transactional outbox with a fake email adapter and cron runner.

Exit gate: retry after timeout returns the same order; forged draft fails; price change never rewrites an order; unverifiable price cannot produce a priced order; staff process a synthetic order; failed email does not lose it. The early slice does not claim document or partnered-activation readiness. Covers REQ 06–09, 11–21, 38.

Change requests and reminders may be completed in A4 but remain required Phase A scope.

### A3 — Documents, email, partners, analytics

Scope: R2 upload intent/finalize/download with signature verification and quarantine; per-plan document checklist enforcement; document permission; selected EmailAdapter with SPF/DKIM/DMARC, acknowledgement and status emails, consent-gated follow-ups with unsubscribe, delivery-status view; manual Dispatch action; manual payment status per the offer flag; partner records, referral codes, attribution, commission line on activation with rule snapshot and state transitions; Umami site and event forwarding; privacy policy and terms pages with versions; customer tracking via OTP.

Exit gate: foreign file access fails; unverified file never visible; email failures retryable; unsubscribed contacts never receive marketing; activation creates one commission line; UTM and partner code visible on the order; tracking cannot be reached by guessing a reference. Covers REQ 04 (record level), 05, 22–29, 31, 32, 34, 35.

Customer tracking remains Phase A; complete it before the launch gate.

### A4 — Backup, observability, hardening, launch

Scope: daily backup runner with encrypted independent archive and heartbeat; one full isolated restore; error tracking, structured logs with scrubbing, synthetic order check, alerts; rate limits and bot protection; WCAG and Lighthouse pass; sample-dataset performance check; runbooks; confirm production tiers and DNS/sender settings prepared earlier; allow a stabilization/retest interval after the last meaningful fix; go live with website 1 only after gates pass.

Exit gate: all Phase A gates in Requirements Section 16 pass with recorded evidence. Covers REQ 10, 39, 40, 41–44 (daily), Section 16.

## Phase B

| **Milestone** | **Scope** | **Size** | **Covers** |
| --- | --- | --- | --- |
| B1 Partner portal and invoicing | Partner login and membership type, own-records view, monthly draft invoice generation, owner/Finance approval, partner visibility of approved invoices, payout marking | M | REQ 04, 33 |
| B2 Hourly backups and alerts | Hourly runner, incremental copying, 75-minute alert, 48 hourly points, PITR evaluation | S | REQ 42–44 |
| B3 Onboarding and websites 2–3 | Provisioning command, resource manifests, new `apps/site-2` and `apps/site-3`, mobile-internet and home-internet forms and payload schemas, distinct branding, per-site feature settings, no SIM-only fields inherited | L | REQ 06, 16, 45 |
| B4 Export/import demonstration | Selective extraction, import into an empty target, count and checksum comparison, negative foreign-workspace search, synthetic cutover rehearsal | M | REQ 46, 47 |
| B5 External adapters | Delivery-provider adapter with reconciliation; payment adapter for payment-required plans; Google Ads/Meta conversion forwarding; n8n event interface (disabled by default) | L | REQ 28–30, 35 |
| B6 Load test and stabilisation | Expand the Phase A burst test using observed production traffic and new-brand workloads; capacity, backlog, cost and query tuning | S | REQ 39 |

# 16 Verification strategy

Test boundaries and irreversible effects rather than implementation lines. Provider calls are fakes in CI plus a small controlled set of sandbox contract tests. Vitest covers unit/component/integration in every app; Playwright covers critical journeys in each frontend. Strict types and the `any` ban are themselves enforced in CI.

| **Test group** | **Required examples** |
| --- | --- |
| Authorisation | Foreign workspace and record IDs, revoked member, role escalation, expired token, document permission missing, denied export |
| Database isolation | Missing context, cross-workspace foreign key, pooled-context reuse, privileged-role misuse |
| Order integrity | Double click, timeout retry, same key different payload, parallel edits, failed commit, terms version recorded |
| Catalogue | Draft vs published, stale events, offer withdrawal, expiry, CMS outage, quote during price change, offer settings copied to snapshot |
| Documents | Oversize, mislabelled type, staged-object overwrite, expired link, foreign attachment, checklist enforcement |
| Communications | Duplicate send prevention, unsubscribe honoured, consent missing, bounce recorded, completed lead stops follow-ups |
| Partners | Activation creates one commission line; rule change leaves old lines; invoice regeneration idempotent; unapproved invoice hidden |
| Recovery | Full restore, auth recovery, missing asset rejection, event reconciliation, old-version compatibility |
| Independence (Phase B) | Selective export, foreign-row absence, actor remapping, scoped cutover |
| User experience | Mobile form, keyboard navigation, error recovery, one H1, draft noindex, correct branding, WCAG checks |
| Types & contracts | Strict build passes with no `any`; frontend and backend share the same generated client; a schema change breaks the build on both sides, not silently |

Phase A performance check: seed 10,000 synthetic orders across two workspaces, verify lists/order-save latency, and test a provisional burst of 20 concurrent submissions with 10 staff sessions. Record errors, pool saturation and queue age and prove no lost/duplicate orders. Initial 100 orders/day is a planning target. Phase B broadens tests using measured traffic.

# 17 Costs, capacity, and upgrade triggers

REQUIREMENTS §15 is the authoritative cost table. Use eligible free services in development; Vercel Pro before commercial hosting/minute-level cron; Supabase Pro for the standard production backup baseline. Prefer plan/configuration upgrades to provider migrations. SES remains contingent on approval and delivery tests. Verify quota, region and billing at provisioning and record actual selections in docs/ENV.md.

Monitor email attempts (including tracking and staff mail), retained document bytes, database/backup egress, function CPU/invocations, queue age, archive/ledger and runner usage, CMS requests, analytics and error volume. Alert before limits threaten service. Spending controls must surface a deliberate maintenance state if intake cannot safely continue; never report an unsaved order as successful.

Exact recovery guarantees and PITR remain deferred by the owner. Any future upgrade must cover database, objects, ledger and operational response together; a database plan upgrade alone is not complete disaster recovery.

# 18 AI-assisted build conventions

Every task given to an AI agent uses this template. BUILD_TASKS.md is the local task source; update external trackers only when explicitly authorized:

| **Field** | **Content** |
| --- | --- |
| REQ IDs | Which requirements this task implements or touches |
| App / package | One app or package; cross-cutting tasks are split |
| Contract | Input/output schemas or API changes, referencing `@canadian-plans/contracts` |
| Schema | Migration files added; RLS policy changes listed explicitly |
| Negative tests | The failure cases that must be proven, not only the happy path |
| Evidence | What the agent must show (test output, screenshot, log) before the task is closed |
| Rollback | Forward-fix or rollback steps |

Rules every agent must follow:

- One bounded task at a time; state assumptions before coding; ask when a business rule is missing rather than inventing it.
- Strict types, no `any`, no unchecked casts. Don't duplicate a type/schema a shared package owns.
- Only `apps/backend` touches the database or imports `@canadian-plans/db`; frontends call the API. Never a Supabase service-role client in application code; never production credentials in previews; never log documents or tokens.
- Generated SQL, RLS policies, and authorisation logic are reviewed by the owner before production.
- New UI uses shadcn components from `@canadian-plans/ui`; new dependencies are justified and pinned.
- Update docs (ADRs, API docs, schema history, env descriptions, runbooks) in the same task when behaviour changes.
- Discover available provider tools rather than assuming named connectors are installed. Use non-production resources and fake email by default; sandbox sends require a controlled verified recipient. Production writes and external messages require explicit owner authorization.

Handover documents (docs/RUNBOOKS): staff onboarding and removal; CMS publishing and price-error handling; failed-email recovery; dispatch and activation; commission and invoice month-end; backup alert response; full restore; workspace provisioning; export/import; credential rotation; release rollback; monthly cost review. Each names required access, safe stopping point, verification, and escalation owner (the owner).

# 19 Traceability matrix

| **REQ** | **Topic** | **Milestone** | **Acceptance gate** |
| --- | --- | --- | --- |
| 01–03 | Owner, staff, content access | A1 | A2, A5 |
| 04 | Partners (record in A, portal in B) | A3, B1 | A8; Phase B |
| 05 | Customers and tracking | A1, A3 | A2 |
| 06 | Independent websites | A2, B3 | A1; Phase B |
| 07–09 | Content, preview, ownership | A2 | A4 |
| 10 | SEO and accessibility | A4 | A12 |
| 11–15 | Catalogue and pricing | A2 | A4, A6 |
| 16–18 | Forms, leads, submission | A2 | A3 |
| 19–21 | Statuses, tools, change requests | A2 | A5, A8 |
| 22–25 | Documents | A3 | A6 |
| 26–27 | Email and follow-ups | A3 | A7 |
| 28 | Delivery (manual A, adapter B) | A3, B5 | A5; Phase B |
| 29 | Payments (manual A, online B) | A3, B5 | A6; Phase B |
| 30 | Automation | B5 | Phase B |
| 31–32 | Partner lifecycle, commissions | A3 | A8 |
| 33 | Invoices | B1 | Phase B |
| 34 | Privacy and consent | A3 | A3, A7 |
| 35 | Analytics and attribution | A3, B5 | A9 |
| 36–37 | Isolation and security | A1, A4 | A2, A11 |
| 38 | Asynchronous work | A2 | A7 |
| 39 | Performance | A4, B6 | A12; Phase B |
| 40 | Observability | A0, A4 | A11, A13 |
| 41–44 | Backup and recovery | A4, B2 | A10; Phase B |
| 45 | Onboarding | B3 | Phase B |
| 46–47 | Separation | B4 | Phase B |
| 48 | Backend-only data access | A0, A1 | A14: import boundaries and credential ownership |
| 49 | Strict typing | A0–A4 | A14: type/lint checks |
| 50 | Shared contracts, audience-specific responses | A0–A4 | A14: consumer builds and response exposure tests |
| 51 | Critical journeys and negative tests | A1–A4 | A14 plus corresponding functional gates |

Gate references (A1–A14) are the numbered Phase A gates in Requirements Section 16 (1–14); they are distinct from implementation milestones A0–A4 and evidence filenames.

# 20 Engineering reference sources

E1 Next.js on Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs

E2 Express on Vercel (functions): https://vercel.com/guides/using-express-with-vercel

E3 Vercel fair-use guidelines (Hobby non-commercial): https://vercel.com/docs/limits/fair-use-guidelines

E4 Supabase row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security

E5 Supabase connection pooling (Supavisor): https://supabase.com/docs/guides/database/connecting-to-postgres

E6 Supabase backups and PITR: https://supabase.com/docs/guides/platform/backups

E7 Supabase pricing and Free-plan pausing: https://supabase.com/pricing

E8 Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/

E9 Sanity with Next.js (embedded Studio): https://www.sanity.io/docs/nextjs

E10 GitHub Actions schedule: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

E11 Vercel Pro plan: https://vercel.com/docs/plans/pro-plan

E12 Resend pricing: https://resend.com/pricing

E13 Umami: https://umami.is/docs

E14 shadcn/ui and MCP: https://ui.shadcn.com/docs/mcp

E15 pnpm workspaces: https://pnpm.io/workspaces

E16 SES pricing: https://aws.amazon.com/ses/pricing/

E17 SES production access: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html

E18 Vercel cron cadence: https://vercel.com/docs/cron-jobs/usage-and-pricing

E19 Vercel affected projects: https://vercel.com/docs/monorepos

Pricing/cadence sources E6/E7/E11/E12/E16–E19 were checked during the 14 September review; recheck before purchase or implementation. The recovery ledger and archive design must pass T4R provider-capability tests.

Code-pattern reference: https://github.com/Md-Takibuddin/canadaesim

Verify current SDKs, provider limits, and plan terms during implementation; this document is not a frozen vendor specification.
