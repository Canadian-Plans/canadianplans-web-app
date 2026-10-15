# Home verification

Source: Canadian Plans Figma desktop `60:3`, mobile `195:2`, inspected through
the Figma MCP before implementation. Scope: `/` only, 12 October 2026.

- Rendered [390 Home](home-390.png) and [1440 Home](home-1440.png).
- Original [390 Figma reference](figma-390.png) and
  [1440 Figma reference](figma-1440.png), for comparison only.
- Individual screenshots cover hero, categories, plans, eSIM, how-it-works,
  journey, internet, benefits, reviews, FAQ and final CTA at both widths.
- [Measured geometry, asset and browser checks](verification.json).

Home tab click/keyboard navigation, selected plan state, desktop journey
rotation, mobile journey keyboard/dots, native FAQ disclosure, postal invalid
and stub-success behavior, retained input, menu/dialog focus and no page errors
passed. Axe reported no WCAG A/AA violations at 390/1440. Document overflow
checks passed at 320, 390, 768, 1024, 1280 and 1440; intended scroll rows stay
contained. Every visible SVG is nonempty, loaded and rendered at its original
root dimensions.

Typechecks passed for site-1, shared UI and admin. Targeted ESLint passed.
All 47 site-1 tests passed, including postal format/stub cases. Site-1 production
build passed. The broader security script passed its server-only import probe
and synthetic credential scan, then failed to start the disposable backend
Playwright harness. The full backend/order suite remains unverified in this run.
Local test Postgres on 127.0.0.1:5432 was unreachable during a read-only probe.

The gallery regression script also passed after optional chrome props were
added. No storefront route other than Home was redesigned.

Remaining source ambiguities and intentional preview/contrast adaptations are
in [DESIGN_NOTES.md](../../../apps/site-1/DESIGN_NOTES.md). Small browser text/dash
rounding differs from Figma. Internet/TV, sample business facts and closed FAQ
answers still require the separate approval/integration work recorded there.
The existing font fallback-metrics warning is unchanged.

Reproduce against the running local development server:

```powershell
pnpm --filter site-1 exec node scripts/verify-home.mjs
```

Set `HOME_TEST_URL` for a different local/preview origin. The Next.js dev
indicator is hidden only during screenshot capture.
