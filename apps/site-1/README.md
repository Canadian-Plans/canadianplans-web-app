# Canadian Plans storefront (site-1)

Next.js App Router storefront for Canadian Plans, the first brand. Public routes:
`/`, `/plans`, `/plans/[slug]`, `/order`, `/track`, `/privacy` and `/terms`.
Home is a Figma design preview; catalogue pages are placeholders. Order, tracking and legal-content
flows are present in code. Live operation still requires approved content,
configuration and the project's launch evidence.

Pre-arrival preview files are local to the browser, with a 24-hour restore window
from the last file change. Opening preview storage removes expired or undated legacy
records across all tab keys; fresh records from other tabs survive. Cleanup runs
when the preview is used, not in the background while the site is closed. This
technical preview-cache window does not set retention for real customer documents.

Use `pnpm --filter site-1 dev` from the repository root (port 3001). Shared strict
TypeScript, ESLint, design tokens and UI primitives apply. The site never imports
DB packages, backend implementation or server-only adapters.

## Configuration boundaries

`src/site.config.ts` is public: site ID/slug, the confirmed name Canadian Plans,
CAD, en-CA and public Umami configuration. The app/package/workspace identifier
stays `site-1`; branding does not rename tenant IDs, environment variables or
deployment resources. The storefront domain is `canadianplans.com`
(`docs/OPEN_INPUTS.md` #2). Production sets `NEXT_PUBLIC_SITE_URL=https://canadianplans.com`
(22 October 2026), which drives canonical URLs, the sitemap and `robots.txt`. It is read at
build time, so changing it needs a new site-1 build; a plain redeploy of the same commit is
skipped by the `affected-builds` ignore step.

The owner supplied the Figma design on 12 October 2026. See the
[design-to-code plan](docs/DESIGN_TO_CODE_PLAN.md) for the desktop/mobile
frame map, CMS rendering approach, implementation order and review gates.
The Home design preview and shared component gallery are implemented.

The Figma foundation is ready: [design instructions](AGENTS.md),
[tokens and ambiguities](docs/DESIGN_NOTES.md), a scoped Tailwind theme exported by
`@canadian-plans/ui/canadian-plans.css`, Google Sans Flex via `next/font` and
typed app-root `content/` files using `@content/*`. Existing ESLint/Prettier
configuration and shadcn primitives are reused. New designs opt into `.cp-design`
per named page. Home is implemented at `/` and shared pieces can be inspected
at `/dev/components`; other storefront pages retain their existing compositions.

## Home design preview

Home follows desktop `60:3` and mobile `195:2`, with its own `(home)` route-group
layout. The remaining `(storefront)` routes retain their existing layout.
Static sections render on the server; client islands own tabs, carousels,
navigation/contact UI and the postal-code preview. All Home copy/assets live in
`content/home.ts`; plan and FAQ/testimonial fixtures reuse `content/components.ts`.

Popular-plan tabs support click, arrow keys, Home and End. The arrival tab shows
the source sample cards; the mobile tab exposes sample mobile comparison, while
the internet tab explains the later-launch scope and links to the postal preview.
Selections never enter real checkout. Desktop journey controls rotate the four
visible cards; mobile supports native swipe/scroll, keyboard arrows and dots.
The FAQ uses the existing native, single-open disclosure component. Reviews can
also be scrolled with keyboard/dots on mobile.

Postal codes validate in the browser and submit to a typed no-op server action.
Input is retained, and the result explicitly says availability was not checked.
Advisor controls open a preview dialog and send no messages. The Home preview
is noindex until the illustrative business copy and commercial data are approved
and integrated; this does not change indexing policy for other routes.

Run `pnpm --filter site-1 exec node scripts/verify-home.mjs` against the current
server on port 3127, or set `HOME_TEST_URL`. Screenshots, source references and
interaction/asset evidence are in [Home evidence](../../docs/EVIDENCE/home/README.md).

## Shared component gallery

Open `/dev/components` after starting site-1. The gallery is available in local
development and Vercel preview, returns 404 in production, and is noindex.
For the current running session use `http://127.0.0.1:3127/dev/components`.

New shared UI exports under `@canadian-plans/ui/canadian-plans`:
`CpButton` (seven tones and three scales), `CpChip`, `CpBadge`, `CpLinkPill`,
`CpPlanCard`, `CpSectionHeading`, `CpFaqAccordion`, `CpReviewCard` (testimonial),
`CpPriceCircle`, `CpBreadcrumb`, `CpImageSlot`, and `CpStickyCta`.
`CpAsset` preserves exported asset dimensions; `CpComponentGroup` wraps gallery
sections. The existing order-summary `ReviewCard` remains a separate component.
`SheetTrigger` and `SheetClose` complete the existing shadcn Sheet exports.

App shared compositions are `UtilityBar`, `Navigation`, `PromoStrip` and `Footer`.
Navigation exposes controlled menu/action props; its gallery wrapper connects
them to the preview provider. Search uses a validated, no-op server action.
Gallery adapters (`ButtonExamples`, `ChipExamples`, `PlanExamples`, `MainAction`,
`StickyExamples`, `NavigationExample`, `ComponentLabProvider`) own demo state.

Consumers import `canadian-plans.css` and `canadian-plans-components.css` into
their Tailwind CSS entry and opt into `.cp-design`. Copy and marked preview
fixtures live in `content/components.ts`; exact SVG exports live in
`public/design/components/`. Links stay within the gallery. Plan selection never
creates an order. The floating mobile CTA is enabled with the gallery checkbox;
its inline specimens include Figma's home indicator, while the floating version
uses the device safe area. Pass `suppressed` when a cookie banner or overlay is open.

Run `pnpm --filter site-1 exec node scripts/verify-components.mjs` with site-1
running on port 3127, or set `COMPONENTS_TEST_URL` to another local/preview origin.
It captures 390/1440 screenshots, checks asset dimensions, browser errors,
accessibility, keyboard/menu/disclosure/selection/sticky/search behavior and
overflow at five widths. Evidence is in
[`docs/EVIDENCE/shared-components`](../../docs/EVIDENCE/shared-components/).

`src/backend.config.ts` is server-only. It reads `SITE_1_BACKEND_URL` (an HTTPS
origin, or HTTP localhost for development) and `SITE_1_SERVICE_CREDENTIAL` lazily.
Never prefix these names with NEXT_PUBLIC, export them from public configuration,
or pass their values into React props or Studio. Placeholder pages need no secrets.
In production `SITE_1_BACKEND_URL` points at the Railway-hosted backend
(`https://backend-production-ebbb6.up.railway.app`).

`src/lib/backendClient.ts` is a server-only fetch transport until the shared typed
client exists. It attaches scoped Bearer authorization and a fresh request ID,
disables caching and redirects, and only accepts paths under `/api/v1/`. The health
helper validates through the existing contracts schema. It is not a browser proxy.

## Studio and analytics

`/studio/[[...tool]]` uses the official NextStudio wrapper and noindex metadata.
With no public Sanity project ID/dataset it renders a disconnected setup shell,
without attempting a fake project connection. T9 must configure this site's own
project, shared CMS schema types and editor access before editing is operational.
Noindex is not access control. Studio has its own layout, without storefront
navigation, Tailwind resets or analytics.

Sanity 6's local CLI reads `sanity.cli.ts`, which shares the Studio's public
project/dataset settings. With those identifiers configured,
`pnpm --filter site-1 exec sanity schema extract --path schema.json` validates
and extracts the shared schema without changing the remote project. Keep the
generated schema outside the checkout when it is only a local verification
artifact. Provider login, remote provisioning and live editor access are separate
operational checks.

Umami loads only when both `NEXT_PUBLIC_UMAMI_SCRIPT_URL` and
`NEXT_PUBLIC_UMAMI_WEBSITE_ID` are nonempty at build time. Automatic tracking is
disabled until T20 implements sanitized events; the configured script still loads.
This prevents raw paths/referrers from being collected by the placeholder scaffold.
Search/hash exclusion and Do Not Track attributes are set as additional safeguards.

## Order form (T13)

`/order` is a five-step journey: Plan → Details → Documents → Review + terms →
Confirmation. All commercial and order data goes through the backend typed client
from `@canadian-plans/contracts`; the browser never holds the service credential
and never supplies a price.

- **Step 1** lists the currently available offers from
  `GET /api/v1/website/offers` (the backend's published catalogue with each
  plan's `productId`). Selecting a plan is a link to `/order?plan=<productId>`.
- **Step 2** shows the save notice ("We'll save your details so you can continue
  later") and, on Continue, a server action creates the draft lead via
  `POST /api/v1/website/leads` with attribution captured from the order URL and
  the referrer header (`src/lib/attribution.ts`, mirroring the backend's
  allowlist — the backend remains the enforcer).
- **Step 3** is driven by the offer's `documentChecklist`; `none` skips it.
  `FileDrop` is a labelled placeholder — real R2 uploads are T17.
- Later steps PATCH the same lead through its draft grant. **Step 4** requests a
  server-authoritative quote (`POST /api/v1/quotes`) and then submits
  (`POST /api/v1/orders`) with one idempotency key generated per draft. A network
  timeout is retried once with the SAME key; a real HTTP response is never turned
  into success. A retryable failure shows "Your order was not saved. Please try
  again." and the confirmation step is reachable only with a server-issued
  reference. A quote failure offers "Request a callback" and creates no order.
- The draft grant and idempotency key live in an httpOnly cookie
  (`src/app/(storefront)/order/draft.ts`). Preview deployments are noindex
  (`VERCEL_ENV=preview`).

### Order-form end-to-end tests

`pnpm --filter site-1 run test:e2e` builds site-1 and runs the Playwright suite
(`e2e/order.spec.ts`) at desktop and mobile widths. Playwright starts two
servers:

1. `apps/backend/tests/e2e/harness.ts` — the **real** backend app against a
   disposable Postgres, with a stub published-catalogue provider and an
   stateful action-bound one-use proof verifier. The browser fixture replaces
   Cloudflare's external script; a synthetic public key is compiled by the test
   runner, and no live Siteverify/provider call is made. The Sanity stub and
   provider emulator stand in for unavailable live services; everything else
   (routes, service credential and scopes, RLS, lead/quote/order transactions,
   idempotency, reference generation) is the real code.
2. the built site-1 server, pointed at the harness with a seeded service
   credential.

Create the disposable database once (the harness migrates and seeds it):

```bash
createdb canadian_plans_e2e_test
```

The harness truncates tenant tables and resets the `app_runtime` password, so it refuses any database that is not on localhost or whose name does not end in `_test` / `_e2e` (override only for a remote throwaway database with `E2E_ALLOW_REMOTE_DATABASE=yes-i-understand`).

### Transactional email design previews

Open `/dev/emails` locally, then select Order received, eSIM ready or Install
booked. The route is also available on Vercel previews and returns 404 in
production, matching the existing component lab policy. Fixtures are fictional;
this route does not send messages.

Templates live in `src/emails`, typed copy/fixtures in `content/emails.ts`.
`renderTransactionalEmail` returns subject, hidden-preheader metadata, HTML and
plain text from validated message data. Real delivery belongs to the backend's
existing outbox/EmailAdapter and requires authoritative order values/action URLs.

After editing the central Canadian Plans tokens:

```bash
pnpm --filter site-1 emails:tokens
pnpm --filter site-1 emails:verify
```

The second command checks previews against the running server on port 3127.
See `docs/EVIDENCE/emails/README.md` for source frames, renderer tests, screenshots
and remaining inbox/asset/business-copy review.

### Category design previews

The seven category routes are `/pre-arrival-sim/students`,
`/pre-arrival-sim/from-india`, `/pre-arrival-sim/toronto-pearson`,
`/mobile-plans/rogers`, `/compare/rogers-vs-fido`,
`/home-internet/vancouver` and `/home-internet/ontario`.
Each has desktop/mobile Figma references and typed preview content. All are
noindex and excluded from the sitemap. Address checks and plan selections use
local fixtures; these pages create no provider request or real order.

Run `scripts/verify-category-sim.mjs`, `verify-category-airport-compare.mjs`,
`verify-category-rogers.mjs`, `verify-category-internet.mjs` and
`verify-category-handoffs.mjs` against the local preview server, using
`AUDIT_ORIGIN` to override port 3127. Source screenshots, rendered comparisons,
asset maps and check results are linked in
[`docs/EVIDENCE/category-review/README.md`](../../docs/EVIDENCE/category-review/README.md).
