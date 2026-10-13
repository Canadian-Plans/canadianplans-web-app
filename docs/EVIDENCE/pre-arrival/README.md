# Pre-arrival SIM evidence

Source: Figma `6zUS2WZbQn6NUhyjesA584`, Website `60:2`, desktop `106:3`,
mobile `207:2`, selected mobile sticky-bar context `365:2796`.
Both roots and all visible children were read with `get_design_context` before
implementation. Full-resolution source screenshots were inspected; native QR
layers were translated directly, and original SVG exports were downloaded with
the MCP curl instructions. Repeated image-slot icons have identical SHA-256
hashes, so the common export is reused. All rendered assets retain their root
width and height.

Run `node apps/site-1/scripts/verify-pre-arrival.mjs` with the dev server at
`http://127.0.0.1:3127`. Set `ARRIVAL_TEST_URL` to test another local preview.
This browser-only check uses no backend, database or approved commercial offer.

- [390 initial page](page-390.png), [1440 initial page](page-1440.png)
- [390 Figma reference](figma-390.png), [1440 Figma reference](figma-1440.png)
- [390 selected bar](selection-390.png), [1440 selected bar](selection-1440.png)
- Separate hero, quick answer, picker, benefits, comparison, steps, requirements,
  reviews, FAQ and final CTA screenshots at both reference widths.
- [Verification results](verification.json): audience filtering, one selected
  plan, compatible-selection preservation, incompatible-selection clearing,
  updated price, keyboard activation, step 2 preview, modal suppression and
  focus restoration, single-open native FAQ, loaded SVG dimensions, browser
  errors, WCAG AA checks and horizontal overflow at 320/390/768/1024/1280/1440.

The Figma picker depicts an already selected Rogers Plus plan and an inline
prototype of the selection bar. The initial page has no selection. Its bar
appears only after selection and stays at the viewport bottom. Desktop uses the
ink pill from `108:104`; mobile uses the white safe-area bar from `365:2796`,
with the requested longer “Continue to step 2” label. No fake OS home indicator
is drawn. The selected bar hides while a dialog or input is active.

The page is a noindex design preview. Audience-to-plan filtering is a documented
fixture mapping, not a carrier eligibility rule. Continue opens a local step 2
preview; it never sends fixture IDs to the integrated order route. No lead,
order, contact request or payment is created. Five closed FAQ answers still need
approved content. Image slots, comparison claims, prices, dates and testimonials
are source examples awaiting approval. Internet/TV remains a later launch.

Visual corrections include the mobile table composition, hero ordering,
source paragraph line breaks, rounded line boxes, image-slot geometry, native
QR compositing, review initials, desktop FAQ wrapping and separate mobile and
desktop selected bars. Minor browser/font/dash rounding and some paragraph
wraps differ from Figma; original type sizes and axes were confirmed through
read-only Figma text-node inspection. No other page implementation was changed.

Validation: site TypeScript, ESLint, Prettier and 47 existing unit tests; shared
UI TypeScript and 25 unit tests; production Next build with synthetic preview
configuration. The existing Google Sans Flex fallback-metrics warning remains.
The database-backed order E2E gate was not rerun for this UI-only route; earlier
session verification established that local Postgres was unavailable.

No new shared React component. Shared changes are optional PlanCard presentation
fields/variant, optional ReviewCard initials and their opt-in styles, plus
additive Canadian Plans tokens. App-only compositions are PlanPicker,
ArrivalNavigation, AdvisorPreview and EsimArt.
