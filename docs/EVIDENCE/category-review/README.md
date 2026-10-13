# Seven category previews — 13 October 2026

Four GPT-6 Luna agents implemented the remaining category templates. Parent
review compared source and browser screenshots, returned mismatches for
correction, and corrected internet layout, editorial assets, footer reuse and
checkout selection directly.

| Route | Desktop / mobile source | Detailed evidence |
| --- | --- | --- |
| `/pre-arrival-sim/students` | `151:2` / `251:2` | [SIM](../category-sim/README.md) |
| `/pre-arrival-sim/from-india` | `162:2` / `255:2` | [SIM](../category-sim/README.md) |
| `/pre-arrival-sim/toronto-pearson` | `186:509` / `256:988` | [Airport/comparison](../category-airport-compare/README.md) |
| `/compare/rogers-vs-fido` | `182:2` / `255:516` | [Airport/comparison](../category-airport-compare/README.md) |
| `/mobile-plans/rogers` | `158:2` / `254:451` | [Rogers](../category-rogers/README.md) |
| `/home-internet/vancouver` | `154:2` / `252:360` | [Internet](../category-internet/README.md) |
| `/home-internet/ontario` | `186:2` / `256:510` | [Internet](../category-internet/README.md) |

All seven routes use typed `previewOnly` content, noindex metadata and local
static assets. Photography remains the source image placeholders. These are
design previews; prices, provider claims, reviews, bylines, contact details and
installation promises require approved data before live use. Address checking,
advisor dialogs and plan choices do not create provider requests or real orders.

Internet plan handoff now allowlists the four known preview plan identifiers
and derives the summary from the selected fixture. Unknown or duplicate query
values fall back to the existing 500 Mbps preview. Fourteen desktop/mobile
selection and malformed-query cases are recorded in
[`internet-handoffs.json`](internet-handoffs.json).
Comparison examples link to plan listings rather than a checkout whose plan
price/data differs. Existing `/order` and email-verified `/track` are preserved.

New shared React components: **none**. Page compositions reuse existing UI
primitives, chrome, assets, review cards and FAQ controls. Shared changes are
additive design tokens, footer category routing and an optional audit setting
that avoids mutating images before React hydration.

Parent visual fixes include native boarding-pass sections, mobile button widths,
plan reading order, source hero typography, map geometry, single-column mobile
coverage cards, editorial avatars, visible guide answers and complete footer
content. Readable blue eyebrows replace low-contrast source yellow where
documented in individual evidence. Native form controls, font rendering and
dashed borders can differ slightly from Figma.

No production deployment, commits, schema changes or CMS publishing were made.
Live CMS/catalogue integration and business approval remain separate work.
