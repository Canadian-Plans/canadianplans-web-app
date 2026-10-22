# OPEN_INPUTS.md

Business questions that are not yet answered. **AI agents: never invent an answer here.** Use TEST-only fixtures and continue independent work. Validate production inputs before the action they govern; synthetic evidence does not authorize real orders, dispatch, activation or payout.

**Owner: fill these in as you get them.** The "Needed by" column is the task that blocks without it.

## Inputs needed by specific Phase A features

| # | Input | Needed by | Placeholder in use | Answer |
|---|---|---|---|---|
| 2 | Website 1 domain | T0 DNS / T18 sender / T28 launch | non-production preview URL | `canadianplans.com` — confirmed by the owner 20 Oct 2026 (DNS on Cloudflare; not yet pointed at site-1, task 3.1) |
| 3 | Real Rogers plan list — names, data allowance, contract terms | T9 | 3 TEST offers in Sanity test dataset | All Canada Wide plans (internet and TV by province, national BYOD mobile) plus the pre-arrival eSIM plans, as tabled in `LAUNCH_PLANS.md` — owner, 20 Oct 2026. |
| 4 | Real prices — recurring charge, one-time fees, amount payable today, per plan | T9 / before live publishing | Illustrative TEST prices | Monthly prices as in `LAUNCH_PLANS.md`. No one-time fees from Canadian Plans (no SIM, activation or shipping fee); amount payable today is $0 on every plan — owner, 22 Oct 2026. |
| 5 | Which plans require payment up front (`paymentRequired`) and how much | T9 | `false` on all TEST offers | None: customers do not pay on the website. `paymentRequired = false` and `amountPayableToday = 0` on every plan — owner, 20 Oct 2026. The provider bills the customer directly after activation; Canadian Plans takes no money from customers — owner, 22 Oct 2026. |
| 6 | Document checklist per plan (passport / visa / address proof / none) | T9 | passport only, on TEST offers | Internet and TV: none (advisor confirms availability). BYOD mobile: `government_id` (plus the provider's identity and credit check). Pre-arrival eSIM: none (an advisor asks if anything is needed). Matches the catalogue — owner, 22 Oct 2026. |
| 7 | Commission rule — fixed CAD per activation, or percentage, and the value | T19 | TEST-only rule; live partnered activation disabled | |
| 8 | Invoice billing identity — legal business name, address, tax number if any | B1 or an explicitly approved interim payout workflow | placeholder strings | |
| 9 | Courier company for SIM dispatch | T14 | free-text courier field | None at launch: Canadian Plans ships no SIM cards (eSIM, or the provider ships). Staff record the provider handoff in the Dispatch step, see `RUNBOOKS/dispatch-and-activation.md` — owner, 22 Oct 2026. |
| 10 | Document retention policy | T21 | — | Retain customer records and accepted identity documents until the customer requests deletion; no automatic six-month or order-completion deadline. Apply deletion through an audited staff action, subject to legal retention obligations. Owner, 21 Oct 2026. See `RETENTION_POLICY.md`. |
| 11 | Sender email address for customer emails (e.g. orders@domain) | T18 | — | From `Canadian Plans <orders@canadianplans.com>`, Reply-To `info@canadianplans.com` — owner, 22 Oct 2026. Railway: `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_REPLY_TO_EMAIL` (task 3.2). |
| 12 | Umami — cloud or self-hosted | T0 / T20 | cloud assumed | |
| 13 | Error tracker — Sentry or alternative | T0 / T25 | Sentry assumed | Sentry (owner, 22 Oct 2026): org `canadian-plans`, projects `canadian-plans-backend` and `canadian-plans-admin`, connected through the existing fetch-based tracker (no SDK). |
| 14 | Quote-withdrawal timing — when a withdrawn offer becomes effective against an in-flight order (immediate durable revocation, or honour an issued quote for its 15-min window) | T10/T16 | TEST both policies; production priced checkout disabled until selected | `honour_until_expiry` — an issued quote stays valid for its remaining 15-minute window even if the offer is withdrawn mid-checkout. Rationale: breaking a customer's in-flight checkout costs more than honouring a briefly-stale price, and the exposure is bounded to 15 minutes. Set via `QUOTE_WITHDRAWAL_POLICY` — resolved 21 Sep 2026 |
| 15 | Transition prerequisites — must required documents be approved and required payment confirmed before ready/dispatch/activate? any authorised exception? | T14/T19 | TEST prerequisite matrix; production dispatch/activation disabled until selected | **Documents yes, payment no, with a reasoned Owner or Orders-staff override.** Required documents must be approved before `ready_for_delivery`/`dispatched`/`activated`; payment state is *not* a prerequisite (the owner receives payment both before and after fulfilment depending on the customer). The owner and staff who process orders (`order.manage`, Owner or Orders role) may override the document prerequisite; a nonblank reason and the outstanding documents are recorded in the audit log. Override access confirmed by owner, 21 Oct 2026. "Required" is per plan/product: the offer's `documentChecklist` (Sanity, `DOCUMENT_CHECKLIST_VALUES`), which is already frozen into the order snapshot at submission, so a later catalogue edit never changes what an in-flight order requires. — resolved 21 Sep 2026 |
| 16 | Retention by data category | T21/T24 | See `RETENTION_POLICY.md` | Customer personal records, saved drafts, accepted file revisions, email records and wish-list contacts follow request-only deletion, confirmed by owner 21 Oct 2026. Technical upload/preview expiry and the existing backup rotation are separate. Minimal commercial/audit records and deletion evidence remain subject to legal and recovery requirements. |
| 17 | Commission calculation basis + rounding (if percentage) — what amount the % applies to, rounding rule, minor units | T19 | commission stays unavailable for real payout until set | |
| 18 | Whether to authorize a Phase A interim payout-approval method before B1 invoices exist | Before enabling partner payout marking | partner_paid disabled pending an approved interim workflow or B1 invoice approval | |
| 19 | Carrier eligibility / activation evidence / who collects each fee / taxes | T9/T14 | TEST offers only until set | Eligibility: as written on each plan in the catalogue (address availability for internet; identity and credit check for BYOD mobile; study/work permit or PR arrivals over 90 days for postpaid pre-arrival, visitors under 90 days for chatr). Activation evidence: the provider's confirmation number, plus the phone number (mobile) or install date (internet). Fees and taxes: the provider bills and collects every charge and its taxes; Canadian Plans collects nothing from customers — owner, 22 Oct 2026. Sales tax on Canadian Plans' own commission income is for the owner's accountant. |
| 20 | Cancellation after manual payment or activation — the manual staff process (no refund automation) | T14/T21 | flag for authorised review; no automated adjustment | Before activation: staff cancel the order at no cost to the customer. After activation: the customer cancels with the provider under the provider's terms; no refund from Canadian Plans because it took no payment — owner, 22 Oct 2026. Steps in `RUNBOOKS/orders.md` → Cancellations. |
| 21 | Supabase Auth email (staff invites/recovery) — verified sender + custom SMTP, separate from the customer EmailAdapter | T5/T18 | needed before real staff-invite testing | Resend SMTP relay (`smtp.resend.com`) on the verified `canadianplans.com` domain, configured as Supabase's custom SMTP — resolved 21 Sep 2026 |
| 22 | Staging setup — separate Free Supabase org, or a second paid project in the prod org (billing is per-org) | T0 | decide before hosted staging | Single live environment — no separate staging project |
| 23 | Email provider selection, SES region/production access and sending quota, sender/event verification | T0 approval request / T18 integration / before live mail | SES preferred candidate; fake adapter in tests; no automatic provider fallback | Resend selected for launch (`EMAIL_PROVIDER=resend`, verified `canadianplans.com` domain); SES adapter kept wired for a later migration — resolved 21 Sep 2026 |
| 24 | Terms/privacy content and its versioning per website (the disclosure version recorded when a draft lead is saved, and the terms version quoted at order submission) | T21/T13 | Approved repository legal release v2, effective 21 Oct 2026: `privacy-2026-10-v2` for lead/wish-list disclosure and `terms-2026-10-v2` for terms. Request-only retention follows the owner's decision in rows 10/16. An order's accepted terms version comes from its server-issued quote. See `docs/legal/README.md`. | Owner retention decision, 21 Oct 2026; implemented in site-1 and the backend legal release. |

## Deferred recovery objectives (do not block development)

| ID | Decision | Current baseline | Status |
|---|---|---|---|
| R1 | Maximum tolerable data loss | Managed daily DB backups plus separate encrypted daily DB/Auth/R2/Sanity archive, independent alerts and restore rehearsal | Owner deferred exact target; zero loss is not promised |
| R2 | Maximum outage and overnight response | Owner receives alerts and directs AI through tested runbooks; measure response and restore separately | Owner deferred exact target; no four-hour guarantee |
| R3 | PITR / more frequent independent backups | Upgrade evaluation later using measured restore results and business needs | Not selected; no purchase authorized |

## Phase B (not blocking launch)

| # | Input | Answer |
|---|---|---|
| B14 | Payment provider (Stripe / other) | |
| B15 | Website 2 name + domain (mobile internet) | |
| B16 | Website 3 name + domain (home internet) | |
| B17 | Partner invoice numbering format and period (calendar month assumed) | |
| B18 | Delivery/courier API, if you move off manual booking | |

## Answered — kept for the record

Move rows here once decided, with the date. Don't delete them; a decided input that later gets questioned should show when and what was chosen.

| # | Input | Answer | Decided |
|---|---|---|---|
| 1 | Website 1 name | Canadian Plans; public code configuration and Studio title updated. Technical identifier remains `site-1`; domain and legal billing identity remain separate inputs | 12 Oct 2026 |
| — | Website 1 visual design and service sequence | Owner-supplied Canadian Plans Figma reference; mobility first, internet and TV later. Implementation follows DESIGN_TO_CODE_PLAN.md and existing platform invariants | 12 Oct 2026 |
| — | Region for data and functions | Canada preferred; superseded 14 Sep 2026 — Supabase project provisioned in us-west-2 is acceptable | 9 Sep 2026 |
| — | Analytics tool | Umami | 9 Sep 2026 |
| — | Malware scanning on uploads | Not at launch — deliberate; signature verification only | 9 Sep 2026 |
| — | Refund / cancellation policy | None exists; no logic to build | 9 Sep 2026 |
| — | Languages | English only | 9 Sep 2026 |
| — | Messaging channels | Email only; no SMS or WhatsApp | 9 Sep 2026 |
| — | Partner login at launch | No — Phase B | 9 Sep 2026 |
| — | Backend | Standalone Express (strict TS), the only DB client, deployed as Vercel functions | 12 Sep 2026 |
| — | Frontends | Admin + each website are separate Next.js apps; API clients only, no DB access | 12 Sep 2026 |
| — | Database count | One shared Supabase Postgres for all sites; workspace-per-site isolation | 12 Sep 2026 |
| — | Repo structure | One pnpm monorepo; shared code in workspace packages, not published to a registry | 12 Sep 2026 |
| — | Where the backend runs | Vercel functions (not a separate always-on host) | 12 Sep 2026 |
| — | Sanity setup | Studio embedded in each website (`next-sanity`, `/studio`), one project per site | 12 Sep 2026 |
| — | Testing | Vitest (unit/component) + Playwright (e2e) in backend and every frontend | 12 Sep 2026 |
| — | Typing | Strict TS, `any` banned; DRY single source of truth for types/Zod/DB schema | 12 Sep 2026 |
| — | Launch scope | One storefront plus backend/admin first; later websites remain Phase B | 14 Sep 2026 |
| — | Delivery priority | Preserve full Phase A; move the date when necessary. September 30 is not a commitment | 14 Sep 2026 |
| — | Initial capacity | 100 orders/day target; verify representative burst behavior, not a capacity guarantee | 14 Sep 2026 |
| — | Technology and cost | Managed services; use free plans where permitted, then upgrade the same services. Better/cheaper/easier technology may be proposed with rationale | 14 Sep 2026 |
| — | Paid services | Necessary paid services acceptable at launch; Vercel Pro acceptable. Standard production baseline includes Supabase Pro; actual purchases remain owner actions | 14 Sep 2026 |
| — | Email direction | Resend selected as the launch email provider (`EMAIL_PROVIDER=resend`); AWS SES adapter kept wired but deferred to a later migration | 21 Sep 2026 |
| — | Maintenance | AI performs implementation and maintenance under owner's direction; owner handles account access, decisions and production deployment | 14 Sep 2026 |
| — | Integrity vs availability | Temporarily stop new orders when necessary to preserve confirmed orders | 14 Sep 2026 |
| — | Recovery baseline | Proceed with standard backups, separate encrypted archive, alerts and tested restore; exact recovery-time/loss objectives deferred | 14 Sep 2026 |
| — | Company / umbrella brand | Canadian Plans. Individual storefront names/domains and registered billing identity remain separate inputs | 14 Sep 2026 |
| 22 | Staging setup | Single live environment — no separate staging Supabase org/project | 14 Sep 2026 |
| — | Credit check on pre-arrival postpaid plans | Owner confirmed: the Rogers/Fido pre-arrival postpaid plans need no credit check and no Canadian credit history. Recorded in the catalogue's arrival terms; add to Terms §7 at the next legal version | 22 Oct 2026 |
| — | WhatsApp channel | A WhatsApp Business number is planned but not ready. Until the owner supplies it, the site promises phone and email only | 22 Oct 2026 |
| — | "No contract" claim | Owner confirmed: no term commitment on any plan (pre-arrival, BYOD mobile, home internet including the 2-year price lock) | 22 Oct 2026 |
| — | Provider named on the site | Home internet/TV and BYOD mobile do not name the provider ("authorised sales agent"; the advisor confirms the provider), matching the catalogue and Terms. Rogers, Fido and Chatr are named only for pre-arrival plans | 22 Oct 2026 |
| — | Guide author / reviewer | Guides are credited to the Canadian Plans team, not to named individuals | 22 Oct 2026 |
| — | Lead contact details in admin | Only roles with `order.manage` or `financial.read` (Orders, Finance, Owner) see a lead's name, email and phone; other roles see leads without contact details | 22 Oct 2026 |
| — | MFA for individually granted privileged permissions | Every privileged action needs a verified MFA (aal2) session, whoever holds the permission, not only Owner/Finance roles | 22 Oct 2026 |
| — | Design-preview routes | `/order/pre-arrival`, `/order/home-internet` and `/track-order` return 404 in production and stay available on preview builds | 22 Oct 2026 |
| — | Contact page forms | Interim: the tracking panel links to `/track` and the message option opens email to info@canadianplans.com; a real message form is a later task | 22 Oct 2026 |
| — | Pre-arrival SIM type | Pre-arrival plans are eSIM only; tighten Terms §7 ("eSIM or physical SIM") at the next legal version | 22 Oct 2026 |
