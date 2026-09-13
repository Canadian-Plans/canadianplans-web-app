# Canadian Plans — Multi-Website Business Platform Requirements
Business and product requirements for an AI-assisted build
Version 2.3 | 14 September 2026 | Owner: Takib (sole approver)

# 0 Document control

| **Item** | **Value** |
| --- | --- |
| Business | Canadian Plans, a new independent business. No relationship with any existing SIM reseller or its systems. |
| Approver | Takib — solo founder, product owner, sole deployer |
| Builder | Takib using AI coding agents with MCP tool access (available Supabase, Vercel, Sanity, Cloudflare, email-provider, tracker and shadcn tools) |
| Companion | Implementation Plan v3.2 (14 September 2026). REQ IDs in this document are referenced there. |
| Status | Reviewed Phase A baseline. Technical changes require a recorded rationale; unresolved business inputs remain in OPEN_INPUTS.md. |

| **Version** | **Date** | **Change** |
| --- | --- | --- |
| 1.0 | 9 Sep 2026 | Initial draft (framed around a legacy business) |
| 2.0 | 9 Sep 2026 | Reframed for Canadian Plans; added Phase A launch cut and Phase B; added privacy, analytics, observability, activation status, partner invoice workflow, per-plan document and payment settings, team roles, WCAG target, terms acceptance, cost model with free build phase; renumbered REQ 01–47 |
| 2.1 | 12 Sep 2026 | Architecture update (no REQ renumbering): standalone Express backend as the only DB client; admin and each storefront are separate frontend apps in one pnpm monorepo with shared workspace packages; Sanity Studio embedded per site; strict TypeScript with no `any`, DRY single-source-of-truth for types/Zod/DB schema, and Vitest+Playwright across all apps added as engineering requirements (see §2 and REQ 48–51) |

| 2.2 | 14 Sep 2026 | Technical review: preserve Phase A and move the date; 100 orders/day initial target; paid services when required; SES candidate; correct isolation, retry, upload, deployment and recovery contracts; keep unresolved business rules gated. |

| 2.3 | 14 Sep 2026 | Company name confirmed as Canadian Plans; align planned repository/package/resource names. Storefront names and legal billing identity remain separate inputs. |

# 1 Purpose and intended outcome

Build a platform that lets Canadian Plans operate several independently branded websites while managing all leads and orders through one central admin application. Launch one SIM website first; later add the other two websites for three different plan types for the Canadian market: mobile/SIM plans (first to launch), mobile-internet plans, and home-internet plans. Each website has its own domain, content, products, prices, order form, email identity, and workspace in the admin.

The central backend provides shared operational capability: staff permissions, order processing, documents, notes, reminders, email, partner commissions, backups, and reporting. Content is separate for every website and lives in that website's own Sanity project. Any website must be able to become an independent business later — own frontend, CMS, backend, admin, records, files, and credentials — using the same software.

The platform is built by one person with AI agents. Every requirement is therefore written to be unambiguous, testable, and small enough to implement as a bounded task. This document states what must be delivered and how it is accepted. The Implementation Plan states how it is built, in what order, and with what verification gates.

# 2 Confirmed decisions, constraints, and defaults

## Confirmed technology decisions

| **Technology** | **Responsibility** |
| --- | --- |
| TypeScript (strict) | Every app and package. `any` is banned; shared types are the source of truth. |
| Express (strict TS) | The backend API — the **only** app that connects to the database. Deployed as Vercel functions. |
| Next.js | Each public website and the custom admin — separate frontend apps that call the backend API and never touch the database. |
| Vercel | One project per app (backend, admin, each website), all from one monorepo; functions in a Canadian region |
| Supabase | Managed PostgreSQL and staff/partner authentication; one project in a Canadian region; backend connects via the pooled connection |
| Cloudflare R2 | Private operational documents and attachments; one bucket per website |
| Sanity (Free plan) | One CMS project per website, **Studio embedded in that website** at `/studio`, for pages, products, published prices, and public images |
| EmailAdapter | Amazon SES preferred candidate, contingent on production access and delivery testing; Resend alternative. Select before live sending, then grow through usage/plan upgrades. |
| Umami | Web analytics on every website; self-hosted or cloud, one site ID per website |
| shadcn/ui | Admin and storefront component system, driven through the shadcn MCP and templates; shared primitives in a workspace package |
| pnpm monorepo | One repository holding every app and shared package; shared code consumed as workspace packages, not published to a registry |
| Drizzle · Zod · Vitest · Playwright | Typed schema · runtime validation · unit/component tests · end-to-end tests, in the backend and every frontend |

Self-hosting, a VPS, self-hosted Supabase, an always-on backend host, and publishing shared packages to an external registry are rejected. Public marketing images belong in Sanity so editors manage them naturally; R2 holds operational files only.

## Business constraints

- One launch website, later three brands; one owner and legal entity. Initial capacity target: 100 orders/day. Verify a representative staging burst; the daily number is not a peak-throughput guarantee.
- Customers are international (any country), applying for Canadian plans. Forms must accept international phone numbers and addresses; each website displays one currency.
- Team: the owner plus roughly five to six staff from launch, split across orders, partners, finance, and content. One person may hold several roles. Role-based permissions are therefore a launch requirement, not a later feature.
- Only the owner deploys code. All code is written by AI agents under the owner's direction, so the system needs clear module boundaries, reproducible setup, small tasks, meaningful tests, and written operating procedures.
- English only. No SMS or WhatsApp messaging in the initial platform.
- Budget: use free plans where permitted in development; necessary paid services are acceptable at launch or earlier for commercial hosting and scheduled integration tests. Prefer plan upgrades over technology migrations. Section 15 separates fixed costs, usage and optional services.
- Timeline: preserve full **Phase A** (first SIM website, backend and admin) and move the launch date until the gates pass. September 30 is a historical target. **Phase B** follows launch; Section 3 defines the boundary.

## Proposed defaults

The following are engineering proposals, adjustable before their milestone without changing the platform structure: a 15-minute checkout quote; the order statuses in Section 7; multi-factor authentication for the owner and finance roles; recovery-time and data-loss targets deferred by the owner; a measured restore rehearsal required; Phase A daily backups moving to hourly in Phase B; backup retention of 30 daily and 12 monthly points in Phase A, plus 48 hourly points in Phase B.

Exact website names and domains, the mobile-internet and home-internet offer rules, the courier, the payment provider, and tax rules are launch-configuration inputs. Their absence does not block the platform; an integration stays disabled until its rules and credentials exist.

# 3 Scope and phases

## Phase A — complete launch scope (date follows gate completion)

Website 1 (SIM/mobile plans) live and accepting orders, and the admin operating it:

- One deployed website shell with its own Sanity project, branded content, and a coded order form.
- Central admin with the SIM workspace, staff invitations, and role permissions (Owner, Orders, Partners, Finance, Content, Viewer).
- Partial leads, final submission with a stable reference, order statuses, notes, reminders, assignment, search, audit history.
- Product and price synchronisation from Sanity; authoritative quotes; immutable order snapshots.
- Per-plan document checklist; private document upload, review, and download through R2.
- Email acknowledgements and follow-ups through the selected EmailAdapter with the website's identity, plus delivery-status visibility.
- Manual courier dispatch recorded in the admin (no delivery API).
- Partner attribution on leads and orders (partner code/record) and commission recording on activation. No partner login yet.
- Umami analytics with UTM attribution captured on leads and orders.
- Daily independent backup with one rehearsed restore before launch.
- Error tracking and structured logs.

## Phase B — after launch

Websites 2 and 3 through the repeatable onboarding process; partner portal (login, own orders, invoice visibility); automatic monthly partner invoice generation with owner approval; hourly backups and the 75-minute backup-age alert; workspace export/import demonstration; delivery-provider API adapter; per-plan online payment; n8n automations; broader performance/load testing beyond the Phase A burst check.

## Outside scope

A general form builder; shared content or products across brands; a universal customer account across brands; multilingual content; editorial approval workflows or scheduled publishing; SMS/WhatsApp messaging; refunds or cancellation fees (no such policy exists today); automatic carrier provisioning; a marketplace; migration of any pre-existing website or data. A new product workflow may need code even though products and pages are CMS-editable.

# 4 People and access

**REQ 01 Owner access.** The owner can access every workspace, invite and remove staff, assign roles and individual permissions, configure integrations, inspect backup and job health, approve partner invoices, and start a controlled workspace export. An all-websites summary shows aggregates only from workspaces the signed-in person may access.

**REQ 02 Staff access.** Permissions combine workspace membership, one or more roles, and individually grantable sensitive permissions. The server rejects unauthorised records, files, exports, and actions regardless of what the UI shows. Removing a member takes effect on the next protected request, not when a token expires.

**REQ 03 Content editors.** Content is edited in Sanity, whose permissions are separate from the admin's. Each workspace shows an Open CMS link to its project. Sanity Free provides Administrator and Viewer roles only; the content staff member is granted Administrator on each website's Sanity project and is trained accordingly. Restricted editor roles require a paid Sanity project and are not promised. [S1]

**REQ 04 Partners.** Partners are external agencies that refer customers. In Phase A a partner is a record and a referral code; staff attribute leads and orders to it. In Phase B approved partners can sign in and see only their own referred orders, commission status, and approved invoices within the SIM workspace. Partners never see other partners, other websites, or unapproved invoices.

**REQ 05 Customers.** Customers submit forms without creating an account. Order tracking uses verified email access (one-time code) scoped to the originating website. Matching phone or email helps staff search; it never merges people or reveals activity on another brand.

| **Role** | **Scope** | **Typical allowed work** |
| --- | --- | --- |
| Owner | All workspaces | Everything, including staffing, integrations, exports, invoice approval |
| Orders | Assigned websites | Leads, orders, customer contact, documents review, dispatch, activation marking |
| Partners | SIM workspace | Partner records, referral attribution, commission status, invoice preparation |
| Finance | Assigned websites | Payment status, commission payout, invoice approval when delegated, financial exports |
| Content | Assigned websites | Open CMS link; no order data unless also granted Orders or Viewer |
| Viewer | Assigned websites | Read-only orders and reports; no documents unless granted |
| Partner (external, Phase B) | SIM workspace, own records | Own referred orders and approved invoices |

Roles are permission templates. Document download, financial data, bulk export, deletion, invoice approval, and integration management are separately grantable permissions. A person may hold several roles.

# 5 Website and CMS

**REQ 06 Independent websites.** Each website owns its domain, navigation, branding, hero and background images, content, offers, order fields, email identity, analytics site ID, and SEO settings. A site-only change deploys that site only; shared-package changes build/test all affected consumers and release them deliberately. Use the monorepo dependency graph, affected-project build controls, and an explicit owner deployment selection. Record Git SHA, lockfile and schema compatibility per release; workspace packages stay in-repo, without an external publishing workflow.

**REQ 07 Editable content.** Editors manage page titles, text, images with alt text, hero backgrounds, buttons, FAQs, testimonials, blog posts, country landing pages, menus, footer, contact details, and SEO fields, and can add, remove, reorder, and configure approved section types. Arbitrary code or new components cannot be added through rich text.

**REQ 08 Preview and publishing.** Drafts can be previewed by authenticated editors and never appear on public pages, in search indexes, or in pricing. Publishing triggers a website refresh. A failed synchronisation is visible in the admin and retried; it never reports an unprocessed price as active.

**REQ 09 Separate content ownership.** One Sanity project per website. Shared schema and component code are allowed; shared content records or cross-project references are not.

**REQ 10 SEO and accessibility.** One H1 per page, correct heading order, editable metadata, canonical URLs, sitemap controls, redirects, structured data reflecting visible facts, and preview deployments excluded from indexing. Country pages allow materially distinct content. Public pages and the order form meet WCAG 2.1 AA for labels, contrast, keyboard use, and mobile layout.

# 6 Products, plans, and pricing

**REQ 11 Editorial source of truth.** Products and prices are edited in the website's Sanity project. The admin displays synchronised data and order history; it is not a second catalogue. A stable product identifier survives title and slug changes.

**REQ 12 Offer information.** Each offer models: product type, currency, displayed recurring charge, one-time fees, amount payable to the website today, eligibility, availability, billing party, contract or promotional conditions, and product specifications (SIM: carrier, data allowance; internet: speed, address conditions). Each offer also carries two operational settings that the order form and admin obey: **payment required** (yes/no, and the amount collected by the website) and **document checklist** (which document types the customer must upload, e.g. passport, visa, address proof, none). An advertised carrier fee does not authorise the website to charge it.

**REQ 13 Authoritative validation.** The backend validates the selected offer and price from published CMS data. Customer-submitted amounts are never trusted. A securely stored quote identifies offer version, charges, terms, and expiry (proposed 15 minutes). An expired quote requires a new quote and explicit customer confirmation. Withdrawal blocks new quotes; treatment of already-issued quotes is the unresolved policy in OPEN_INPUTS #14. Model and test both policies with synthetic data; production priced checkout remains disabled until the owner selects one.

**REQ 14 Historical correctness.** Each order stores an immutable snapshot of product, price components, currency, terms, document checklist, payment setting, and offer version. Later CMS edits do not change it. Staff adjustments create a separate audited amendment.

**REQ 15 Provider failure.** If the current price cannot be verified, the system may save a clearly labelled unpriced lead or callback request but never a confirmed order with an unverified amount. Staff can see synchronisation errors and the last successful update.

# 7 Leads and orders

**REQ 16 Individual forms.** Each website uses a coded form for its plan type; shared validation, security, upload, and submission utilities are reused. Product-specific fields are validated on the server with a known schema version so old submissions remain readable after a form changes.

**REQ 17 Partial leads.** After an intentional step (Continue) with a visible notice, save the lead with: workspace, captured fields, selected offer if known, UTM/referrer attribution, partner referral code if present, and the consent/disclosure version. Repeated saves update the same authorised draft. No keystroke capture.

**REQ 18 Final submission.** Completing the form creates exactly one order for that draft and submission key, returns a stable reference, and records the quote, submission time, and the version of the terms the customer accepted. A retry after a network timeout returns the existing outcome on an authorized request — checked before any re-validation of the already-consumed quote, so a customer whose connection dropped after a successful save is never told it failed. One-order-per-draft is guaranteed by a database constraint, not an application existence check. No success screen may appear when persistence failed.

**REQ 19 Staff fulfilment and statuses.** Submission means Submitted — not fulfilled, not paid. Staff verify details, review documents, request payment where the plan requires it, dispatch the SIM, and mark activation when the carrier confirms. Every important change records who and when.

| **Status** | **Meaning** | **Typical next step** |
| --- | --- | --- |
| Incomplete lead | Contact details saved, form unfinished | Customer continues or staff follow up |
| Submitted | Final form accepted, reference issued | Staff review |
| In progress | Staff processing; documents or payment being verified | Resolve requirements |
| Awaiting customer | Information, document, or payment missing | Resume when supplied |
| Ready for delivery | Checks complete | Manual courier dispatch |
| Dispatched | Courier booked; tracking reference recorded | Await activation |
| Activated | Carrier confirms the plan is active | Commission becomes earned; support and reporting |
| Cancelled | Closed without activation, with reason | Retain history |

Payment, delivery, commission, and archive states are separate dimensions from fulfilment status. Archiving is a visibility action, never deletion. Dispatch/activation prerequisites, activation evidence and exceptional cancellation handling remain OPEN_INPUTS #15, #19 and #20; test fixtures do not authorize production transitions.

**REQ 20 Operational tools.** Workspace-scoped search, filters, assignment, contact notes, follow-up reminders, timestamps, plan details, archive, and permitted exports. Staff edits use conflict detection so two people cannot unknowingly overwrite each other.

**REQ 21 Customer and partner changes.** Customer or partner edits after submission become pending change requests that staff approve or reject. External users never directly replace verified data or historical pricing.

# 8 Documents and file ownership

**REQ 22 Private files.** Customer documents and operational attachments live in private R2 storage, each belonging to one workspace and one record. Every upload and download is authorised by the backend. File names and URLs reveal nothing about the customer.

**REQ 23 Safe uploads.** Enforce the plan's document checklist, allowed types (PDF, JPG, PNG), a configured size limit (proposed 10 MB), random object identifiers, and server-side type verification by file signature before the file is visible to staff. Verification runs on a private candidate copy the uploader can no longer modify (so bytes cannot be swapped between the check and the file becoming available), and the exact verified object is what staff later receive. A replacement creates a new revision; review history is preserved. No third-party malware scanning at launch; this is a recorded decision. Signature checks establish file type, not freedom from malware. Serve originals as downloads with attachment disposition and nosniff; do not inline-render untrusted originals. A future preview must use an isolated, hardened rendering pipeline.

**REQ 24 Retention and deletion.** Documents are kept until the owner deliberately removes them under the retention policy in REQ 34. A deletion removes or restricts every linked personal copy — order, lead, notes, amendments, personal audit values, file revisions, email records, job payloads — not just the order screen, while keeping the minimal commercial record. Deletion is audited (without preserving the deleted personal data in the audit), and recorded in a minimal deletion ledger held outside any single app-database snapshot so that restoring an older backup does not reopen access to deleted data: applicable deletions and suppressions are replayed before a restored system reopens, and the restore fails closed if that ledger is unavailable. Backup expiry and processor deletion are handled separately from immediate active-system deletion; instant erasure of every historical archive is not promised unless the design actually does it.

**REQ 25 Independence.** One private bucket per website plus database ownership metadata. Bucket separation supports export; it does not replace authorisation checks.

# 9 Communications and integrations

**REQ 26 Email.** Send order acknowledgements, status notifications, and follow-ups from the correct website identity with SPF, DKIM, and DMARC configured. Delivery status, bounces, and retry controls are visible per workspace. Transactional messages and marketing follow-ups are distinct message classes; marketing messages carry an unsubscribe link and are sent only with recorded consent (REQ 34). No private documents or unnecessary personal data in emails.

**REQ 27 Follow-ups.** Follow-up due dates and eligibility are stored centrally. Before sending, recheck whether the customer completed, cancelled, unsubscribed, or was already contacted. Staff can stop a scheduled sequence.

**REQ 28 Delivery.** At launch, staff book the courier manually and record the courier name, tracking reference, and dispatch date on the order (status Dispatched). A delivery-provider adapter is Phase B; when added, retries must not create duplicate shipments and uncertain outcomes are flagged for reconciliation.

**REQ 29 Payments.** The per-offer payment-required setting drives the workflow. In Phase A, payment is collected manually and its status recorded by staff. In Phase B an online payment adapter (provider to be selected) creates a session from the backend quote amount, confirms only via trusted webhook, and records audited payment status. There is no refund or cancellation-fee logic.

**REQ 30 Automation.** Future n8n workflows consume authorised events or scoped APIs, never raw database or storage credentials. An automation outage must not lose or block a saved order.

# 10 Partner operations (SIM workspace)

**REQ 31 Partner lifecycle.** Partners are agencies. Each has a record, status (pending, approved, suspended), a referral code, and contact and payout details. Leads and orders referred by a partner carry that partner's ID. Partner records and permissions belong to one workspace.

**REQ 32 Commissions.** A commission line is created when an order reaches Activated, using the commission rule in effect at that time (rule and amount are stored on the line). Commission states: **earned** (order activated) → **carrier paid** (the carrier has paid Canadian Plans for that activation) → **partner paid** (Canadian Plans has paid the partner). Rule changes never alter existing lines. Commission status is independent of fulfilment status.

**REQ 33 Invoices.** On a monthly cycle the system generates one draft invoice per partner per period from that period's commission lines. The owner (or delegated Finance) reviews and approves it; only approved invoices become visible to the partner (Phase B portal) and are eligible for payout marking. Re-running generation for the same partner and period updates the draft or does nothing if approved; it never duplicates. Invoice numbers are sequential per workspace. Billing identity and applicable taxes are configuration inputs. Phase A payout marking remains disabled until this approval workflow exists, unless the owner explicitly resolves OPEN_INPUTS #18 with an interim approval procedure.

# 11 Privacy, consent, and analytics

**REQ 34 Privacy and consent.** The platform handles identity documents of international customers for a Canadian business and must therefore: host the **database and application functions** in a Canadian region (Supabase and Vercel), collect only the documents the plan's checklist requires, restrict document download to granted permissions, record consent version at lead save and terms version at submission, obtain express consent before any marketing follow-up (CASL) and honour unsubscribe immediately, support a customer's deletion request through an audited staff action, and publish a privacy policy and terms page on each website. Other providers (e.g. the selected email service and R2 object storage) may store or process data outside Canada; the actual provider regions are recorded and reflected accurately in the privacy policy rather than promised to be Canada-only. Blanket Canada-only storage is not an owner requirement; PIPEDA does not prohibit cross-border processing but the business stays accountable for protection and transparency, and any carrier-contract location terms are honoured. A retention policy (proposed: keep documents while the order is active plus a configurable period, then delete on owner action) is decided before launch and applied through REQ 24.

**REQ 35 Analytics and attribution.** Umami tracks every website with one site ID per website. Leads and orders store bounded allowlisted UTM fields and partner codes, approved referrer origins and known landing-route templates; strip query strings, unknown paths, tokens and contact data before persistence or events. The admin shows lead-to-order counts per source. Google Ads or Meta conversion events are a Phase B addition behind the same attribution data.

# 12 Reliability, security, performance, and observability

**REQ 36 Isolation.** Workspace ownership is enforced in the backend and the database, including relationships between records, for orders, leads, partners, commissions, invoices, file metadata, background jobs, staff-visible logs, and exports. A workspace identifier from a public browser is never trusted.

**REQ 37 Security.** Privileged keys stay server-side; secure staff sessions; multi-factor authentication for Owner and Finance, enforced as a verified completed-this-login (aal2) session for privileged actions — not merely an enrolled factor — and checked in the backend, not by a frontend redirect; input validation; rate limits and bot protection on public endpoints; signed webhooks; secrets and documents never in logs. Supabase Studio is an engineering console, not the CRM.

**REQ 38 Recoverable asynchronous work.** Saving an order durably records required follow-up work. Email or delivery failures are visible and retryable. Duplicate events, outages, and partial external requests are handled explicitly.

**REQ 39 Performance.** Public pages are cached with optimised media. Backend runs near the database. Proposed targets: typical order-save under two seconds excluding uploads and email; Core Web Vitals in the good range. A load test at the agreed peak is Phase B; Phase A verifies with a realistic sample dataset.

**REQ 40 Observability.** Every request carries an ID. Errors go to an error-tracking service; logs are structured, scrub personal data and documents, and are retained per provider limits. The owner receives alerts for failed jobs, failed backups, and synthetic order-check failures.

**REQ 48 Backend-only data access.** Exactly one application — the Express backend — connects to the database. The admin and every storefront are separate frontend apps that read and write data only through the backend's versioned API; no frontend opens a database connection, imports the database package, or holds a database credential. This boundary is enforced in the codebase (lint/import rules), not only by convention. Accepted when a frontend build that imports the database package fails CI, and when every data operation in admin and storefronts is a backend API call.

**REQ 49 Strict typing.** All code is TypeScript in strict mode; the `any` type and unchecked casts used to bypass type errors are prohibited and fail CI. Accepted when the strict build and the lint rule banning `any` both pass in CI across every app and package.

**REQ 50 Single source of truth (DRY).** Domain types, runtime validation schemas, and the database schema are defined once in shared packages and derived from one another rather than hand-duplicated; where derivation cannot be expressed in types, a checked-in codegen script produces the duplicate. The backend and all frontends consume the same generated API client and schemas, so a contract change surfaces as a build error on both sides rather than silently. Accepted when no app redefines a type a shared package owns, and when changing a shared schema breaks the build of every consumer that is now inconsistent.

**REQ 51 Test coverage across apps.** Every app (backend and each frontend) has unit and component tests in Vitest and end-to-end coverage of its critical journeys in Playwright, including the negative cases named in the Implementation Plan's verification strategy, not only happy paths. Accepted when the required negative tests exist and run in CI, and when a user-facing flow without an e2e test is treated as incomplete.

# 13 Backup and recovery

**REQ 41 Scope.** Back up operational records, required authentication data, all retained R2 objects, Sanity content and assets, migrations, deployment configuration, and the information needed to recover credentials. Encrypted secrets are controlled separately. Code history alone is not a backup.

**REQ 42 Frequency and verification.** Phase A: Supabase Pro daily backups plus one independent daily snapshot (database/Auth export, retained R2 objects, Sanity export) to a separately controlled account. Encrypt every payload and the manifest before upload; verify checksums and key recovery. Phase B: hourly snapshots and incremental copying. A snapshot is usable only when export and referenced objects are present and checksums pass.

**REQ 43 Honest recovery expectations.** The owner accepts a standard daily-backup baseline for now and has deferred exact recovery-time/loss objectives, including overnight response. Daily snapshots may lose roughly a day of changes plus job delay; missed/failed runs extend that window. Zero loss and a four-hour recovery guarantee are not promised. Record both alert-to-response and response-to-restoration duration in drills. Suspend new order acceptance whenever storage integrity cannot be established, while preserving confirmed orders.

**REQ 44 Alerts and exercises.** Alert the owner when a backup is missing (Phase A: older than 26 hours; Phase B: older than 75 minutes), when the synthetic order check fails, or when a queue accumulates errors. Run a full restore before launch, then monthly, and after significant schema or backup changes.

# 14 Adding and separating websites

**REQ 45 New website onboarding.** A repeatable process creates a workspace, Sanity project, R2 bucket, frontend deployment, scoped credentials, email identity, Umami site, and feature settings. Domain ownership, billing, provider approvals, design, and custom forms remain human inputs. Used for websites 2 and 3 in Phase B.

**REQ 46 Separate operation.** The software runs with one workspace as well as several. One workspace's records, files, content, history, partner data, and configuration can be exported without other websites' data, and the same code deployed against an independent database and credentials.

**REQ 47 Demonstrated separation.** Before websites 2 and 3 go live, demonstrate export/import with sample data: record counts, file checksums, functional workflows, and absence of foreign-workspace data.

# 15 Cost and growth constraints

Planning basis checked 14 September 2026. Use eligible free tiers during development; upgrade the same services when capacity or required features demand it. There is no fixed USD 0 build promise.

| Service | Development | Launch baseline / cost boundary |
| --- | --- | --- |
| Vercel | Local development; hosted commercial work on Pro | Pro, starting around USD 20/month for one deploying seat; usage can add cost. Required before commercial hosting and minute-level cron tests. |
| Supabase | Free development/staging project where eligible | Pro starting around USD 25/month with one Micro project covered by compute credits. Staging in the same paid org adds project compute; otherwise use a separate eligible Free org. |
| Email | FakeEmailAdapter in tests; provider sandbox for controlled delivery tests | SES preferred, subject to approval: Essentials base sending USD 0.16/1,000 emails; à-la-carte outbound USD 0.10/1,000 if selected. Data, events and add-ons extra. Resend is an alternative, not an assumed free production service. |
| Sanity, R2 | Free allowances where eligible | Verify dataset, role, storage and request quotas at provisioning; upgrade in place as required. |
| Umami and error tracking | Verify current hosted free eligibility | Choose managed service tiers; do not assume self-hosting has no operating cost. |
| Independent archive and deletion ledger | Separate protected account; synthetic data initially | Usage-based storage, requests and runner costs. Measure from retained files and backup frequency; no fixed USD 2–5 promise. |
| Base hosting + database | Paid services may be needed during development | Approximately USD 45/month before staging, email, archives, monitoring, usage, taxes and other exclusions. This is not the total operating budget. |

At 100 orders/day and an illustrative three emails/order, 30 days implies 9,000 emails. SES base sending is approximately USD 1.44 on Essentials or USD 0.90 on à-la-carte pricing, before other charges. Measure tracking codes, staff mail and follow-ups separately. New SES accounts start in a restricted sandbox; live sending requires production approval and appropriate sending quotas. Resend Free's 100/day allowance is not sufficient for that example.

Excluded: domains, taxes, AI subscriptions, courier/payment fees, n8n, paid CMS roles, additional deploying seats, and overages. Exact disaster-recovery objectives and PITR remain deferred; database recovery does not replace object/content archives. Growth should first use tuning and plan/configuration upgrades; a paid plan does not guarantee an inefficient or incorrect implementation will scale.

# 16 Acceptance and launch readiness

## Phase A gates (website 1 + admin)

1. Website 1 has independent content and a branded form; submissions appear only in its workspace.
2. Unauthorised staff, forged website credentials, and altered IDs cannot read or modify another workspace's records or files; removed staff are denied on the next request.
3. Partial leads resume safely; repeated final submissions create one order; failed persistence never shows success; terms version is recorded.
4. Publishing a CMS price changes new quotes while existing orders keep their snapshot; an unverifiable price cannot create a priced order.
5. Each role sees and can do only what its permissions allow; document download requires the explicit permission.
6. Per-plan document checklist and payment-required setting drive the form and the admin; documents upload, verify by signature, and download only through authorised links.
7. Email failures are visible and retryable without duplicating orders; SPF/DKIM/DMARC pass.
8. Activation creates a commission line with the stored rule; status and commission are independent.
9. Umami records page views and the lead/order events; UTM and partner code appear on the order.
10. One full restore from the independent daily backup succeeds in an isolated environment.
11. Preview deployments cannot reach production data or send real email; secrets are inventoried.
12. Public pages pass automated and manual WCAG 2.1 AA checks; record Lighthouse lab metrics separately from real-user Core Web Vitals. A representative staging dataset and burst test demonstrate the proposed latency/error targets.
13. Written procedures exist for staff onboarding/removal, price errors, failed email, backup alerts, and restore.
14. REQ 48–51 have evidence: frontend DB imports fail CI, strict typing is enforced, contracts have audience-specific fields, and critical flows/negative cases pass. Site-only releases do not deploy unrelated apps.

All applicable production business inputs are validated before real offer publishing, dispatch, activation and payout. Disabled or TEST-only behavior is not evidence that a required production feature is complete.

## Phase B gates

Websites 2 and 3 provisioned through onboarding; configuration/branding reuse is expected, while new product workflows may require reviewed code and schemas; partner portal isolation; monthly invoice generation is idempotent and approval-gated; hourly backups with the 75-minute alert; workspace export/import demonstrated; delivery and payment adapters pass duplicate-event and uncertain-outcome tests; load test at the agreed peak.

# 17 Plain-language glossary

| **Term** | **Meaning in this project** |
| --- | --- |
| Workspace | One website's operational area inside the shared admin |
| Offer | A published plan with its price, terms, document checklist, and payment setting |
| Quote | A time-limited record of the offer and price shown to one customer |
| Snapshot | A frozen copy of commercial data stored with an order |
| Activation | Carrier confirmation that the customer's plan is live; the commission trigger |
| Commission line | One earned amount for one activated order under one rule |
| Idempotency key | A token that makes a repeated request return the same result instead of a duplicate |
| Webhook | A signed notification from a provider when something changes |
| Recovery point | A saved state to which the system can be restored |
| RLS | Row-level security: database rules that hide other workspaces' rows |

# 18 Reference sources

S1 Sanity pricing and roles: https://www.sanity.io/pricing

S2 Supabase backups: https://supabase.com/docs/guides/platform/backups

S3 Supabase pricing and Free-plan pausing: https://supabase.com/pricing

S4 Vercel Pro plan and fair-use policy: https://vercel.com/docs/plans/pro-plan and https://vercel.com/docs/limits/fair-use-guidelines

S5 Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/

S6 Email pricing and approval: https://resend.com/pricing ; https://aws.amazon.com/ses/pricing/ ; https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html

S7 CASL overview (Government of Canada): https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en

S8 PIPEDA overview (Office of the Privacy Commissioner): https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/

Code-pattern reference (not a business reference): https://github.com/Md-Takibuddin/canadaesim

Hosting, database, email and CMS pricing sources were rechecked during the 14 September 2026 review; verify actual quotas and terms at each provisioning milestone. External sources support provider constraints; they are not a performance or recovery guarantee.
