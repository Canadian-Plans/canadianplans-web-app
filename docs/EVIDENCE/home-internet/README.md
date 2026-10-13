# Home Internet evidence

Figma file `6zUS2WZbQn6NUhyjesA584`, Website page `60:2`:
desktop `106:34`, mobile `212:51`; available `308:3/73`, unavailable
`308:38/108`, invalid postal code `308:59/129`. All eight frames were retrieved
with full design context and screenshots before implementation.

- [390 page](page-390.png), [1440 page](page-1440.png)
- [390 source](figma-mobile.png), [1440 source](figma-desktop.png)
- Available: [390](available-390.png), [1440](available-1440.png)
- Unavailable: [390](unavailable-390.png), [1440](unavailable-1440.png)
- Invalid: [390](invalid-390.png), [1440](invalid-1440.png)
- Section screenshots cover hero, finder, plans, comparison, TV, equipment,
  coverage, reviews, FAQ and final CTA at both reference widths.
- [Machine-readable verification](verification.json) includes source SVG root
  and rendered dimensions, WCAG AA audits, interaction and overflow results.

Run `node apps/site-1/scripts/verify-home-internet.mjs` against a local dev
server on `http://127.0.0.1:3127`, or set `INTERNET_TEST_URL` for another preview.
The script checks postal correction, optional calendar validation, radio arrow
keys and price updates, continuation and waitlist previews, focus restoration,
retained inputs, unconfigured codes, speed recommendations, TV messaging and
independent keyboard FAQ expansion. It also holds and fails a stub action to
verify disabled loading, failed lookup, retry and closing a pending request.
No horizontal overflow at 320/390/768/1024/1280/1440; no page errors; no axe
violations in the page or any requested result state at 390 and 1440.

Mock examples: `V3T 1Z2` available, `T0L 1A0` unavailable, `V3T 1Z` invalid.
Other valid codes show an unconfigured fixture message. All fixture values are
preview-only. Replace `lookupInternetAvailability` to connect a real backend;
the page has no persistence, messages, order or installation booking. Its route
is noindex and respects the mobility-first / internet-later launch scope.

Visual comparison corrected mobile ordering, featured card colours, native SVG
sizes, equipment radii and timeline gaps. Accessible close buttons and visible
mock notices intentionally add to the source dialogs. Minor font wrapping and
browser dash rounding differ. Image slots remain the source placeholders.
Four FAQ answers still need approved copy; prices, dates, service claims and
testimonials remain source previews.

Validation: site TypeScript, ESLint, Prettier, 65 unit tests (18 new lookup/date
cases); shared UI TypeScript and 25 tests; optimized Next production build with
synthetic preview configuration. Build retains the known Google Sans Flex
fallback-metrics warning. Database-backed order E2E was not rerun for this
nonmutating UI route; local Postgres was unavailable in earlier session checks.

No new shared component. Additive shared changes: PlanCard internet variant and
unit, optional FaqAccordion initial-open IDs, and central design tokens. Other
page implementations were not edited for this task.
