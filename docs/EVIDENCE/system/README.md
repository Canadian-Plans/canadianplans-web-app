# System pages and cookie consent

Figma `6zUS2WZbQn6NUhyjesA584`, Website page. All full contexts, screenshots and
metadata were read before implementation.

| Feature         | Desktop | Mobile  |
| --------------- | ------- | ------- |
| 404             | 306:3   | 306:123 |
| Search          | 306:228 | 306:363 |
| Accessibility   | 307:2   | 307:96  |
| Cookie banner   | 307:175 | 307:226 |
| Cookie settings | 307:189 | 307:240 |

`figma-0.png` through `figma-9.png` follow desktop/mobile table order. Rendered
pages are `404-*`, `search-*`, `accessibility-*`. Consent screenshots use the
accessibility page behind the overlay. Figma's “Any page behind the banner” is
an annotation, not product copy.

Run from `apps/site-1`, with the existing local server on port 3127:

```powershell
pnpm exec node scripts/verify-system.mjs
pnpm exec node scripts/verify-analytics-consent.mjs
```

`verification.json` records layout, rendered/intrinsic asset geometry, axe WCAG
2.1 A/AA results and overflow at 390/1440. Additional checks cover 320/768/1024,
desktop 200% zoom equivalent (720 CSS pixels at DPR 2), skip links, genuine HTTP
404, search categories/query/empty/invalid/transport-failure/retry, consent
cancellation/focus, independent choices, refresh and cross-tab withdrawal.
Only the search transport is intercepted for failure testing; input is retained.

`analytics-verification.json` records a browser fixture with the real consent
provider, Analytics component and plan-selection helper. Only external Next
Script/pathname lifecycles are substituted. A configured fake URL verifies
analytics loading after opt-in, privacy attributes, marketing-only exclusion,
withdrawal with a loaded tracker, and re-opt-in. No provider is contacted.
Fixture bundles are generated in a fresh temporary directory.

Site-1 lint, TypeScript, 149 unit tests, scoped Prettier and the production build
passed. The legal-page verifier also passed after connecting its cookie controls.
The build used test-only backend credentials, an unreachable local backend and
a fake analytics URL; it is verification output, not a deployment artifact.
The existing Google Sans Flex fallback-metrics warning remains.

`assets.json` records all source names, normalized asset paths, SHA-256 hashes
and root dimensions. Sixteen canonical new exports remain; duplicate downloads
were removed. SVG paths/shapes were not inspected or rewritten.

Mobile main/footer boundaries match the source, using explicit line boxes and
selected mobile text breaks. Desktop shared chrome retains established font
rounding of about two pixels; minor glyph widths/native dashed borders remain.
Banner bounds match exactly: 390×246 at y598 and 1200×139 at x120/y737. Settings
match 390×718 at y126 and 640×575 at x400/y162.5 (Figma rounds desktop y to 163).

Scoped checks do not certify the entire website, carrier PDFs, assistive
technology support or operational claims in the accessibility statement. Those
claims and the source toggle artwork's non-text contrast require design/owner
review before launch. Search remains a preview index; marketing integration is
future work.
