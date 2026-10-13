# Rogers category preview evidence

Figma source: file `6zUS2WZbQn6NUhyjesA584`, desktop frame `158:2`, mobile frame `254:451` (primary link `link_6ab3a09ad1d881919483c9be3d9f01fc`). Source captures are `source-1440.png` and `source-390.png`; implementation captures are `rogers-1440.png` and `rogers-390.png`. Section crops are under `crops/`.

`verification.json` records browser widths (320, 390, 768, 1024, 1440), visible image intrinsic/rendered dimensions at mobile and desktop, heading sequence, keyboard interactions, and axe results. The route uses preview-only plan-selection and advisor dialog states. Fixtures including prices, coverage claims, reviews, and contact details are identified by the page notice pending owner approval.

The hero eyebrow uses the shared blue accent at both widths so its small uppercase text meets contrast requirements on the lemon hero background; the Figma yellow accent did not meet that threshold. The final blue placeholder uses a 10% white overlay instead of the source 14% to keep white small text above AA contrast. The visible fixture notice sits in the source area. Other sections use source layout, typography and native content to determine height.

The 13 October fidelity correction re-read both full contexts and metadata. It corrected the narrow quick answer, undersized headings/bars, table styles, mobile card layout, guide/facts dimensions, reviews and final CTA. `verification.json` now records every section's geometry and asserts source widths and heights of the spec, quick-answer and guide/FAQ/final image slots, bold headings and five-segment ratings. Earlier route-health results alone did not establish visual fidelity.

Asset map (exact Figma SVG exports; original viewBox/intrinsic geometry retained):

- `desktop-imgEllipse.svg`, `desktop-imgEllipse1.svg`–`desktop-imgEllipse5.svg`: byline author/reviewer and review avatars.
- `mobile-imgIconCheck.svg`: plan-card included-feature marks.
- `desktop-imgFrame.svg`, `mobile-imgFrame.svg`: image-slot frame assets.
- `desktop-imgIcon.svg`, `desktop-imgIcon1.svg`, `mobile-imgIcon.svg`–`mobile-imgIcon3.svg`: desktop/mobile image-slot icons and callouts.
- `desktop-imgMark.svg`, `mobile-imgMark.svg`: frame marks.
- `mobile-imgPhoneIcon.svg`: mobile source phone icon.

Shared logo and generic image-slot assets are reused from the existing shared library where byte-identical. All page content, copy, labels, and fixture data are owned by `apps/site-1/content/category-rogers.ts`.

Verification command from `apps/site-1`: `AUDIT_ORIGIN=http://127.0.0.1:3127 node scripts/verify-category-rogers.mjs` (PowerShell: `$env:AUDIT_ORIGIN='http://127.0.0.1:3127'; node scripts/verify-category-rogers.mjs`). TypeScript and scoped ESLint checks passed. Browser verification found no overflow, runtime errors, or axe AA violations at tested widths; keyboard sort, plan preview, FAQ expansion, advisor dialog Escape, and focus return passed.
