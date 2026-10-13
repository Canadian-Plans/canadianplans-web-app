# Shared-component verification

Source: Canadian Plans Figma `6zUS2WZbQn6NUhyjesA584`, desktop Home `60:3`
and mobile section `194:2` with the individual nodes named in the task.
Completed 12 October 2026 against `/dev/components`.

- [390 gallery](components-390.png) and [1440 gallery](components-1440.png).
- Individual screenshots cover utility, nav, promo, footer, buttons, chips,
  default/featured plan cards, heading, FAQ, review, price circle, image slot,
  breadcrumb and sticky CTA specimens at both widths.
- [Measured geometry and asset checks](verification.json): mobile nav 64,
  utility 44/38, plan cards 350/384 wide, default heights about 447/455,
  featured heights about 455/467, reviews about 262/286, image slots 350×220,
  sticky specimens 390×99 and footer heights about 947/439.
- Original local SVGs load and retain their exported width/height. No page errors.
- Keyboard FAQ operation and single expansion, chip selection, plan selection,
  menu open/Escape/focus return, menu-to-dialog focus return, floating CTA
  visibility/suppression/focus return and selected-plan summary passed.
- Whitespace search validation and valid-query stub submission passed. The
  action creates no persisted data or real order.
- Axe found no WCAG A/AA violations in the gallery at 390 and 1440.
  No horizontal document overflow at 320, 390, 768, 1024 or 1440.
- Site-1/shared-UI/admin typechecks, targeted ESLint, formatting and Git whitespace
  checks passed. Existing tests passed: site-1 35, shared UI 25. Site-1 build passed.
- Production-mode local server returned 404 for the gallery; development returned 200. The gallery is noindex and isolated from storefront page compositions.

Visual corrections included mobile nav height, desktop heading description,
footer spacing/separators, review star geometry and mobile image-slot width.
Source assets and mobile/desktop specimen geometry were compared with Figma.
The gallery's section arrangement is for inspection and is not a Home page.

Remaining differences/ambiguities are documented in
[DESIGN_NOTES.md](../../../apps/site-1/DESIGN_NOTES.md): browser fractional text
rounding and dashed-border rendering, font fallback-metrics warning, unspecified
interactive states, and unapproved illustrative business content. The Next.js
dev indicator is hidden only for evidence screenshots.

Reproduce with the development server on port 3127:

```powershell
pnpm --filter site-1 exec node scripts/verify-components.mjs
```

Set `COMPONENTS_TEST_URL` to use another running local/preview origin.
