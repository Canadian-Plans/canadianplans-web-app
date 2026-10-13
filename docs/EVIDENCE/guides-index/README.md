# Guides index evidence

Figma file `6zUS2WZbQn6NUhyjesA584`, Website: desktop `121:3`, mobile `219:2`.
Full contexts and screenshots were inspected before implementation. Focused
references: hero `121:33`, lists `121:52` / `219:37`, question `220:5`.

Source exports: `figma-desktop.png`, `figma-mobile.png`.
Rendered index: `guides-1440.png`, `guides-390.png`.
Feature detail: `featured-1440.png`, `featured-390.png`.
No-results states: `empty-1440.png`, `empty-390.png`.

| Section | Mobile y / height | Desktop y / height |
| --- | --- | --- |
| Hero | 164 / 584 | 160 / 543 |
| Guides | 748 / 1687 | 703 / 1410 |
| Feature | 788 / 524 | 759 / 454 |
| Six-card grid | 1336 / 979 | 1237 / 724 |
| Questions | 2435 / 736 | 2113 / 456 |
| Final section | 3171 / 570 | 2569 / 550 |
| Final card | 3219 / 474 | 2569 / 454 |
| Footer | 3741 / 947 | 3119 / 439 |

Complete canvases are 4688 / 3558 high. Feature images are 350×200 mobile and
560×454 desktop; card slots are 104×104 mobile and 383×180 desktop. Static
image icons keep their intrinsic 32×32 dimensions; mobile card slots contain
captions without the desktop icon/label, matching the source. Source hashes,
SVG roots, rendered sizes and typography are checked. Photos remain placeholders.

`pnpm --filter site-1 exec node scripts/verify-guides-index.mjs` regenerates
`verification.json` on the local dev server, default port 3127. Override with
`GUIDES_INDEX_TEST_URL`. The script verifies:

- Source section/image geometry, loaded assets and intrinsic SVG dimensions.
- WCAG 2/2.1 AA and no runtime errors.
- Initial six cards, Show more revealing the supplied seventh summary and
  focusing it, combined category/search, keyboard submission/filtering,
  no-results/clear and announcements.
- Navigation to the supplied article and its existing schema, skip link,
  final global finder/returned focus and advisor destination.
- No horizontal document scroll at 320/390/768/1024/1280/1440.

The filter unit tests exercise category/search intersection, case/whitespace,
multiple words, metadata terms, empty/no-match and registry immutability.
Site-1 typecheck, lint, selected-file formatting, 118 site tests, 25 shared UI
tests and a production build pass. The existing font fallback-metrics warning
remains. Source 85%-white CTA note text is changed to white for AA contrast.

All list metadata comes from `content/guides.ts`. The index uses existing
content/plan/help destinations for summaries whose article body is missing;
only the supplied India student guide routes to its full article. Show more
uses the eSIM compatibility summary already supplied on that article's related
reading, without inventing another guide. No API or CMS integration is added.

Minor font/dashed-stroke rendering differences remain. The page preserves
other page implementations and all existing uncommitted work. New shared
components: **none**; only additive shared tokens were needed.
