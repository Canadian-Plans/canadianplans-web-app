# OPEN_INPUTS.md

Business questions that are not yet answered. **AI agents: never invent an answer here.** Use TEST-only fixtures and continue independent work. Validate production inputs before the action they govern; synthetic evidence does not authorize real orders, dispatch, activation or payout.

**Owner: fill these in as you get them.** The "Needed by" column is the task that blocks without it.

## Inputs needed by specific Phase A features

| # | Input | Needed by | Placeholder in use | Answer |
|---|---|---|---|---|
| 1 | Website 1 name | T3 | `SITE_1_NAME_PLACEHOLDER` in `site.config.ts` | |
| 2 | Website 1 domain | T0 DNS / T18 sender / T28 launch | non-production preview URL | |
| 3 | Real Rogers plan list — names, data allowance, contract terms | T9 | 3 TEST offers in Sanity test dataset | |
| 4 | Real prices — recurring charge, one-time fees, amount payable today, per plan | T9 / before live publishing | Illustrative TEST prices | |
| 5 | Which plans require payment up front (`paymentRequired`) and how much | T9 | `false` on all TEST offers | |
| 6 | Document checklist per plan (passport / visa / address proof / none) | T9 | passport only, on TEST offers | |
| 7 | Commission rule — fixed CAD per activation, or percentage, and the value | T19 | TEST-only rule; live partnered activation disabled | |
| 8 | Invoice billing identity — legal business name, address, tax number if any | B1 or an explicitly approved interim payout workflow | placeholder strings | |
| 9 | Courier company for SIM dispatch | T14 | free-text courier field | |
| 10 | Document retention period | T21 | "TBD" in `RETENTION_POLICY.md` | |
| 11 | Sender email address for customer emails (e.g. orders@domain) | T18 | — | |
| 12 | Umami — cloud or self-hosted | T0 / T20 | cloud assumed | |
| 13 | Error tracker — Sentry or alternative | T0 / T25 | Sentry assumed | |
| 14 | Quote-withdrawal timing — when a withdrawn offer becomes effective against an in-flight order (immediate durable revocation, or honour an issued quote for its 15-min window) | T10/T16 | TEST both policies; production priced checkout disabled until selected | |
| 15 | Transition prerequisites — must required documents be approved and required payment confirmed before ready/dispatch/activate? any authorised exception? | T14/T19 | TEST prerequisite matrix; production dispatch/activation disabled until selected | |
| 16 | Retention periods by data category — live data, abandoned drafts, file revisions, rejected uploads, backups, deletion ledger | T21/T24 | labelled TEST placeholders in RETENTION_POLICY.md | |
| 17 | Commission calculation basis + rounding (if percentage) — what amount the % applies to, rounding rule, minor units | T19 | commission stays unavailable for real payout until set | |
| 18 | Whether to authorize a Phase A interim payout-approval method before B1 invoices exist | Before enabling partner payout marking | partner_paid disabled pending an approved interim workflow or B1 invoice approval | |
| 19 | Carrier eligibility / activation evidence / who collects each fee / taxes | T9/T14 | TEST offers only until set | |
| 20 | Cancellation after manual payment or activation — the manual staff process (no refund automation) | T14/T21 | flag for authorised review; no automated adjustment | |
| 21 | Supabase Auth email (staff invites/recovery) — verified sender + custom SMTP, separate from the customer EmailAdapter | T5/T18 | needed before real staff-invite testing | Resend SMTP relay (`smtp.resend.com`) on the verified `canadianplans.com` domain, configured as Supabase's custom SMTP — resolved 21 Sep 2026 |
| 22 | Staging setup — separate Free Supabase org, or a second paid project in the prod org (billing is per-org) | T0 | decide before hosted staging | Single live environment — no separate staging project |
| 23 | Email provider selection, SES region/production access and sending quota, sender/event verification | T0 approval request / T18 integration / before live mail | SES preferred candidate; fake adapter in tests; no automatic provider fallback | Resend selected for launch (`EMAIL_PROVIDER=resend`, verified `canadianplans.com` domain); SES adapter kept wired for a later migration — resolved 21 Sep 2026 |
| 24 | Terms/privacy content and its versioning per website (the disclosure version recorded when a draft lead is saved, and the terms version quoted at order submission) | T21 (content); T13 order form uses a placeholder | `TEST-disclosure-v1` in site-1 `site.config.ts` for the lead-save disclosure only — an order's accepted terms version always comes from the server-issued quote, never the storefront | |

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
