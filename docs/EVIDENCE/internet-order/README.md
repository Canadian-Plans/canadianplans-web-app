# Home internet order evidence

Figma file `6zUS2WZbQn6NUhyjesA584`, Website: desktop `119:2`, mobile
`302:207`. Both full contexts and screenshots were inspected before coding;
focused form references were `119:22` and `302:221`.

Source exports: `figma-desktop.png`, `figma-mobile.png`. Implemented states:
`form-1440.png`, `form-390.png`, `invalid-1440.png`, `invalid-390.png`,
`confirmation-1440.png`, `confirmation-390.png`.

| Element           | Mobile x / y / width / height | Desktop x / y / width / height |
| ----------------- | ----------------------------- | ------------------------------ |
| Header            | 0 / 0 / 390 / 77              | 0 / 0 / 1440 / 77              |
| Collapsed summary | 20 / 93 / 350 / 70            | Hidden                         |
| Form              | 20 / 179 / 350 / 2388         | 120 / 125 / 768 / 1408         |
| Mobile recap      | 40 / 2045 / 310 / 342         | Hidden                         |
| Desktop summary   | Hidden                        | 920 / 125 / 400 / 629          |

Complete initial canvases are 390×2607 and 1440×1629. Native select arrows,
checkbox shapes and small font glyph differences remain. The existing Google
Sans Flex fallback-metrics build warning remains. The source's commercial
copy and 500 Mbps / $75 plan are preview fixtures, not verified offers.

`pnpm --filter site-1 exec node scripts/verify-internet-order.mjs` regenerates
`verification.json` against port 3127; override with `INTERNET_ORDER_TEST_URL`.
It checks source geometry, asset hashes and intrinsic/rendered dimensions,
WCAG 2/2.1 AA, keyboard expansion of the mobile summary, validation and focus,
contact consent, a failed server action with retained input, successful preview
confirmation, returning to edit with retained values, no business API calls,
no runtime errors and no horizontal document scroll at
320/390/768/1024/1280/1440.

The three new SVG exports retain their source root dimensions: lock 16×16,
phone 18×18, chevron 20×20. The source logo is byte-identical to the existing
36×36 shared asset and is reused. No assets are redrawn or stretched.

Validation tests cover required fields, separate consents, international phone
numbers, calendar validity, future birth dates, past installation dates,
tampered options and unknown runtime input. Shared confirmation tests cover
real-reference rendering, the missing-reference guard and honest preview copy.
Site tests: 127; shared UI tests: 25. Typechecks, lint, selected-file formatting,
production build and browser checks pass.

The route uses the existing React form stack and shared FormField/Input/Button
components. The typed stub validates again on the server and returns only a
preview result or generic field errors. It creates no order, installation,
reference, email or message. Personal data stays in component memory and is
not placed in URLs, analytics, storage or server logs. Header help links use
the existing contact page. No production integration or deployment was added.

New shared component: **OrderConfirmation**. The existing `/order` confirmation
was inline, so its presentation was extracted without changing its live
reference guard or order actions. This route reuses it with a distinct preview
state. FormField accepts ReactNode labels/hints for the optional suffix and
privacy icon; existing string callers render unchanged.
