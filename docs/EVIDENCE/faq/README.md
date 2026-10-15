# FAQ help-center verification

Design source: Figma `6zUS2WZbQn6NUhyjesA584`, desktop `189:37`, mobile `218:2`.
The `/faq` route implements the requested page only.

## Screenshots

| Width | Source | Browser |
| --- | --- | --- |
| 390 | [Figma](figma-mobile.png) | [Page](faq-390.png), [eligibility](eligibility-390.png), [search](search-390.png), [empty](empty-390.png) |
| 1440 | [Figma](figma-desktop.png) | [Page](faq-1440.png), [eligibility](eligibility-1440.png), [search](search-1440.png), [empty](empty-1440.png) |

Main section positions/heights match both frames. Mobile: Hero 164/559, general
723/1060, plans 1783/1107, orders 2890/1053 and CTA 3943/531. Desktop: Hero
160/413, general 573/906, plans 1479/843, orders 2322/817 and CTA 3139/510.
Canvas sizes are 390×5421 and 1440×4088. Image slots are 350×200 on mobile and
380×240 on desktop. Values are CSS pixels. Minor font-glyph and dashed-border
rasterization differences remain; images are the exact designed placeholders.

## Reproduce

Start site-1 at port 3127, then run from the repository root:

```powershell
node apps/site-1/scripts/verify-faq.mjs
```

`FAQ_TEST_URL` can override the local origin. The script records
[verification.json](verification.json) and checks both reference sizes:

- 19 disclosures, three default-open answers, keyboard Enter/Space toggling,
  independent exclusive groups, search across questions/answers/aliases,
  no-result/clear behavior and keyboard topic links with restored group focus.
- A server-rendered FAQPage script containing the three complete source Q&A
  pairs, matching the actual expandable answers. Search leaves it unchanged.
- Static SVG source hashes, loaded images, exact intrinsic dimensions and the
  mobile/desktop image-slot geometry.
- No page errors or WCAG A/AA scan findings in the normal and empty states.
- Global plan finder launch/focus/Escape, CTA destinations and no horizontal
  document scroll at 320, 390, 768, 1024, 1280 and 1440.

The nine FAQ unit tests cover normalization, source-example aliases, term
matching, pending-copy exclusions, schema/data parity, blank content and script
terminator escaping. Site/UI type checks, lint, formatting, tests and the site
build are the final project checks.

Figma supplies three answers. The other 16 questions use an explicit
awaiting-approved-content notice and are excluded from structured answers.
Contact details and other source business claims remain preview copy. Advisor
actions use the existing `/contact` preview, and this page initiates no chat,
email, callback, order or tracking request. New shared components: none.
