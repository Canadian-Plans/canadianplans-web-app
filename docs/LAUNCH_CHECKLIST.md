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

- ☑ **1.1 Re-check production config** _(Claude, read-only)_. Confirm or rule out the
  23 September gaps: site-1 service credential missing, scheduler off, Sanity
  `production` dataset empty, `SITE_1_NAME_PLACEHOLDER` still showing. Also read which of
  `QUOTE_WITHDRAWAL_POLICY`, `EMAIL_PROVIDER`, `ENABLE_SCHEDULER`, `NEXT_PUBLIC_SITE_URL`
  are set on Railway/Vercel. Output: an updated status column in this file. _Re-checked
  22 Oct, see the table below._
- ☑ **1.2 Confirm `main` is green** _(Claude)_. CI on the newest `main` commit, and
  production deploys of backend, admin and site-1 from that commit. _22 Oct: CI green on
  `5fc4397`; admin and site-1 run it; the Railway backend is still on `6a76a1d`._
  _25 Oct: CI `verify` green on `9e5510d`; the backend health endpoint returns
  `{"ok":true}` and live `/order` serves the real plans, so the backend has been
  redeployed past `6a76a1d` (exact Railway commit not read)._

### Production status (22 October 2026)

Read-only checks through the connected Railway, Vercel, Supabase and GitHub tools and
plain HTTP requests to the live site. Labels as below.

| Area                      | Finding                                                                                                                                                                                                                                                                                                                                                   | Label                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| CI on `main`              | CI passed on `5fc4397` (PR #18 merge). The scheduled Backup and Backup monitor workflows keep failing, expected while no real backup exists (4.1).                                                                                                                                                                                                        | verified                  |
| Vercel site-1 / admin     | Both production deployments are `READY` on `5fc4397`, team "Canadian Plans".                                                                                                                                                                                                                                                                              | verified                  |
| Railway backend           | Running deployment `4267deeb` from `6a76a1d` (20 Oct). No deployment since: PRs #16, #17 and #18 are not on the backend. `/api/v1/health` returns `{"ok":true}`.                                                                                                                                                                                          | verified                  |
| Live `/order`             | `https://canadianplans.com/order` returns 200 but shows "Plans are unavailable". Inferred cause: the backend predates the repo catalogue (ADR 0005) and the read-without-Turnstile fix, both on `main`.                                                                                                                                                   | verified · inferred cause |
| Domain                    | `canadianplans.com` serves site-1 (`/`, `/terms`, `/privacy` all 200). Home title "Canadian phone & internet plans, with real prices."                                                                                                                                                                                                                    | verified                  |
| robots.txt                | `Disallow: /` for all agents (6.1 still open).                                                                                                                                                                                                                                                                                                            | verified                  |
| Railway variables         | Set: `ENABLE_SCHEDULER`, `MACHINE_REGISTRY_JSON`, `QUOTE_WITHDRAWAL_POLICY`, `EMAIL_PROVIDER`, `ADMIN_ORIGIN`, `NODE_ENV`, `RESEND_ACCOUNT_ID`, `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_HOSTNAMES`. Not set: `SENTRY_DSN`. Values not read, so the Resend webhook entry inside `MACHINE_REGISTRY_JSON` is unconfirmed. | verified (names)          |
| Vercel site-1 variables   | Production has `SITE_1_SERVICE_CREDENTIAL`, `SITE_1_BACKEND_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Not set: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SANITY_DATASET`.                                                                                                                              | verified                  |
| Production migrations     | All 25 journal entries recorded, `0021`–`0024` included.                                                                                                                                                                                                                                                                                                  | verified                  |
| Workspace site-1          | DB `name` still "Northern Arrival Mobile" (3.6).                                                                                                                                                                                                                                                                                                          | verified                  |
| site-1 service credential | 1 active, 0 revoked.                                                                                                                                                                                                                                                                                                                                      | verified                  |
| Catalogue / orders        | 0 `offer_versions`, 0 `catalogue_sync_events`, 0 orders for site-1.                                                                                                                                                                                                                                                                                       | verified                  |

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

- ☑ **3.0 (new) Redeploy the backend** and apply migrations `0016`–`0019` before anything
  in Stage 3. Both done 20 Oct (see below).
- **2.1** is probably answered already (`canadianplans.com`); the owner needs to confirm it.
  3.1 is still open.
- **3.6** also covers the workspace's DB name ("Northern Arrival Mobile").
- **3.7** must not keep the Sanity smoke-test offer published in `production`.
- Stage 3–4 items: none could be ticked; every 23 September gap was confirmed or could not
  be checked.

### Railway fixes (20 October 2026, after the owner upgraded the Railway plan)

- **Cause of the outage:** the Railway service had fallen back to the Railpack builder.
  Railway no longer reads the repo's `railway.json` (config-as-code is deprecated in
  favour of `.railway/railway.ts`), so Railpack found no start command and every build
  since the plan lapsed failed (`No start command detected`).
- **Fixed on the service itself:** builder `DOCKERFILE` with `apps/backend/Dockerfile`,
  healthcheck `/api/v1/health` (60 s), restart `ON_FAILURE` ×3. These are the values
  `railway.json` intended. A redeploy reuses the old deployment's build settings, so a
  fresh deployment of `main` was needed.
- **Backend running `6a76a1d`:** deployment `b2ddb473` reached `SUCCESS`, and
  `/api/v1/health` returns `{"ok":true}`. _(verified)_
- **Scheduler:** `ENABLE_SCHEDULER` and the outbox/catalogue scheduler identities are
  already configured; the server starts both tasks. The optional synthetic check is not
  configured (`SYNTHETIC_CHECK_SELECTOR` unset, task 4.3). _(verified from logs and
  `scheduler.ts`)_
- **Catalogue sync fails with `provider_unavailable`:** `MACHINE_REGISTRY_JSON` has no
  Sanity integration for site-1 (`registry.sanityForWorkspace` returns nothing), so 0 offers
  sync. Adding one needs a Sanity read token plus the site-1 revalidate URL and secret from
  Vercel. Side effect: the Sanity smoke-test offer has not synced. _(verified from
  `catalogue_sync_state` and `catalogue/service.ts`)_
- **`QUOTE_WITHDRAWAL_POLICY=honour_until_expiry`** set on the backend (OPEN_INPUTS #14).
- **Still open, outside Railway:** the Railway config file migration to
  `.railway/railway.ts` (repo change), a stale empty staged Railway patch from 17 Sep
  (`03e15f7e`, left untouched).

### Supabase migrations applied (20 October 2026)

- `0016_bumpy_puppet_master`, `0017_worthless_synch`, `0018_lowly_dragon_lord` and
  `0019_backup_leases` were applied to production (`ixbhodlvfyxjctpsjibj`) with the
  owner's go-ahead. All four are additive (new tables, indexes, RLS policies, grants, two
  functions); none drops or rewrites data. Each ran as one atomic batch together with its
  `drizzle.__drizzle_migrations` row (hash and journal timestamp as Drizzle computes
  them), so `pnpm --filter @canadian-plans/db db:migrate` sees production as up to date.
  _(verified: 20 of 20 journal entries recorded; the 16 new tables exist.)_
- All new tenant tables have RLS enabled and forced. The only app table without forced RLS
  is `workspaces`, the global tenant registry, which `PLATFORM_CONTEXT.md` §4 exempts.
  Supabase's security advisor reports `app.backup_leases` and `app.rate_limit_buckets` as
  "RLS enabled, no policy": intended (deny-all; `backup_leases` is read only through a
  security-definer function) _(read)_. It also reports "leaked password protection
  disabled", a Supabase Auth setting the owner turns on in the dashboard.

### Decisions recorded (20 October 2026)

- **Sanity is deferred.** The owner does not want Sanity for now; it will be added later.
  Consequence: the only catalogue source the backend has is the Sanity adapter, so until a
  replacement exists `/order` cannot list priced plans and no order can be taken. The
  hardcoded storefront pages are display-only and cannot feed checkout (prices must come
  from the server, `PLATFORM_CONTEXT.md` §4.4). A non-Sanity catalogue source needs an ADR
  and code, and it depends on the launch plans and prices (2.2, 2.3). Tasks 3.7 and 3.8
  are on hold until that is decided. The catalogue sync logging `provider_unavailable`
  every 5 minutes is the expected result of having no Sanity registry entry.
- **Regional plans and wish list built (code, not yet deployed).** The repo catalogue
  (ADR 0005), province-aware offers and quotes, the internet and mobile order forms, and the
  region wish list (migration `0020`, `POST /api/v1/website/region-waitlist`, a one-field
  form on `/order` for a province with no internet plans, `region_selected` analytics
  events) are committed on the working branch. Still to do before they work in production:
  apply migration `0020` to Supabase (owner go-ahead), deploy the backend to Railway, set
  `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID` (and decide `CATALOGUE_ALLOW_OPEN_INPUTS` while
  `TEST-` placeholders remain, see `docs/ENV.md`). The wish list consent notice
  (`TEST-waitlist-v1`) is a placeholder the owner must approve. The 15 database-backed
  backend tests, including the new wish list store test, only run in CI, which runs on pull
  requests and `main`, so they are unverified until a pull request is opened.
- **Done 20 Oct (afternoon):** migration `0020_region_waitlist` applied to production
  Supabase (tracking row id 21; `app_runtime` can insert, not delete; FORCE RLS on). Railway
  `backend` now has `SITE_1_STATIC_CATALOGUE_WORKSPACE_ID` set (no redeploy; the running code
  ignores it until the new code is deployed). The Canadian Plans Vercel team is connected: the
  `canadianplans-web-app-site-1` and `-admin` projects exist and build; `canadianplans.com`
  and `www.canadianplans.com` (308 to the apex) are attached to site-1, and
  `apex.canadianplans.com` stays on admin (owner confirmed). Remaining: Cloudflare DNS for
  the apex and www (owner), site-1 service credential and `SITE_1_SERVICE_CREDENTIAL` on
  Vercel (owner MFA), merging the working branch to `main` so Railway (which tracks `main`)
  deploys the new code, the `CATALOGUE_ALLOW_OPEN_INPUTS` decision, and Vercel Pro.
- **Legal text and placeholders (21 Oct):** the plan catalogue no longer has `TEST-`
  placeholders (billing party, provider and pre-arrival eligibility came from Canada Wide and
  canadaesim; the terms version is `terms-2026-10-v2`). `/terms` and `/privacy` now publish real
  text from the repo with the owner's business details, so `CATALOGUE_ALLOW_OPEN_INPUTS` is not
  needed. Site-wide placeholder phone, address and emails were replaced with the real ones.
  Still to check: the assumptions listed in `docs/LAUNCH_PLANS.md`, a lawyer's review, and
  the phone number the owner will change.
- **Bot check (21 Oct):** the backend wanted a Turnstile token on every storefront call, which
  the site never sent, so `/order` showed "Plans are unavailable". Now only writes need the
  token (reads such as the plan list do not), and the site gets a fresh, one-use token bound
  to that route's action before each write (actions are listed in `docs/ENV.md`).
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set on Vercel (widget "canadianplans.com (Spin)").
  Check that the widget lists canadianplans.com and www, that Railway's
  `TURNSTILE_SECRET_KEY` belongs to it, and set
  `TURNSTILE_HOSTNAMES=canadianplans.com,www.canadianplans.com` (the single
  `TURNSTILE_HOSTNAME` is only a fallback).
- **Vercel:** the Vercel account connected to this session is the owner's personal Hobby
  account (`md-takibuddin`, team "Md takib 's projects"). It holds older projects, has no
  project linked to this repository and no deployment of any commit from it. The admin and
  site-1 projects are not in it, so nothing was created. Hobby is also non-commercial under
  Vercel's fair-use terms. Needed: the "Canadian Plans" Vercel team connected to the
  session, or the owner's go-ahead to create the projects in another team.

## Stage 2 — Business decisions only you can make (You)

These block the first order. Each is a row in `docs/OPEN_INPUTS.md`; answer there.

- ☑ **2.1 Domain** (#2) — `canadianplans.com`, confirmed by the owner 20 Oct 2026.
- ☑ **2.2 Plans to sell at launch** (#3) — real Rogers plans: names, data, terms. Start
  with a short list (3–5 plans) rather than the whole catalogue. _20 Oct: the owner chose
  all Canada Wide plans (internet and TV by province, national BYOD mobile) and confirmed
  the tables in [LAUNCH_PLANS.md](LAUNCH_PLANS.md) as correct. Pre-arrival stays a separate
  category._
- ☑ **2.3 Prices** (#4) — monthly charge, one-time fees, amount payable today, per plan.
  _22 Oct: monthly prices as in LAUNCH_PLANS.md; no one-time fees; $0 due today._
- ☑ **2.4 Upfront payment** (#5) — which plans need payment before fulfilment, and how
  much. Phase A has no card checkout; say how customers will pay you (e-Transfer etc.).
  _No payment on the website for any plan (20 Oct); the provider bills the customer
  directly after activation (22 Oct)._
- ☑ **2.5 Documents per plan** (#6) — passport / visa / address proof / none. _22 Oct:
  internet none, BYOD mobile government ID, pre-arrival none (catalogue matches)._
- ☑ **2.6 Carrier and fees** (#19) — eligibility rules, activation evidence, who collects
  each fee, taxes. _22 Oct: eligibility per plan in the catalogue; evidence = provider
  confirmation number; the provider collects all fees and taxes._
- ☑ **2.7 Courier** (#9) — who ships SIMs, and how you book them. _22 Oct: no shipping at
  launch; handoff recorded as described in `RUNBOOKS/dispatch-and-activation.md`._
- ☑ **2.8 Sender email** (#11) — e.g. `orders@<domain>`. _22 Oct:
  `orders@canadianplans.com`, replies to `info@canadianplans.com`; set on Railway in 3.2._
- ☑ **2.9 Retention policy** (#10, #16) — owner confirmed request-only deletion of
  retained customer records and identity documents on 21 Oct 2026; no fixed period.
  Version 2 legal text and `RETENTION_POLICY.md` record the decision. The complete
  customer-request deletion implementation is tracked by C3.
- ◐ **2.10 Terms and privacy text** (#24) — your own or a lawyer's; Claude can draft a
  first version for you to review, but it is your legal responsibility. _20 Oct: drafts
  adapted from the Canada Wide texts are in `docs/legal/` (`terms-v1-draft.md`,
  `privacy-v1-draft.md`) with `[OWNER TO CONFIRM]` gaps to fill._
- ☑ **2.11 Cancellation process** (#20) — what staff do if a customer cancels after paying
  or after activation. _22 Oct: free before activation; after activation the customer
  cancels with the provider. Steps in `RUNBOOKS/orders.md` → Cancellations._
- ☐ **2.12 Storefront claims** — replace the bracketed placeholders on the site
  (`[PRICE]`, install timelines, marketing claims). Claude will list every one.

Not needed for the first direct order (can wait): commission rules #7/#17/#18, invoice
identity #8, Umami/Sentry choice #12/#13, Phase B items.

## Stage 3 — Production setup (Both)

Depends on Stage 1 findings and the Stage 2 answers.

- ☑ **3.1 Point the domain at site-1** _(You buy / Both configure)_ — Vercel domain,
  `NEXT_PUBLIC_SITE_URL`, `ADMIN_ORIGIN`/CORS origins updated. _22 Oct: `canadianplans.com`
  serves site-1 over HTTPS; `NEXT_PUBLIC_SITE_URL=https://canadianplans.com` set on Vercel
  (owner approved) and site-1 rebuilt, so canonical links no longer say `localhost`.
  25 Oct: `/order` on the domain reaches the backend and lists plans._
- ◐ **3.2 Email sending** _(Both)_ — verify the domain in Resend, SPF/DKIM/DMARC records,
  `EMAIL_PROVIDER=resend`, sender address from 2.8. **Before deploying the
  `website-improvements` backend** (it sends only through a registered Resend account):
  1. In the Resend dashboard, add a webhook to
     `https://<backend>/api/v1/webhooks/resend/<selector>` for `email.delivered`,
     `email.bounced`, `email.complained` and `email.failed`; copy its `whsec_...` secret.
  2. Add this entry to the `webhooks` array of Railway's `MACHINE_REGISTRY_JSON`, keeping
     the existing entries:

     ```json
     {
       "selector": "<selector>",
       "provider": "resend",
       "providerAccount": "<label>",
       "workspaceId": "<site-1 workspace UUID>",
       "actorId": "<new stable UUID>",
       "verificationSecret": "whsec_..."
     }
     ```

  3. Set `RESEND_ACCOUNT_ID=<label>` (the same label) on Railway.
  4. Apply migrations 0021–0024, then deploy and send a test acknowledgement.

  Without steps 2–3 every customer email fails with `email_account_not_configured`;
  the retired `EMAIL_WEBHOOK_SHARED_SECRET` endpoint now returns 404. Details:
  `docs/ENV.md` → Resend.

  _22 Oct: domain verified in Resend; SPF (`send.`), DKIM (`resend._domainkey`) and DMARC
  (`p=none`) are published; the Resend webhook `resend-site-1` exists and
  `RESEND_ACCOUNT_ID` is set. `RESEND_FROM_EMAIL=orders@canadianplans.com`,
  `RESEND_FROM_NAME=Canadian Plans` and `RESEND_REPLY_TO_EMAIL=info@canadianplans.com` set on
  Railway without a redeploy. Left: deploy the backend (1.2) and send a test email._

- ☑ **3.3 Turn on checkout** _(Both)_ — set `QUOTE_WITHDRAWAL_POLICY=honour_until_expiry`
  on Railway (decided 21 Sep, OPEN_INPUTS #14) and redeploy. _20 Oct: set and live
  (deployment `4267deeb`). 25 Oct: live `/order` renders priced plans with no
  `checkout_disabled`._
- ☑ **3.4 Turn on the scheduler** _(Both)_ — `ENABLE_SCHEDULER=1` on the backend and the
  machine registry entries for `outbox:run` / `reconcile:run` for site-1. Without it, no
  catalogue sync and no customer emails. _20 Oct: scheduler runs. The Sanity sync
  (`provider_unavailable`) is moot: the launch catalogue lives in the repo (ADR 0005),
  so nothing is left for this item. Closed 25 Oct._
- ☑ **3.5 site-1 service credential** _(You, needs MFA)_ — create in admin → Settings,
  Claude sets `SITE_1_SERVICE_CREDENTIAL` on Vercel site-1 and redeploys. _22 Oct: one
  active credential, and the Vercel production variable is set._
- ☑ **3.6 Site name** _(Claude)_ — replace `SITE_1_NAME_PLACEHOLDER` with "Canadian Plans".
  _22 Oct: the placeholder is gone from code; the site-1 workspace in the production
  database was renamed from "Northern Arrival Mobile" to "Canadian Plans" (owner approved)._
- ☑ **3.7 Real plans in Sanity `production`** _(Both)_ — siteSettings + the launch offers
  from 2.2–2.6, published. Claude prepares the documents, you review and publish.
  _Superseded: Sanity is deferred; the real plans live in the repo catalogue (ADR 0005)._
- ☑ **3.8 Catalogue sync check** _(Claude)_ — offer_versions appear for site-1 and `/order`
  lists the real plans (no "Plans are unavailable"). _25 Oct: live `/order` lists the
  100 GB, 175 GB and Unlimited mobile plans with prices matching the repo catalogue; no
  "Plans are unavailable". The offer_versions query does not apply to the repo catalogue
  (ADR 0005)._
- ☑ **3.9 Make static pages match the catalogue** _(Claude)_ — the redesigned landing
  pages are static; their plan names and prices must match what `/order` sells. _22 Oct:
  PR #22; every plan button links to its plan in `/order`._
- ☑ **3.10 Legal pages** _(Claude)_ — publish the terms/privacy text from 2.10 and record
  their versions. _22 Oct: `/terms` and `/privacy` live as version 2, effective 21 Oct._

## Stage 4 — Safety net before real customer data (Both)

- ☐ **4.0 Rotate exposed keys** _(You, Claude guides; owner chose later on 22 Oct)_ — Cloudflare, R2 and Backblaze B2
  credentials were stored in plain text outside a password manager. Create new keys,
  update Railway/Vercel/GitHub secrets, revoke the old ones. Do this first.
- ☐ **4.1 Backups** _(You provision, Claude verifies)_ — enable managed daily database
  backups (Supabase Pro baseline) **and** provision the T24 GitHub secrets for the
  separate encrypted daily DB/Auth, R2 and Sanity archive, independent alerts and a
  rehearsed restore. Verify both recovery paths before real customer data.
  Today there is **no restorable backup** of production. _22 Oct: owner decided no backup for
  now and stays on Supabase Free. Risk accepted: a database loss before this is done cannot
  be recovered._
- ◐ **4.2 Error tracking** _(Both)_ — connect Sentry (or chosen tool) so production errors
  reach you. _22 Oct: Sentry org `canadian-plans` with projects `canadian-plans-backend` and
  `canadian-plans-admin`. `SENTRY_DSN` set on Railway (live with the next backend deploy) and
  `NEXT_PUBLIC_SENTRY_DSN` on Vercel admin (live with the next admin build). The code posts
  scrubbed events itself; no Sentry SDK. A test event reached each project. Not covered: the
  storefront (site-1) and the GitHub Actions jobs, which have no DSN._
- ☐ **4.3 Alerts** _(Claude)_ — confirm owner alerts and the synthetic order check are
  green with the scheduler on.
- ☑ **4.4 Staff accounts** _(You)_ — invite staff in admin with the right roles; MFA on for
  you and Finance. _22 Oct: owner-only at launch; the owner is the only account that can sign
  in, with MFA. Three 14 Sep seed memberships point to deleted users and cannot log in._

## Stage 5 — Rehearse the first order (Both)

- ☑ **5.1 Run the e2e specs** _(Claude)_ — `order.spec.ts` and `a2-launch-gates.spec.ts`
  need a Postgres harness (none on this PC; use CI or a temporary database). _22 Oct: CI
  runs them on every push against a disposable Postgres; on `main` `1af1773` all 84 site-1
  e2e tests passed (desktop and mobile), both specs included._
- ☐ **5.2 Production test order** _(Both)_ — a controlled, non-billable order on the live
  site: submit → acknowledgement email arrives → appears in admin → documents uploaded
  and approved → status moves to ready/dispatched. No real carrier activation; cancel it
  through the approved process afterwards. Evidence in `docs/EVIDENCE/A4-launch.md`.
- ☐ **5.3 Walk the runbooks once** _(You, Claude beside you)_ — `RUNBOOKS/orders.md`,
  `dispatch-and-activation.md`, `failed-email-recovery.md`, `release-rollback.md`.
- ☐ **5.4 Stock and supplies** _(You)_ — SIM cards on hand, packaging, courier account.

## Stage 6 — Go live (Both)

- ☑ **6.1 Open to search engines** _(Claude)_ — production robots/sitemap allow indexing;
  only `/business-internet` stays noindex. One switch: flip `STOREFRONT_INDEXING_OPEN`
  in `apps/site-1/src/lib/seo.ts` to `true` and deploy; the commercial pages and the
  sitemap follow it (`publicRobots()` / `INDEXABLE_PATHS`). _25 Oct: live robots.txt is
  `Allow: /` with `/studio` and `/api` disallowed; sitemap.xml returns 200. Not verified:
  sitemap submission to Google Search Console / Bing._
- ☐ **6.2 Analytics** _(Both)_ — Umami (or chosen tool) recording visits and order starts.
- ◐ **6.3 Announce** _(You)_ — first customers usually come from people you can reach _22 Oct: skipped for now (owner)._
  directly: newcomer and student groups, WhatsApp/Facebook communities, friends and
  partners. Claude can draft posts and a short launch message. _22 Oct: drafts for every channel in
  [marketing/launch-posts.md](marketing/launch-posts.md) (English, no offer); post after
  `/order` lists plans._

## Stage 7 — The first real order (You, Claude on call)

- ☐ **7.1 Order arrives** — alert/email received, order visible in admin.
- ☐ **7.2 Check documents** — approve or request re-upload.
- ☐ **7.3 Payment** — collect as decided in 2.4 and record it.
- ☐ **7.4 Dispatch or activate** — book courier / activate with Rogers, update status. _22 Oct:
  `ORDER_OPERATIONAL_TRANSITIONS=1` set on Railway (owner approved), live with the next backend
  deploy; without it Dispatch and Activate return `feature_not_ready`._
- ☐ **7.5 Customer confirmed** — customer has a working SIM; note anything that was
  awkward and turn it into a fix or a runbook change.

---

## Critical path

1.1 → (2.1–2.6 in parallel with you) → 3.1–3.8 → 4.1 → 5.2 → 6 → 7.

Stage 2 is the longest wait and only you can do it. Claude can do 1.1, 1.2, 2.12 (listing
placeholders), 3.6, 3.9 and 5.1 now, without any of your answers.
