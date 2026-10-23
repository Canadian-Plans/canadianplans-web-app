# Canadian Plans page audit — 13 October 2026

The later [design and code review](design-code-review-2026-10-13.md) expands browser
coverage to 39 route/state cases and records subsequent fixes and payload
measurements. The performance results below describe this earlier audit.

Scope: all 24 implemented route shapes, represented by 32 page/state cases at
390 and 1440. This includes the three email previews, seven tracking fixtures,
the component lab, legacy storefront routes and the unconfigured Studio. No new
product features, commercial data, provider integrations or routes were added.

Outcome: **all 32 cases pass the mobile 90+ performance gate**, with medians of
92–96 from five valid measured runs each. All 64 final captures have zero automated
accessibility violations. Visual differences and publication questions remain
explicitly listed below; pixel-perfect parity is not claimed.

## Fixes

- Replaced the shared Figma image renderer with `next/image`, retaining original
  SVG bytes, intrinsic dimensions and decorative alt text. SVGs are unoptimized;
  raster images use Next's normal optimization. React Email keeps its `Img`
  component because exported email HTML cannot run Next's image component.
- Added page-specific descriptions, canonicals, Open Graph and Twitter metadata,
  plus a neutral brand sharing image. Article metadata retains its article type
  and source author/date. Order and search metadata never interpolates entered
  details or queries. Published legal titles follow the CMS document.
- Kept drafts, fixtures, private flows, previews and Studio unindexable. Fixed the
  sitemap to exclude draft/private routes and include legal pages only when
  published. Production indexing now also requires a valid public HTTPS origin.
- Made legal reads explicitly use Sanity's published perspective, including
  when a preview token is configured. The older configured API otherwise defaults
  to raw documents; a test now guards against exposing draft legal versions.
  [Sanity perspectives](https://www.sanity.io/docs/content-lake/perspectives).
- Named utility/promotion landmarks, removed nested complementary landmarks,
  named the plan comparison table's first column, and connected the tracking and
  cookie dialogs to their actual title IDs.
- Expanded Home carousel dot hit areas and accessibility contact targets to at
  least 24 pixels. Dot markers keep their original small visual size.
- Added an accessible control-boundary token using the existing muted palette
  colour. The source grey against white measured 2.26:1; the replacement measures
  6.68:1. Darkened applicable input, search, chip and picker boundaries, and gave
  the off cookie switch a visible boundary. Essential visual cues need at least
  3:1; decorative boundaries and disabled controls are treated separately.
  [W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- Made focus rings follow their surrounding surface: white on inverse cards,
  blue on light surfaces, including the white address card inside the blue hero.
  Verified focused controls on Home, pre-arrival, address checking and the footer
  at both widths; measured contrast is recorded in the focus evidence.
- Fixed a shared selector that incorrectly showed Contact in the mobile utility
  bar, and kept the desktop internet recommendation on one line as Figma does.
- Removed unused Google Sans Flex axes while retaining its default grade,
  roundness and width. Preload only the Latin body alphabet; other Unicode
  subsets load when used. Consolidated global CSS into one import; page styles use
  Tailwind references so they retain their tokens/variants without emitting the
  whole stylesheet repeatedly.
- Rendered the cookie banner in the initial HTML. A small, read-only preference
  check hides it for visitors with a valid saved choice before application
  JavaScript loads. This removes its late appearance without granting consent;
  analytics and marketing still default off. Both initial states pass with
  application scripts blocked, and persistence/withdrawal checks still pass.
- Reserved the email preview's initial frame height to prevent a large layout
  shift. Exported email HTML and its table/inline-style layout are unchanged.
- Kept the unconfigured Studio fallback on the server so it does not download
  the full editor. Deferred both its editor and config in a lazy client boundary;
  a server conditional alone still preloaded the static client dependency graph.
  Configured Studio still uses the existing vendor component.
  Its measured JavaScript transfer fell from 2,048,465 to 321,346 bytes, and its
  final performance median is 96.
- Updated existing browser checks for the current shared search icon, global
  finder, consent live region and full-page lazy-image captures. Those checks
  still exercise interactions, focus, geometry and source asset hashes.

New shared components: **none**. `CpAsset` keeps its existing interface; its
dedicated Canadian Plans entry now requires the existing Next framework peer.
`StudioClient` and `StudioEditor` are application-specific loading boundaries
around the existing editor.

## Evidence and method

[Page screenshots and browser results](final/pages.json) contain
64 captures, heading sequences, initial keyboard focus paths, image checks,
metadata, landmarks, runtime errors, overflow and axe WCAG 2/2.1/2.2 AA plus
best-practice results. Final captures have zero automated violations, no heading
level jumps, one page H1 and no horizontal document overflow. Email iframe HTML
has additional separate checks in [email evidence](../emails/verification.json).
All 479 visible web image instances across these captures are loaded Next images.
Automated checks and the focused interaction cases are not a complete assistive
technology or WCAG certification.

[Focus screenshots and measured contrast](final/focus/results.json)
cover representative light/inverse surfaces. Existing page verifiers additionally
cover menus, focus traps/return, both finder branches, filters, tabs, carousels,
disclosures, form error focus/retry, order refresh recovery, postal result states,
tracking fixtures, legal contents and consent persistence/withdrawal.

[Raw Figma pixel diffs](final/diffs/summary.json) compare unscaled
reference PNGs with current full-page captures. Threshold 0.2, antialiasing excluded;
there is no alignment, masking or automatic pass threshold. Differences include
font rasterization, required preview notices, accessibility changes and state
differences. A small percentage is evidence to inspect, not a fidelity certificate.
The source references are in each page's original evidence directory; Home,
pre-arrival, home internet and mobile plans also had fresh Figma context reads.
Full-page comparisons use a saved essential-only cookie choice; banner/settings
states have separate captures and interaction checks. Performance uses a fresh
visitor with the banner visible.
The three email desktop diffs compare the standalone 680-pixel canvas containing
the 600-pixel body; they exclude the application preview toolbar. Their dimensions
match Figma, with raw differences of 2.84%, 3.06% and 2.84%.

Lighthouse uses Next's production build in a local preview environment, mobile
emulation and simulated throttling, with fresh first-visitor consent defaults.
Each case has six navigation runs: discard the first warm-up and report the
median of five. Baseline and final use the same Lighthouse 13.5.0 settings.
The final run uses a separate production server with no concurrent builds or
browser QA.
Studio was remeasured after its route-only loading fix; Home was also remeasured
on that rebuild to confirm the shared performance budget.
[Lighthouse method](https://github.com/GoogleChrome/lighthouse/blob/main/readme.md).
These are laboratory measurements of the local production build and fixture
states, not production field Web Vitals or a live backend/CMS load test.
Earlier concurrent and intermediate runs are retained as diagnostic evidence;
use `audit/final-verified/lighthouse` for the final performance gate.
[Initial consent without application scripts](final/consent-initial/results.json)
separately verifies the early banner behavior.

## Open questions and remaining review

1. **Publication and canonical origin.** What is the approved production origin?
   Set `NEXT_PUBLIC_SITE_URL` to it before release. The local default is
   `http://localhost:3001`; custom audit/preview ports are not a production
   canonical. Most Figma pages are deliberately still fixture-backed and noindex.
   Confirm their publication gate after real content/offers are connected.
2. **Legal approval.** Figma note 136:171 requires legal review of Privacy and
   Terms, including PIPEDA, B.C. PIPA, CASL and bracketed
   company/contact/policy placeholders. These drafts remain version 0 and
   noindex; this audit does not approve their text or accepted versions.
3. **Assets and claims.** Photos, provider/dealer authorization, ratings/reviews,
   testimonials, prices, service timing and contact information still need owner
   approval. The sharing image uses the existing brand only; approve any future
   campaign/article artwork separately. Email SVG support still needs a real
   inbox/client matrix and an approved raster alternative where necessary.
4. **Visual residuals.** Home internet and mobile plans retain paragraph/table
   wrapping and cumulative section-height differences; their raw diffs identify
   the remaining review areas. Pre-arrival's reference is already selected and
   includes an inline selection bar, while the initial implementation is
   unselected and shows the requested floating bar after a choice. Do not
   manufacture a selection or reserve fake inline space to zero that diff.
5. **Overlay viewport.** Tracking's desktop Figma frame has a full-document
   backdrop and a 680×867 dialog at y=180; the actual modal uses a viewport
   backdrop and scrolls when the window is shorter. Its full-page raw diff is
   dominated by that difference. Confirm the intended window height/position
   before treating full-document overlay pixels as a defect. Some tracking
   error references are 430 pixels wide; 390 captures test their fluid adaptation.
6. **No matching reference.** Legacy `/plans`, `/plans/[slug]`, `/order`, `/track`,
   the component lab and Studio have no supplied whole-page Figma counterpart.
   Their responsive/accessibility/metadata checks are included; visual parity
   is not claimed. Email designs have one 600-pixel body reference, so their
   390-pixel layouts are responsive adaptations rather than a separate mobile
   Figma match. The configured live Studio is vendor-managed and is outside the
   unconfigured fallback audited here.
7. **Launch scope.** Mobility remains the first launch; internet and TV are later.
   This audit keeps the existing preview pages and does not change that decision.
8. **Browser security issue entry.** Lighthouse's Best Practices score is usually
   96 because Chrome reports a CSP entry in its Issues panel, without an attributed
   resource in the saved details. Browser page-error captures are empty. Recheck
   this on the approved HTTPS deployment and preserve the existing security
   headers while identifying the issue; a performance score is not justification
   to relax them.

## Verification

Site TypeScript, ESLint, 162 unit tests, shared UI TypeScript and 26 UI tests pass.
The production build passes with the existing Google Sans Flex fallback-metrics
warning. Changed files are formatted. No deployment, commits, backend writes,
real messages or production order operations were performed. Database-backed
integration gates are separate from these fixture UI checks.

The generated per-case results below are populated from the final evidence.

Reproduce from `apps/site-1` against an immutable production build in a preview
environment, with the database/CMS fixture configuration recorded for that run:

```powershell
$env:AUDIT_ORIGIN='http://127.0.0.1:3150'
$env:AUDIT_PHASE='final'
node scripts/audit-pages.mjs
node scripts/audit-visual-diff.mjs
$env:AUDIT_PHASE='final-verified'
node scripts/audit-lighthouse.mjs
node scripts/check-audit-performance.mjs
node scripts/audit-report.mjs
```

Run Lighthouse separately from builds, browser QA and the development server.
The gate requires every case to have five valid measured runs and a performance
median of at least 90; it reports missing or failing cases instead of hiding them.
<!-- audit-generated -->

| Page / state                                                | Pixel diff 390 / 1440 | Axe violations 390 / 1440 | Mobile performance median | Valid measured runs |
| ----------------------------------------------------------- | --------------------- | ------------------------- | ------------------------- | ------------------- |
| / (home)                                                    | 6.96% / 4.36%         | 0 / 0                     | 93                        | 5                   |
| /pre-arrival-sim (pre-arrival)                              | 16.24% / 13.83%       | 0 / 0                     | 93                        | 5                   |
| /home-internet (home-internet)                              | 8.85% / 11.46%        | 0 / 0                     | 92                        | 5                   |
| /mobile-plans (mobile-plans)                                | 16.03% / 5.57%        | 0 / 0                     | 93                        | 5                   |
| /contact (contact)                                          | 2.69% / 1.75%         | 0 / 0                     | 94                        | 5                   |
| /faq (faq)                                                  | 2.71% / 1.86%         | 0 / 0                     | 94                        | 5                   |
| /about (about)                                              | 3.2% / 2.09%          | 0 / 0                     | 94                        | 5                   |
| /guides (guides-index)                                      | 2.76% / 1.69%         | 0 / 0                     | 92                        | 5                   |
| /guides/best-sim-for-students-from-india (guides)           | 3.53% / 1.99%         | 0 / 0                     | 94                        | 5                   |
| /order/home-internet (internet-order)                       | 3.56% / 1.6%          | 0 / 0                     | 95                        | 5                   |
| /order/pre-arrival (pre-arrival-order)                      | 6.64% / 2.34%         | 0 / 0                     | 92                        | 5                   |
| /privacy (privacy)                                          | 12.04% / 7.9%         | 0 / 0                     | 95                        | 5                   |
| /terms (terms)                                              | 12.15% / 7.66%        | 0 / 0                     | 95                        | 5                   |
| /search (search)                                            | 4.05% / 2.17%         | 0 / 0                     | 96                        | 5                   |
| /accessibility (accessibility)                              | 6.63% / 2.15%         | 0 / 0                     | 95                        | 5                   |
| /missing-preview-page (404)                                 | 2.84% / 1.41%         | 0 / 0                     | 96                        | 5                   |
| /dev/components (components)                                | — / —                 | 0 / 0                     | 94                        | 5                   |
| /dev/emails?template=order-received (email-order)           | — / 2.84%             | 0 / 0                     | 95                        | 5                   |
| /dev/emails?template=esim-ready (email-esim)                | — / 3.06%             | 0 / 0                     | 95                        | 5                   |
| /dev/emails?template=install-booked (email-install)         | — / 2.84%             | 0 / 0                     | 93                        | 5                   |
| /track-order?state=lookup (tracking-lookup)                 | 3.76% / 1.89%         | 0 / 0                     | 93                        | 5                   |
| /track-order?state=esim-sent (tracking-esim-sent)           | 3.35% / 2.22%         | 0 / 0                     | 93                        | 5                   |
| /track-order?state=action-needed (tracking-action-needed)   | 3.43% / 2.32%         | 0 / 0                     | 93                        | 5                   |
| /track-order?state=request-change (tracking-request-change) | 5.12% / 47.41%        | 0 / 0                     | 93                        | 5                   |
| /track-order?state=not-found (tracking-not-found)           | — / —                 | 0 / 0                     | 95                        | 5                   |
| /track-order?state=too-many-tries (tracking-too-many-tries) | — / —                 | 0 / 0                     | 94                        | 5                   |
| /track-order?state=code-expired (tracking-code-expired)     | — / —                 | 0 / 0                     | 95                        | 5                   |
| /plans (legacy-plans)                                       | — / —                 | 0 / 0                     | 95                        | 5                   |
| /plans/test-plan (legacy-plan)                              | — / —                 | 0 / 0                     | 94                        | 5                   |
| /order (legacy-order)                                       | — / —                 | 0 / 0                     | 96                        | 5                   |
| /track (legacy-track)                                       | — / —                 | 0 / 0                     | 92                        | 5                   |
| /studio (studio)                                            | — / —                 | 0 / 0                     | 96                        | 5                   |

Pixel diff “—” means no supplied matching whole-page reference, or a state requiring a component/cropped comparison; it is not a pass.

Performance is the 90+ gate. The preview SEO score is intentionally reduced by noindex/robots; do not remove those safeguards to raise it. The real 404 is measured with Lighthouse’s `ignoreStatusCode` flag so rendering can be scored while its HTTP 404 response stays intact.

Before/after medians: Home 83 → 93, mobile plans 76 → 93, pre-arrival order 77 → 92. Home internet after the first optimizations was 88; the final measured score is 92.
