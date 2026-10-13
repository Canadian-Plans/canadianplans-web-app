# About evidence

Design file: `6zUS2WZbQn6NUhyjesA584`, Website page. Full desktop `188:2` and
mobile `216:2` contexts and screenshots were read before implementation, plus
story `188:180` / `216:22`. The supplied Figma photo note explicitly identifies
the two Image slots as placeholders for future photography.

`figma-desktop.png` / `figma-mobile.png` are the source exports.
`about-1440.png` / `about-390.png` are the rendered pages; `final-*.png` isolate
the CTA. Visual comparison fixed mobile background, heading wraps, line boxes,
button padding, story column sizing and footer geometry. No other page
implementation was changed.

| Section | Mobile y / height | Desktop y / height |
| --- | --- | --- |
| Hero | 164 / 600 | 160 / 971 |
| Story | 764 / 849 | 1131 / 710 |
| Benefits | 1613 / 715 | 1841 / 525 |
| Dealer strip | 2328 / 199 | 2366 / 209 |
| Final CTA section | 2527 / 502 | 2575 / 601 |
| CTA card | 2575 / 406 | 2575 / 505 |
| Footer | 3029 / 947 | 3176 / 439 |

The complete pages are 3976 / 3615 high. Browser text rasterization has minor
glyph-width differences from Figma. Native dashed borders differ slightly in
dash placement. These do not change section geometry. Designed photo
placeholders and approval of supplied business/contact claims remain.

Run `pnpm --filter site-1 exec node scripts/verify-about.mjs` with the local
development server on port 3127, or set `ABOUT_TEST_URL`. `verification.json`
records source-matched section geometry, loaded assets, SVG source hashes and
intrinsic/rendered sizes, keyboard skip link, mobile-menu focus restoration,
global plan finder, plan/advisor destination navigation, WCAG 2/2.1 AA scan,
runtime errors and overflow checks at six widths from 320 through 1440.

Other checks: site-1 and UI type checks, site-1 lint, selected-file Prettier,
111 site-1 unit tests, 25 UI unit tests, and a site-1 production build using
local test-only backend settings. No new unit suite is needed for this static
composition. The existing font fallback-metrics warning remains.

New shared components: **none**. Shared changes are additive tokens in
`packages/ui/src/styles/canadian-plans.css`; About styles and compositions are
private to its route. Existing uncommitted project work is preserved.
