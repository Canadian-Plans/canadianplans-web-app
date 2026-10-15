# Pre-arrival order flow evidence

Figma file `6zUS2WZbQn6NUhyjesA584`, Website:

| State                 | Desktop    | Mobile     |
| --------------------- | ---------- | ---------- |
| Step 1                | `116:3`    | `302:2`    |
| Step 1 errors         | `369:2884` | `369:2734` |
| Expanded plan summary | —          | `369:3022` |
| Step 2                | `117:2`    | `302:104`  |
| Confirmation          | `120:2`    | `302:327`  |

All nine full design contexts and screenshots were inspected before coding.
Focused asset contexts were also inspected for the lock and image-slot icon.
Source screenshots are `figma-0.png` through `figma-8.png`, in table order
(expanded follows the error pair). Browser screenshots are `one`, `errors`,
`expanded`, `two`, `confirmation`, `documents` and `image`, suffixed by width.

| Element                | Mobile y / width / height | Desktop y / width / height |
| ---------------------- | ------------------------- | -------------------------- |
| Header                 | 0 / 390 / 77              | 0 / 1440 / 77              |
| Stepper                | 77 / 350 / 64             | 77 / 1200 / 80             |
| Collapsed plan summary | 157 / 350 / 70            | Hidden                     |
| Expanded plan summary  | 157 / 350 / 498           | Hidden                     |
| Step 1 form            | 243 / 350 / 1652          | 181 / 768 / 1055           |
| Step 1 error form      | 243 / 350 / 1989          | 181 / 768 / 1374           |
| Step 2 form            | 243 / 350 / 2169          | 181 / 768 / 1434           |
| Document box           | 474 / 310 / 556           | 395 / 672 / 408            |
| Desktop plan summary   | Hidden                    | 181 / 400 / 577            |
| Confirmation hero      | 77 / 390 / 545            | 77 / 1440 / 536            |
| Confirmation timeline  | 646 / 350 / 621           | 637 / 776 / 544            |
| Internet CTA card      | 1839 / 350 / 288          | 1237 / 1200 / 178          |

Main canvases match the source section geometry. The clear-draft toolbar is an
intentional addition below the designed canvas. The expanded mobile reference
is clipped at 844 high; implementation continues with the complete form below
its matching summary. Native select arrows/checkbox shapes and small font
glyph/dashed-stroke differences remain.

`pnpm --filter site-1 exec node scripts/verify-pre-arrival-order.mjs` regenerates
`verification.json` against the local server on port 3127. Override with
`PREARRIVAL_ORDER_TEST_URL`. Verification covers:

- Source geometry and locally downloaded SVG hashes, root dimensions, loaded
  images and effective rendered sizes; images decode before capture.
- WCAG 2/2.1 AA, error-link focus and focus on step/confirmation transitions.
- Both steps, country-code validation, three-error summary, email confirmation,
  required documents and consents, failed action/retry with retained values.
- Refresh recovery of text, current step, selected plan, checkbox preferences,
  passport number and both actual File blobs; refreshing confirmation.
- Returning to edit, clear-draft deletion, picker handoff and audience/plan
  changes followed by refresh without losing entered text.
- No runtime errors or horizontal document scroll at 320/390/768/1024/1280/1440,
  including step 2 and confirmation at narrow/intermediate widths.

The existing pre-arrival landing-page verifier also passes after its former
placeholder-dialog expectation was replaced with the real checkout handoff.
Unit checks cover validation, invalid calendar dates, international phone
numbers, consent/email matching, metadata limits, tampered plans/unknown input,
versioned incomplete drafts and the server stub's response. Shared FormField
checks verify accessible descriptions and error-icon ordering.

Checks: 135 site tests and 26 shared UI tests, site/UI typechecks, site lint,
selected-file formatting and production build. The existing Google Sans Flex
fallback-metrics build warning remains.

The implementation is a UI preview. It adds pinned `react-hook-form@7.90.0` and
`@hookform/resolvers@5.4.3` as explicitly requested, using the existing Zod
dependency and shared Input/FormField/CpButton/CpChip/CpImageSlot stack. Schema
types derive from Zod; incomplete stored drafts are independently bounded and
versioned. Only registered fixture IDs and audience IDs enter the handoff URL,
and the query is removed after hydration. Personal fields never enter URLs,
analytics, logs or returned action results. File blobs never reach the server.

Text/plan/step state is cached in sessionStorage. File blobs are cached in
IndexedDB under an opaque key held in that tab's sessionStorage. No arbitrary
expiry is imposed on a refreshable draft. Clear saved draft removes that tab's
file record and resets its text values. Closing a tab ends its text session;
orphaned file blobs can remain in browser storage until site data is cleared.
Storage failures show a visible recovery warning; the UI can still validate
in-memory values. This cache is separate from backend lead grants and creates
no business record. Real order integration and retention policy remain separate
work.

Both document slots and the city options are representative preview inputs,
not carrier eligibility rules. Real document requirements stay per-offer and
backend-authoritative. Birth date must be in the past, arrival today or later;
no minimum age is inferred. Prices/contact/activation claims remain fixtures.
The privacy note describes local storage rather than claiming an encrypted
upload. Confirmation says **Preview ready**, with no invented order reference,
send, activation or email claim. Advisor and address actions use existing local
contact/home-internet pages; Back returns to retained details.

New shared components: **none**. FormField gains optional `errorIcon` and
`errorBeforeHint` props; default behavior is unchanged. Additive shared tokens
cover verified source colours and line boxes. The picker continuation is the
only existing page behavior changed; its filtering/card layouts stay intact.
The integrated `/order`, `/track` and home-internet order remain unchanged.
