# Canadian Plans design foundation

Source: [Figma Website page](https://www.figma.com/design/6zUS2WZbQn6NUhyjesA584/Canadian-Plans?node-id=60-2),
Home desktop `60:3` and Home mobile `195:2`. Extracted 12 October 2026
using `get_variable_defs` and full `get_design_context` with screenshots on
both frames.

The foundation phase added infrastructure and tokens only. Existing pages were retained;
no page is implemented or opted into the new theme. No shared React components
were added. The existing Next.js App Router / strict TypeScript / Tailwind v4 /
shared shadcn scaffold, root ESLint and root Prettier configuration are reused.
The app now exposes format scripts alongside its existing lint/type/build scripts.

## Ownership and use

[canadian-plans.css](../../packages/ui/src/styles/canadian-plans.css) is the
single source for values. Its package export is
`@canadian-plans/ui/canadian-plans.css`; the storefront stylesheet imports it
after the shared defaults. `cp-*` theme names are additive. A future named
page opts into `.cp-design`, which maps shadcn semantic colours locally.
The admin and existing pages retain their current theme.

Lengths are stored in rem using Figma pixels / 16. Pixel equivalents below are
reference measurements, not permission to put raw values into page code.
Use `bg-cp-blue`, `text-cp-body-m`, `rounded-cp-24`,
`gap-cp-24`, `shadow-cp-raised`, `font-cp` and `max-w-cp-content`.
The complete CSS token file includes the exact scaled mobile values as well.

The font is loaded with `Google_Sans_Flex` from `next/font/google` in
[src/lib/fonts.ts](src/lib/fonts.ts), exposing `--font-google-sans-flex` on
the root layout. The installed Next.js definitions support this exact family
and its variable weight, GRAD, ROND and wdth axes. Next lacks automatic fallback
metrics for this family; the loader explicitly uses `adjustFontFallback: false`
and the token keeps a normal system fallback stack. The new theme uses GRAD 0,
ROND 0 and wdth 100, matching the frame context. Optical sizing was not exposed
by the Figma context and remains a visual-verification question.

New typed copy/plan files belong in this app's [/content](content/site.ts),
using the `@content/*` alias. Only the existing brand name is populated now.
The plan-fixture array is empty; `PreviewPlan` wraps the shared
`WebsiteOffer` contract and requires `previewOnly: true`.
Real commercial data remains backend-authoritative.

## Colours

For each row the CSS name is `--cp-color-<name>`, exposed to Tailwind as
`--color-cp-<name>`.

| Name             | Value   |
| ---------------- | ------- |
| blue             | #3657f2 |
| ink              | #101a3d |
| muted            | #535b7a |
| white            | #ffffff |
| black            | #000000 |
| line             | #e6e9f2 |
| strong           | #a7acbf |
| sun              | #ffe14d |
| blush            | #ff9db8 |
| sky              | #e3e9ff |
| mint             | #d5f5e6 |
| lemon            | #fff4c2 |
| pink             | #ffe3ea |
| snow             | #f7f8fc |
| wash             | #eff8f3 |
| inverse-muted    | #c9cee3 |
| inverse-line     | #2a3459 |
| inverse-inactive | #3a4570 |
| rating           | #b88a00 |

## Gradients, prototype details and legacy colours

The MCP variables give the semantic palette above. These extra colours come
from actual unbound fills in the two full frame contexts. The descriptive
illustration names are implementation names; they are not claimed to be named
Figma variables.

| Name                   | Value   |
| ---------------------- | ------- |
| hero-gradient-start    | #5c78ff |
| hero-gradient-end      | #2440c8 |
| slot-gradient-start    | #eff3ff |
| slot-gradient-end      | #e0e7ff |
| slot-line              | #d1d9f2 |
| slot-muted             | #666b7a |
| illustration-line      | #ccd1e0 |
| illustration-neutral   | #d9deeb |
| illustration-soft      | #e0e5ed |
| illustration-mint      | #e0f7eb |
| illustration-line-soft | #e2e5ec |
| illustration-blue      | #e8edff |
| illustration-violet    | #f2e8ff |
| illustration-warm      | #fff0de |
| illustration-snow      | #f6f7fb |
| illustration-white     | #f7f9fc |
| legacy-page            | #f2f2ee |
| legacy-muted           | #9a9da5 |
| legacy-line            | #d9dad5 |

`--cp-gradient-hero`: top-to-bottom hero-gradient-start → hero-gradient-end.
`--cp-gradient-slot`: top-to-bottom slot-gradient-start → slot-gradient-end.
The slot dashed border is `rgb(54 87 242 / 0.25)`.
The shadow colour is `rgb(15 26 61 / 0.25)`, which differs slightly from ink.

The mobile canvas has an additional legacy palette
(`#F2F2EE`, `#9A9DA5`, `#D9DAD5`) while most visible sections use the
Canadian Plans palette. Preserve those tokens under separate names; confirm
where they belong during the page task. Do not silently replace the primary
white surface with the mobile canvas fallback.

## Typography

Family: **Google Sans Flex**. All named styles below are exposed as
`text-cp-<name>`, including their line height, tracking and weight.

| Name           | Figma style       | Size, px | Weight | Line height | Tracking, em |
| -------------- | ----------------- | -------- | ------ | ----------- | ------------ |
| label-s        | CP/Label/S        | 13       | 700    | 1.25        | 0            |
| caption        | CP/Caption        | 13       | 400    | 1.4         | 0            |
| logo           | CP/Logo wordmark  | 22       | 800    | 1           | -0.02        |
| label-l        | CP/Label/L        | 16       | 700    | 1.25        | 0            |
| body-s         | CP/Body/S         | 14       | 400    | 1.45        | 0            |
| label-m        | CP/Label/M        | 14       | 700    | 1.25        | 0            |
| eyebrow        | CP/Eyebrow        | 13       | 700    | 1.25        | 0.08         |
| display-xl     | CP/Display/XL     | 96       | 700    | 0.95        | -0.03        |
| h1             | CP/Heading/H1     | 56       | 700    | 1           | -0.03        |
| body-xl        | CP/Body/XL        | 20       | 400    | 1.45        | 0            |
| button-l       | CP/Button/L       | 18       | 700    | 1.2         | 0            |
| tag            | CP/Tag            | 12       | 700    | 1.25        | 0.06         |
| h4             | CP/Heading/H4     | 24       | 700    | 1.15        | -0.02        |
| price-xl       | CP/Price/XL       | 64       | 700    | 0.95        | -0.04        |
| display-l      | CP/Display/L      | 80       | 700    | 0.95        | -0.03        |
| display-m      | CP/Display/M      | 72       | 700    | 1           | -0.04        |
| h5             | CP/Heading/H5     | 20       | 700    | 1.25        | -0.01        |
| body-m         | CP/Body/M         | 16       | 400    | 1.5         | 0            |
| h3             | CP/Heading/H3     | 30       | 700    | 1.1         | -0.02        |
| h2             | CP/Heading/H2     | 36       | 700    | 1.1         | -0.02        |
| body-l         | CP/Body/L         | 17       | 400    | 1.5         | 0            |
| body-l-medium  | CP/Body/L Medium  | 17       | 500    | 1.5         | 0            |
| display-mobile | CP/Mobile/Display | 48       | 700    | 0.95        | -0.03        |

The context reports tracking as percentages: e.g. desktop 96 px with
`-2.88px` tracking equals `-0.03em`; 13 px eyebrow with `1.04px`
tracking equals `0.08em`. Unitless line-height floating-point noise is
normalized to the displayed decimal.

Additional node-level sizes, exposed as `text-cp-<size>`:
12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 28, 30, 32, 34, 36, 42, 46, 46.019, 48, 56, 64, 72, 80, 96 px. Decimal names use a hyphen, e.g.
`text-cp-46-019`. These raw size utilities do not impose a weight or
line-height; use named styles when the style applies.

The actual mobile hero uses **46 px**, although CP/Mobile/Display is **48 px**.
Both are retained. `text-cp-hero-fluid` interpolates 46 → 96 px across
390 → 1440 using clamp; its slope/intercept are derived implementation tokens,
not additional Figma variables. Secondary hero text is 30 px mobile / 56 px
desktop. Use the real node values for each text slot.

## Radii and borders

Reference radii, exposed as `rounded-cp-<value>`:
3.595, 4, 5, 6, 9.6, 10, 14, 16, 17.257, 20, 22, 23.01, 24, 26, 28, 32, 40, 50.84, 63.276, 82, 88, 718.329, 999 px.

Core panel/card radii: 14, 16, 20, 22, 24, 26, 28, 32 and 40 px.
The mobile hero uses 28 px; desktop hero uses 40 px. Small radii belong to bars
and details. Large/scaled radii belong to pills or badges, not generic cards.
Decimal utility names use a hyphen, e.g. `rounded-cp-23-01`.

Border tokens: thin 1 px; outline 1.5 px; strong 2 px;
scaled mobile 1.438 px; detail 1.8 px. Shadcn's scoped base radius is 16 px;
its computed radius utilities are not exact Figma card radii, so apply the
specific `rounded-cp-*` class to a reused primitive where needed.

## Shadows

| Token / Tailwind utility                          | Figma pixel equivalent                |
| ------------------------------------------------- | ------------------------------------- |
| cp-shadow-raised / shadow-cp-raised               | 0 16 40 0 rgba(15,26,61,0.25)         |
| cp-shadow-raised-mobile / shadow-cp-raised-mobile | 0 11.505 28.762 0 rgba(15,26,61,0.25) |
| cp-shadow-stamp / shadow-cp-stamp                 | 3 3 0 0 ink                           |
| cp-shadow-stamp-mobile / shadow-cp-stamp-mobile   | 2.157 2.157 0 0 ink                   |

These are the four observed shadows; no additional default card shadow is
invented for the design.

## Spacing and containers

Spacing tokens `--cp-space-N` / utilities `gap-cp-N`, `p-cp-N`, etc.:
2, 4, 6, 8, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 22, 24, 28, 30, 32, 36, 40, 48, 50, 56, 64, 67, 72, 80, 88, 96, 108, 112, 120 px.

| Token                    | Reference value              |
| ------------------------ | ---------------------------- |
| cp-viewport-mobile       | 390 px                       |
| cp-viewport-desktop      | 1440 px                      |
| cp-container-desktop     | 1200 px                      |
| cp-container-mobile      | 350 px                       |
| cp-container-hero-mobile | 358 px                       |
| cp-gutter-mobile         | 20 px                        |
| cp-gutter-hero-mobile    | 16 px                        |
| cp-gutter-desktop        | 120 px at the 1440 reference |
| cp-section-space-mobile  | 48 px                        |
| cp-section-space-desktop | 96 px                        |

`cp-container` uses the smaller of available width minus two mobile gutters
and the 1200 px maximum; it yields 350 px at 390 and 1200 px at 1440.
The hero uses a different 16 px outer gutter on mobile. These are layout
utilities, not React components. Keep the document fluid rather than setting
its width to the Figma frame.

Fractional padding and absolute coordinates from scaled artwork are not a
global spacing rhythm. Their complete geometry must be extracted into named,
scoped art tokens during the relevant component task. Likewise the frame's
total page height is not a layout token: text and sections flow naturally.

## Ambiguities for later page tasks

- Only the 390 and 1440 layouts are authoritative references. Intermediate
  breakpoint behavior needs responsive composition and screenshots; the
  default Tailwind breakpoints are existing implementation defaults, not values
  extracted from Figma.
- Typography overrides and scaled hero decorations create exact fractional
  values. Keep node values, and compare their effective geometry before
  simplifying them. Do not round all radii to one generic scale.
- Google Sans Flex optical sizing and synthetic fallback layout need visual
  verification after a page actually uses the font.
- The build succeeds and produces self-hosted WOFF2 assets. Turbopack still
  prints its missing font-override-metrics warning with `adjustFontFallback`
  disabled; this is recorded rather than treated as completed fallback-metric
  support. The normal system fallback remains available.
- The shared defaults define red/Inter and generic shadcn radii/shadows. New
  designs use the scoped theme plus exact cp utilities; changing global defaults
  would affect the admin and is outside this task.
- Static photo slots are deliberate placeholders. The foundation downloaded no
  assets; the shared-component task now includes original logo/icon/avatar SVG
  exports under `public/design/components/`, with no temporary URLs in code.
- The source has internet/TV, WhatsApp, sample prices/reviews/office details and
  a simplified checkout/tracking model. The owner confirmed mobility first.
  Follow the adaptations in [the design plan](../../docs/DESIGN_TO_CODE_PLAN.md);
  design content does not establish approved live business facts.
- New design-preview forms use typed stubs; existing integrated order/tracking
  flows remain operational code. The gallery search now uses a validated stub.
- The gallery has been screenshot-verified at 390/1440. Storefront pages still
  require their own comparison when implemented.

Implementation references:
[Tailwind custom text tokens](https://tailwindcss.com/docs/font-size#customizing-your-theme)
and [Next.js font loading](https://nextjs.org/docs/app/api-reference/components/font).

Foundation checks: site-1 and shared-UI typechecks, targeted ESLint, all 35
existing site-1 tests, changed-file formatting, local documentation links and
Git whitespace checks passed. A probe using installed Tailwind 4.1.16 verified
ten generated utility classes, named typography defaults, 390/1440 fluid text
endpoints and container widths. The site-1 build passed with the font-metrics
warning above. No page screenshots are required or claimed for this foundation.

## Shared components — 12 October 2026

Desktop context: `60:3`, utility `60:4`, nav `60:13`, promo `60:30`, footer `68:50`.
Mobile overview `194:2` returned a sparse description, so exact contexts were
read for `364:2153`, `364:2163`, `194:15`, `363:1002`, `364:2795` and `312:16`.
Home mobile `195:2` metadata and relevant mobile card/FAQ/review/heading contexts
were also consulted. Both source screenshots and individual components were
compared with the gallery, rather than treating the gallery layout as a Home page.

Additional central geometry tokens include utility 44/38, mobile nav 64,
desktop search 233, footer about 340, heading copy 520, FAQ 740/answer 600,
review strip 888/mobile card 300/quote height 130, image slot 220/pair 760,
price circle 176 with rotated stage 198.7816567 and rotation -8 degrees,
sticky button 140×52 and specimen home indicator 134×5. Widths use fluid containers.
Typography weights, line heights, tracking, alpha colors, borders and sticky
shadow are centralized with the existing token set. The chrome switches at
1280 (an implementation breakpoint where the full nav fits); the source specifies
390 and 1440, with intermediate behavior inferred and tested.

The local font's star glyph metrics differ from Figma's `normal` line box.
The review star row uses a 20 line box and 0.125em tracking to reproduce the
source's 75-wide, 20-high row; the resulting cards are about 262/286 high.
Browser rounding of fractional line heights leaves subpixel differences from
Figma's rounded frame sizes. Native dashed border rendering varies slightly
from Figma's dash pattern. Source colors, width and corner geometry are retained.

All 16 downloaded SVG exports are preserved unchanged. Repeated desktop/mobile
logo and avatar exports have identical hashes and reuse the exact same artwork.
The placeholder variants use the original 32×32 image icons; no photograph is
invented. The component inventory and usage are in [README.md](README.md).

Figma does not specify the mobile menu, search result, disabled/hover/focus states
or most closed FAQ answers. The gallery supplies accessible preview states,
stub feedback and clearly marked placeholder answers. Sample prices, office
details, reviews and internet/TV links demonstrate the source design only;
they are not approved live business content. Mobility-first scope still applies.
Real search/checkout integration and other storefront pages are future named tasks.

Visual and interaction evidence:
[390 screenshot](../../docs/EVIDENCE/shared-components/components-390.png),
[1440 screenshot](../../docs/EVIDENCE/shared-components/components-1440.png),
[verification details](../../docs/EVIDENCE/shared-components/verification.json).
The Next.js dev indicator is hidden only during screenshot capture.

## Home — 12 October 2026

Home `/` now has an isolated `(home)` layout. Desktop `60:3` and mobile `195:2`
were re-read with full design context and screenshots before coding, with exact
hero, journey and internet contexts inspected separately. Original 1440/390
Figma references and rendered full-page/section screenshots are saved in
[Home evidence](../../docs/EVIDENCE/home/README.md).

Home composes the existing chrome, buttons, badges, image slots, plan cards,
section heading, review cards, FAQ and price circles. No shared UI React component
was added. App compositions are HomeNavigation, PopularPlans, JourneyCarousel,
PostalCodePreview, PreviewContact, ReviewCarousel and InternetArt. UtilityBar,
Navigation and Footer gained optional link/contact props with their gallery
defaults retained. Shared-file changes are those compositions and the central
token stylesheet; other page compositions are unchanged.

The central tokens now include exact fractional hero/internet artwork geometry,
highlight/sticker rotations, source text-box heights and illustration borders.
All 34 original Home SVG exports are local with a typed source-node manifest.
Repeated logo/image/avatar assets reuse exact exports from the component library.
Roof and Wi-Fi arc assets retain their original root dimensions at both sizes.
Lengths remain rem; coordinates are used only for intentional illustration
overlays. The page containers and ordinary sections flow with content. A narrow
352 breakpoint makes tab/category labels fit below the 390 reference.

Confirmed interactions: accessible plan tabs with keyboard navigation, client
sample selection, desktop card rotation and mobile journey swipe/scroll/dots,
review scroll/dots, menu/dialog focus restoration and native single-open FAQ.
Postal validation accepts Canadian formats and retains input. Its server action
returns only invalid/preview status, never availability, and performs no writes.

Deliberate source adaptations: internet/TV remains a later launch. The internet
tab and postal result explain that scope rather than claim live coverage; their
states are not specified by Figma. Advisor/search controls are UI previews.
Source sample prices, testimonials, operating claims and office details still
need approval and backend/CMS integration. Closed FAQ answers remain marked
preview placeholders because Figma only supplies the first expanded answer.
Home is noindex during this design-preview stage.

Visual notes: corrected inherited hero tracking, mobile category composition,
plan-card ordering, review wrapping, dashed image-slot geometry, house borders
and exact SVG sizes. Step numbers use the existing muted token instead of the
low-contrast source grey, satisfying the accessibility check. Minor browser
font/dash rounding remains, with a few mobile text blocks differing by several
pixels from Figma's rounded boxes. The postal feedback differs intentionally.
The existing Google Sans Flex fallback-metrics warning remains.

## Pre-arrival SIM — 12 October 2026

`/pre-arrival-sim` uses an isolated `(pre-arrival)` layout. Desktop `106:3`,
mobile `207:2` and selected mobile sticky context `365:2796` were read before
coding, including all visible child contexts and full-resolution screenshots.
See [page evidence and remaining ambiguities](../../docs/EVIDENCE/pre-arrival/README.md).

New central tokens preserve the QR illustration's native fractional geometry;
pre-arrival text/slot/card measurements; the 12/32 ink selection-bar shadow;
mobile table line `#e3e5f0`, highlight `#e8edff`, 600 weight and 1.3 leading;
and observed rounded 21/26/46 text line boxes. Original font sizes, weights,
GRAD 0, ROND 0 and wdth 100 were confirmed directly from the text nodes.
Mobile hero and quick-answer line breaks preserve the reference while narrower
screens can wrap naturally. No length/colour values live in the page CSS or JSX.
Original SVGs are local under `public/design/pre-arrival`; identical image-slot
exports share a verified hash. QR squares remain native code layers, not a
screenshot, placeholder image or externally generated QR.

PlanPicker is the sole client owner of audience, selected ID and continuation
state. Student and permanent-resident preview filters show all three fixtures;
Worker shows Rogers Plus/Unlimited; Visitor shows Fido Essential. An eligible
selection survives a filter change, otherwise it clears. This mapping is an
explicit UI demonstration because the source provides no carrier eligibility
matrix. No initial plan is selected. The fixed selected bar uses the desktop
ink pill and the mobile white safe-area context. Continue opens a local step 2
preview and restores focus on close. Commercial integration is still separate.

Other ambiguities: five FAQ answers are absent from Figma and marked as awaiting
approved content. Image slots, office details, dates, comparisons, prices and
testimonials remain source previews. Internet/TV remains a later launch; the
promo points to Home's existing future-service preview. Browser typography and
dash rounding still produce small differences in some paragraphs. The installed
Next package has no `dist/docs/` directory, so its existing App Router files and
available package guidance were used. The known font fallback-metrics warning
remains. No new shared component; PlanCard and ReviewCard gained optional
presentation fields, and all page styling is scoped to `.cp-arrival`.

## Home Internet — 12 October 2026

`/home-internet` uses an isolated `(home-internet)` layout. Desktop `106:34`,
mobile `212:51`, and all six address results `308:3/73`, `308:38/108`,
`308:59/129` were read with full design context before coding. Original SVG
exports are local under `public/design/home-internet`; repeated desktop/mobile
icons share exact verified hashes and retain native dimensions. Full source and
implementation screenshots and browser checks are in
[page evidence](../../docs/EVIDENCE/home-internet/README.md).

The existing foundation provides colours, Google Sans Flex, spacing, typography,
1200 container and radii. Additive central tokens cover the 440 address form,
380 recommendation, 480 result dialog, 340/286 mobile text widths, 280×168 TV
slot, 180/220 equipment slots, 26 text size and 46 mobile title line box;
600 weight, 2.5 featured outline and small result radii. Result tokens are input
line `#bfc4d4`, invalid line `#db2626` and text `#b21a1f`, success text `#087342`,
unavailable fill `#fff2db` and text `#995205`, selected fill `#f0f2ff`, plus form
16/20 and dialog 12/40 ink shadows. Page styles use tokens exclusively and are
scoped to `.cp-internet` or its portal dialog.

`lookupInternetAvailability` in `src/lib/internet-availability.ts` is the single
server-only lookup seam, called by a typed stub server action. Fixtures are
`V3T 1Z2` available and `T0L 1A0` unavailable; malformed Canadian postal codes
show the source invalid state. Other valid codes show an unconfigured-preview
error, never an invented coverage verdict. Optional dates are validated as
calendar dates without inventing booking policy. A transport failure has its own
retry message. Inputs survive errors and closing; pending submission is disabled
and closing a pending lookup does not reopen the dialog. Native radios select
the returned speed. No network lookup, persistence, lead, order or booking occurs.

Speed-finder rules are UI demonstrations: one person plus browsing → 150 Mbps;
four or more plus gaming → 1.5 Gbps; four or more or gaming → 1 Gbps;
otherwise → 500 Mbps. Adding TV displays a future-service note. Continuing,
waitlist, TV and advisor actions open local preview messages. This is a noindex
Phase B design preview; source prices, testimonials, dates and service claims
still need approval and real backend integration.

Four closed FAQ answers are absent from the source and explicitly await approved
copy. The two supplied answers start open and expand independently. Original
image slots remain placeholders. Accessible dialog close controls and explicit
mock notices are intentional additions to the source. Corrected card colours,
equipment icon sizes/radii and timeline spacing match the inspected frames;
small browser font-wrap and dashed-border rounding differences remain. The
existing Google Sans Flex fallback-metrics build warning remains. Current Next
App Router and server-action guides were available in this installed package.

No new shared React component. Existing PlanCard gained optional unit and
internet presentation, and FaqAccordion gained optional multiple initial open
IDs; their previous defaults remain. Static sections remain server components,
with page-only client widgets for forms, recommendations, navigation and dialogs.

## Mobile Plans — 12 October 2026

`/mobile-plans` uses an isolated `(mobile-plans)` layout. Full design context and
screenshots were read for desktop `106:65`, mobile `214:2`, and mobile filter
sheet `367:2760`. Source SVG exports are local under `public/design/mobile-plans`;
desktop/mobile duplicates share exact verified hashes and native dimensions.
[Screenshots and verification](../../docs/EVIDENCE/mobile-plans/README.md) cover
both page sizes and the bottom sheet.

The page reuses the foundation palette, Google Sans Flex, 1200 container, type
scale, radii, buttons, chips, plan cards, native FAQ, reviews and chrome. Additive
central tokens cover the 420 carrier stack/final image, 103 mobile carrier card,
168/180/260/300/340 image slots, 260×150 tip image, 380 FAQ intro, 600 answer,
480 preview dialog, 21/25/28 line boxes, 600 weight, 2.5 featured border,
44×26 switch dimensions, 0.06 tag tracking and native avatar/scrim colours.
All page styles use central tokens and are scoped to `.cp-mobile-plans` or
page-specific portals. Regular shared component defaults remain intact.

Typed fixtures and labels live in `content/mobile-plans.ts`. The four source
plans are Chatr prepaid 20 GB/$29, Fido prepaid 60 GB/$45, Rogers postpaid
100 GB/$55 and 150 GB/$75. All are explicitly `previewOnly`; current offers,
claims and reviews still need approval before launch. Selecting a plan opens
its local preview without entering checkout or creating an order/contact request.

One provider owns filter state shared by the desktop bar, mobile sheet and active
chips. Sheet edits apply immediately; Show closes the sheet and its count is
derived from matching plans. Clear all restores All/Any/Any/BYOD defaults while
preserving the selected sort. The pure `filterMobilePlans` function combines
brand, pay, data and phone support with AND, using plan metadata. Data bands are
under 20, 20–60 inclusive, and greater than 60, avoiding overlap at the ambiguous
“60 GB+” label. Under 20 has no current fixture and shows an actionable empty
state. All four fixtures support BYOD, so toggling it off legitimately retains
four results. No financing offer was invented to make that count change.

Default source order is retained on desktop and the featured Fido card is
promoted on mobile, matching the two references. Explicit price/data sorts use
numeric fixture fields. Brand and no-credit-check explore links set matching
filters; comparison links scroll to the table. Unlimited, student, senior and
SIM-type tags are absent from source data and open an explanatory preview rather
than invent eligibility. Six closed FAQ answers await approved copy.

Visual corrections include mobile amount/allowance rows, sheet geometry and
scrim, carrier colours, responsive card sizing, mobile step headers, photo slots
and final CTA ordering. Accessibility adaptations: mobile yellow price uses
20 instead of 18 type, and the final blue image slot uses a subtle darker fill
so white small text meets contrast. Minor font wrapping and browser dashed-border
rounding differ from Figma. Original photo slots remain placeholders. The known
Google Sans Flex fallback-metrics build warning remains. No new shared component;
PlanCard gained an optional pay-type/mobile presentation and ReviewCard gained
an optional photo-avatar tone. Other page implementations were not edited.

## Global plan finder — 12 October 2026

The note at `285:8` was read first: this is a global modal opened from the shared
Nav, with Step 0 branching to A (already in Canada) or B (newcomer/traveling),
then converging on results. Full desktop and mobile context was read for
`291:3/62/109`, `292:3/91/145`, `293:3/73`, and
`305:2/64/114/201/292/349/419/492`. All source screenshots and rendered states
are in [finder evidence](../../docs/EVIDENCE/plan-finder/README.md).

The root layout owns one PlanFinderProvider; the modal is loaded when opened.
Both desktop Nav and the mobile menu launch it. The existing integrated
storefront header also gets a trigger; its order/track implementations remain
untouched. Page-specific contact controls retain their own behavior. Closing
returns focus to the desktop trigger or mobile menu button; reopening starts a
fresh flow. No answer, personal data or commercial payload is persisted.

`content/plan-finder.ts` contains all copy, typed options, defaults, transitions,
paths, progress labels/fills and fixture presentation. A has need → province →
current provider → priority; B has arrival type → length of stay. The pure flow
helper follows typed edges, tracks visited questions for Back, and preserves
answers until an earlier choice changes. A changed answer clears all dependent
answers; Edit returns to Step 0 without clearing unchanged choices. Result chips
come only from the current branch. Figma's preselected examples are initial
defaults, including newcomer, student, long stay and value preferences.

Source B results use the Rogers 100 GB/$40 and Fido 75 GB/$35 preview fixtures.
A reuses the existing typed mobile/internet fixtures with explicit price/value/
speed demonstration rankings. Province, current carrier, audience and stay
eligibility have no approved matrix, so they do not imply live eligibility.
The internet selection follows the supplied four-step A path because no separate
internet question branch was specified. Results visibly disclose preview status.
Plan details, plan selection and advisor actions stay inside nonmutating preview
views; See all plans navigates to the appropriate existing listing.

Central tokens add 680/760 modal widths, 788 mobile scroll limit, 52 option icon
wrapper, 179/203 need tiles, 194 priority cards, 50 actions, measured compact row
padding, 600 weight, source neutral/carrier colours, 24/64 shadow and 0.6 scrim.
The 768 breakpoint makes the modal centered on larger screens and a bottom sheet
on smaller screens. Mobile content scrolls internally while controls remain
reachable. Every SVG retains its exact root size; smaller mobile option/result
icons use their own exports rather than resizing desktop assets.

Visual fixes include inherited dialog translation, exact icon slots, desktop
inline badges, mobile source line breaks, compact row geometry, persistent
controls and native radio focus. Darker green badge text and dark text on the
orange Freedom badge are intentional AA contrast adaptations. The result preview
notice adds height to the source. The real underlying page shows through the
scrim; Figma's sample backdrop is not an implementation asset. Minor browser
line-box and dashed-border rounding remains. The existing Google Sans Flex
fallback-metrics build warning remains.

## Pre-arrival order — `/order/pre-arrival`

Sources: step 1 `116:3` / `302:2`, errors `369:2884` / `369:2734`, expanded
mobile plan summary `369:3022`, step 2 `117:2` / `302:104`, confirmation
`120:2` / `302:327`. All desktop/mobile contexts and source screenshots were
read before implementation. The route group isolates its compositions and
reuses the existing checkout stylesheet and shared design primitives.

The user's requested react-hook-form stack adds pinned `react-hook-form@7.90.0`
and `@hookform/resolvers@5.4.3`, with the existing Zod dependency. One useForm
instance owns both steps; the shared Zod schema drives client validation and
the typed stub server action. Step 1 validates only its own fields. Step 2
requires matching confirmation email, both preview document selections and
separate contact/terms consents. Pending submission disables the form; errors,
retry and back navigation retain values and move focus appropriately.

The plan picker now links to this route with only known plan/audience IDs.
The original landing-page label, Continue to step 2, remains source copy; the
checkout has its own two-step progress. Query handoff is consumed and removed
after hydration. Changing plan/audience preserves entered details, and all
displayed pricing derives from the existing typed preview plan registry.

Refresh recovery uses a bounded, versioned sessionStorage draft plus browser
IndexedDB File blobs keyed by an opaque tab identifier. No expiry silently
drops a refreshable draft. Clear saved draft deletes the current tab's file
record and resets entered values. Closing the tab ends its text session;
unreachable file records can remain on this device until browser site data is
cleared. Storage failures are reported visibly. This browser preview cache is
separate from real backend lead persistence and grants. No personal data goes
into URLs, logs or analytics; the route mounts no analytics. File contents
never cross the server-action boundary, which returns only preview status or
generic field errors and performs no order, upload, email or message operation.

Source document and city options are illustrative: real carrier requirements
remain per-offer and backend-authoritative. Validation accepts international
country-coded numbers, a past birth date and arrival today or later, without
inventing a minimum age. The privacy note accurately describes local preview
storage instead of an encrypted upload. The confirmation composition preserves
the source geometry but uses Preview ready and hypothetical next steps, without
an invented order reference or send claim. Advisor/address links use existing
local pages; Back to my details restores the form.

Central additions include the secure-ID fill/stroke, error fill/stroke/text,
21 error line box, 150/116 image-slot heights, 300 desktop image width,
900/760 confirmation text widths, 45/72 success glyph sizes, offset success
shadow and measured confirmation line boxes. Existing spacing, colours, type,
container widths and radii provide the rest. All static SVGs retain source
hashes and intrinsic dimensions; byte-identical logo/duplicate exports are
reused or deduplicated. The expanded state uses its own exported chevron-up
and source phone variant. Every image decodes before screenshots.

New shared components: **none**. FormField adds optional errorIcon and
errorBeforeHint support, preserving its existing default order and accessible
control associations. Only the picker continuation changes on an existing
page; integrated `/order` and `/track` behavior and the home-internet form stay
intact. Verification is in `docs/EVIDENCE/pre-arrival-order` and the route's
browser script. Forms, errors, expanded summary and confirmation section
geometry match at 390/1440. A clear-draft toolbar is added below the source
canvas. Remaining differences are native controls and minor font/dashed-stroke
rendering; existing font fallback-metrics build warning remains.

New shared app components: PlanFinderProvider, PlanFinderModal and
PlanFinderTrigger, plus the usePlanFinder hook. Existing shadcn Dialog, Button and
CpAsset/CpButton are reused; no shared package primitive was added.

## Contact — `/contact`

Sources: desktop `122:3`, mobile `220:70`, with additional form contexts
`122:89` / `220:142`. The page composes the existing utility bar, navigation,
promo strip, footer, CpButton/CpAsset/CpImageSlot, SkipLink, FormField, Input,
Textarea, Select and Dialog. It leaves other page implementations intact.

- Mobile uses the source's legacy page colour, 20 gutters, 48 display type,
  30 section headings, stacked options and full-width buttons. Desktop uses
  white, the existing 1200 container, 96 display type, three options, and
  740/440 columns with a 20 gap. Columns switch at 1024; full chrome at 1280.
- Added central tokens: option minimum height 267, side column 440, office
  image height 200, textarea height 140, mobile hero copy width 340, line boxes
  18/25/26/46/91, fluid desktop display type and the inverse help-divider colour.
  Existing colour, radius, spacing, font and button tokens are reused.
- Contact-only overrides match source chrome and text line boxes without
  changing shared defaults. Inset borders preserve the source's fractional 1.5
  outline and layout at browser device scale one. The office photo remains the
  exact designed Image slot. Every SVG keeps its intrinsic dimensions; shared
  substitutes were verified byte-identical against the downloaded exports.
- Message and tracking forms validate locally and submit to a typed stub
  server action, which revalidates and returns only a preview marker. Neither
  form stores data, sends a message, performs a lookup, or uses the integrated
  `/track` service. Drafts survive errors and successful previews; pending
  controls prevent duplicate submission. Personal inputs never enter URLs.
- The design's phone, email, address, opening hours and reply-time copy remain
  unapproved fixtures. WhatsApp, calling and directions display an honest
  preview dialog. Email focuses the message form. The global Nav finder works.
- Topic options are a reversible UI proposal because Figma shows the dropdown
  closed. Install-date, document and call-verification shortcuts preselect
  topics and focus the message field; SIM tracking targets this page's tracking
  form. eSIM help and All FAQs use the existing preview FAQ destinations.

Evidence and reproducible browser checks are in `docs/EVIDENCE/contact` and
`scripts/verify-contact.mjs`. Main section geometry matches both source frames;
the desktop canvas is 2629 high and mobile 4775 high. Google Sans Flex is loaded
through the existing next/font setup. Minor glyph-width and dashed-border
rasterization differences remain between Figma and the browser; no font
distortion was introduced to hide them. The existing fallback-metrics build
warning remains. Real contact integration, approved contact details, the office
photo and final topic/help destinations remain follow-up work.

New shared components: **none**. All new React compositions are private to the
contact page; the shared token file receives additive contact tokens only.

## FAQ help center — `/faq`

Sources: desktop `189:37`, mobile `218:2`, plus general/eligibility contexts
`190:218` and `218:25`. No other page implementation was changed. The route
reuses the shared chrome/footer, native CpFaqAccordion, CpSectionHeading,
CpImageSlot, CpLinkPill/CpButton, Input and SkipLink. Its headings, image slots,
footer and JSON-LD are rendered on the server; client state handles local search,
topic navigation and the Nav menu.

- Source questions are grouped as 7 general/eligibility, 6 plans/SIM and 6
  order/billing questions. The first supplied answer in each group starts open.
  Native disclosure semantics provide keyboard toggling, with one open item per
  group. Every question and answer uses typed `/content/faq.ts` data.
- The search checks question text, supplied answer text and typed search aliases.
  The source example “no credit check” resolves to the credit-history question.
  Search is local, never enters a URL and creates no submission. Counts, clear
  and empty states are accessible. Topic links clear a search, jump to their
  group and focus it. The global Nav plan finder remains available.
- Shared foundation additions: 380 sidebar, 600 search width, mobile search
  height 63, mobile copy width 340, image heights 200 mobile / 240 desktop,
  mobile question line box 23, fluid display type, chip border `#d6dbe8` and
  search placeholder colour `#5c6069`. Existing spacing/radii/colour/type tokens
  and the previously measured 18/26/46/91 line boxes are reused. Columns switch
  at 1024 and full chrome at 1280. Scoped overrides retain shared defaults.
- The desktop heading remains on the source's single line at 1440. The complete
  desktop and mobile canvases are 4088 / 5421 high. All main section geometry
  matches the source; minor Google Sans Flex glyph and dashed-border rendering
  differences remain. The existing next/font fallback-metrics warning remains.
- Shared SVG substitutes were checked byte-identical against the exported
  assets, and every intrinsic size is verified. Only the FAQ search and mobile
  phone exports need new local files. Designed Image slots remain placeholders.

The frames supply **three** answers. Their other **16** closed questions have no
answer copy in Figma or the existing content collection, so expanding them shows
an explicit pending-copy notice. New eligibility, charging, cancellation and
refund policies were not authored. Source business claims and advisor details
remain design-preview copy. Advisor actions route to `/contact`; Browse all plans
routes to the existing mobility preview. Tracking uses the existing `/track`
destination, without creating a lookup or verification request on this page.

FAQPage JSON-LD follows [the schema.org FAQPage type](https://schema.org/FAQPage):
`mainEntity` Question objects with acceptedAnswer Answer objects. It is derived
from the **same complete source answers displayed in the accordion**; pending
notices and blank content are excluded. The server emits one native
`application/ld+json` script and escapes `<` as `\u003c` following the installed
Next.js JSON-LD guide. Browser checks compare server HTML, parsed schema and
expandable answer text. Client searches leave that schema unchanged. The route
keeps design-preview noindex metadata.

Evidence and verification are in `docs/EVIDENCE/faq` and `scripts/verify-faq.mjs`.
Checks cover keyboard search/topic/disclosure behavior, empty/clear states,
schema parity, script escaping, intrinsic asset geometry, AA contrast and
document overflow at 320/390/768/1024/1280/1440. Remaining content work is the 16
answer bodies and the future photos. New shared components: **none**. All new
React compositions are private to this page; only the central token file has
shared additions.

## About — `/about`

Sources: desktop `188:2`, mobile `216:2`, with the story contexts `188:180`
and `216:22`. Reuses shared UtilityBar, Navigation, PromoStrip, Footer,
CpSectionHeading, CpImageSlot, CpAsset, CpButton, Card and SkipLink. The page
renders on the server; its private navigation wrapper manages the menu and
existing global plan finder. New shared components: **none**.

- Typed `content/about.ts` contains every heading, caption, benefit, stat and
  destination. Source business claims, hours, address and contact details are
  marked design-preview fixtures. They need approval before production use.
- The mobile story is copy, image, then stats. CSS grid presents the same DOM
  with copy/stats beside the image on desktop. Benefit cards switch from rows
  to four columns, using the exported intrinsic 24×24 icons in 44/48 circles.
- Central token additions cover 40 mobile display size / 38 line box, fluid
  desktop display, 220/420 team-image heights, 660 story-copy width and its
  660:460 column ratio, 340 mobile copy width, 700 dealer disclaimer width,
  33/23 line boxes, dealer ink `#101216`, and secondary `#5c6069` via an existing
  colour token. Existing spacing, radii, type and 91 desktop line tokens are
  reused. Columns switch at 1024; shared desktop chrome at 1280.
- Mobile inherits the source's warm page background; benefits and final CTA
  are white. Desktop is white except the story and dealer sections. Hero lines
  preserve the desktop reference breaks and wrap naturally on mobile.
- Team and advisor image slots remain the explicitly designed placeholders.
  Four benefit exports and the mobile phone export are new local assets;
  byte-identical chrome/image icons reuse existing files. Asset hashes,
  intrinsic dimensions and rendered wrapper dimensions are checked.
- See plans opens `/mobile-plans`; Talk to an advisor opens
  `/contact#message-us`; the mobile contact control opens contact options.
  Navigation Find my plan opens the existing global modal. No submission,
  order, lookup or external message is initiated by this page.

Evidence is in `docs/EVIDENCE/about` and `scripts/verify-about.mjs`. The complete
canvases are 390×3976 and 1440×3615. All major section positions and heights
match the frames; minor Google Sans Flex glyph-width and native dashed-border
differences remain. Keyboard skip/menu/finder, CTA navigation, WCAG AA and no
document overflow at 320/390/768/1024/1280/1440 are verified. The existing
next/font fallback-metrics warning remains.

## Guide article — `/guides/[slug]`

Sources: desktop `133:2`, mobile `247:39`, article body `134:2` / `248:25`,
quick answer `248:26`, and eSIM paragraph `249:60`. Only this route was built;
the Guides index and other pages were not changed. The supplied article is
`/guides/best-sim-for-students-from-india`. Unknown slugs return 404.

The server renderer uses the typed `ArticleBlock` union in `content/guides.ts`
for headings, paragraphs, checklists, comparisons, device instructions, order
steps, callouts and FAQs. New dependencies: none. The content registry and
renderer can accept another supplied article without creating JSX copy. All
prices, commercial claims, dates and people remain `previewOnly` design data,
and the page keeps noindex metadata. This does not connect a live CMS or an
offer/order API.

- Desktop uses sticky 220 contents / 640 article / 260 plan-and-share columns
  with 40 gaps. Mobile moves the plan card and 196 hero image after the quick
  answer, followed by a collapsed contents control. The desktop header image
  is 1200×440. Existing CpBreadcrumb, CpImageSlot, CpAsset, CpFaqAccordion,
  CpButton, Card, shared chrome and global plan finder are reused.
- Contents anchors focus their target; the desktop list tracks visible
  headings. Native exclusive FAQs start with the supplied bank answer open.
  The other five answers are absent from both frames, so they show the same
  explicit pending-copy notice used on the FAQ preview. New bank, SIN,
  payment or device policies were not authored.
- Helpful Yes/No choices are local UI state. Copy link copies the current
  article URL without its fragment and reports success/failure. WhatsApp is
  a user-operated share intent; verification does not open or send it.
  Student plan actions route to `/pre-arrival-sim#plans`, advisor actions to
  `/contact#message-us`.
- Related titles and summaries are supplied, but their article bodies are not.
  Until those guides are built, cards link to this article's device section,
  the existing eligibility FAQ, and pre-arrival page. Breadcrumb/Nav Guides
  links jump to Keep reading; a Guides index was not invented.
- Central additions cover 960 title / 760 intro widths, 220 contents / 260
  aside widths, 440/196 hero heights, 180/170 device image heights, 160 desktop
  related image height and 104 mobile image size, 28/76/25 line boxes,
  comparison border `#e0e4ef`, popular mobile background `#eff3ff`, and 3
  contents active border / quick-answer radius. Existing type, spacing,
  colours, radii and measured line boxes are reused. Desktop columns start
  at 1280; narrower layouts remain stacked and fluid.
- Source mobile soft line breaks are represented in typed content for the
  quick answer and device paragraph, then flow naturally at wider widths.
  Desktop table cells preserve the source's best-for line breaks. The inset
  tip stroke preserves its 1.5 border geometry without browser rounding.
- AA fixes: the popular-row in-store price uses existing muted ink instead
  of slot grey, and the final small note uses white instead of 85% white.
  Both source colours were narrowly below 4.5:1 on their backgrounds.

Article JSON-LD follows [schema.org Article](https://schema.org/Article), using
the same visible headline, description, category, author, reviewer and modified
date. Canonical and schema URLs derive from `siteBaseUrl()`. No publication date
or real article image was supplied, so those fields are omitted. The server
renders a native schema script with `<` escaped as `\u003c`, following the
installed Next.js guide. Unit tests cover lookup/unknown slugs, contents targets,
metadata parity and script escaping; browser checks compare canonical/schema
and source dates.

Screenshots and measurements are in `docs/EVIDENCE/guides`, with
`scripts/verify-guides.mjs`. Complete canvases are 390×7661 and 1440×5781. All
major section positions and heights match. Minor font glyph-width and dashed
stroke rendering differences remain; the six designed image slots are still
placeholders. Exported author/reviewer, phone and contents icons retain source
hashes and intrinsic geometry. Shared chrome/image assets were byte-identical.
New shared components: **none**; the server renderer and client interactions
are private guide compositions. Only the central token stylesheet has shared
additions.

## Guides index — `/guides`

Sources: desktop `121:3`, mobile `219:2`, with focused hero `121:33`, list
`121:52` / `219:37`, and question card `220:5` contexts. Only the index was
built. The existing article template and other page implementations remain
unchanged. The new `(guides-index)` route group isolates its styles.

The list comes from typed `guideList` data in `/content/guides.ts`. It contains
the featured first-week guide, the six supplied index cards, and the previously
supplied eSIM compatibility summary from the article's related reading. All
records are marked `previewOnly`. The published-body registry remains separate:
only the India student article has supplied body copy. Other summaries route
to corresponding existing article sections, FAQ or plan/help previews until
their full guide bodies are provided; no content or dead article routes were
invented.

- Initial view shows one feature and six cards. Show more reveals the remaining
  supplied eSIM summary, then disappears and focuses its new card. Repeated
  page sizes derive from typed index copy, not JSX constants.
- Search applies on the Search button or Enter; topics preserve an applied
  search. Matching is case-insensitive, checks title/category/caption/keywords,
  and combines words with the selected topic. No-results copy, Clear filters,
  result announcements, keyboard filtering and focus return are implemented.
  These controls perform local filtering and submit no form or backend request.
- The feature is server-rendered and passed into the list's client boundary.
  Static questions, final CTA and chrome/footer remain server compositions.
  The final Find my plan button opens the existing global modal and restores
  trigger focus when closed. The advisor CTA uses `/contact#message-us`.
- Reused CpImageSlot, CpButton, CpChip, Input, SkipLink and shared chrome/footer.
  All visible copy, image captions, destinations and filter labels are typed
  content. New shared components: **none**.
- Central additions: 920 hero-title width, 640 search/intro width, 560 desktop
  feature image width, 386 desktop card width, 200 mobile feature image height
  and 180 desktop card image height. Existing 104 mobile thumbnails, display
  type, measured line boxes, spacing, colours, radii and strokes are reused.
  Cards and questions use two columns at 768; full desktop chrome/layout at 1280. Narrow screens have no horizontal document scroll.
- The mobile page background is warm, with snow hero, wash questions and white
  final CTA. The source question layout uses 16 after its heading and 12 between
  mobile rows, with 20 vertical card padding. Desktop uses 20/16 gaps. The
  mobile Show more label aligns left as designed. Inset strokes preserve the
  source's 1.5 card/search border geometry without rounding their box sizes.
- The source CTA's small 85%-white text narrowly misses AA on blue, so it uses
  the existing white token. Source business/pricing claims remain preview copy.
- Exported featured/image/chrome icons are byte-identical to existing assets;
  only the index's mobile phone export needs a new local file. All intrinsic
  and rendered dimensions, source hashes and image-slot typography are checked.

Evidence is in `docs/EVIDENCE/guides-index` and
`scripts/verify-guides-index.mjs`. Complete canvases are 390×4688 and 1440×3558;
all major section positions, heights and image-slot sizes match. Remaining
visual differences are minor font glyph widths and native dashed strokes.
Photos remain designed placeholders; the full bodies behind the other guide
summaries remain pending. Checks cover search/category combinations, Show more
focus, empty/clear, article navigation, final global finder/advisor actions,
keyboard use, WCAG AA, source asset geometry and overflow at six widths.

## Home internet order — `/order/home-internet`

Sources: desktop `119:2`, mobile `302:207`, focused form `119:22` and mobile
field `302:221`. The isolated `(internet-order)` route uses the existing React
form stack, FormField/Input/CpButton and typed client validation with a stub
server action. Copy is in `/content/internet-order.ts`; the plan derives from
the existing `preview-internet-500` record. No backend order, payment,
installation booking, reference, email or message is created.

The desktop form and summary are 768/400 wide with a 32 gap inside the existing
1200 container. Mobile uses the 350 container, 20 horizontal form padding,
24 vertical padding, stacked fields, an expandable summary and a recap before
submission. The column breakpoint is 1024. Central token additions cover the
77 header, 59 controls, 400 sidebar, 26/29 mobile title, summary border,
footnote/divider colours and viewport height. Existing colours, type, spacing,
radii and borders supply the rest. No page-local numeric lengths or colours
are introduced. The logo reuses a byte-identical shared export; lock, phone
and chevron retain intrinsic 16/18/20 dimensions.

Form values remain in component memory. Validation focuses the first invalid
field and associates messages with controls; pending/retry states prevent
duplicate submission and retain input. The server stub revalidates unknown
input and returns no personal data. Birth date must be a valid past calendar
date, installation date today or later. No minimum age, eligibility or
three-day availability policy is invented. Province options include all
Canadian provinces/territories, defaulting to the source BC selection; this
does not assert coverage. Source commercial/contact claims remain fixtures.
Contact consent starts checked as designed; both consents are required.

New shared component: **OrderConfirmation**. The existing `/order` confirmation
was an inline step, not a standalone page. Its presentation now lives in the
shared component with saved, missing-reference and preview variants. Existing
live order actions and the server-reference guard are preserved. The new route
reuses the preview variant, explicitly stating that nothing was created or
sent, and supports returning to the retained form. FormField label/hint types
now accept ReactNode to reuse its accessible stack for optional text and the
exported privacy icon. No analytics is mounted on this form route.

Evidence is in `docs/EVIDENCE/internet-order`. Initial full canvases match
390×2607 and 1440×1629; form, summary and recap geometry matches both sources.
Browser checks cover invalid submission, keyboard summary expansion, separate
consent, server-action failure/retry, confirmation and back navigation, WCAG AA,
assets, runtime errors and overflow at six widths. Unit checks cover validation
and all shared confirmation variants. Remaining visual differences are native
select/checkbox rendering and minor font glyph widths; the existing font
fallback-metrics build warning remains.

## Track order — `/track-order`

Read the pattern note `246:293` before the source pairs: lookup `126:2` / `220:233`,
eSIM sent `127:2` / `237:2`, action needed `130:2` / `242:40`, request change
`131:335` / `246:33` and sheet `246:295`, not found `308:144` / `308:207`, too many
tries `308:163` / `308:226`, code expired `308:183` / `308:246`. Retrieved all
contexts and screenshots. The note explicitly turns the desktop modal into a
full-screen mobile sheet; the 390 sheet scrolls internally on shorter screens.

The typed registry in `/content/track-order.ts` contains exactly one `previewOnly`
fixture per state. The validated `state` query accepts `lookup`, `esim-sent`,
`action-needed`, `request-change`, `not-found`, `too-many-tries`, `code-expired`;
missing, repeated or unknown values fall back to lookup. A request-change URL
opens the email form over the action-needed result with Arrival expanded on
mobile, as shown in `246:33`. Closing returns to that result. Other inputs and
selected files never enter the URL or persistent storage. Lookup checks only the
synthetic fixture reference/contact and returns a state identifier. No analytics
is mounted here; existing live `/track` is unchanged.

Reuse: UtilityBar, Navigation, Footer, CpBreadcrumb, CpAsset, CpImageSlot, CpButton,
FormField/Input/Textarea and the Radix Dialog primitives. Four new compositions
remain page-local under `src/components/track-order`. New shared components:
**none**. The only shared change is additive definitions in
`packages/ui/src/styles/canadian-plans.css`. Page styles and portal overlay rules
are scoped to tracking. SVGs reuse byte-identical existing assets where possible;
17 distinct new exports remain in `public/design/track-order`. Evidence stores
source hashes, intrinsic geometry, browser measurements and accessibility results.

Token additions cover lookup/error/intro widths 640/560/620, the lookup shadow,
91 hero line, 56 meaning line, help image 220×140 / mobile 168 high, install image
440×280 / mobile 180 high, advisor width 420, attention image 320×180 / mobile
160 high, upload width 340 / mobile height 191, the 4-offset attention shadow,
progress line, detail headings 57/79, error colours/borders/control heights,
680 modal width, top 180 with a viewport bound, full viewport sheet height,
overlay/shadow, dialog surfaces, textarea heights and exported radio geometry.
Desktop radio widths follow the measured 188/143/90/203/231/170 wraps. Existing
1200/350 containers, type scale, borders and radii supply the remainder. The
page layout switches at 1280; the dialog changes at 768. Source phone-only line
breaks preserve the three-line number update; wider layouts wrap naturally.

All lookups, QR/code resend, file selection/drop and change submissions are
preview-only. Client validation mirrors the stub boundary; failures retain fields
and show a generic retry message. Selected files are validated locally as JPG,
PNG or PDF, up to 10 MiB, without reading or uploading their contents. The change
form validates all six categories, and only the email layout has a supplied
design; other categories reuse its field stack. Calendar dates must be today or
later, not an invented activation/change-window policy. Successful previews say
nothing was changed, uploaded or sent. Source timestamps, rate-limit wait, code
expiry, status, pricing, advisor SLA and contact details remain fixtures rather
than backend assertions.

Ambiguities: the error frames are standalone cards, so they replace the lookup
form within the existing lookup page. No surrounding error-page design was
supplied. The install-guide destination is not specified; it uses the existing
student guide's eSIM section until a dedicated installation article is provided.
Image slots stay placeholders because that is what the sources show. Minor glyph
widths, the mobile textarea placeholder wrap and native textarea resize handle
differ between browser and Figma. Next's existing Google Sans Flex fallback
metrics warning remains; no fallback-font change was made in this task.

Evidence: `docs/EVIDENCE/track-order`. Final source comparison covers 390/1440
canvases for all seven states, modal/sheet and error crops. Lookup cards match
350×504 / 640×484; eSIM canvases match 390×4217 and approximately 1440×2838;
action-needed mobile matches 390×4190. The modal is 680×867 and mobile sheet
390×1089. Error crops match 350×543/546/343 and 560×489/491/325. Browser checks
cover validation, failure/retry retention, fixture lookup, all URL states,
accordions, change form completion/back/Escape/focus return, file validation,
resend feedback, WCAG AA, SVG hashes/aspect ratios and document overflow at
320/390/768/1024/1280/1440.

## Privacy and Terms — `/privacy`, `/terms`

Sources: Privacy `136:3` / `249:194`, Terms `137:2` / `250:96`. Read design note
`136:171` first, then retrieved all four full design contexts, screenshots and
metadata. The note is explicitly not part of the page and is not rendered.

### Review required by the legal note

The note says the legal text is a draft structure, not legal advice. Before launch:

- Have a Canadian lawyer review Privacy for **PIPEDA, BC PIPA and CASL**, and review
  **Terms**.
- Replace every bracketed item with real, approved details. Privacy still contains
  `[legal company name]`, `[X]` days for ID retention, `[X]` years for order-record
  retention, `[Describe actual safeguards.]`, `[List countries/providers.]`,
  `[Name]` for the Privacy Officer, and `[X]` business days for replies.
- Terms still contains `[Legal company name]`, `[Confirm exact rules.]` for changes
  and cancellations, and `[Lawyer to draft liability wording.]`.

No placeholder was filled or interpreted as a business decision. Source dealer,
licence, age/eligibility, pricing, cancellation, location, retention and support
claims are draft wording requiring the same review. In particular, this task does
not add an age gate, retention schedule or cancellation policy to the order flow.
The source cookie-consent claims also need to match actual provider behaviour.

### Content ownership and rendering

Both routes moved from `(storefront)` into an isolated `(legal)` layout for the
new chrome. The existing `getLegalPage`, Sanity projection/parser, LegalBody and
order/lead version handling remain unchanged. A request-scoped React cache avoids
reading the same document separately for metadata and body.

When a published Sanity document is available, its title, body, effective date and
version remain authoritative. Published output contains no Figma short version,
section copy, placeholders or draft SLA. A generic contact box follows the body.
The published path is covered by a render regression check; no CMS document was
written or seeded during this design task.

When no published document is available, typed `previewOnly` structured copy from
`/content/legal.ts` supplies the Figma draft. A visible **Design draft — not
approved legal text** label, **Version 0**, unavailable effective date and
`noindex` metadata preserve the repository's unapproved-legal-content behaviour.
The source's sample version 1.0 and effective date are not treated as an accepted
legal version. The draft indicator deliberately adds 32 to the mobile header and
36 to the desktop header; it is separate from the off-page design note.

### Layout, reuse and interactions

Reuse UtilityBar, Navigation, Footer, CpAsset/CpButton, SkipLink, Radix Dialog and
the existing LegalBody renderer. New app compositions shared by these two routes:
**LegalPage, LegalNavigation, LegalHeaderControls and LegalContents**. No new UI
package primitive was added. Shared file changes are additive tokens/variant in
`packages/ui/src/styles/canadian-plans.css`: 280 TOC width, 76 hero line, 104 jump/
sticky offset, the source `#e2e4ec` TOC border and the 1280 desktop breakpoint.
Other values reuse the central typography, spacing, container and colour tokens.

Mobile has a 350 container, four initial jump links and an expandable contents
list with all 11/13 sections. Native section anchors move keyboard focus to their
headings; selection updates the active link. Desktop uses the 1200 container,
280 sticky contents column, 64 gap and 856 article. Privacy/Terms tabs navigate to
the corresponding route. The initial cookie preview was superseded by the global
consent controls documented below. Header and footer now open the same settings
dialog and save explicit choices. Legal text/provider disclosures still require
the reviews recorded above.

Downloaded every SVG reference and reused exact existing matches. Four distinct
new exports remain in `public/design/legal`: desktop search, mobile phone, jump
arrow and expand chevron. Asset hashes and rendered/intrinsic geometry are
recorded in `docs/EVIDENCE/legal/assets.json` and `verification.json`.

### Verification and remaining differences

Evidence is in `docs/EVIDENCE/legal`. Both routes were captured at 390/1440 and
compared to their source PNGs. Privacy article/body measurements match 3348 mobile
and 2329 desktop; Terms bodies match 3438 mobile and 2425 desktop. Contents is 350×298 on mobile
and 280×442/518 on desktop; summary boxes match 350×358/410 and 856×236/262.
Contact boxes match 350×234 and 856×114/138. Source paragraph breaks are preserved
on mobile and wrap naturally on desktop; minor font glyph-width differences remain. The existing Google Sans Flex
fallback-metrics build warning remains.

Browser verification passes expansion, section-link focus, cookie dialog Escape/
focus restoration, tab navigation, original asset hashes/aspect ratios, WCAG AA,
runtime errors and overflow at 320/390/768/1024/1280/1440. Regression checks verify
that the fallback stays version 0 and published CMS legal text does not acquire
unapproved Figma claims. Site typecheck/lint, 142 tests and production build pass.
All task files pass formatting; the known full-app formatting issues outside these
routes are unchanged.

## System pages and cookie consent — 12 October 2026

Implemented 404 (`306:3` / `306:123`), `/search` (`306:228` / `306:363`),
`/accessibility` (`307:2` / `307:96`), banner (`307:175` / `307:226`) and settings
(`307:189` / `307:240`). Read all ten full desktop/mobile contexts, screenshots
and metadata before coding. Evidence and commands: `docs/EVIDENCE/system/README.md`.

The root `not-found.tsx` composes existing chrome and returns a genuine 404 for
unmatched URLs. Search matches terms against six typed `previewOnly` source
fixtures and filters categories with live counts. A missing query displays the
supplied `student sim card` example. Nav and 404 forms navigate to `/search?q=…`.
Malformed values, email addresses and phone-like sequences are rejected before
form navigation and never echoed as result copy. Loading, validation, empty and
transport-failure states work; retry retains input. The validated server action
is UI only. Links use existing routes/sections instead of inventing guide/city
routes shown only in source crumbs. Live search integration remains future work.

Accessibility uses typed source copy and the advisor image slot. Selected mobile
line breaks preserve Figma wrapping and collapse naturally on desktop. Source
website-wide keyboard/contrast/200% zoom claims, carrier-PDF known issues,
October review date, two-business-day response promise and placeholder contact
details need owner verification and a broader audit before launch. Scoped axe
checks do not certify the whole site. Toggle artwork needs a non-text-contrast
review; photography remains the supplied placeholder.

One root `CookieConsentProvider` owns version-1 choices under
`canadian-plans.cookie-choices.v1`. Analytics and Marketing default off; Essential
is always on and disabled. Accept all, Reject non-essential, Save my choices and
cancellation work independently. Draft toggles grant no permission before saving.
Invalid/missing/obsolete records fail closed. When storage is blocked, an explicit
choice lasts only for the visit and the UI announces this. Refresh and cross-tab
changes synchronize; Escape restores focus. Both design and original storefront
footers reopen settings. The legal header now uses this dialog, superseding its
earlier preview notice and the consent-integration caveat above.

The existing Umami mounting scope is preserved. Its loader requires analytics
consent, and pageview/plan-selection calls check live consent so withdrawal also
blocks an already-loaded tracker. Existing no-query, no-hash, no-auto-tracking and
Do Not Track attributes remain. Marketing choices are saved for future use;
Google/Meta integrations are Phase B and no scripts were installed. Review source
marketing/disclosure copy against providers actually deployed before launch.
Storage contains only a version and two booleans, with no order/contact data.

Central token additions: system line #e0e5ed, body #384054, breadcrumb #0d804d,
inverse #d1d9f2; results 860, quick links 1016 (two 500 cards plus 16), signal 128,
advisor width 280/mobile height 170; cookie dialog 640, viewport max-height 100dvh,
overlay ink at 60%, banner shadow 0/-4/40 with ink at 20%; measured 19/23/21/35/43/70
line boxes. All numeric definitions live in `packages/ui/src/styles/canadian-plans.css`.
Page CSS uses tokens. Dialog changes at 48rem; banner row and desktop pages use
80rem to retain usable controls at intermediate widths.

New shared components: `CookieConsentProvider`, `CookieSettingsTrigger`,
`SiteSearchForm`. Compositions reused within these pages: `SystemShell`,
`SystemNavigation`, `SystemLinkCard`. `SearchResults` is page-local. Existing
Dialog, CpButton, CpAsset, CpImageSlot, UtilityBar, Navigation and Footer are reused.
Necessary shared changes: root provider; footer settings/accessibility link;
Nav search (component lab retains preview); legal cookie header; analytics gate.
Other page implementations and backend flows remain unchanged.

Verification: 390/1440 screenshots compared against Figma, exact SVG hashes and
aspect ratios, 320/768/1024 overflow, desktop 200% zoom equivalent, keyboard
skip/dialog focus, zero scoped axe A/AA violations, failure/retry and cross-tab
consent. A browser fixture exercises configured analytics opt-in/withdrawal
without contacting a provider. Minor font glyph widths and dashed-border rendering
remain, as does the existing Google Sans Flex fallback-metrics build warning.
Owner/design accessibility and disclosure review remain required before launch.

## Transactional emails — 13 October 2026

Read full contexts, metadata and screenshots for Order received `309:3`, eSIM
ready `309:53` and Install booked `309:102`. Added React Email 6.11.1 templates
under `src/emails`, with a 600-wide body, presentation-table layout and inline
styles. Existing web UI components rely on Tailwind/custom properties and do not
provide email-safe tables; email compositions reuse the source tokens and exact
32×32 image-slot export instead. The 28×28 blue header rectangle is the source
mark, not the website's star mark.

All copy and fictional `previewOnly` fixtures are typed in `content/emails.ts`.
Each template requires its own typed customer/order fields and action URL, with
no sample defaults. `renderTransactionalEmail` validates the discriminated
message, returns subject/preheader/HTML/plain text and escapes HTML-like values.
Invalid inputs, header control characters and unsafe URLs produce generic errors
without echoing personal data. Asset origins are explicit; action links contain
no fixture customer/order identifiers. Rendering adds no provider calls, logging,
tracking pixels or backend order transitions. Delivery remains the existing
backend outbox/EmailAdapter responsibility.

Email-specific central tokens cover body/frame widths 600/680, image height 170,
title/body line boxes 38/27, mark radius 8 and the Google Sans Flex font stack and
source variation axes. Other colors/type/spacing/radii reuse existing tokens.
`pnpm emails:tokens` compiles these into `tokens.generated.ts` so delivered HTML
contains literal pixel/colors and no CSS custom properties. The verifier checks
all generated values against the central stylesheet. Email-compatible legacy
rgba syntax is derived from the existing border token; gradient-free clients get
the source's solid light background fallback.

`/dev/emails?template=order-received|esim-ready|install-booked` displays sandboxed
previews plus exported HTML/plain text. Subject/preheader inbox labels appear
only in the preview; actual HTML uses React Email's hidden preheader. Google Sans
Flex font-face CSS is injected only into the browser preview from the existing
Next font stylesheet; exported HTML retains its inline font declarations and
Arial/sans-serif fallback. The route is noindex and follows the component lab's
development/Vercel-preview guard. It is not published as a production page.

New shared email compositions: `EmailFrame`, `EmailSpacer`, `EmailImageSlot`,
`EmailSteps`, `EmailOrderSummary`. `EmailPreviewFrame` is the reusable preview
wrapper. No shared web chrome/page implementations were changed. Package/lockfile
add the current React Email dependency; Vitest enables the automatic JSX runtime
used by Next for meaningful template rendering tests.

Desktop geometry matches all three source frames: body heights 1186/1142/1164,
68 header, 536×170 image slot, step heights 225/218/183, summaries 185/155/185 and
164 footer. Verified 390/1440 previews, 320 overflow, inline/table HTML/plain text,
exact SVG hash/root/rendered dimensions, unknown template handling, personalization
and validation/escaping. Evidence: `docs/EVIDENCE/emails/README.md`.

Source response promises, eSIM activation timing, commercial prices/free install,
24-hour rescheduling policy and contact details need owner review before use.
Photography remains placeholders; approved raster assets and native inbox tests
are required before delivery, since SVG/webfonts/gradients/corners vary by email
client. Browser checks do not claim Gmail/Outlook/Apple Mail parity. Minor font
and dashed-border differences and the existing font-fallback build warning remain.

## Category templates — 13 October 2026

Added Students, From India, Toronto Pearson, Rogers, Rogers vs Fido, Vancouver
and Ontario category previews from their paired desktop/mobile Figma frames.
Page-local compositions reuse the scoped theme and existing primitives; new
shared React components: none. Copy, accessible labels and fixture data remain
typed in `content/category-*.ts`; assets are local with node/geometry evidence.

The parent reviewed agent work against source captures and corrected mobile
hero controls, boarding passes, plan reading order, internet map layers,
coverage card layout, guide content, review avatars and complete footer content.
Footer/search/audience links now reach the new category routes. Internet checkout
summaries derive from an allowlisted selected preview plan instead of always
showing 500 Mbps. The comparison routes do not hand off mismatched price/data
examples to checkout.

All pages are noindex design previews, excluded from sitemap, with no provider
requests or real order creation. Existing live order/tracking behavior remains
intact. See [category review evidence](../../docs/EVIDENCE/category-review/README.md)
for source frames, verification and remaining production content/integration work.

## Design and code review — 13 October 2026

The [review report](../../docs/DESIGN_CODE_REVIEW.md) covers 39 route/state cases,
source verification of the Pearson FAQ, corrected single/multi-open disclosures,
desktop/mobile category checkout handoff, focus restoration, valid navigation
targets and removal of 49 obsolete CSS rules. Address/plan client widgets now
receive only the content they use; production HTML payload measurements and
initial-state visual comparisons are recorded with the review.

Page audits now fail on broken captures, runtime/accessibility/heading/overflow
errors, missing anchor targets, unloaded images and changed asset geometry.
Eleven audit regression tests cover the failure gates. New shared React
components: none; the existing shared FAQ behavior is corrected.

## Rogers fidelity correction — 13 October 2026

The earlier Rogers audit proved route health and interactions but missed substantial
desktop fidelity errors. Re-read both complete source frames (`158:2`, `254:451`),
screenshots and metadata before correcting this page. Restored the full-width
quick-answer panel and its blue rule, five-segment ratings, source heading weights,
plan table sizing and popular row, aligned mobile data/prices, comparison footer,
switch cards, guide/facts typography, review grid, FAQ spacing and final image slot.
Source copy differences were corrected. The breadcrumb now cancels shared primitive
padding locally; the mobile background and neutral hero colors follow the source.
Rogers navigation highlights Mobile Plans. No new shared React components.

Preview fixtures remain noindex and operation-free. Their visible notice moved to
the sources area to preserve the hero geometry. Two deliberate contrast corrections
remain: blue instead of the low-contrast yellow mobile eyebrow, and a 10% white
overlay instead of 14% in the final photo placeholder so white small text meets AA.
Existing shared primitives are composed; changes affect Rogers CSS/content and
Rogers-specific central tokens only. Source and actual captures, geometry assertions,
keyboard/focus behavior, axe and 320/390/768/1024/1440 overflow checks are recorded in
`docs/EVIDENCE/category-rogers/`. Small font rasterization differences remain.

## Electric Blue redesign — 14 October 2026

Source of truth for this redesign is the Claude Design canvas "Canadian Plans — Homepage
Redesign" (Home.dc.html), not Figma; the owner approved this exception to AGENTS.md rule 2.

- Tokens: palette moved to electric blue `#2457ff`, ink `#111827`, mint, amber and navy;
  Archivo replaces Google Sans Flex for the storefront (`--font-archivo`). New tokens are
  grouped under "Electric Blue redesign" and `--cp-rd-*` in `canadian-plans.css`.
- Shared primitives (new): `CpCategoryBanner`, `CpFeatureRow`, `CpBlockHeading`,
  `CpStepTimeline`, `CpFeatureCard`, `CpFeatureGrid`, `CpCtaBand`, `CpSwipeRow`;
  `CpButton` tones `amber | mint | navy | white`; `CpBadge` tones `mint | amber`.
- Home: composition in `src/components/home/redesign/*`, copy in `content/home-redesign.ts`,
  styles in `src/app/(home)/home-redesign.css`, illustrations in `public/design/redesign/`.
  The previous composition was removed with the other backups. `PopularPlans` is retained as the
  pricing section (`#popular-plans`). Footer background is navy site-wide.
- Open: bracketed copy, business pricing, real testimonial quotes/photos, 390/1440
  screenshot verification.

## Electric Blue category template — 14 October 2026

One template (`src/components/category-redesign/template.tsx`) now renders Pre-arrival
(`/pre-arrival-sim`), Home Internet (`/home-internet`), Mobile Plans (`/mobile-plans`) and the
new Business Internet preview (`/business-internet`, noindex, not in the sitemap). Order:
breadcrumb → `CpCategoryBanner` hero (h1, category tone) → quick answer → feature row →
steps / who / cards → the page's own plan block → comparison → FAQ → `CpCtaBand`.

- Owner decisions (14 October): keep the quick answer and comparison table; drop reviews,
  coverage, TV, equipment and who-can-order blocks; hero colours follow the category system
  (amber-soft, ink, blue, navy), not the blue canvas stubs; create `/business-internet`.
- Category copy (banner, feature, steps, cards, CTA) is shared with the homepage explorer via
  `homeRedesign.categories`; page additions live in `content/category-redesign.ts`, business copy
  in `content/business-internet.ts`. Shared redesign CSS moved to `src/app/redesign.css`.
- Plan blocks are unchanged components with their existing preview data and order handoffs:
  `PlanPicker`, `AddressCheckForm` + `SpeedFinder` + `InternetSpeedCards`, `MobilePlanBrowser`.
  The hero action and CTA band point at each page's plan block.
- Business has no plan list (`[PRICE]` open), so its plan slot is a UI-only quote form: client
  validation plus a typed stub server action (`(business-internet)/actions.ts`) that stores and
  sends nothing and reports a preview result. FAQ answers keep bracketed open inputs.
- Shared changes: `CpCategoryBanner` gains `description` and `headingLevel="h1"`; feature-row
  columns size to content when stacked (removed ~130px gap at 390); `--cp-cat-*` tokens added.
  Homepage `#internet` links (dead since the redesign) now go to `/home-internet`; removed-section
  anchors on category navs/promos were repointed. New shared React components: none.
- Open: unused legacy components/content/CSS from the removed sections (cleanup after review);
  `audit-records.mjs` expects a `figmaAssets` key `audit-pages.mjs` never collects, so every
  audited route reports "Incomplete audit results" (pre-existing).
- Owner follow-up (14 October): category banners removed from the homepage explorer; each
  explorer block is now feature row → steps/cards → CTA band. The banner remains the H1 hero on
  the four category pages.
- Owner follow-up (14 October): explorer feature rows now carry the category eyebrow, action and
  price (`CpFeatureRow` gains optional `tone`, `eyebrow`, `action`, `price*`). Eyebrows use the
  category text tones (amber-ink, mint-ink, blue, navy) because mint on white is ~1.8:1; buttons
  are ink / blue / blue / mint so none is white on white.

## Electric Blue re-skin of remaining pages — 14 October 2026

About, Contact, FAQ, Guides, Guides index, order flows, tracking, legal and system pages keep their
layouts and behaviour; only clashes with the new style were changed (page CSS only):

- Legacy beige page backgrounds (`--cp-color-legacy-page`) → white on About, Contact, FAQ, Guides
  index and tracking; About bands/benefit cards and the FAQ search field → grey.
- Decorative tinted blocks → grey: contact option cards, guide checklist and device cards, legal
  summary boxes, order-summary plan cards, pre-arrival eSIM panel.
- Kept on purpose: tracking/order status fills (done, attention, info, problem), the guide tip
  callout (amber-soft), active table-of-contents and popular-row highlights.
- Image placeholder slots are grey (`--cp-color-slot-*`), shared with the transactional emails;
  `pnpm emails:tokens` regenerated and `emails:verify` passes.
- About final CTA gets top spacing on desktop so it no longer sits flush against the grey band.
- `/order` and `/track` behaviour unchanged. Audit: 22 routes × 390/1440, zero problems.

## Electric Blue wrap-up — 14 October 2026

- Homepage hero now defaults to "I'm moving to Canada" (newcomer audience per PLATFORM_CONTEXT);
  the H1 matches the page title again and `scaffold.spec.ts` passes unchanged.
- Removed code left unused by the category template: `EsimArt` + `content/pre-arrival-art.ts`,
  `AdvisorPreview`, `InternetAction`, `MobilePreviewAction`, `ExploreNeeds`, the three per-page
  review arrays, `internetEquipmentAssets`, unreferenced copy sections, and ~400 dead CSS rules in
  `pre-arrival.css`, `home-internet.css`, `mobile-plans.css` and `home.css` (screenshots
  pixel-identical before/after at 390 and 1440).
- Tracking "action needed" card: soft amber card; the ink outline/offset shadow (and its
  `--cp-track-attention-shadow` token) are retired.
- Google Sans Flex now loads only on `/dev/emails` (emails keep it); the storefront loads Archivo only.
- Handoff backups (`*.bak-2026-10-14`, `page.legacy.tsx.bak`, `rd-tokens.merged…`,
  `claude-transfer.tgz`) moved out of the repo.
- Verification: typecheck, lint, 200 unit tests, production build, 36/36 backend-free e2e specs,
  page audit 22 routes × 390/1440 with zero problems, `emails:verify`. Not run here: `order.spec.ts`
  and `a2-launch-gates.spec.ts` (need the Postgres e2e harness).
- Owner change (14 October): the storefront font is **Google Sans Flex** again, not Archivo.
  `--cp-font-family` uses `--font-google-sans-flex` (root layout); Archivo is removed. Emails were
  already Google Sans Flex. Audit re-run: 22 routes × 390/1440 clean, no overflow at 320.

## Page-by-page Electric Blue redesign — 15 October 2026

Owner request: bring every page in line with the home page, rewrite copy for clarity and
SEO without inventing facts. Tracker, decisions and open placeholders:
[docs/REDESIGN_PROGRESS.md](docs/REDESIGN_PROGRESS.md).

- **Landing kit** (`src/components/landing/*`, `src/app/landing.css`, `content/landing/*`):
  banner hero, quick answer, facts strip, steps, checklist, cards, pros/cons, data table,
  guide with key facts, FAQ, related links, CTA band; BreadcrumbList + FAQPage JSON-LD
  (pending answers excluded). Used by the seven SEO pages and /about. The old
  category-sim/rogers/airport-compare/internet route groups, assets and `--cp-cat*` tokens
  are removed.
- **Site chrome**: `SiteHeader` + `siteChrome` / `siteFooter` (`content/site-chrome.ts`)
  replace per-page chrome with real links on every page except the home header.
- **Aligned in place**: contact, FAQ (10 answers filled from existing site copy), guides
  index/article (index lists only real content), track order, order-flow layout, legal and
  system pages: home-style headings, navy instead of ink panels, CTA band.
- New shared React components in `@canadian-plans/ui`: none. New app components:
  `LandingPage`, `InternetLanding`, `SiteHeader`.

## Final homepage design pass — 16 October 2026

Source: the owner's "FINAL · Homepage (building section by section)" Claude Design export
(`Home.dc.html`), compared section by section with the live page at 1440 and 390.

- Owner decisions (16 October): keep Google Sans Flex (the export still uses Archivo); hero
  keeps opening on "I'm moving to Canada"; remove the Popular plans section (`PopularPlans`,
  `#popular-plans`) as in the design; use the design's header and footer on every page with
  real links, leaving out the email sign-up and social icons until there is a backend and real
  accounts.
- Header (all pages): dark utility bar with the dealer line; new `BrandMark` logo (blue mark +
  "canadianplans" wordmark, mint "plans" on navy) also in the checkout headers; nav adds
  Business Internet and reads "Pre-arrival Plans"; search is an icon link to `/search`;
  "Find my plan" is a blue pill. Mobile keeps the menu (the export has none) and hides the
  header finder below 375px so the logo is never clipped; the finder stays in the menu.
- Footer (all pages): Plans / Popular / Help / Company columns, design colours and sizes.
  The Popular column (landing pages) takes the slot of the omitted sign-up form.
- Home: hero plan card sits on the photo, wider copy column; the finder button wraps under
  the fields instead of truncating "A number before I arrive"; picker cards get the grey
  icon well and shadow; display headings 58px, feature titles 52px, testimonials/FAQ 44px;
  explorer heading "Discover everything we offer."; "Who it's for" icons on white tiles;
  FAQ toggle is "+" on grey turning into a dark "×". "Find my plan" links open the plan finder.
- Not built: the hero carousel arrows/dots (the export has no slides behind them) and the
  white "See mobile plans" button (kept blue so it is visible on white, per 14 October).
- Removed: `src/components/home/interactive.tsx` (HomeNavigation, PopularPlans and older
  unused previews) and `homeChrome` / `homeFooter`.
- Verification: typecheck, lint, format, 175 unit tests, production build, full audit
  (28 routes × 320/390/1440: one h1, no overflow, anchors, axe, no errors; 24 internal links).
  `scaffold.spec.ts` now expects the home nav "Mobile Plans" link to open `/mobile-plans`.

## Home page rebuilt to the final export — 16 October 2026

Owner request: the coded home page was narrower than the design; rebuild it as an exact copy
of the final homepage export, as a system rather than hard-coded values. Font stays Google
Sans Flex.

- Cause of the width gap: the export uses content-box sizing, so its hero card and final CTA
  are 1296px wide (1184px content + 56px padding), its header content is 1280px and its sections
  1184px. The old build used one 1200px container everywhere.
- System: a home design token group `--cp-hd-*` in `canadian-plans.css` (layout widths,
  gutters, colour roles, type roles, leading, tracking, radii, shadows, component sizes, flex
  bases) plus the export's breakpoints as variants (`cp-hd-md` 1000px, `cp-hd-sticky` /
  `cp-hd-nav` 900px, `cp-hd-sm` 760px, `cp-hd-xs` 640px). `--cp-hd-leading-normal` (1.27)
  reproduces the export's normal line box instead of Tailwind's 1.5.
- Components: `src/components/home/design/*` (hero with a two-slide carousel synced to the
  audience tabs, picker, service columns with swipe dots, explorer with scroll-spy nav,
  getting connected, stories, FAQ, final CTA), styled only by `src/app/(home)/home-design.css`.
  The previous home components, `home.css` and `home-redesign.css` were removed; category and
  landing pages are unchanged.
- Header and footer (all pages): header content 1280px with 48px gutters; footer as in the
  export (Plans / Help / Company, email sign-up, WhatsApp). The sign-up is a preview: it
  validates and says sign-ups open soon; nothing is stored or sent
  (`src/lib/newsletter-preview.ts`). Only WhatsApp is shown (links to Contact) until real
  social URLs exist; Careers waits for a page. Footer column titles are not headings, so
  "Plans" no longer collides with the `/plans` h1.
- Owner decisions (16 October): hero opens on "I already live in Canada"; carousel has two
  dots (one per audience); newsletter and WhatsApp as above.
- Deliberate differences from the export: mint eyebrows on white use mint-ink (AA); the white
  "See mobile plans" button gets an ink outline so it is visible; picker "See plans →" links
  are full brand blue instead of 75% opacity (AA); the phone header keeps its menu button; the
  desktop nav appears from 1280px (the export's nav overflows below about 1250px).
- Verification: section offsets within a few pixels of the export at 1440 (remaining drift is
  Google Sans Flex wrapping differently from Archivo), full audit 28 routes × 320/390/1440 with
  0 problems, interactions (tabs, carousel, FAQ, how-it-works, sign-up, explorer nav, finder,
  skip link, desktop and mobile nav) checked, 178 unit tests.
