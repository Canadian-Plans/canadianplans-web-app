# Category SIM preview evidence

This evidence covers two design-preview pages implemented from Figma file `6zUS2WZbQn6NUhyjesA584`:

- Students: desktop frame `151:2`, mobile frame `251:2`, route `/pre-arrival-sim/students`.
- From India: desktop frame `162:2`, mobile frame `255:2`, route `/pre-arrival-sim/from-india`.

The unscaled source screenshots are `students-desktop-151-2-original.png`, `students-mobile-251-2-original.png`, `india-desktop-162-2-original.png`, and `india-mobile-255-2-original.png`. Capped `get_design_context` exports are the similarly named files without `-original`. `assets.json` maps downloaded Figma asset URLs, variable names, source nodes, and local files. `node-map.json` records the page-section relationships. Source SVGs are local under `apps/site-1/public/design/category-sim/`; photos remain the designed image-slot placeholders.

Rendered screenshots use `<page>-<width>-full.png` and `<page>-<width>-<section>.png` names. `verification.json` and the per-route/width audit JSON files record tested viewports, section geometry, accessible image geometry, axe results, interactions, and plan handoff URLs. Run `AUDIT_ORIGIN=http://127.0.0.1:3127 pnpm --filter site-1 exec node scripts/verify-category-sim.mjs` against the shared local preview server.

The latest canonical 390/1440 rendered reference files remain `students-390-plans.png`, `students-1440-plans.png`, `india-390-plans.png`, and `india-1440-plans.png`, plus the corresponding `<page>-<width>-full.png` captures. Mobile source section targets and the latest manual geometry readings are recorded in `source-geometry-targets.json`. At the final page-local pass, Students sections were within 4–93 px of the Figma mobile targets: hero +13, quick answer −3, countdown −4, plans +12, requirements −43, guide −35, reviews 0, FAQ +93, explore −29, final −9. India differences still needing parent visual review were quick answer −35, country facts +20, countdown −4, plans +12, requirements −67, calling India −58, guide −59, FAQ +116, explore −29, final −9. Breadcrumb, metadata, and footer were within 1 px of source. No artificial section minimum heights were added to fill the differences.

The plan card markup is category-local so mobile follows the source order and desktop keeps the source row layout. The source plan surface uses `--cp-catsim-plan-surface` (`#f1f2ee`), merged into the central stylesheet from `token-proposals.css`. Copy/prices and image-slot captions remain typed preview fixtures.

Verification note: scoped TypeScript and ESLint checks pass. The last isolated Playwright load/decode/Axe check reported zero axe violations and no page errors. The parent reran full multi-viewport verification against the immutable production build successfully, with no runtime errors. The combined 14-case category audit also passes all axe rules after parent sidebar semantics and mobile FAQ typography corrections. Earlier hot-reload failures are development-only historical observations. The exact handoff scenario was validated in earlier full passes: selecting the Rogers Plus preview reaches `/order/pre-arrival?plan=preview-rogers-plus&audience=student` and shows the 100 GB / $40 Student summary.

Plan cards are preview fixtures (`previewOnly: true`) and point only to the existing `/order/pre-arrival` preview flow. The verifier selects `preview-rogers-plus`, confirms the `100 GB` and `$40` summary, and confirms the supported `student` audience. There are no provider calls, saved order records, or real order submissions.

Copy, prices, coverage statements, timing, review text/counts, named contributors, and support details are Figma-derived preview fixtures. They require owner approval before production use. Image captions describe source image-slot intent; no photography has been fabricated or substituted. Design contexts did not define interactive/open accordion states, keyboard behavior, responsive behavior below 390px, or any real request submission semantics; those are implemented as preview behaviors and checked locally. Both routes are marked `noindex,nofollow` and are omitted from the sitemap.

