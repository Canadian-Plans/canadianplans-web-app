# Track order preview evidence

Open `/track-order?state=lookup`. Supported `state` values:

| State            | Source desktop / mobile         |
| ---------------- | ------------------------------- |
| `lookup`         | 126:2 / 220:233                 |
| `esim-sent`      | 127:2 / 237:2                   |
| `action-needed`  | 130:2 / 242:40                  |
| `request-change` | 131:335 / 246:33, sheet 246:295 |
| `not-found`      | 308:144 / 308:207               |
| `too-many-tries` | 308:163 / 308:226               |
| `code-expired`   | 308:183 / 308:246               |

Pattern note 246:293 was read first: desktop modal becomes a full-screen mobile
sheet. Source PNGs are `figma-0.png` through `figma-14.png` in the table's order,
with request-change background and sheet preceding the error pairs.

Run from `apps/site-1`:

```powershell
node scripts/verify-track-order.mjs
```

`TRACK_ORDER_TEST_URL` overrides the default http://127.0.0.1:3127.
`TRACK_ORDER_BASELINE=1` captures comparisons without interaction assertions.
`verification.json` records final geometry, visible assets, accessibility and
overflow checks. `assets.json` records original export hashes and dimensions.
Full-page screenshots and modal/error crops are saved at 390 and 1440.

The verifier covers all fixture states, invalid lookup/focus, known/unknown
lookup, network failure/input retention/retry, mobile details, change form
validation/completion/back/Escape/focus return, file selection validation,
resend feedback, WCAG AA, original asset hashes/aspect ratios and overflow at
320, 390, 768, 1024, 1280 and 1440. Unit tests cover the registry, query parsing,
boundary validation, fixture matching and preview-only actions.

All results are synthetic. QR/code resend, file upload and change submission
perform no real operation. Error cards are integrated into lookup because the
source provides no surrounding error page. Other change categories reuse the
email form layout. Remaining visual differences are minor font glyph widths,
textarea placeholder wrapping and the browser's resize handle. The existing
Google Sans Flex fallback-metrics build warning remains.

Reused shared components; new shared components: **none**. Only additive central
tokens affect shared files. Existing live `/track` and other pages are unchanged.

Checks: site typecheck/lint, UI typecheck, 140 site tests, 26 UI tests,
production build and browser verification pass. All changed files pass Prettier.
The full-app format command still flags 29 unrelated files outside this page's
scope; those files were preserved. Browser evidence contains 14 state/viewport
records with zero WCAG AA violations and zero document overflow. The production
build emits only the existing font fallback-metrics warning described above.
