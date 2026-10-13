# Mobile Plans evidence

Source: Figma `6zUS2WZbQn6NUhyjesA584`, Website page `60:2`, desktop `106:65`,
mobile `214:2`, mobile filters sheet `367:2760`. All three frames returned full
design context and screenshots before implementation. Original SVG exports were
downloaded with MCP curl instructions. Duplicate exports have identical verified
SHA-256 hashes; rendered assets retain their root dimensions.

- [390 page](page-390.png), [1440 page](page-1440.png)
- [390 Figma](figma-214-2.png), [1440 Figma](figma-106-65.png)
- [390 filter sheet](filters-sheet-390.png), [Figma sheet](figma-367-2760.png)
- Separate hero, plans, comparison, payment, switching, reviews, FAQ and final
  CTA screenshots at both reference widths.
- [Verification results](verification.json): assets, WCAG AA, interactions and
  no horizontal overflow at 320/390/768/1024/1280/1440.

Run `node apps/site-1/scripts/verify-mobile-plans.mjs` against the local dev
server at `http://127.0.0.1:3127`, or set `MOBILE_PLANS_TEST_URL`. The browser
check verifies brand/pay combinations, empty results and reset, 20–60 boundaries,
active-chip removal, price/data sorting, BYOD, sheet counts, Escape/focus
restoration, selected-plan preview, keyboard FAQ and explore-link filtering.
The page and filter sheet have no axe violations. No page errors occurred.

Filtering reads typed preview data in `apps/site-1/content/mobile-plans.ts`
through the pure `filterMobilePlans` helper. All four fixtures are BYOD-capable,
and none are under 20 GB. A 60 GB plan belongs to 20–60; the “60 GB+” control
selects values greater than 60 to keep bands exclusive. Default source order
differs by viewport: Fido is visually promoted on mobile. Explicit sorting
uses numeric fields and does not mutate fixtures. Clearing filters preserves sort.

Plan selection, advisor and unconfigured need links open local previews. There
is no order, contact, number transfer, persistence or real offer integration.
The route is noindex; source prices, operating claims, dates, testimonials and
six missing FAQ answers need approval before launch. Existing integrated
`/order` and `/track` were not changed.

Visual comparison corrected mobile step/header composition, carrier colours,
sheet geometry, exact SVG sizes, responsive plan cards and final photo ordering.
Yellow mobile price type is 20 rather than 18 for AA contrast, and the final
photo slot uses a subtle darker fill for white caption contrast. Minor font
wrap and dash rounding differences remain. Photos retain the source placeholders.
The sheet appears above the real scrolled page; the Figma prototype's separate
dimmed mock page is not drawn into the application.

Validation: site TypeScript, ESLint, Prettier and 77 unit tests (12 new filter
cases); shared UI TypeScript and 25 tests; optimized Next production build with
synthetic preview configuration. The existing Google Sans Flex fallback-metrics
warning remains. Database-backed order E2E was not rerun for this client-only
filtering route; local Postgres was unavailable in earlier session checks.

No new shared React component. Optional shared changes: PlanCard pay type/mobile
variant, ReviewCard photo-avatar tone and additive central tokens. Page-only
compositions own filters, navigation, preview dialogs and static sections.
