# BUILD_TASKS.md — Step-by-step tasks with prompts

How to use this file:

1. The owner supplies account access, MFA, business decisions and production authorization. AI may prepare or perform authorized setup using available tools; verify external account approvals rather than assuming they are automated.
2. Open a fresh AI session (Claude Code in the monorepo root). Paste the **Prompt** exactly. Every prompt starts by making the agent read the context docs, so you don't have to re-explain.
3. Don't close a task until every **Done when** line is true and you've seen the evidence. Record completion locally; synchronize external trackers only when requested.
4. One task per session where possible. If the agent wanders into Phase B work, say: *"That's Phase B — interface and flag only, see PLATFORM_CONTEXT.md §6."*
5. If a prompt needs an answer you don't have yet, use a TEST-only placeholder and log it in `OPEN_INPUTS.md`; keep the dependent real operation disabled.

Everything is ONE pnpm monorepo. Apps: `apps/backend` (Express, the only DB client), `apps/admin` and `apps/site-1` (Next.js frontends). Shared: `packages/{types,contracts,db,adapters,ui,config}`. The docs live at the repo root and in `docs/`.

Legend: **S** ≈ half a day to a day · **M** ≈ 2–3 days · **L** ≈ 4+ days (solo + AI).

> **Schedule:** preserve full Phase A and move the launch date until gates pass. The original 31–51 task-day estimate is rough effort, not a calendar commitment. Task IDs are stable references; execute the dependency order below, not numeric order. Build a thin synthetic order path first, then complete all Phase A features. Exact disaster recovery targets are deferred; the standard backup/restore baseline remains required.

## Execution order and dependencies

1. T0 → T1 → T2/T3 → T4 → T4R → T5 → T6 → T7 → T8.
2. T9 → T4P → T10A → T11 → T10 → T12 → T15 → T10B → T13 → T14 → T16.
3. T17 → T18 → T19 → T20 → T21 → T22 → T23.
4. T24 → T25 → T26 → T27 → stabilization/retest → T28.

T4P/T10A establish partner/catalogue tables before leads reference them. T10 creates quotes after drafts exist; T12 adds the quote-to-order consumption foreign key after orders exist. T10B activates deployed sync jobs after T15's runner exists. T14 provides staff processing UI but partnered activation is not complete until T19. T16 uses synthetic no-document offers; document/activation proof is completed at T23. T4R is an early recovery feasibility gate, T24 the full rehearsal. Keep TEST-only fixtures and unfinished production transitions disabled.

### T4R. Early recovery and ledger spike (after T4, before T5)

Use disposable synthetic accounts and objects. Follow IMPLEMENTATION_PLAN §13: prove supported Auth export/import, staff access/MFA recovery, encrypted database/R2/Sanity artifacts and separately controlled deletion-ledger storage. Test ledger writer restrictions, encryption key recovery, idempotent events, checkpoint reconciliation, and missing-ledger fail-closed behavior. Record exact supported commands, exclusions and required identity/bootstrap changes in docs/RUNBOOKS/restore.md and docs/EVIDENCE/A0-recovery-spike.md. Final app integration is completed in T21/T24. Do not claim the production recovery gate has passed.

### T4P. Partner schema prerequisite (after T9, before T11)

Create the minimal workspace-scoped partners table, approved/suspended/pending states, referral-code uniqueness and lookup using the existing contracts/RLS patterns. Use only synthetic partners. T19 extends this table; it must not recreate it. Test a foreign-workspace referral and suspended partner.

### T10A. Catalogue schema prerequisite (after T4P, before T11)

Create products and immutable offer_versions with workspace ownership and a unique commercial-content hash, plus separate mutable availability/revocation state. Record CMS revision provenance. T11 may now reference offer_versions. Quote rows are created in T10; order references wait until T12.

### T10B. Deployed catalogue jobs (after T15, before T16)

Register the already-tested T10 sync/reconciliation handlers with T15's runner. Use the verified machine registry, inbox and workspace scopes; test five-minute reconciliation on the dedicated staging deployment. Exercise duplicate/out-of-order events and a missing webhook. Record evidence before Gate A2.

---

# PHASE A — backend + admin + website 1 (SIM), launch when gates pass

## Milestone A0 — Baseline and conventions

### T0. Accounts and keys — Manual (S)

Provision under Canadian Plans ownership; use eligible free services initially, with required paid services before commercial hosting/scheduled testing:
- GitHub org `canadian-plans` with ONE private repo: `canadian-plans` (the monorepo).
- Vercel team (Pro before commercial hosting or minute-level cron integration) — you'll create one Vercel *project* per app later (backend, admin, site-1), all pointing at this one repo.
- Supabase: two projects in **Canada (ca-central-1)**: `canadian-plans-prod` and `canadian-plans-staging`. Note billing is per-ORG, so either put `canadian-plans-staging` in its own separate Free org, or budget it as a second paid project in the prod org (decide via OPEN_INPUTS #22). Set the Canada function region explicitly on every Vercel project too — don't rely on a default.
- Scheduling: the required minute-level Vercel Cron schedules need **Pro** and run only on a project's production deployment. Stand up the dedicated staging project with only staging resources and a fake email sink before T15/T10B/T25. PR previews use manual job invocation for tests only.
- Sanity org with eligible free dataset allowance. Cloudflare account with R2 enabled. Email-provider setup: SES preferred pending approval; record selection in OPEN_INPUTS #23. Umami cloud account (or note "self-host" as open input). Sentry (or chosen tracker) free tier. Backblaze B2 account under a **different** email/2FA for backups. Linear project "Canadian Plans Platform" with milestones A0–A4, B1–B6.
- Store every key in a password manager. Never paste production keys into a chat.

Start domain/DNS verification, SES production-access request, Auth SMTP setup, R2 test bucket/CORS and separate B2 archive/ledger provisioning in T0. Provision a synthetic Sanity test dataset before T4R; T9 reuses the project. Feature integration follows later; provider approvals may take time. Confirm staging organization billing and each provider's actual quota. Missing external inputs block dependent gates, not local scaffolding.

Done when: access/resource inventory and pending approvals are recorded; docs/ENV.md lists variable names and environment ownership only, never values.

### T1. Monorepo scaffold, backend, shared packages, conventions (M)

**Prompt:**
```
Read PLATFORM_CONTEXT.md fully, then IMPLEMENTATION_PLAN.md §3 and §18.

Task: scaffold the `canadian-plans` pnpm monorepo exactly as PLATFORM_CONTEXT.md §10 describes.
- pnpm workspaces; TypeScript strict everywhere with noImplicitAny; an ESLint config in packages/config that (a) bans the `any` type and unchecked casts, (b) allows @canadian-plans/db only in apps/backend, its defining package and explicitly allowlisted offline migration/backup/restore/test tooling, (c) forbids direct DB clients in frontends; Supabase Auth session clients are allowed but cannot perform DB/Storage operations. Prettier; Vitest; Playwright config per frontend (no tests yet).
- apps/backend: Express app in strict TS, exported so it can run as a Vercel function (single handler entry + local dev server). Route GET /api/v1/health returning { ok: true, requestId }. Structured request-id middleware. No DB code yet beyond a placeholder @canadian-plans/db import to prove the boundary lint works.
- apps/admin: Next.js App Router app, empty home, a lib/api.ts placeholder that will call the backend via the typed client. No DB access.
- packages/types, contracts, db, adapters, ui, config: each with package.json (name @canadian-plans/<x>), tsconfig, index.ts, and a README stating its single responsibility and what it must never import. @canadian-plans/db's README states it is imported ONLY by apps/backend.
- jobs/: placeholder folder with README (handlers invoked by backend cron routes).
- docs/: preserve ADR/0000-reviewed-planning-baseline.md; create ADR/0001-split-architecture.md (record: Express backend as sole DB client, monorepo, Vercel functions), API.md skeleton, SCHEMA_HISTORY.md, ENV.md (names only), RUNBOOKS/README.md. (OPEN_INPUTS.md already exists — leave it.)
- .github/workflows/ci.yml: install, strict types, boundary lint, unit tests and affected builds. Declare shared package dependencies accurately. Configure affected-project deployment controls for Vercel, with explicit production promotion by the owner. Test site-only change vs shared-package change; record release SHA/lockfile/schema compatibility. No production secrets.
- docs/TASK_TEMPLATE.md matching Implementation Plan §18.
Constraints: no real database schema yet, no Supabase Auth yet, pin all versions. List assumptions first. Finish by running full CI locally and showing output, including a deliberate demonstration that importing @canadian-plans/db from apps/admin fails lint.
```
Done when: CI passes; the boundary lint provably fails an @canadian-plans/db import from a frontend; the `any` ban is active; docs skeleton exists.

Keep all eight planning files at the root, matching this workspace. Generated API, environment, evidence and runbook files live under docs/. Connect available tools and record capabilities; do not assume every named connector is installed.

### T2. Admin shell with shadcn (S)

**Prompt:**
```
Read PLATFORM_CONTEXT.md §3 and §11.

Task: add shadcn/ui to apps/admin using the shadcn MCP, and put shared primitives + design tokens in @canadian-plans/ui (colour, radius, spacing, font defined once). Start from a dashboard template with a left sidebar, top bar, content area.
Create placeholder routes: /login, /w/[workspace]/orders, /w/[workspace]/leads, /w/[workspace]/partners, /w/[workspace]/documents, /w/[workspace]/settings, and a /denied page. No data yet — static placeholders that will later call the backend API.
Add a WorkspaceSwitcher in the top bar (static list for now).
Accessibility: keyboard-navigable sidebar, visible focus, skip link.
Deliver: screenshots of each route at desktop and mobile widths, and docs/ADR/0002-shadcn-design-system.md. No DB access anywhere in admin.
```
Done when: every route renders; keyboard navigation works; shared primitives live in @canadian-plans/ui; ADR written.

### T3. Site-1 scaffold with embedded Sanity shell (S)

**Prompt:**
```
Read PLATFORM_CONTEXT.md §2, §3, §10, and IMPLEMENTATION_PLAN.md §6 "Project and schema design".

Task: scaffold apps/site-1: Next.js App Router, strict TS, ESLint (shared config), Vitest, Playwright.
- Public site.config.ts: site ID/slug, name placeholder, currency CAD, locale en-CA, public analytics configuration. Separate server-only backend.config.ts: backend URL + this site's service credential. Never serialize the server config into props or Studio/browser bundles.
- Pages: /, /plans, /plans/[slug], /order, /track, /privacy, /terms — placeholders.
- Embedded Sanity Studio at /studio using the official next-sanity setup (config reads projectId/dataset from env; no project created yet — wire it in T9). Studio route is noindex and, later, editor-gated.
- lib/backendClient.ts (server-only) wrapping the typed client from @canadian-plans/contracts once it exists; for now a fetch wrapper adding an Authorization header from the server-only credential + a request id. Prove with a test that the credential never appears in the client bundle.
- Umami script from config, disabled when the env var is empty.
Record "site name" and "domain" in OPEN_INPUTS.md.
Constraint: site-1 has NO database access and imports NO @canadian-plans/db — data comes only from the backend API (and public content from Sanity).
```
Done when: site builds; /studio route renders the Studio shell; credential never in client bundle (test proves it); Umami loads only when configured.

---

## Milestone A1 — Identity, workspaces, isolation

### T4. Database foundation and workspace schema (M)

**Prompt:**
```
Read PLATFORM_CONTEXT.md §4 (all 14 invariants) and IMPLEMENTATION_PLAN.md §4 and §5.

Task: in packages/db (@canadian-plans/db, imported only by apps/backend) create the Drizzle setup and the first migration set, designed for the transaction-mode pooler.
Tables (schema `app`): workspaces, memberships (user_id, workspace_id, membership_type enum ['staff','partner'], status), roles (owner, orders, partners, finance, content, viewer), membership_roles, permissions (document_download, financial_data, bulk_export, deletion, invoice_approval, integration_management), membership_permissions, service_credentials (per website, hashed secret, scopes, revoked_at), audit_events (workspace_id, actor_id, actor_label, action, entity, entity_id, before, after, request_id, created_at).
Rules: UUID PKs; timestamptz UTC; every tenant table has workspace_id NOT NULL; composite unique (workspace_id, id) on tenant tables; composite FKs where a child references a tenant parent; indexes starting with workspace_id.
Roles and runtime: SQL for a non-owner runtime role `app_runtime` without BYPASSRLS; migrations run as a separate role. Enable RLS on every tenant table with policies reading current_setting('app.workspace_id', true) and current_setting('app.actor_id', true); missing settings deny.
Provide @canadian-plans/db withTenantTx(ctx, fn): open a transaction on a POOLED connection, SET LOCAL both settings, run fn, commit. Document why SET LOCAL (not session SET) is required under transaction pooling, and configure Drizzle to use the pooled (Supavisor, transaction mode) connection string.
Tests (Vitest against a disposable Postgres in CI): missing context denies; wrong workspace context sees zero rows; composite FK rejects cross-workspace child; runtime role cannot bypass RLS; two sequential units of work on one pooled connection do not leak SET LOCAL settings.
Update docs/SCHEMA_HISTORY.md and docs/ENV.md. No Supabase Auth yet.
```
Done when: migration applies to an empty DB in CI; all five negative tests pass (incl. pooled-context reuse); runtime role verified non-BYPASSRLS.

YOU review this one personally — see OWNER_PLAYBOOK §5.

### T5. Supabase Auth, sessions, MFA, and the authorisation layer (M)

**Prompt:**
```
Read PLATFORM_CONTEXT.md §4 items 2, 3 and 11, REQUIREMENTS.md REQ 01–02, 37, 48, IMPLEMENTATION_PLAN.md §5 "Staff requests".

Task: implement staff auth in apps/backend and wire apps/admin to it. Admin holds the Supabase session; the BACKEND verifies it and does all authorisation and DB work.
- apps/backend: middleware that verifies the Supabase session (server-side) on every protected route, then loads membership, roles, permissions from the DB per request (no JWT role claim trusted). Build authorize({ actorId, workspaceId, action }) in @canadian-plans/... (backend module) returning allow/deny + reason; permission matrix; individual permissions override.
- MFA (TOTP) for Owner and Finance: **the backend refuses privileged actions unless the current session's assurance level is a verified aal2 (MFA actually completed this login), not merely that a factor is enrolled.** Check this server-side alongside membership + permission; a frontend redirect is not enforcement. Keep sign-in, enrol, challenge, and a defined recovery route usable so nobody deadlocks out; recovery must not create a password-only shortcut to privileged actions.
- Invitation flow: owner invites by email → membership pending → accepted on first login. Removal sets status=revoked; the NEXT backend request is denied even with a live token (prove in a test).
- admin: /login, session handling, /denied with reason codes, workspace switcher lists only the actor's active workspaces (data via backend).
- Seed script: workspaces "site-1" and "demo-2" with deliberately different names, one user each, owner in both.
Tests (backend): Owner in ws A cannot read ws B without membership; Orders role denied document download without permission; revoked member denied next request; MFA-less finance denied; a valid password-only aal1 session is denied a privileged Owner/Finance action; a verified aal2 session is allowed; a forged assurance claim is rejected.
Also implement the bootstrap lookup from PLATFORM_CONTEXT.md §4b: a server-verified staff actor lists only their own memberships/permitted workspaces under the restricted runtime role (how the workspace switcher resolves before tenant context is set).
Never use the service-role key in application code — assert with a grep test in CI. Admin must not import @canadian-plans/db (lint already enforces this).
```
Done when: negative tests pass; seed produces two isolated workspaces; grep test proves no service-role key; admin does all data access through the backend.

### T6. Website service credentials and public-request authentication (S)

**Prompt:**
```
Read IMPLEMENTATION_PLAN.md §5 "Public website requests" and §7, REQ 48.

Task: implement storefront-to-backend authentication in apps/backend.
- Owner can create/revoke a per-workspace service credential in admin /w/[workspace]/settings (admin calls a backend endpoint); the secret is shown once, stored hashed.
- Backend middleware: a request with a valid credential gets context { workspaceId, callerType: 'website', scopes }. Scopes limited to leads:write, quotes:create, orders:create, uploads:customer, tracking:otp. Anything else denied.
- Client-supplied workspace_id/Host/Origin are never authentication. Tests: forged workspace_id in body overridden; revoked credential denied; staff-only endpoint denied for a website credential.
- Apply edge/bot and request-size controls before DB work. Use bounded per-IP/credential buckets with short lock timeouts and expiry cleanup, not a global hot row. Measure saturation. General abuse/auth limits remain; completed-order retries must not consume new-submission quotas.
- Implement the server-only machine registry described in PLATFORM_CONTEXT §4b for scheduler scopes and provider endpoint/account/workspace/key mappings. Test unknown/revoked selector, invalid signature/secret, wrong provider account and cross-workspace confusion.
- Update @canadian-plans/contracts with auth error codes and docs/API.md "Authentication".
```
Done when: tests pass; admin can issue/revoke credentials via the backend; API.md documents the scheme.

### T7. Contracts package and typed client (S)

**Prompt:**
```
Read IMPLEMENTATION_PLAN.md §7 and §3, REQ 50.

Task: in @canadian-plans/contracts define Zod schemas + TypeScript types for the /api/v1 families in Implementation Plan §7 (leads, quotes, orders, workspace orders, upload intents/finalize, download link, partners/commissions/invoices, webhooks, exports, tracking). Include the error envelope { code, message, requestId, details? } and a versioned form schema type { schemaVersion, payload }.
Generate an OpenAPI 3.1 doc from the schemas at build (docs/API.md links it) and a typed client createBackendClient({ baseUrl, credential }) consumed by BOTH admin and site-1 (single source of truth — REQ 50).
Do not implement handlers. Contract tests: every schema round-trips; the client's types are derived from the same schemas so a schema change breaks consumers at build time.
```
Done when: OpenAPI generates; the one client compiles in both admin and site-1; contract tests pass.

### T8. A1 exit gate — isolation evidence bundle (S)

**Prompt:**
```
Read REQUIREMENTS.md §16 Phase A gates 2 and 11, REQ 48, and IMPLEMENTATION_PLAN.md §5 "Database enforcement".

Task: write an integration suite isolation.spec.ts for the implemented auth/membership/credential routes: altered workspace IDs, foreign fixture IDs, removed membership, expired/forged credential, role escalation on an existing protected action, missing DB context, pooled-context reuse and machine-registry confusion. Real order/transition/file-route checks land in T16/T23 when those routes exist.
Also add a CI check that (a) the redacted deployment/config inventory maps all preview credentials to isolated non-production resources (names alone are insufficient), and (b) no frontend imports @canadian-plans/db (boundary lint) — confirm both are enforced.
Output docs/EVIDENCE/A1.md with the test list and results.
```
Done when: all isolation tests green; boundary + preview-secret checks green; evidence committed.

**GATE A1** — read docs/EVIDENCE/A1.md yourself. Do not start the order slice unless the isolation gate is green.

---

## Milestone A2 — Lead-to-order journey with real pricing

### T9. Sanity project and schemas for site-1 (S)

Preparation: reuse the site-1 Sanity project/test dataset provisioned for T4R; add the production dataset only within the verified plan allowance. Put projectId/dataset into site-1 env. Give the content person the recorded CMS role before live editing.

**Prompt:**
```
Read REQUIREMENTS.md REQ 06–09, 11–12 and IMPLEMENTATION_PLAN.md §6.

Task: in apps/site-1's embedded Studio (/studio from T3), define document types: siteSettings, navigation, page (sections as a versioned discriminated union: hero, richText, planGrid, faq, testimonials, cta, imageText), countryPage, post, product (stable productKey, title, slug, type: 'sim'), offer (product ref, name, currency, recurringCharge, oneTimeFees[], amountPayableToday, paymentRequired boolean, documentChecklist: array of 'passport'|'visa'|'address_proof', eligibility, availability, billingParty, contractTerms, specs { carrier, dataAllowance, ... }), redirect, legalPage (with version).
Validation so a published offer is always complete. Editor-only draft preview on allowlisted routes, caching disabled.
Seed 3 sample offers in the TEST dataset (illustrative prices, clearly labelled TEST).
Put the schema definitions in packages/contracts/src/cms/schema-types.ts as the shared source of truth and have the site import them; document the approach in apps/site-1/docs/CMS.md.
```
Done when: Studio (embedded) loads and publishes; an incomplete offer fails validation; preview is editor-only.

### T10. Catalogue sync: signed inbox, offer versions, quotes (M)

**Prompt:**
```
Read PLATFORM_CONTEXT.md §4 items 4–5, REQUIREMENTS.md REQ 11–15, IMPLEMENTATION_PLAN.md §6 fully.

Task: implement catalogue sync in apps/backend (catalogue module) + @canadian-plans/adapters/sanity.
- Extend T10A catalogue schema; create catalogue_sync_events (inbox) and quotes (workspace_id, draft_id, offer_version_id, charges, terms_version, expires_at, revoked_at). The draft FK now targets T11. T12 adds consumed_by_order_id and its workspace-scoped FK once orders exist. Never recreate T10A tables or mutate immutable versions for availability.
- POST /api/v1/webhooks/sanity on the backend: resolve its untrusted endpoint selector through the server-only registry, verify the raw-body signature and mapped provider account, derive the workspace, then store to a scoped inbox, respond 200, process async (re-fetch the published doc from Sanity — never trust the body — validate, create a new offer_version only if commercial data changed; serialise per (workspace, product) with a lease; unpublish → separate current-availability state; existing-quote treatment follows OPEN_INPUTS #14).
- Implement/test reconciliation and sync handlers with manual invocation first; T10B schedules them through T15 on staging at five-minute cadence.
- POST /api/v1/quotes: fetch/validate published data outside a DB transaction, compute its canonical commercial hash, then atomically upsert/select that exact immutable version and persist a quote valid 15 min (config). Match quote fields and version even while webhooks lag. CMS failure returns an unpriced-lead error. Existing-quote withdrawal behavior is an explicit TEST policy until OPEN_INPUTS #14 is resolved; production priced checkout stays disabled without that selection.
- Authenticated revalidate call to site-1 after sync.
Tests: duplicate/out-of-order webhook, quote/webhook race preserves exact version/content, withdrawal under both policy fixtures, expired quote, CMS outage, price change leaves historical versions intact, mismatched provider account denied.
Admin: /w/[workspace]/settings/catalogue (read-only) shows last sync, errors, current offer versions — via the backend API.
```
Done when: all listed scenario tests pass; admin shows sync state; unpriced-callback path works.

### T11. Leads and draft grants (S)

**Prompt:**
```
Read REQUIREMENTS.md REQ 16–17, 34, 35 and IMPLEMENTATION_PLAN.md §7.

Task: implement leads in apps/backend (leads module).
- Tables: leads (workspace_id, status incomplete|submitted, contact fields, selected_offer_version_id nullable, payload JSONB {schemaVersion}, attribution JSONB {utm_*, referrer, landing_page, partner_code}, consent_version, timestamps), draft_grants (lead_id, token hash, expires_at, revoked_at).
- POST /api/v1/website/leads creates a lead + grant (website credential required); PATCH /api/v1/website/leads/:id requires the grant. Repeated saves update the same lead. Called only on explicit steps, no keystroke capture.
- A partner_code matching an active partner for that workspace links; unknown codes stored + flagged, not linked.
Tests: forged grant fails; grant from another lead fails; expired grant fails; attribution uses an allowlist and bounds; strips unknown/query/token/contact fields and overlong values; referrer reduced to approved origin and landing route to a known template, never arbitrary raw paths; consent_version required.
Admin: /w/[workspace]/leads list with source column + "incomplete" filter (via backend).
```
Done when: negative tests pass; leads list shows attribution.

### T12. Order model, statuses, and idempotent submission (M)

**Prompt:**
```
Read PLATFORM_CONTEXT.md §4 items 5–7 and 9, REQUIREMENTS.md REQ 14, 18–19, IMPLEMENTATION_PLAN.md §4 and §7 "Final submission".

Task: implement orders in apps/backend (orders module).
- Tables: orders (workspace_id, reference (short, unique per workspace, non-guessable), lead_id, status enum ['submitted','in_progress','awaiting_customer','ready_for_delivery','dispatched','activated','cancelled'], payment_state ['not_required','pending','paid'], delivery_state ['none','dispatched'], archived_at, assignee_id, version int, snapshot JSONB (offer_version_id, charges, currency, terms_version, documentChecklist, paymentRequired, amountPayableToday), payload JSONB, partner_id nullable, submitted_at), order_status_history, order_amendments, order_change_requests, idempotency_keys, outbox_jobs (Plan §9), dispatch_records, payment_records.
- POST /api/v1/orders in ONE transaction, IN THIS ORDER: (1) use previously authenticated website/customer authority (provider verification outside the transaction); (2) look up an existing completed order by the scoped idempotency key + request fingerprint — if found, return its stored reference WITHOUT re-validating the (now-consumed) quote; (3) same key, different payload → 409 conflict; (4) only for a genuinely new submission: validate the quote (same workspace/draft, unexpired, unconsumed, and allowed by the owner-selected withdrawal policy) → claim idempotency key → create order + snapshot + terms version → consume quote → link lead → write history → insert outbox jobs (order_acknowledgement_email, analytics_order_submitted) → commit → return reference. DB down → 503 retryable, NO success. Enforce one order per (workspace, draft/lead) and per scoped key with DB uniqueness constraints, not an app-level existence check; coordinate concurrent requests with constraints/locking. If a customer wants another order, they start a new draft.
- Transition functions (not raw status writes) with an allowed-transition map; each writes history + audit, takes expectedVersion, returns 409 on mismatch. T19 wires partnered activation and commission atomically; until then, partnered activation returns feature_not_ready without changing order state. T4P owns the minimal partner table. All real dispatch/activation transitions require the validated OPEN_INPUTS rules; fixtures do not authorize production.
Tests: double submit; timeout-after-commit retry returns the SAME reference; a completed request still returns its stored outcome AFTER its quote expires; conflicting payload → 409; two different keys for one submitted draft cannot create two orders; parallel requests create exactly one order + one quote consumption; failed commit leaves no partial rows; illegal transition rejected; cancellation requires reason.
```
Done when: all listed integrity tests pass; a synthetic submission commits email/analytics jobs and returns one reference. Submitted draft authority permits only safe retry lookup, not further edits.

### T13. SIM order form on site-1 (M)

**Prompt:**
```
Read REQUIREMENTS.md REQ 10, 16–18, IMPLEMENTATION_PLAN.md §11, PLATFORM_CONTEXT.md §4 items 3–6.

Task: build the multi-step order form at apps/site-1 /order using shadcn primitives from @canadian-plans/ui (add Stepper, FormField, FileDrop placeholder, ReviewCard there if missing). All data via the backend typed client; site-1 never touches the DB.
Steps: 1 Plan (published offers) → 2 Details (name, email, international phone + country code, arrival/destination, current country; capture UTM/referrer/partner code from URL/cookie) → 3 Documents (driven by the offer's documentChecklist; 'none' skips; upload wired in T17, placeholder now) → 4 Review + terms checkbox with terms version → 5 Confirmation with the reference.
Behaviour: end of step 2 shows "We'll save your details so you can continue later" and calls POST /leads via a server action + typed client; later steps PATCH the same lead. Step 4 calls POST /quotes then POST /orders with an idempotency key generated once per draft. Retry on timeout with the same key. On 503 show "not saved, please try again", NEVER a success screen. On quote failure offer "Request a callback".
Accessibility: labels, error summaries, focus management, mobile layout, one H1. Preview deploys noindex.
Tests: Playwright happy path against the test dataset; timeout retry returns the same reference; quote-failure path.
```
Done when: Playwright passes; usable on a phone; no success without a reference.

### T14. Admin order processing (M)

**Prompt:**
```
Read REQUIREMENTS.md REQ 19–21 and IMPLEMENTATION_PLAN.md §11.

Task: build the admin order journey in apps/admin — all data via the backend API (admin has no DB access).
- /w/[workspace]/orders: list with filters (status, assignee, partner, date, source), permission-aware search (reference, name, email, phone — workspace-scoped), archive toggle, bulk assign.
- /w/[workspace]/orders/[id]: read-only snapshot panel, customer + plan details, status transition buttons (allowed transitions only; cancel needs reason), assignment, notes, reminders, audit timeline, change-requests panel (approve/reject → audited amendment via backend), payment panel (shows paymentRequired/amount; Orders/Finance record manual payment), Dispatch action (courier, tracking ref, date → dispatched), Activate action (→ activated).
- Optimistic concurrency: send expectedVersion; on 409 "changed by X, reload".
- Every write calls a backend transition endpoint; no business logic in the UI.
Tests: role matrix (viewer cannot transition; orders can; finance cannot activate unless granted), 409 on stale edit, cancel without reason blocked. (Backend enforces; admin surfaces.)
```
Done when: an order is processed end to end in the UI; role tests pass.

### T15. Transactional outbox and job runner (S)

**Prompt:**
```
Read IMPLEMENTATION_PLAN.md §9 first paragraphs and PLATFORM_CONTEXT.md §4 item 7.

Task: implement the outbox runner in jobs/ and expose it as an authenticated Vercel Cron route ON THE BACKEND (apps/backend /api/internal/jobs/run, cron every minute, secret header). The required minute-level Vercel Cron cadence needs Pro and runs on the production deployment only, so test this on the dedicated staging project (T0), not a PR preview. No always-on worker — each cron run is bounded to fit function limits. Give the runner an explicit authorized workspace set and claim/process each workspace's jobs inside that workspace's transaction context — never scan all tenants' jobs on a broadly-privileged connection (PLATFORM_CONTEXT.md §4b). Claim the job + persist a lease in one transaction, COMMIT, then call the provider outside any open transaction, then record the outcome in another scoped transaction (R4).
- Claim up to N jobs with FOR UPDATE SKIP LOCKED + a lease; exponential backoff with jitter; max attempts → status failed + alert event; per-job dedup key.
- Resolve the scheduler's allowed workspace set from the verified server registry. Claim/update within short withTenantTx transactions; provider calls occur after commit, with only the job workspace's provider credential. Persist provider IDs, stable message IDs and uncertain send outcomes; reconcile instead of blindly resending ambiguous attempts.
- Handlers registry; implement order_acknowledgement_email against a FakeEmailAdapter, analytics_order_submitted with sanitized identifiers only. No commission placeholder handler; commissions are internal activation writes.
- Admin: /w/[workspace]/settings/jobs shows pending/failed jobs + Retry (permission integration_management), via backend.
Tests: lease expiry reclaim, backoff schedule, dedup, failure surfaces in admin, handler never runs outside a workspace context.
```
Done when: the cron route runs jobs; failed jobs visible and retryable.

### T16. A2 exit gate — journey evidence (S)

**Prompt:**
```
Read REQUIREMENTS.md §16 Phase A gates 3 and 4.

Task: write an end-to-end Playwright suite (site-1 + admin, hitting the real backend) proving: browser → lead → quote → order → admin processing. Use synthetic offers requiring no documents for this early slice; partnered activation and document enforcement are proved in T23 after T17/T19. Include: retry after a simulated timeout returns the same reference; forged draft grant fails; a CMS price change mid-checkout leaves the accepted order unchanged; offer withdrawal obeys each configured TEST policy and production checkout stays gated while OPEN_INPUTS #14 is unresolved; fake email failure leaves the order intact and the job failed.
Write docs/EVIDENCE/A2.md with results and screenshots.
```
Done when: suite green; evidence committed.

**GATE A2** — read docs/EVIDENCE/A2.md. Synthetic evidence does not authorize live offers. Real plan/pricing and withdrawal inputs must be validated before production publishing/checkout. If work overruns, update the forecast and preserve scope.

---

## Milestone A3 — Documents, email, partners, analytics

### T17. R2 documents: upload, verify, quarantine, download (M)

Manual first: create bucket `canadian-plans-site-1-docs` (private), an R2 API token scoped to it, CORS allowing only site-1 and admin origins for PUT/GET.

**Prompt:**
```
Read PLATFORM_CONTEXT.md §4 item 8, REQUIREMENTS.md REQ 22–25, IMPLEMENTATION_PLAN.md §8.

Task: implement documents in apps/backend (documents module) + @canadian-plans/adapters/r2. All upload/download flows run through the backend.
- Tables: files (workspace_id, record_type, record_id, document_type, bucket, object_key random, size, checksum, detected_mime, status uploading|verifying|available|rejected|deleted, uploaded_by, created_at), file_revisions, file_review_events.
- Adapter interface: createUpload, verifyUpload, issueDownload, copyForExport.
- Flow: POST /uploads/intents (authorise actor + parent record + checklist allows this type) → signed PUT URL (5 min) → client uploads to R2 staging → POST /uploads/:id/finalize → FIRST copy the staged object to a private candidate key with a unique object identity the uploader cannot write to (guards against swap-after-check; a presigned PUT can be reused until it expires) → THEN verify the CANDIDATE: existence, size ≤ 10 MB, signature PDF/JPEG/PNG (ignore declared Content-Type), checksum → on success atomically attach that exact candidate object to the file record as available; else rejected with reason. Concurrent/repeat finalize calls are safe (can't overwrite an approved object or create conflicting revisions) and return a consistent outcome. Cleanup job for expired intents + abandoned staging/rejected objects.
- Downloads: POST /files/:id/download-link checks workspace membership + document_download permission (or customer grant for own file) → signed GET (2 min), issuance audited. Serve originals as attachments with a sanitized filename and nosniff; no inline original-file viewer.
- Replacement → revision; delete → tombstone + scheduled cleanup, audited.
- Wire site-1's Documents step and an admin Documents panel (approve/reject with note), both via backend.
Tests: oversize; mislabelled type; swapping the staged upload during finalize cannot make unchecked bytes available; two simultaneous finalize calls can't overwrite an approved object or create conflicting revisions; repeated finalize returns a consistent outcome; the recorded checksum matches the object served to staff; expired link; foreign attachment id; missing permission; checklist mismatch.
```
Done when: all listed negative tests pass; upload works from the form; download only with permission.

### T18. Email adapter, consent and follow-ups (M)

Prerequisites from T0: sender/domain access, provider approval and quota review. SES is preferred pending OPEN_INPUTS #23; implement one selected provider after these checks, with FakeEmailAdapter in tests.

**Prompt:**
```
Read REQUIREMENTS.md REQ 26–27, 34 and IMPLEMENTATION_PLAN.md §9 "Email".

Task: implement communications in apps/backend and @canadian-plans/adapters/email.
- EmailAdapter + FakeEmailAdapter; SES implementation if approved, otherwise the explicitly selected alternative. Do not add automatic failover or two live integrations.
- Tables: email_messages, suppressions, consents (lead_id/order_id, marketing_opt_in, version, captured_at), follow_up_schedules. Use composite workspace FKs.
- Sender identity and templates: acknowledgement, status, awaiting-customer, dispatch, activation, abandoned-form marketing.
- Verified provider events → scoped inbox → delivery/bounce/complaint status and suppression; use server registry account/topic mapping and the provider's supported signature verification.
- Separate marketing unsubscribe from hard-bounce/complaint/address suppression: transactional messages ignore marketing opt-out only, never a deliverability suppression.
- Before follow-ups, re-read consent/suppression and lead/order state. Unsubscribe works without login. Feed durable suppression changes into the independent ledger protocol from §13, before claiming completion.
- Admin delivery view shows sent/delivered/failed/uncertain separately. Stable logical IDs and provider IDs permit reconciliation; ambiguous send timeouts do not trigger blind retries. No exactly-once email claim without provider support.
- EMAIL_PROVIDER=fake in CI/previews. Verify Auth custom SMTP separately; it does not inherit the customer adapter.
Tests: known duplicate logical job does not send twice; uncertain provider outcome is visible and reconciled; invalid event rejected; marketing opt-out honored; transactional allowed after marketing-only opt-out but blocked for hard suppression; bounce/complaint recorded; completed lead stops follow-ups.
```
Done when: controlled sandbox delivery, DNS authentication and provider events pass; production approval/quota and selected adapter recorded. No real customer sends during implementation.

### T19. Partners, referral codes, commissions (M)

**Prompt:**
```
Read PLATFORM_CONTEXT.md §4 item 10, REQUIREMENTS.md REQ 04 (Phase A part), 31–33, IMPLEMENTATION_PLAN.md §4 "Commission model".

Task: implement partners in apps/backend (partners module) for the SIM workspace.
- Extend partners from T4P; add commission_rules (type fixed|percentage, value, currency, effective_from/to), commission_lines (workspace_id, order_id with unique (workspace_id, order_id), partner_id, rule_id, rule_snapshot JSONB, amount, currency, state earned|carrier_paid|partner_paid, invoice_id nullable, state history), invoices + invoice_lines (tables only in Phase A; no generation UI).
- Activation hook: orders.activate() and its single commission line commit atomically using the valid rule effective at activation. Require OPEN_INPUTS #7/#17 and transition/evidence inputs for real activation; a TEST fixed-zero rule must never enter live immutable records. Reject and leave state unchanged when configuration is incomplete.
- Finance actions: mark carrier_paid (permission financial_data + verified aal2), audited. partner_paid remains disabled until approved-invoice support exists in B1 or OPEN_INPUTS #18 explicitly defines an interim approval mechanism; do not invent one.
- Admin: /w/[workspace]/partners list/detail (Partners role); referral codes, referred orders, commission lines + states; Finance sees carrier-paid actions; disabled payout UI explains the missing approval dependency. All via backend.
- Ensure order.partner_id is copied from the lead at submission (from T11). Feature flag partnerPortal=false; membership_type 'partner' reserved, no login path.
Tests: activation creates one line even when retried; rule change leaves old lines; commission state independent of order status; Partners role cannot mark paid; Viewer sees no payout details.
```
Done when: activation → commission visible; state actions audited; tests green.

### T20. Analytics: Umami + server events (S)

**Prompt:**
```
Read REQUIREMENTS.md REQ 35 and IMPLEMENTATION_PLAN.md §9 "Analytics".

Task:
- apps/site-1: Umami script for page views and plan_selected; completed lead/order events are emitted once from the backend outbox. No personal data or raw URLs in events; prevent duplicate client/server counting.
- apps/backend + @canadian-plans/adapters: AnalyticsSink with a fake/log implementation in tests and Umami server-event implementation for live lead/order events; stable event IDs, sanitized fields and correct site mapping. Phase B adds Google Ads/Meta sinks.
- admin: /w/[workspace]/reports/sources — leads and orders by utm_* and by partner, date range, workspace-scoped, via backend.
Tests: events contain no email/phone/name; report counts match seeds.
```
Done when: Umami shows page views + events; sources report matches seeds.

### T21. Privacy, terms, consent capture, deletion request (S)

**Prompt:**
```
Read REQUIREMENTS.md REQ 34 and REQ 24.

Task:
- apps/site-1: /privacy and /terms rendered from Sanity legalPage documents with a version; the form stores current terms version at submission (verify T13) and consent version at lead save.
- apps/backend: staff action "Delete customer data" on an order (permission deletion). Map personal data across ALL copies — the order, its lead, notes, amendments, audit before/after values, file revisions, email records, job payloads, idempotency responses — and remove or restrict each; keep the minimal commercial record (reference, snapshot) and an audit entry (reason + actor) WITHOUT copying deleted personal details into it. Also write a minimal **deletion ledger** row (identifiers + action only, never the deleted passport/contact data) that lives outside any single app-DB snapshot, so a later restore can replay it. Stop scheduled follow-ups and set suppression for the contact. Document in docs/RUNBOOKS/data-deletion.md.
- Integrate the §13 ledger protocol: commit restricted local intent; publish encrypted unique event after commit; require independent durable acknowledgement before irreversible cleanup/completion; retry idempotently and surface pending failures. Test unavailable ledger, crash between stages, duplicate event and restoration from before the deletion.
- docs/RETENTION_POLICY.md: owner-approved periods by category from OPEN_INPUTS #10/#16; use TEST-only values until set. Preserve commercial fields only after personal-field classification; snapshots must not retain customer contact data.
Tests: deletion removes/restricts ALL linked personal copies (lead, notes, old file revisions, personal audit values, email records) but order reference + commercial snapshot remain; a deletion-ledger row is written outside the app snapshot; follow-ups stop and the contact is suppressed; audit written without deleted personal details.
```
Done when: pages live with versions; deletion works and is audited.

### T22. Customer order tracking via email OTP (S — Phase A)

**Prompt:**
```
Read REQUIREMENTS.md REQ 05 and IMPLEMENTATION_PLAN.md §5 (customer grant).

Task: implement /track on apps/site-1 and the tracking endpoints on apps/backend.
- POST /api/v1/tracking/otp: customer enters reference + email; if they match an order in THIS workspace, send a 6-digit code (selected transactional EmailAdapter) — always respond 200 to prevent enumeration. Rate-limit by email and IP.
- Generate codes cryptographically; store a keyed hash bound to workspace/order/normalized email, expire in 10 min, permit at most five attempts, invalidate on resend and atomically consume. Rate-limit verification and issuance by challenge and IP.
- POST /api/v1/tracking/verify: only after successful atomic consumption, returns a scoped tracking grant (30 min).
- GET /api/v1/tracking: with the grant, returns status, dispatch tracking ref, and which documents are still required; never internal notes or staff names.
Tests: unknown recipient has indistinguishable response; guessing reference alone gives nothing; wrong/exhausted/expired code denied; resend invalidates old code; concurrent verification consumes once; grant expiry and cross-workspace denial; tokens absent from logs.
```
Done when: tracking works for a seeded order; enumeration tests pass.

### T23. A3 exit gate (S)

**Prompt:**
```
Read REQUIREMENTS.md §16 Phase A gates 5–9.

Task: extend the Playwright/integration suites to prove gates 5–9 and write docs/EVIDENCE/A3.md: role matrix, checklist + payment flag driving form and admin, document signature verification and permissioned download, email failure retry without duplicate order, DMARC pass screenshot, activation → one commission line, UTM and partner code on the order, Umami events.
```
Done when: evidence complete; all suites green.

**GATE A3** — read docs/EVIDENCE/A3.md. Preserve the Phase A scope and update the launch forecast if incomplete.

---

## Milestone A4 — Backup, observability, hardening, launch

### T24. Daily backup runner and full restore rehearsal (M)

Prerequisites: T0 provisions the recovery account; T4R proves Auth/ledger feasibility; T21 integrates deletion. Use the exact recovery/encryption/retention contract in IMPLEMENTATION_PLAN §13.

**Prompt:**
```
Read REQUIREMENTS.md REQ 41–44 and IMPLEMENTATION_PLAN.md §13 fully.
Implement jobs/backup and jobs/restore:
- Protected pinned GitHub Actions daily workflow + manual dispatch, isolated backup secrets. Source read/export and archive writer cannot delete archives; plaintext keys/data never enter logs or persistent artifacts.
- Consistent DB export including supported Auth and migration state → referenced-object manifest → R2 copies and Sanity dataset/assets → encrypt EVERY payload and manifest to the recovery recipient → upload and verify completeness/checksums → heartbeat.
- Prevent source cleanup racing snapshot references. Record per-system revisions and reconcile them with immutable order snapshots.
- Separate manifest-aware retention job/credential preserves 30 daily and 12 monthly points and all shared payloads they reference. Dry-run before deletion; test that a retained snapshot remains restorable after cleanup.
- Independent monitor alerts when the latest complete verified snapshot exceeds 26h; a stopped/partial job cannot issue success.
- Restore into an isolated recovery environment using separate decryption/read credentials: DB/FK counts, Auth login/MFA or rehearsed re-enrolment, revoked memberships/sessions, file checksums, catalogue consistency and RLS.
- Reconcile the independent ledger and checkpoint, replay later deletion/suppression/revocation intents, and fail closed on missing/stale/unverifiable evidence. Reconcile uncertain provider sends and external payment/dispatch effects before resuming jobs.
- Exercise corrupt ciphertext, missing object/key, failed Auth recovery and unavailable ledger. Record measured loss window, alert-response and restore duration; no zero-loss or fixed-time claim.
Perform a complete rehearsal with synthetic data in isolated staging; record docs/EVIDENCE/A4-restore.md and update the runbook.
```
Done when: complete archive/monitor evidence and successful full recovery exist, including identity access, retained documents, deletion replay and failure cases. Move the launch date if this gate fails.



### T25. Observability, alerts, synthetic check (S)

**Prompt:**
```
Read REQUIREMENTS.md REQ 40 and IMPLEMENTATION_PLAN.md §10.

Task:
- Structured JSON logging (requestId, workspaceId, actorId, route, duration) across backend, admin, jobs; a scrubber removing emails, phones, names, tokens, document-ish fields. Unit-test the scrubber.
- Error tracker SDK in backend, admin, jobs with release tags; test a thrown error appears with the request id and no PII.
- Synthetic order check: a backend job every 15 minutes running the full lead→quote→order flow against a dedicated "synthetic" workspace (fake email), then cancels. Alert on failure.
- Alert channel: email to owner (optional webhook) for failed job queue > 0 for 10 min, backup age, synthetic failure, error-rate spike. docs/RUNBOOKS/alerts.md.
```
Done when: an induced error shows in the tracker without PII; synthetic check runs; alert email received.

### T26. Hardening: rate limits, bot protection, headers, WCAG, performance sample (S)

**Prompt:**
```
Read REQUIREMENTS.md REQ 10, 37, 39 and §16 gate 12.

Task:
- Bot protection on the form (Turnstile or equivalent) and tighter rate limits on backend /leads, /quotes, /orders, /tracking/*.
- Security headers (CSP, HSTS, frame-ancestors, referrer policy) on site-1 and admin; CSRF on cookie-authenticated mutations; documented SameSite.
- Accessibility: axe in Playwright on /, /plans, /order steps, /track; fix serious/critical; one H1 per page; sitemap + robots; noindex previews and /studio.
- Performance: seed 10,000 synthetic orders across two workspaces; run a provisional burst of 20 concurrent submissions with 10 staff sessions. Measure order-save/admin-list p95, failures, pool saturation and queue age; verify no lost/duplicate orders and no tenant leaks. Record workload and results in docs/EVIDENCE/A4-perf.md; 100/day is a planning target, not a substitute for peak testing.
```
Done when: axe reports zero serious/critical; Lighthouse lab metrics recorded separately from field Core Web Vitals; perf numbers recorded.

### T27. Runbooks and handover docs (S)

**Prompt:**
```
Read IMPLEMENTATION_PLAN.md §18 "Handover documents".

Task: write docs/RUNBOOKS/*.md for: staff-onboarding-removal, cms-publishing-and-price-error, failed-email-recovery, dispatch-and-activation, commission-month-end (Phase A manual), backup-alert-response, restore (link), secret-rotation, release-rollback, monthly-cost-review. Each: purpose, required access, exact steps with UI paths/commands, verification, safe stopping point, escalation (owner). Update docs/ENV.md and docs/API.md to match reality.
```
Done when: every runbook has been read by you and one followed on staging.

### T28. Production upgrade and go-live — Manual + Prompt (S)

Owner launch preparation: confirm Vercel Pro already supports commercial hosting/staging cron, and production Supabase Pro/backups are active. Verify the configured Canadian regions, selected email provider approval/quota and authenticated sender, then point the domain at site-1; create production Sanity content with real plans + prices; add your content person as Sanity Administrator; invite staff with roles in admin; enrol MFA for you + Finance. Confirm all three Vercel projects (backend, admin, site-1) are on the Pro team.

**Prompt:**
```
Read REQUIREMENTS.md §16 Phase A gates 1–14.

Task: run the launch checklist. Produce docs/EVIDENCE/A4-launch.md by executing: owner-authorized production smoke test (controlled non-billable test order; no carrier activation/payment; archive after verification or cancel only through the approved cancellation process), DNS/DMARC verification, backup heartbeat green, synthetic check green, error tracker receiving, all staff logins with correct roles, previews confirmed to have no production env, the "@canadian-plans/db only in backend" boundary confirmed in the built apps, cost table updated with actual plan settings, open inputs reviewed. Change no code; if something fails, stop and report.
```
Done when: gates 1–14 each have evidence; website 1 is accepting orders.

---

# PHASE B — after launch

Each Phase B milestone follows the same pattern: read context → interface exists from Phase A → implement → negative tests → evidence.

### B1. Partner portal and monthly invoicing (M)
```
Read PLATFORM_CONTEXT.md §6 (partner portal row), REQUIREMENTS.md REQ 04, 33.
Task: enable membership_type 'partner' with Supabase Auth invitation from a partner record; backend RLS ownership predicate so a partner sees only own referred orders (limited fields), own commission lines, and APPROVED invoices; monthly backend job generating one draft invoice per partner per period from earned/carrier_paid lines (idempotent; approved period = no-op); owner/Finance approval UI freezing the invoice; payout marking. Feature flag partnerPortal per workspace. A partner portal may be a route in admin or a small separate frontend app — decide in an ADR; either way it only calls the backend. Tests: partner escalation, unapproved invoice hidden, regeneration idempotent, cross-workspace partner denied.
```

### B2. Hourly backups (S)
```
Read IMPLEMENTATION_PLAN.md §13 Phase B. Task: make runner cadence a config value, switch to hourly, extend existing incremental copying and manifest-aware cleanup to 48 hourly points, add a 75-minute age alert, measure GitHub Actions delay over a week, report cost deltas.
```

### B3. Onboarding command and websites 2–3 (L)
```
Read REQUIREMENTS.md REQ 06, 16, 45 and IMPLEMENTATION_PLAN.md §14 "Repeatable onboarding".
Task: jobs/provision — resumable, idempotent command creating workspace, Sanity project + schema deploy, R2 bucket + token, a new Vercel project for apps/site-2 (and site-3) + env, webhooks, selected email-provider identity, Umami site, seed content, sample order; writes a workspace manifest. Scaffold apps/site-2 (mobile-internet) and apps/site-3 (home-internet) from site-1 with their own embedded Studio, forms, and payload schemas; no SIM-only fields or partner menus inherited. Tests: provisioning re-run converges; each site submits to its own workspace; deploying one does not touch the others.
```

### B4. Export/import demonstration (M)
```
Read REQUIREMENTS.md REQ 46–47 and IMPLEMENTATION_PLAN.md §14 "Separation procedure".
Task: jobs/extract for a selective workspace export in dependency order (rows, offer/order history, partner data, audit actor labels, file manifest + copyForExport, Sanity export, config inventory), jobs/import into an empty target, count/checksum comparison, negative foreign-workspace search, synthetic cutover rehearsal. Evidence in docs/EVIDENCE/B4.md.
```

### B5. External adapters (L)
```
Read REQUIREMENTS.md REQ 28–30, 35 and IMPLEMENTATION_PLAN.md §9.
Task (one adapter per session): (a) DeliveryAdapter for the chosen courier (idempotency keys, timeout → query-by-reference, uncertain flag); (b) PaymentAdapter for the chosen provider — session from snapshot amount, webhook-only confirmation, no card data; (c) AnalyticsSink for Google Ads/Meta from stored attribution; (d) ExternalEventPublisher for n8n with signed minimal events. Each behind its workspace feature flag, sandbox-tested, with duplicate-event and ambiguous-outcome tests.
```

### B6. Load test and stabilisation (S)
```
Read REQUIREMENTS.md REQ 39 and IMPLEMENTATION_PLAN.md §16 last paragraph.
Task: run 20 concurrent submissions with 10 admin sessions against 10k+ orders on staging; report median/p95, errors, query counts, pool saturation, queue age; propose indexes/batching; update cost review and the backlog. Watch serverless cold-start and function execution time on the backend specifically.
```

---

## Session opener (paste at the start of every session, unless CLAUDE.md is in the repo root — Claude Code reads that automatically)

```
Read PLATFORM_CONTEXT.md in full. Then read the sections of REQUIREMENTS.md and IMPLEMENTATION_PLAN.md that the task names. Before writing code: (1) name the app or package you're working in, (2) list your assumptions, (3) list any open inputs you need and use placeholders logged in OPEN_INPUTS.md, (4) confirm which PLATFORM_CONTEXT.md §4 invariants this task touches. Only apps/backend may touch the database. Work on this one task only. End by showing test output (including negative tests) and the docs you updated.
```
