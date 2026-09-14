# PLATFORM_CONTEXT.md

The single source of truth for what Canadian Plans is and how it must be built. AI agents read this in full at the start of every session, before touching code. If anything you're about to do conflicts with this file, stop and say so.

Also follow [AGENTS.md](AGENTS.md) for the shared session workflow and required
project skill. Read each startup document once per session; do not loop through
links to documents already read.

---

## 1. What this is

Canadian Plans is a new, independent business owned solely by Takib (Dhaka-based). It sells Canadian telecom plans to an **international** audience — people buying *before* they arrive in Canada (students, immigrants, workers, tourists). One legal entity, one owner who approves everything, roughly 5–6 staff at launch working in functional areas (orders, partners, finance, content). Only the owner deploys to production. All code is written by AI agents under the owner's direction.

This is **not** Get Canada SIM. That was a separate, earlier venture. Do not carry over its branding, content, or business data. The old `Md-Takibuddin/canadaesim` repo may be consulted as a **code-pattern reference only**, never as a business reference.

## 2. The apps

Five deployable apps, one shared database. Each app is a separate deployment on Vercel; they share code through workspace packages, never through the database directly except via the backend.

| App | What it is | Talks to |
|---|---|---|
| **backend** | Express + strict TypeScript API. The **only** app that connects to the database. | Supabase Postgres (pooled), R2, selected email provider |
| **admin** | Next.js app for staff — orders, partners, finance, content, settings. | backend API only |
| **site-1** | Next.js storefront — SIM / mobile plans (Rogers). Launches first. Embeds Sanity Studio. | backend API + its own Sanity |
| **site-2** | Next.js storefront — mobile-internet plans. Phase B. | backend API + its own Sanity |
| **site-3** | Next.js storefront — home-internet plans. Phase B. | backend API + its own Sanity |

The three storefronts are **separate brands** with their own names, domains, look, content, and Sanity project. They share only code. One shared admin and one shared backend serve all of them; a workspace (tenant) per site keeps their data separate inside the one database.

## 3. Tech stack (current baseline; changes require a recorded rationale)

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript, strict everywhere | `any` is banned. See §4. |
| Backend | **Express** (strict TS) | The only DB client. Deployed as **Vercel Functions** — subject to serverless limits; use the pooled DB connection. Scheduled work (outbox, reconciliation, synthetic check) runs via Vercel Cron, which needs **Pro for the required minute-level cadence** — Hobby caps cron at once-daily and only runs it on production deployments, so the Pro upgrade (or an external scheduler) must be in place before scheduled work is integrated, not left to launch day. |
| Frontends | **Next.js** (App Router) | admin + 3 sites, each its own Vercel project. Never touch the DB. Each storefront's *server* may hold only its own scoped backend service credential; the browser holds none. |
| Hosting | **Vercel**, Canada function region (set explicitly on every project) | Everything runs here. Use local development and eligible free services initially; Vercel Pro before commercial hosting or scheduled-work integration. A dedicated **staging Vercel project** (its production deployment wired only to staging DB/storage/CMS + a fake email sink) is what actually exercises cron; PR previews use manual job invocation only. |
| Database + Auth | **Supabase** (Postgres + Auth), Canada region | Free during build → Pro at launch. Backend connects via the **pooled** connection string (Supavisor, transaction mode). |
| Tenant isolation | Postgres **RLS** + per-request tenant context | `SET LOCAL app.workspace_id` inside each transaction — works under the transaction-mode pooler. |
| File storage | **Cloudflare R2** | Private buckets, signature-verified uploads, signed download URLs. |
| CMS | **Sanity** (Free), embedded per site | Official `next-sanity` template; Studio mounted at `/studio` in each storefront. One Sanity project per site. |
| Email | **EmailAdapter; Amazon SES preferred candidate** | SES production access, verified sender and delivery-event tests must pass before selection is final. Resend is an alternative if SES is unsuitable, not an automatic migration or failover. |
| Analytics | **Umami** | No PII in events. |
| UI | **shadcn/ui** via shadcn MCP | No Figma phase. Shared primitives in a workspace package. |
| ORM / validation / tests | **Drizzle**, **Zod**, **Vitest**, **Playwright** | Vitest for unit/component; Playwright for e2e. In backend and every frontend. |
| Error tracking | Sentry-class tool | No PII in traces. |
| Backups | **GitHub Actions → Backblaze B2** | Custom job (T24). Independent of Supabase plan tier. |
| Automation | **n8n** | Phase B only. Not at launch. |
| Monorepo | **pnpm workspaces**, one repo | `apps/*` + `packages/*`. Shared code lives in packages, not copied. |

**Outside the current baseline:** VPS / always-on hosting, self-hosted Supabase, form builders, shared content across brands, universal customer accounts, multilingual content, SMS/WhatsApp, refunds/cancellation logic, publishing shared packages to an external registry (they stay in-repo as workspace packages).

## 4. Non-negotiable invariants

These are the things that must never break, regardless of what a task asks for. If a request would violate one, stop and name it.

1. **Every tenant table carries `workspace_id NOT NULL`.** No exceptions. Child rows reference parents by `(workspace_id, id)`, never `id` alone. (Genuinely global tables — the workspace registry and platform identities — are the only ones without it, and they hold no tenant business data.)
2. **Isolation is enforced twice:** once in the backend (authorization check per request) and once in Postgres (RLS policy reading `app.workspace_id`). A policy that says `USING (true)` is a bug. Missing tenant context denies ordinary tenant operations, never allows. The narrow, documented **bootstrap lookups** are the exception (see §4b): a server-verified actor discovering only their own memberships, a website credential resolving to its own workspace, and verified machine identities resolving through the server-owned registry in §4b — never a caller-supplied workspace.
3. **The backend is the only database client.** Admin and all storefronts reach data *only* through the backend API. No frontend — not even admin — opens a DB connection or imports `@canadian-plans/db`. The only exceptions are explicitly-documented offline tooling that is not a business app: migrations, the backup job, and restore scripts.
4. **Prices and offers come only from the server, validated server-side.** A price submitted by the browser is never trusted. The backend re-reads the authoritative offer before quoting.
5. **Orders freeze a full commercial snapshot at submission.** Later CMS or price changes never alter an existing order.
6. **One order per submitted draft, one per idempotency key — and a retry returns the existing order *before* re-checking anything it already consumed.** On submission the backend first looks for a completed order with the same scoped idempotency key + request fingerprint and returns it if found (even though its quote is now consumed/expired); only for a genuinely new submission does it then validate the unused, unexpired quote. A different payload under the same key is a conflict. Database uniqueness on (workspace, draft) and on the scoped key — not an app-level "does it exist?" check — is what guarantees one order.
7. **External side effects go through the transactional outbox; internal writes and bounded verification do not.** Creating the order with its history and snapshot, recording manual dispatch/payment, and creating the commission during activation are internal DB transactions at their respective transitions. *Requests* to send email or publish an external event are inserted as outbox rows in the same transaction, then executed **after commit** by the runner. Bounded synchronous provider calls that a request genuinely needs (Supabase Auth/session verification, a CMS read for pricing, file-signature checks, bot checks) are allowed — but never while a DB transaction or row lock is held open. Nothing external runs inside the transaction.
8. **Uploaded files are private and verified by signature,** not by extension or declared type. The finalize step verifies a private candidate copy the uploader can no longer change (guarding against swap-after-check), then atomically attaches that exact object; stored in private R2, served only via short-lived signed URLs after a permission check.
9. **Order status, payment state, and delivery state are independent dimensions.** They don't collapse into one field.
10. **Commission is earned only on activation,** never on submission, created exactly once per order with the commission rule snapshotted at activation time. Carrier pays Canadian Plans first, then Canadian Plans pays the partner. Invoice generation is idempotent.
11. **Every action is audited** with who, when, what changed (without copying unnecessary personal data into audit values). Consent and terms versions are recorded at capture (CASL). **Owner and Finance privileged actions require a verified `aal2` session** — the backend checks the session actually completed MFA this login, not merely that a factor is enrolled.
12. **No PII in logs, errors, analytics, or URLs.** Emails, phones, names, documents, tokens — scrubbed. Attribution captured from URLs is stored in a bounded, sanitized form, never forwarded raw to analytics/logs.
13. **No production credentials in preview or PR-CI environments.** The backend uses the Postgres runtime role with RLS, never the Supabase service-role key in application code. The one documented exception is a dedicated, isolated production **backup workflow** (protected branch, pinned actions, protected secrets) that gets only the read/export + archive-write access it needs — archive-write must not include archive-delete.
14. **Strict types, no `any`.** Shared types, Zod schemas, and the DB schema derive from one source of truth (see §4a). A cast to `any` or an unchecked `as` to dodge a type error is a bug, not a fix. **But a DB row type is not an API response type:** define explicit allowed request/response fields per audience (customer/staff/partner/viewer) and enforce them server-side; never expose a whole row to satisfy DRY.

### 4b. Bootstrap lookups (verified identities before tenant context)

The backend needs to know which workspaces an actor may enter *before* it can set `app.workspace_id`. Three narrowly scoped identity paths solve this without weakening isolation:

- **Staff:** a server-verified Supabase actor may read only their own active memberships and permitted workspace identifiers — scoped to `actor_id`, returning membership metadata only, never other tenants' data.
- **Website:** a valid service credential resolves to its own workspace, scopes, and revocation status. A caller-supplied workspace is still never trusted.
- **Machines:** a server-only integration registry maps each webhook endpoint/key to one provider account, workspace and verification secret, and each verified scheduler identity to explicit workspace IDs and job scopes. Treat URL IDs as untrusted selectors; verify the mapped signature or scheduler secret before deriving context. Unknown, revoked, mismatched account or foreign-workspace identities fail closed. The registry is deployment configuration maintained through the owner's release process, contains no customer data, and does not require a cross-tenant DB read. Staging and production registries and secrets are separate; rotation requires deployment and a revocation test.

Implement the staff/website DB lookups as tightly actor/credential-scoped access (or a constrained, owner-defined lookup function with fixed inputs, returned fields, search path, and grants) under the real restricted runtime role — never as general cross-workspace read, `BYPASSRLS`, or a service-role client.

### 4a. DRY / single source of truth

Types, validation, and schema must not be hand-duplicated across apps. Define once, derive the rest:

- Domain types and Zod schemas live in shared packages (`@canadian-plans/contracts`, `@canadian-plans/types`).
- The Drizzle DB schema (`@canadian-plans/db`) is the source for row types; Zod request/response schemas derive from or are checked against them.
- If a derivation can't be expressed in types alone, add a small codegen script in the repo rather than copying by hand.
- The backend and every frontend import these packages; none redefine a type the packages already own.
- **DRY does not mean one type for everything.** DB row types live in `@canadian-plans/db`; API request/response schemas live in `@canadian-plans/contracts` and expose only the fields each audience is allowed to see. Deriving field *validation* is good; reusing a row type as a response type is a leak. Keep server-only adapter code out of browser bundles, but export browser-safe Sanity schema types (the embedded Studio needs them).

## 5. Phase A scope (build now; launch when gates pass)

Backend + admin + **site-1 only**. One workspace (site-1). Everything needed to take a real SIM order end to end: catalogue sync from Sanity, priced quotes, lead capture with resume, idempotent order submission, admin order processing (assign/note/remind/dispatch/activate), document upload/verify/download, transactional + marketing email with consent, partners and commission-on-activation, analytics, privacy/terms, isolation tests, and a rehearsed backup+restore. Sites 2 and 3 are **not** built in Phase A, but the code must not assume there is only one site. Use a second synthetic workspace for isolation tests. Initial capacity target: 100 orders/day, with a staging burst test; this is a target to verify, not measured capacity. Preserve the full Phase A scope and move the launch date when necessary; 30 September is no longer a commitment.

## 6. Phase B (leave room for — build the seam now, not the feature)

| Phase B thing | What to leave room for now |
|---|---|
| Partner portal (partner login) | `membership_type = 'partner'` reserved; portal flag off; no login path yet. |
| Invoice generation UI | Invoice + invoice-line tables exist; no generation UI in Phase A. Partner payout marking stays disabled until invoice approval is available, unless the owner resolves OPEN_INPUTS #18 with a documented interim approval workflow. |
| Sites 2 & 3 | Nothing hardcodes "one site". Workspace onboarding is a documented procedure. Sanity is per-site by construction. |
| Data export / import | Keep a clean serialization boundary in the backend. |
| Hourly backups / PITR | Backup job parameterized by frequency; daily now. |
| Delivery / payment providers | Behind adapter interfaces; manual courier + manual/flagged payment now. |
| Ad conversion events (Google/Meta) | `AnalyticsSink` interface; only a log/Umami sink now. |
| n8n automations | Not wired in Phase A. |
| Load test | Deferred; keep endpoints measurable. |

## 7. Decisions already made (don't re-ask)

Owner approves everything, no co-founder · region = Canada for the **database and functions** (not a blanket promise that every provider stores everything in Canada — record the chosen email provider's actual region, R2 location hints aren't a guarantee; record actual provider regions and reflect them in the privacy policy) · Sanity roles: owner is Administrator (Free has no Editor role); content staff get Administrator · analytics = Umami · delivery = manual courier, recorded in admin · payments = manual, per-plan `paymentRequired` flag, provider TBD in Phase B · no refunds, no such policy · English only · email only (no SMS/WhatsApp) · customers are international, any country/phone accepted · documents = per-offer checklist, PDF/JPG/PNG, ≤10 MB, signature-verified, no malware scanner yet (deliberate) · partners = referral agencies, commission on activation, carrier pays Canadian Plans then Canadian Plans pays partner, monthly owner-approved invoices · design = shadcn only, no Figma · backend = Express on Vercel functions · monorepo = one pnpm repo, shared code in workspace packages (not published to a registry) · one shared DB · **Supabase billing is per-organization, so staging can't be Free alongside a Pro prod project in the same org — either put staging in its own Free org or budget it as a second paid project.**

### Review decisions — 14 September 2026

- Company/umbrella brand: **Canadian Plans**, confirmed by the owner. This does not establish a registered legal entity name, domain ownership or the names of individual storefronts. Planned repository/package/resource identifiers use `canadian-plans`.

- Owner prefers managed services that grow through plan upgrades; technology choices may change for clear cost or maintenance benefits, recorded before implementation.
- Build and maintain through AI under the owner's direction; the owner handles approvals, account access and production deployment. Require tested scripts, diagnostics and runbooks rather than assuming AI will recover an undocumented system.
- Use free plans where permitted during development. Vercel Pro is approved in principle when required; production Supabase Pro is the standard baseline. Do not interpret this planning decision as authority to purchase or deploy.
- Standard recovery baseline: managed daily database backups, a separate encrypted daily archive covering DB/Auth, R2 and Sanity, independent alerts and a rehearsed restore. Exact recovery-time/loss objectives and PITR are deferred, not launch blockers for development. This baseline does not promise zero loss. Pause checkout when integrity cannot be established rather than confirm an unsafe order; measure actual recovery before launch.
- Amazon SES is a preferred email candidate subject to account approval and integration verification; finalize through OPEN_INPUTS #23 before live sending. No provider migration is required merely because volume grows.

## 8. How to decide when the task is ambiguous

1. Does it conflict with a §4 invariant? → Stop, name the invariant, don't work around it.
2. Is it a business rule (price, commission, document requirement, policy)? → Don't invent it. Check `OPEN_INPUTS.md`; if missing, use a clearly named TEST-only placeholder, log it there, and continue independent work. Real publishing, dispatch, activation and payout remain disabled until their required inputs are validated.
3. Is it a Phase B thing (§6)? → Build the interface/flag only, say you're doing so.
4. Is it a technical choice in §3? → Use the current baseline. Propose cost/maintenance improvements with a recorded rationale; do not silently migrate.
5. Anything left genuinely open and technical? → Pick the option that best preserves the invariants, state your assumption, proceed.

## 9. Definition of done (per task)

- Strict types, no `any`, no unchecked casts.
- Unit/component tests (Vitest) **and**, where a user flow is involved, e2e (Playwright) — including the negative cases, not just the happy path.
- No new duplication of a type/schema a shared package already owns.
- Docs updated in the same change (ADR, API, schema history, env, runbook as relevant).
- Test output and the list of changed docs shown at the end.

## 10. Repo layout (one pnpm monorepo)

```
canadian-plans/
  apps/
    backend/          Express + TS. The only DB client. Deploys as Vercel functions.
    admin/            Next.js staff app. API client only.
    site-1/           Next.js storefront (SIM). Embeds Sanity Studio at /studio.
    site-2/           Next.js storefront (mobile internet). Phase B.
    site-3/           Next.js storefront (home internet). Phase B.
  packages/
    types/            @canadian-plans/types — shared domain TypeScript types.
    contracts/        @canadian-plans/contracts — Zod schemas + API request/response types + typed client.
    db/               @canadian-plans/db — Drizzle schema, migrations, withTenantTx helper. Imported only by backend.
    ui/               @canadian-plans/ui — shared shadcn primitives + design tokens.
    adapters/         Backend-only provider adapters; browser-safe CMS schemas live in contracts/cms.
    config/           @canadian-plans/config — shared tsconfig, eslint, vitest, prettier presets.
  jobs/               Outbox handlers invoked by backend cron; offline backup/restore/retention tooling runs separately.
  REQUIREMENTS.md     Product requirements (root planning file).
  IMPLEMENTATION_PLAN.md  Architecture and technical contracts (root planning file).
  BUILD_TASKS.md       Task prompts and dependency order (root planning file).
  OWNER_PLAYBOOK.md    Owner's workflow (root planning file).
  OPEN_INPUTS.md       Business inputs and confirmed decisions (root planning file).
  docs/               API.md, SCHEMA_HISTORY.md, ENV.md, ADR/, RUNBOOKS/, EVIDENCE/ (implementation artifacts)
  CLAUDE.md           Read automatically every session.
  PLATFORM_CONTEXT.md This file. Read in full every session.
```

Each Vercel project points at one `apps/*` directory. Only `apps/backend` among business apps may import `@canadian-plans/db`; allowlist its defining package and offline migration/backup/restore/test tooling separately. Enforce frontend exclusion with lint and build checks.

## 11. Glossary

- **Workspace / tenant** — one site's slice of the shared database. site-1 is one workspace.
- **Offer version** — an immutable snapshot of a plan's commercial terms; orders reference a specific version.
- **Quote** — a short-lived, server-authoritative price tied to an offer version.
- **Draft grant** — a token letting an anonymous visitor resume their own in-progress lead.
- **Service credential** — a per-site secret the storefront uses to call the backend; scoped, revocable.
- **Outbox** — the table of queued side-effect jobs run by the background runner.
- **Commission line** — one earned commission for one activated order, with the rule snapshotted.
- **Evidence file** — `docs/EVIDENCE/*.md`, the proof a gate passed.
