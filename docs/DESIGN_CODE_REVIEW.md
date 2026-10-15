# Design and code review — 13 October 2026

Reviewed the current site-1 storefront, shared Canadian Plans UI and preview
tooling. The browser inventory covers 39 route/state cases at 390 and 1440 px,
including the seven category pages, main pages, orders/tracking previews,
legal/search/accessibility, component lab, three email previews, unconfigured
Studio and read-only smoke checks of the existing catalogue/order/tracking
routes. This is a review of the existing implementation, not an audit of the
entire backend or a production release.

## Improvements implemented

| Finding                                                                                                      | Change and verification                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Students/India plan selection relied on a mobile-only sticky bar, leaving desktop without a Continue action. | Added an inline selected-plan summary and preview checkout link at every width. The keyboard verifier now actually follows the desktop link and checks the selected 100 GB / $40 summary.                                                                                                                                     |
| Small client widgets received entire page models.                                                            | Address checking receives only the region and postal placeholder; category plan selection receives only its path and plan section. Typed interfaces document the smaller inputs, and server callers explicitly construct them.                                                                                                |
| Closing the Rogers selection preview removed the focused close button.                                       | Restores focus to the selected plan button, with a connected-element check and a browser regression assertion.                                                                                                                                                                                                                |
| Pearson's FAQ had source/design drift.                                                                       | Retrieved full Figma contexts and screenshots for desktop `186:867` and mobile `258:237`. Removed an image placeholder absent from the source and restored native type, button and column geometry. Both source answers now start open. The section measures 1113.5 px mobile and 967.5 px desktop versus Figma's 1115 / 971. |
| Named native disclosures silently closed the second default-open answer.                                     | `CpFaqAccordion` omits the exclusive HTML group when several initial-open IDs are provided. Single-open groups remain exclusive. Unit checks and a real keyboard browser check exercise both modes.                                                                                                                           |
| Some navigation destinations were wrong.                                                                     | Mobile Plans' utility tracking link reaches `/track`; category internet Guides links reach `#guide`; shared footer help links reach the actual Guides, Contact and email-verified Track pages.                                                                                                                                |
| Obsolete styling remained after plan/review markup changed.                                                  | Removed 45 unused SIM plan rules and four unused internet review rules. The eight initial-state screenshots for the optimized pages show no detected pixel changes after the refactor.                                                                                                                                        |
| The page audit could report failures while exiting successfully.                                             | Added a fail-fast report validator for HTTP, capture completeness, runtime errors, accessibility, headings, overflow, missing anchors, unloaded images and asset geometry. Eleven regression tests exercise healthy and failed records. The new check caught real missing anchors, which were fixed.                          |

New shared React components: **none**. The shared FAQ component's existing
interface is retained; its multi-open behavior is corrected. No dependency,
backend, database, provider, CMS publishing or production deployment changes.

## Measured efficiency

Chromium loaded each production-built route six times at 390×844 in a fresh
context with essential-only consent. The first run was discarded; values below
are medians of the five measured runs. V8 coverage and network resource records
are retained with the measurements. Values are decoded initial HTML bytes,
including the React Server Component payload, not compressed wire sizes.

| Page       |  Before |   After | Reduction |
| ---------- | ------: | ------: | --------: |
| Students   | 135,541 | 124,708 |     7.99% |
| From India | 145,412 | 133,054 |     8.50% |
| Vancouver  | 176,630 | 165,741 |     6.16% |
| Ontario    | 174,845 | 164,377 |     5.99% |

The primary improvement is less serialized page data. JavaScript size remains
approximately unchanged; no JavaScript execution-speed or Lighthouse-score
improvement is claimed. The small new controls add code, so this is not a claim
that every resource got smaller. Final byte measurements are in
[payload evidence](EVIDENCE/audit/design-review-final/payload.json), with the
[baseline](EVIDENCE/audit/review-baseline/payload.json) kept separately.

## Verification

The optimized production build uses Webpack, consistent with the earlier
workaround for stale development Turbopack output. Local runtime preview mode
allows the guarded component/email previews to be inspected without publishing
them. The final [page records](EVIDENCE/audit/design-review-final/pages.json)
and screenshots cover all 78 desktop/mobile cases. Focused browser verifiers
also cover 320/390/768/1024/1440, desktop/mobile plan handoff, sorting, keyboard
focus, multi-open FAQs, address failure states and preview summaries. No real
orders or messages were submitted.

Site typecheck, full site lint, shared UI typecheck, production build and
changed-file formatting passed. Tests: site 162, shared UI 28, audit validator 11.
The validator checks all final records, including expected HTTP 404 semantics.
Visual cleanup comparisons are in
[refactor evidence](EVIDENCE/audit/design-review-final/refactor-visuals.json).

## Remaining scope

Approved photography, missing FAQ/article content, carrier/business claims,
live CMS/catalogue wiring, provider operations and production release remain
the existing separate work. Native controls, font rendering and dashed strokes
can differ from Figma. This review does not claim pixel-perfect parity for
every source frame, complete live order/backend testing, an exhaustive security
audit, or new performance scores for every route. The earlier 32-case
[Lighthouse audit](AUDIT_REPORT.md) remains historical evidence.
