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

## Approach

SEO landing pages share one kit (`src/components/landing/*`, styles in
`src/app/landing.css`, copy in `content/landing/*`) built from the home page primitives
(`CpCategoryBanner`, `CpStepTimeline`, `CpFeatureCard`, `CpCtaBand`, FAQ accordion).
Pre-arrival plan blocks reuse the `/pre-arrival-sim` `PlanPicker`. Testimonials and star
ratings are dropped (unverified; owner removed reviews from category pages on 14 Oct).

## Verification

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

| #   | Page                                                                                         | Status | Notes                                           |
| --- | -------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| 1   | `/pre-arrival-sim/students`                                                                  | done   | landing kit built; moved to `(landing-arrival)` |
| 2   | `/pre-arrival-sim/from-india`                                                                | todo   |                                                 |
| 3   | `/mobile-plans/rogers`                                                                       | todo   |                                                 |
| 4   | `/pre-arrival-sim/toronto-pearson`                                                           | todo   |                                                 |
| 5   | `/compare/rogers-vs-fido`                                                                    | todo   |                                                 |
| 6   | `/home-internet/ontario`                                                                     | todo   |                                                 |
| 7   | `/home-internet/vancouver`                                                                   | todo   |                                                 |
| 8   | `/about`                                                                                     | todo   |                                                 |
| 9   | `/contact`                                                                                   | todo   |                                                 |
| 10  | `/faq`                                                                                       | todo   |                                                 |
| 11  | `/guides`                                                                                    | todo   |                                                 |
| 12  | `/guides/[slug]`                                                                             | todo   |                                                 |
| 13  | `/order/pre-arrival`                                                                         | todo   | preview form, stub action                       |
| 14  | `/order/home-internet`                                                                       | todo   | preview form, stub action                       |
| 15  | `/track-order`                                                                               | todo   |                                                 |
| 16  | `/plans`, `/plans/[slug]`, `/order`, `/track`                                                | todo   | restyle only, behaviour unchanged               |
| 17  | `/privacy`, `/terms`                                                                         | todo   |                                                 |
| 18  | `/accessibility`, `/search`, 404                                                             | todo   |                                                 |
| 19  | Category polish: `/pre-arrival-sim`, `/home-internet`, `/mobile-plans`, `/business-internet` | todo   |                                                 |

## Open placeholders and questions for the owner

- Students: FAQ answers on student discount, flight date changes and parents paying are
  still “awaiting approved content” (shown, excluded from FAQ JSON-LD).
- Students: the old page's star rating (“4.8, 1,200+ Google reviews”) and named
  testimonials were dropped as unverified. Re-add only with real, sourced reviews.
- Plan cards still show “$60/$80 in store” comparison prices from the pre-arrival fixtures;
  confirm the source before launch.
