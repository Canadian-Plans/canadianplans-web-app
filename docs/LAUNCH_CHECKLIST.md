# LAUNCH_CHECKLIST — website 1 live and the first order fulfilled

Written 19 October 2026, after the Electric Blue redesign merged (PR #15). This is the
working list from "code on `main`" to "first real customer order fulfilled". It narrows
BUILD_TASKS T28 to what the first order actually needs; the full Phase A gate list stays
in REQUIREMENTS.md §16.

**Who:** **You** = owner decision or account action · **Claude** = Claude can do it in a
session · **Both** = Claude prepares, you approve or click.

**Status key:** ☐ not started · ◐ partly done · ☑ done. Production facts marked
_(unverified)_ come from 23 September notes and must be re-checked in step 1.

---

## Stage 1 — Find out what production really looks like (Claude, ~1 session)

- ☐ **1.1 Re-check production config** _(Claude, read-only)_. Confirm or rule out the
  23 September gaps: site-1 service credential missing, scheduler off, Sanity
  `production` dataset empty, `SITE_1_NAME_PLACEHOLDER` still showing. Also read which of
  `QUOTE_WITHDRAWAL_POLICY`, `EMAIL_PROVIDER`, `ENABLE_SCHEDULER`, `NEXT_PUBLIC_SITE_URL`
  are set on Railway/Vercel. Output: an updated status column in this file.
- ☐ **1.2 Confirm `main` is green** _(Claude)_. CI on merge commit `b688b0c`, and Vercel
  production deploys of backend, admin and site-1 from that commit.

### Production status (20 October 2026)

Read-only checks through the connected Railway, Vercel, Supabase, Sanity and GitHub
tools. **verified** = checked directly today · **read** = from repo code/docs ·
**not checked** = blocked, reason given.

| Area                                             | Finding                                                                                                                                                                                                                                                                                                                                                               | Label                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| CI on `main`                                     | CI passed on `b688b0c` (PR #15 merge) and on `6a76a1d` (this checklist).                                                                                                                                                                                                                                                                                              | verified                       |
| Backup monitor                                   | Scheduled `backup-monitor.yml` has failed all 4 runs since 19 Oct, which is expected while no real backup exists (task 4.1).                                                                                                                                                                                                                                          | verified                       |
| Railway backend deployment                       | Project `canadian-plans-backend`, one service `backend`, one `production` environment. **No active deployment**: the 5 newest are `REMOVED`/`SKIPPED`, the last one (`893cbd2`, PR #14) was removed on 18 Oct, and no deployment has status `SUCCESS`. `https://backend-production-ebbb6.up.railway.app/api/v1/health` returns Railway's 404 "Application not found". | verified                       |
| Railway variables                                | Not checked. Listing variable names was blocked by this session's permission gate on production reads.                                                                                                                                                                                                                                                                | not checked                    |
| Vercel admin / site-1                            | Not checked. The connected Vercel team ("Md takib 's projects") has no admin or site-1 project, so they are in a team this session cannot see (DEPLOYMENT_INVENTORY names a "Canadian Plans" team).                                                                                                                                                                   | not checked                    |
| Domain `canadianplans.com`                       | Registered, DNS on Cloudflare (`julian.ns.cloudflare.com`). No A record on the apex and no `www` record, so the site is not served on it. OPEN_INPUTS #21/#23 say this domain is already verified in Resend.                                                                                                                                                          | verified (DNS) · read (Resend) |
| Supabase                                         | One project `canadianplans` (`ixbhodlvfyxjctpsjibj`), `us-west-2`, `ACTIVE_HEALTHY`.                                                                                                                                                                                                                                                                                  | verified                       |
| Production migrations                            | 16 of the 20 journal migrations applied; last applied is `0015_organic_roland_deschain`. **Not applied: `0016_bumpy_puppet_master`, `0017_worthless_synch`, `0018_lowly_dragon_lord`, `0019_backup_leases`.**                                                                                                                                                         | verified                       |
| Workspace site-1                                 | Exists, but its DB `name` is the seed value "Northern Arrival Mobile", not "Canadian Plans".                                                                                                                                                                                                                                                                          | verified                       |
| Catalogue                                        | 0 `offer_versions`, 0 `catalogue_sync_events` for site-1. Catalogue has never synced.                                                                                                                                                                                                                                                                                 | verified                       |
| site-1 service credential                        | 0 active, 0 revoked for site-1.                                                                                                                                                                                                                                                                                                                                       | verified                       |
| Orders / outbox                                  | 0 orders, 0 leads, 0 outbox jobs for site-1; 7 memberships in total.                                                                                                                                                                                                                                                                                                  | verified                       |
| Sanity `production` dataset (project `rzso02w8`) | 0 `siteSettings`. One published offer `smoke-test-offer` ("SMOKE TEST — do not use") and one product `smoke-test-product`, both from 23 Sep. No real plans.                                                                                                                                                                                                           | verified                       |
| Site name                                        | `SITE_1_NAME_PLACEHOLDER` no longer exists in code; `siteConfig.name` comes from `content/site`. The live page could not be checked because no public site URL is reachable.                                                                                                                                                                                          | read                           |

**What this changes in the plan:**

- **3.0 (new) Redeploy the backend** and apply migrations `0016`–`0019` before anything in
  Stage 3. Production has no running API, so admin and `/order` cannot work.
- **2.1** is probably answered already (`canadianplans.com`); the owner needs to confirm it.
  3.1 is still open.
- **3.6** also covers the workspace's DB name ("Northern Arrival Mobile").
- **3.7** must not keep the Sanity smoke-test offer published in `production`.
- Stage 3–4 items: none could be ticked; every 23 September gap was confirmed or could not
  be checked.

## Stage 2 — Business decisions only you can make (You)

These block the first order. Each is a row in `docs/OPEN_INPUTS.md`; answer there.

- ☐ **2.1 Domain** (#2) — buy or choose the domain for website 1.
- ☐ **2.2 Plans to sell at launch** (#3) — real Rogers plans: names, data, terms. Start
  with a short list (3–5 plans) rather than the whole catalogue.
- ☐ **2.3 Prices** (#4) — monthly charge, one-time fees, amount payable today, per plan.
- ☐ **2.4 Upfront payment** (#5) — which plans need payment before fulfilment, and how
  much. Phase A has no card checkout; say how customers will pay you (e-Transfer etc.).
- ☐ **2.5 Documents per plan** (#6) — passport / visa / address proof / none.
- ☐ **2.6 Carrier and fees** (#19) — eligibility rules, activation evidence, who collects
  each fee, taxes.
- ☐ **2.7 Courier** (#9) — who ships SIMs, and how you book them.
- ☐ **2.8 Sender email** (#11) — e.g. `orders@<domain>`.
- ☐ **2.9 Retention periods** (#10, #16) — needed so the privacy policy is truthful.
- ☐ **2.10 Terms and privacy text** (#24) — your own or a lawyer's; Claude can draft a
  first version for you to review, but it is your legal responsibility.
- ☐ **2.11 Cancellation process** (#20) — what staff do if a customer cancels after paying
  or after activation.
- ☐ **2.12 Storefront claims** — replace the bracketed placeholders on the site
  (`[PRICE]`, install timelines, marketing claims). Claude will list every one.

Not needed for the first direct order (can wait): commission rules #7/#17/#18, invoice
identity #8, Umami/Sentry choice #12/#13, Phase B items.

## Stage 3 — Production setup (Both)

Depends on Stage 1 findings and the Stage 2 answers.

- ☐ **3.1 Point the domain at site-1** _(You buy / Both configure)_ — Vercel domain,
  `NEXT_PUBLIC_SITE_URL`, `ADMIN_ORIGIN`/CORS origins updated.
- ☐ **3.2 Email sending** _(Both)_ — verify the domain in Resend, SPF/DKIM/DMARC records,
  `EMAIL_PROVIDER=resend`, sender address from 2.8. Send a test acknowledgement.
- ☐ **3.3 Turn on checkout** _(Both)_ — set `QUOTE_WITHDRAWAL_POLICY=honour_until_expiry`
  on Railway (decided 21 Sep, OPEN_INPUTS #14) and redeploy.
- ☐ **3.4 Turn on the scheduler** _(Both)_ — `ENABLE_SCHEDULER=1` on the backend and the
  machine registry entries for `outbox:run` / `reconcile:run` for site-1. Without it, no
  catalogue sync and no customer emails.
- ☐ **3.5 site-1 service credential** _(You, needs MFA)_ — create in admin → Settings,
  Claude sets `SITE_1_SERVICE_CREDENTIAL` on Vercel site-1 and redeploys.
- ☐ **3.6 Site name** _(Claude)_ — replace `SITE_1_NAME_PLACEHOLDER` with "Canadian Plans".
- ☐ **3.7 Real plans in Sanity `production`** _(Both)_ — siteSettings + the launch offers
  from 2.2–2.6, published. Claude prepares the documents, you review and publish.
- ☐ **3.8 Catalogue sync check** _(Claude)_ — offer_versions appear for site-1 and `/order`
  lists the real plans (no "Plans are unavailable").
- ☐ **3.9 Make static pages match the catalogue** _(Claude)_ — the redesigned landing
  pages are static; their plan names and prices must match what `/order` sells.
- ☐ **3.10 Legal pages** _(Claude)_ — publish the terms/privacy text from 2.10 and record
  their versions.

## Stage 4 — Safety net before real customer data (Both)

- ☐ **4.0 Rotate exposed keys** _(You, Claude guides)_ — Cloudflare, R2 and Backblaze B2
  credentials were stored in plain text outside a password manager. Create new keys,
  update Railway/Vercel/GitHub secrets, revoke the old ones. Do this first.
- ☐ **4.1 Backups** _(You decide, Claude runs)_ — either upgrade Supabase to Pro (daily
  backups) or provision the T24 GitHub secrets and run one real backup + restore drill.
  Today there is **no restorable backup** of production.
- ☐ **4.2 Error tracking** _(Both)_ — connect Sentry (or chosen tool) so production errors
  reach you.
- ☐ **4.3 Alerts** _(Claude)_ — confirm owner alerts and the synthetic order check are
  green with the scheduler on.
- ☐ **4.4 Staff accounts** _(You)_ — invite staff in admin with the right roles; MFA on for
  you and Finance.

## Stage 5 — Rehearse the first order (Both)

- ☐ **5.1 Run the e2e specs** _(Claude)_ — `order.spec.ts` and `a2-launch-gates.spec.ts`
  need a Postgres harness (none on this PC; use CI or a temporary database).
- ☐ **5.2 Production test order** _(Both)_ — a controlled, non-billable order on the live
  site: submit → acknowledgement email arrives → appears in admin → documents uploaded
  and approved → status moves to ready/dispatched. No real carrier activation; cancel it
  through the approved process afterwards. Evidence in `docs/EVIDENCE/A4-launch.md`.
- ☐ **5.3 Walk the runbooks once** _(You, Claude beside you)_ — `RUNBOOKS/orders.md`,
  `dispatch-and-activation.md`, `failed-email-recovery.md`, `release-rollback.md`.
- ☐ **5.4 Stock and supplies** _(You)_ — SIM cards on hand, packaging, courier account.

## Stage 6 — Go live (Both)

- ☐ **6.1 Open to search engines** _(Claude)_ — production robots/sitemap allow indexing;
  only `/business-internet` stays noindex.
- ☐ **6.2 Analytics** _(Both)_ — Umami (or chosen tool) recording visits and order starts.
- ☐ **6.3 Announce** _(You)_ — first customers usually come from people you can reach
  directly: newcomer and student groups, WhatsApp/Facebook communities, friends and
  partners. Claude can draft posts and a short launch message.

## Stage 7 — The first real order (You, Claude on call)

- ☐ **7.1 Order arrives** — alert/email received, order visible in admin.
- ☐ **7.2 Check documents** — approve or request re-upload.
- ☐ **7.3 Payment** — collect as decided in 2.4 and record it.
- ☐ **7.4 Dispatch or activate** — book courier / activate with Rogers, update status.
- ☐ **7.5 Customer confirmed** — customer has a working SIM; note anything that was
  awkward and turn it into a fix or a runbook change.

---

## Critical path

1.1 → (2.1–2.6 in parallel with you) → 3.1–3.8 → 4.1 → 5.2 → 6 → 7.

Stage 2 is the longest wait and only you can do it. Claude can do 1.1, 1.2, 2.12 (listing
placeholders), 3.6, 3.9 and 5.1 now, without any of your answers.
