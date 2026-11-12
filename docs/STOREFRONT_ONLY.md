# This repository is the Canadian Plans storefront only

Written 2026-11-12. Keep it current.

## What changed

Until 2026-11-12 this repository held the whole platform: backend, admin,
storefront, jobs and shared packages. The owner split it:

- **Backend and admin** now live in `Canadian-Plans/canadianplans-crm` (a copy
  of the GT Sales CRM, renamed for Canadian Plans). That repository is the only
  place backend and admin work happens.
- **This repository** keeps the storefront `apps/site-1` and the shared
  packages it uses: `packages/contracts`, `packages/ui`, `packages/types` and
  `packages/config`.

Removed here: `apps/backend`, `apps/admin`, `jobs`, `packages/db`,
`packages/adapters`, `packages/observability`, `railway.json`, the three backup
workflows and the backup and recovery scripts. They remain in this
repository's git history.

## How the storefront talks to the CRM (rewired 2026-11-12)

`apps/site-1` calls the CRM's website API through the typed client in
`@canadian-plans/crm-contracts` (`packages/crm-contracts`, a copy of the CRM's
`packages/contracts`; see its README for how to refresh it). The old
`packages/contracts` stays only for the province helpers and the Sanity schema
types; its client and API schemas are no longer used.

| Storefront               | CRM                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Plan list on `/order`    | `GET /website/plans`, turned into the form's offers by `src/lib/offers.ts`.                                                              |
| Pre-arrival SIM order    | Lead type `sim_order`: a draft that is saved, resumed, takes document uploads and is submitted with the same `PATCH` (`submit: true`).   |
| Internet order           | Lead type `internet`: sent once, on submit (`POST /website/leads` with `submit: true`).                                                  |
| Mobile order             | Lead type `mobility`: sent once, on submit.                                                                                              |
| Price on the review step | The plan's current price from the plan list. There is no quote: the CRM reads the price again and freezes it on the order at submit.     |
| "Request a callback"     | A `contact_message` lead, `payload.kind = 'callback_request'`.                                                                           |
| Province wish list       | A `contact_message` lead, `payload.kind = 'region_waitlist'`.                                                                            |
| `/track`                 | The CRM's tracking routes: email code, the customer's orders, a change request, passport and visa uploads.                               |
| Consent                  | `consentVersion` on the lead: the privacy version on a draft; privacy, terms and (mobile) credit-check versions joined by `;` on submit. |

What a plan needs in the CRM admin (Settings → Plans) for the storefront to show
it fully: custom plan properties marked "Show on website" with the keys
`custom_product_key` (the key the static pages link with), `custom_regions`
(province codes, comma-separated; absent = everywhere), `custom_product_title`,
`custom_best_for`, `custom_features` (one per line) and `custom_promotion`. A
plan without them still lists and orders, under its name.

The site key needs the scopes `leads:write`, `uploads:customer` and `tracking`.
The backend's bot check is Cloudflare Turnstile; the widget's action names are
the CRM's (`lead-save`, `upload-intent`, `upload-finalize`, `tracking-request`,
`tracking-verify`).

### What the CRM does not have, and what happened to it here

- **Marketing opt-in**: no website route records it, so the checkbox was
  removed from the review step.
- **Documents for internet and mobile orders**: uploads need a draft, and these
  two are sent whole. Their document checklist is not shown; staff collect what
  they need.
- **Mobile credit-check identity** (the CRM's licence or SIN step): not built
  in the storefront. The consent checkbox stays and its version is recorded.
- **"We need something from you" requests and their answers**, the order
  progress steps, payment state and "last updated" on `/track`: the CRM does
  not send them. `/track` shows the status in the CRM's words and lets the
  customer change name, phone, arrival date and address in Canada.
- **Internet province** is not a field of the CRM's internet form; the postal
  code and the plan chosen carry it.

## What is not done yet

- **The browser journeys** in `apps/site-1/e2e` and the security suite
  (`test:security`) still boot the old backend's test harness, which is gone.
  The files are kept; CI does not run them. Unit tests (605), typecheck, lint
  and the build do run. Rewriting them against a local `canadianplans-crm`
  backend is the next engineering task.
- **Nothing here was tried against the live CRM**: the storefront has no site
  key yet. The unit tests use a fake client.
- **`/order/pre-arrival` and `/order/home-internet`** were preview-only pages
  before the split and still are.
- **The old `packages/contracts`** can be cut down to the province helpers and
  `cms/` once nothing else imports it.

## What comes next

1. In the CRM admin: create the site key (the three scopes above), save the
   email settings and enter the plans with the properties above.
2. In the storefront's Vercel project: set `SITE_1_BACKEND_URL` to the CRM
   backend's origin and `SITE_1_SERVICE_CREDENTIAL` to the new key, then deploy
   this branch.
3. Place a test order of each kind and follow it on `/track`.
4. Rewrite the browser journeys and put them back in CI.

## Reading the older documents

`PLATFORM_CONTEXT.md`, `docs/REQUIREMENTS.md`, `docs/IMPLEMENTATION_PLAN.md`,
`docs/BUILD_TASKS.md`, the ADRs, runbooks and evidence describe the whole
platform as it was. Their backend, admin, database and backup sections are
history; the storefront sections and the invariants that bind a website (no
database access, no price trusted from the browser, no PII in logs, no secrets
in the browser) still apply.
