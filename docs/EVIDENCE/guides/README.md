# Guide article evidence

Figma `6zUS2WZbQn6NUhyjesA584`, Website: desktop `133:2`, mobile `247:39`.
Full contexts and screenshots were read before implementation; article body
`134:2` / `248:25`, quick answer `248:26`, and device paragraph `249:60`
provided focused references. Source PNGs are `figma-desktop.png` and
`figma-mobile.png`. Rendered full pages are `guide-1440.png` / `guide-390.png`;
`article-*.png` isolate the body.

Preview route: `/guides/best-sim-for-students-from-india`.

| Section | Mobile y / height | Desktop y / height |
| --- | --- | --- |
| Header | 164 / 551 | 160 / 941 |
| Body | 715 / 4762 | 1101 / 3053 |
| Related | 5477 / 627 | 4154 / 547 |
| Final section | 6104 / 610 | 4701 / 641 |
| Final card | 6152 / 514 | 4701 / 545 |
| Footer | 6714 / 947 | 5342 / 439 |

Full pages are 7661 / 5781 high. The browser font differs slightly in glyph
width from Figma; native dashed strokes differ in dash placement. Source
mobile line breaks and comparison-cell breaks are retained in typed content.
All main section geometry matches the source. Two text colours were adjusted
to existing tokens for AA contrast: the popular row's in-store price and the
CTA's small note.

Run `pnpm --filter site-1 exec node scripts/verify-guides.mjs` with the dev
server on port 3127, or set `GUIDE_TEST_URL`. `verification.json` records:

- Geometry and image-slot sizes, loaded static assets, source SHA-256 hashes,
  SVG root dimensions and effective rendered sizes.
- WCAG 2/2.1 AA scan, keyboard contents/focus, native FAQ toggles, local helpful
  choices, clipboard result and WhatsApp intent URL without sending a message.
- Keyboard skip link, global finder and restored trigger focus, plan/advisor
  routes, unknown-slug 404, schema/canonical/source metadata parity.
- No runtime errors or horizontal document scroll at 320, 390, 768, 1024,
  1280 and 1440.

Unit tests cover valid/unknown/inherited slug names, six contents targets,
Article metadata and omitted invented dates/images, and script-breaking input.
Site-1 typecheck/lint/format, its 115 unit tests and a production build passed.
The existing Google Sans Flex fallback-metrics warning remains.

Remaining source content: five FAQ answers, real photos, approved business and
author/reviewer details, and the three related article bodies. Related cards
currently point to the corresponding existing help/preview content. Only the
requested guide template was built. New shared components: **none**. The shared
stylesheet received additive tokens; other page implementations are unchanged.
