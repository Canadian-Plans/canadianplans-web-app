# Site-1 page redesign — progress tracker

Owner request (15 October 2026): bring every site-1 page in line with the Electric Blue
home page (look, layout and tone), clean up the UI, and rewrite copy so it is clear,
SEO-friendly and keyword-focused. Work one page at a time; commit and push each page to
`redesign/electric-blue` (PR #15). **A new session resumes from the first page that
is not `done` below.**

## Owner decisions (15 October 2026)

- **Copy:** rewrite titles, meta descriptions, headings and body for clarity and
  keywords; add FAQ structured data where it helps. Never invent prices, timelines,
  ratings or claims. Bracketed/awaiting-approval placeholders stay and are listed here.
- **Order flow** (`/plans`, `/order`, `/track`): restyle only; submission, validation
  and tracking behaviour unchanged; existing e2e must still pass.
- **Commits:** one commit per finished page, pushed to `redesign/electric-blue`.
- **Order:** SEO landing pages → About/Contact/FAQ/Guides → order and tracking →
  legal and system → polish pass on the four category pages.
- Visual reference is the home page (`src/components/home/redesign/*`), not Figma — the
  same exception the owner approved on 14 October (DESIGN_NOTES "Electric Blue redesign").
- All pages stay `noindex` until the owner publishes; going indexable is not part of
  this work.

## Site header and footer

Redesigned pages use `SiteHeader` (`src/components/shared/site-header.tsx`) with
`siteChrome` / `siteChromeWithPromo` and `siteFooter` from `content/site-chrome.ts`: real
links instead of the old per-page `#plans` / `#contact` placeholders. Move each page onto
them as it is redone; the home page and the four category pages switch in the polish pass.

## Approach

SEO landing pages share one kit (`src/components/landing/*`, styles in
`src/app/landing.css`, copy in `content/landing/*`) built from the home page primitives
(`CpCategoryBanner`, `CpStepTimeline`, `CpFeatureCard`, `CpCtaBand`, FAQ accordion).
Pre-arrival plan blocks reuse the `/pre-arrival-sim` `PlanPicker`. Testimonials and star
ratings are dropped (unverified; owner removed reviews from category pages on 14 Oct).

## Verification

**Use a production build** (`pnpm build && npx next start --port 3127`): in this cloud
container the dev server's HMR websocket is blocked by the proxy and client components do
not hydrate, so interaction checks fail on `pnpm dev`. The landing and page verify
scripts default to `http://127.0.0.1:3127`.

`AUDIT_ORIGIN=http://127.0.0.1:3001 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-landing.mjs <route>`
(dev server: `pnpm dev`). Checks one h1, no horizontal scroll at 320/390/1440, in-page
anchors, JSON-LD (no pending answers), axe serious/critical, page errors; saves evidence to
`docs/EVIDENCE/landing/`.

## Per-page checklist

1. Screenshot before (390 + 1440).
2. Rebuild on the landing kit; rewrite copy in `content/`.
3. Typecheck, lint, format, unit tests, page verify script / e2e if the page has one.
4. Screenshot after (390 + 1440), check no horizontal scroll at 320.
5. Update this file, commit, push.

## Status

| #   | Page                                                                                         | Status | Notes                                                                                                             |
| --- | -------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `/pre-arrival-sim/students`                                                                  | done   | landing kit built; moved to `(landing-arrival)`                                                                   |
| 2   | `/pre-arrival-sim/from-india`                                                                | done   | old `(category-sim)` route group removed                                                                          |
| 3   | `/mobile-plans/rogers`                                                                       | done   | uses `/mobile-plans` browser pre-filtered to Rogers; old route group removed                                      |
| 4   | `/pre-arrival-sim/toronto-pearson`                                                           | done   |                                                                                                                   |
| 5   | `/compare/rogers-vs-fido`                                                                    | done   | old airport/compare route group removed                                                                           |
| 6   | `/home-internet/ontario`                                                                     | done   | reuses `/home-internet` address check and speed cards                                                             |
| 7   | `/home-internet/vancouver`                                                                   | done   | old category-internet route group removed                                                                         |
| 8   | `/about`                                                                                     | done   | on the landing kit, with FAQ + JSON-LD                                                                            |
| 9   | `/contact`                                                                                   | done   | layout and forms kept; site header/footer, breadcrumb, home-style hero, navy tracking panel                       |
| 10  | `/faq`                                                                                       | done   | 10 answers filled from existing site copy (13/19 in JSON-LD)                                                      |
| 11  | `/guides`                                                                                    | done   | every card now opens real content (article + 7 landing pages)                                                     |
| 12  | `/guides/[slug]`                                                                             | done   | 5 FAQ answers filled from site facts; related cards from the index                                                |
| 13  | `/order/pre-arrival`                                                                         | done   | reviewed: already matches; minimal checkout header kept on purpose                                                |
| 14  | `/order/home-internet`                                                                       | done   | reviewed: already matches; minimal checkout header kept on purpose                                                |
| 15  | `/track-order`                                                                               | done   | site header/footer, home-style headings, navy help band                                                           |
| 16  | `/plans`, `/plans/[slug]`, `/order`, `/track`                                                | done   | layout restyle only (site header/footer, type); pages untouched; `order.spec.ts` still needs the Postgres harness |
| 17  | `/privacy`, `/terms`                                                                         | done   | chrome + headings only; legal wording untouched (needs legal review)                                              |
| 18  | `/accessibility`, `/search`, 404                                                             | done   | chrome + headings; navy panels                                                                                    |
| 19  | Category polish: `/pre-arrival-sim`, `/home-internet`, `/mobile-plans`, `/business-internet` | done   | site header/footer; home footer; dead links fixed; full-site audit clean                                          |

## Final audit (15 October 2026)

Production build, 28 routes × 320/390/1440: one h1, no horizontal scroll, no broken
in-page anchors, no serious/critical axe findings, no page errors; all 23 internal link
targets return 200. Not run here: `order.spec.ts` and `a2-launch-gates.spec.ts` (Postgres
e2e harness).

Stale scripts (pre-date the 14 Oct redesign, fail on old h1 text / removed classes before
and after this work): `verify-home.mjs`, `verify-pre-arrival.mjs`,
`verify-home-internet.mjs`, `verify-mobile-plans.mjs`. Rewrite or retire them.

## Open placeholders and questions for the owner

- The home header still links "Pre-arrival SIM" / "Mobile Plans" to `#popular-plans` on the
  page (`scaffold.spec.ts` expects it); only its footer moved to the site footer.
- "Track order" now goes to `/track` (real backend tracker) everywhere; `/track-order` is the
  design-preview tracker. Decide which one customers should use.

- FAQ: 10 answers were filled from facts already on other pages (marked `answerStatus:
'site'`): SIN, ordering before arrival, ID, carrier choice, official carrier, eSIM check,
  keeping a home number, switching plans, when you are charged, who to contact. Still
  pending: English support, activation time, data limit, changing an order, missing
  documents, cancel/refund (PLATFORM_CONTEXT: no refund policy — owner wording needed).

- Guides: the index no longer lists unwritten guides (first-week checklist, Brampton
  internet, calling home, eSIM vs physical SIM, no-credit plans); write them, then add them
  back to `guideList`.
- About: shop location, hours and the “no markup” claim are owner-supplied preview copy.

- Students: FAQ answers on student discount, flight date changes and parents paying are
  still “awaiting approved content” (shown, excluded from FAQ JSON-LD).
- Students: the old page's star rating (“4.8, 1,200+ Google reviews”) and named
  testimonials were dropped as unverified. Re-add only with real, sourced reviews.
- From India: FAQ answers on parents ordering, number before visa approval and Hindi/Punjabi
  support are still awaiting approved content.
- Rogers: plans and the brand table now come from the `/mobile-plans` preview data (Rogers
  from $55, 100/150 GB), replacing the old page's placeholder $45–$75 list and 4.2
  editorial score, so the two pages agree. Real Rogers offers are still needed.
- Rogers: the old "number transfer usually the same day (VERIFY)" claim was dropped from the
  switching steps until confirmed.
- Rogers vs Fido: now compares the site's own preview plans (Fido from $45/60 GB prepaid,
  Rogers from $55/100 GB postpaid) instead of the old page's separate $29/$34 prepaid
  examples, which also contradicted each other on US roaming. Page topic widened from
  "prepaid" to Rogers vs Fido overall.
- Toronto Pearson: four FAQ answers (WiFi to activate, flight changes, family orders, other
  airports) still awaiting approved content.
- Footer: TV bundles, Surrey and Toronto internet links removed (no such pages; TV is a
  later phase). Cookie settings opens the existing consent dialog.
- Vancouver/Ontario: neighbourhood speeds, city prices ($55–$60) and install times are the
  old preview examples, shown as "typical"; verify before launch. The TV-bundle FAQ was
  removed (TV is a later phase); basement-suite and moving FAQs await approved answers.
  The Vancouver credit-history answer now also appears on Ontario.
- Done 15 Oct: removed the unused `public/design/category-{sim,rogers,airport-compare,internet}/`
  assets and their 136 `--cp-cat{sim,ac,net,rog}-*` tokens.
- Plan cards still show “$60/$80 in store” comparison prices from the pre-arrival fixtures;
  confirm the source before launch.
