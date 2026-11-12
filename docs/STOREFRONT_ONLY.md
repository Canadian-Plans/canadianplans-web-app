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

## What the browser suites cover

`pnpm run test:e2e` builds the storefront and runs its Playwright suites
(`apps/site-1/e2e`, see the README there) at a desktop and a mobile width, then
the client-bundle security check (`test:security`). CI runs both after the
build. They need no database and no secret.

The storefront in these runs talks to a **stub of the CRM's website API**
(`apps/site-1/e2e/crm-stub`), not to the real CRM. The stub validates every
request with the schemas of `@canadian-plans/crm-contracts` and checks its own
answers against the same package, enforces the site key, the draft and customer
grants, `Idempotency-Key` replay and conflict, and the lead-type rules the
storefront depends on. Covered:

- **SIM order**: plan, details, documents (a real PDF and PNG through the signed
  upload; a wrong file type refused), the plan's price on the review step, the
  `MS-` reference on the confirmation, and what the CRM received (lead type,
  plan, form, consent versions, attribution from the URL).
- **Resume**: a reload mid-draft restores the details; changing the plan.
- **Internet and mobile orders**: nothing is sent before submit, then exactly
  one `POST /website/leads` with `submit: true` and an `Idempotency-Key`.
- **When it goes wrong**: field errors, a plan withdrawn or repriced before
  submit, a lost answer retried under the same key (one order),
  `idempotency_conflict`, a 503, an expired, unknown, submitted or forged
  draft, the province wish list, "Request a callback", the CRM down.
- **`/track`**: code, order list, order details, a change request (the four
  allowed details only), a passport upload, a wrong code, an expired session, an
  order that can no longer change.
- **Accessibility** (axe, no serious or critical findings) on every step of the
  order form and of tracking, the security headers, and that the site key never
  reaches the browser.

What they cannot show is that the real CRM behaves as the stub does: its
database, emails, rate limits, real Turnstile verification and real storage are
not in these runs.

## What is not done yet

- **Nothing here was tried against the live CRM**: the storefront has no site
  key yet. The unit tests use a fake client and the browser suites use the stub
  above. A test order of each kind against the live CRM, followed on `/track`,
  is the owner's final check.
- **`/order/pre-arrival` and `/order/home-internet`** were preview-only pages
  before the split and still are.
- **The old `packages/contracts`** can be cut down to the province helpers and
  `cms/` once nothing else imports it.
- **Campaign attribution** (`utm_*`, partner code) is recorded only when the
  customer lands on a link that already names the plan
  (`/order?plan=…&utm_source=…`): choosing a plan from the list moves to a new
  address without those parameters. Decide whether the storefront should carry
  them across.

## What comes next

1. In the CRM admin: create the site key (the three scopes above), save the
   email settings and enter the plans with the properties above.
2. In the storefront's Vercel project: set `SITE_1_BACKEND_URL` to the CRM
   backend's origin and `SITE_1_SERVICE_CREDENTIAL` to the new key, then deploy
   this branch.
3. Place a test order of each kind and follow it on `/track`. This is the check
   the browser suites cannot make.

## Reading the older documents

`PLATFORM_CONTEXT.md`, `docs/REQUIREMENTS.md`, `docs/IMPLEMENTATION_PLAN.md`,
`docs/BUILD_TASKS.md`, the ADRs, runbooks and evidence describe the whole
platform as it was. Their backend, admin, database and backup sections are
history; the storefront sections and the invariants that bind a website (no
database access, no price trusted from the browser, no PII in logs, no secrets
in the browser) still apply.
