# Privacy and Terms evidence

Sources: Privacy 136:3 / 249:194; Terms 137:2 / 250:96. Legal note 136:171 was read
first. Original renders are `figma-0.png` to `figma-3.png` in that order. Final
browser screenshots cover both pages at 390/1440; expanded mobile contents has
separate captures. `assets.json` stores source-export hashes/root dimensions;
`verification.json` stores final geometry, visible assets and accessibility.

Run from `apps/site-1`:

```powershell
node scripts/verify-legal.mjs
```

`LEGAL_TEST_URL` overrides http://127.0.0.1:3127. The script checks keyboard focus,
contents expansion, legal tabs, cookie preview dialog, runtime errors, WCAG AA,
asset hashes/aspect ratios and overflow at six widths. All four page/viewport
records pass with zero accessibility violations and no overflow.

The Figma content is an unapproved fallback draft. Published CMS text and accepted
versions remain authoritative; source version 1.0 was not adopted. The visible
draft indicator adds 32/36 to the mobile/desktop headers. Article measurements
match their sources. Minor
font glyph-width differences and the existing font fallback warning remain.

The legal note requires a Canadian lawyer to review Privacy (PIPEDA, BC PIPA,
CASL) and Terms before launch, and replacement of all bracketed items. The exact
placeholder checklist and implementation details are in
[DESIGN_NOTES.md](../../../apps/site-1/DESIGN_NOTES.md).
Cookie preference integration is also pending; its control truthfully says no
preference is saved or changed in this preview.

New app compositions shared across the pair: LegalPage, LegalNavigation,
LegalHeaderControls and LegalContents. No new UI package primitive. Shared token
changes are additive. Unit checks cover approved CMS content versus fallback;
site typecheck/lint, 142 tests and production build pass.
