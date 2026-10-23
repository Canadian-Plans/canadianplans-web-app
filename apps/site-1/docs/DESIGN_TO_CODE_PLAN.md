# Canadian Plans — Figma to code plan

Prepared: 12 October 2026. Updated: 13 October 2026. Subsequent authorized tasks
implemented the storefront design previews, supporting screens, transactional
email previews and seven category templates listed in
[category review evidence](../../../docs/EVIDENCE/category-review/README.md). The owner
confirmed **mobility first; internet and TV later** for live integration.
Internet category pages are isolated design previews. Live content, commercial
verification and backend/CMS integration remain separate work; the original
planning scope below is retained as historical planning context.

Goal: visitors can browse Canadian Plans' mobility offers, submit an order and
securely track it through a responsive Sanity-driven storefront whose approved
screens match the desktop and mobile Figma references.

## Decisions and scope

- Website 1's public brand is **Canadian Plans**. Local configuration, the home
  heading and Studio title now use that name. The package, directory, workspace
  slug, credential scopes and environment-variable prefixes stay `site-1`.
- The [owner's Figma file](https://www.figma.com/design/6zUS2WZbQn6NUhyjesA584/Canadian-Plans?node-id=60-2)
  is the visual source. The previous no-Figma choice is superseded for site-1.
- Keep Next.js App Router, strict TypeScript, Tailwind v4, the shared shadcn
  primitives, the Express API and the site's own Sanity project.
- Launch with mobility and the two audiences already recorded in
  [the CMS handoff](CMS.md#sanity-driven-storefront-handoff-27-september-2026): newcomers and Canadians. Internet, TV, address
  availability, installation and bundles remain later milestones. Their Figma
  frames are recorded so they can be implemented later.
- This task prepares the plan and applies the local display name. It does not
  authorize the visual build, production writes, account changes or deployment.
- Domain, billing identity, approved carrier offers, prices, legal content and
  marketing claims remain separate business inputs. Figma examples do not
  answer those inputs.

## What was inspected

The supplied node `60:2` is the **Website** canvas, rather than one screen.
Its metadata includes main pages, desktop/mobile pairs, an order flow, legal
pages, category templates, a plan finder and additional states/email designs.
The home frames `60:3` and `195:2` were retrieved as full design context with
screenshots. Other frames below were inventoried from metadata; retrieve their
full design context and screenshots before implementing them.

Observed visual system:

| Property            | Figma reference                                                             |
| ------------------- | --------------------------------------------------------------------------- |
| Desktop / mobile    | 1440 px / 390 px                                                            |
| Desktop content     | 1200 px with 120 px side margins at the reference width                     |
| Typeface            | Google Sans Flex, regular through extra bold                                |
| Brand blue          | `#3657F2`                                                                   |
| Ink / muted text    | `#101A3D` / `#535B7A`                                                       |
| Yellow accent       | `#FFE14D`                                                                   |
| Supporting surfaces | Sky, mint, blush, pale yellow and white                                     |
| Layout language     | Large typography, rounded section cards, pill buttons, layered hero visuals |

The design includes explicit **image/photo slots**. Preserve them in a design
preview; replace them only with owner-approved images for publication. Do not
invent customer photographs, reviews, dealer status or office details.

The existing code has the storefront shell, placeholder home/catalogue/detail
pages, an order journey with server actions, document-upload components,
email-verified tracking, legal content helpers, Studio and Playwright tests.
The local CMS changes already add brand settings, a reusable link picker,
simple/mega navigation, service/audience filters and extra section types.
Preserve those existing uncommitted changes; extend them only in a later,
scoped implementation task.

## Screen and route map

Node IDs identify design references; proposed content slugs can be edited in
Sanity. Preserve reserved application routes and their existing behavior.

| Screen                                 | Desktop node                                | Mobile node                                 | Code destination / timing                                                              |
| -------------------------------------- | ------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Home                                   | `60:3`                                      | `195:2`                                     | `/`; first visual preview                                                              |
| Pre-arrival SIM                        | `106:3`                                     | `207:2`                                     | CMS `/pre-arrival-sim`; mobility launch                                                |
| Mobile plans                           | `106:65`                                    | `214:2`                                     | CMS `/mobile-plans`, linked to `/plans`; mobility launch                               |
| Plan list / detail                     | Listing sections in the mobility frames     | Matching mobile sections                    | Reserved `/plans`, `/plans/[slug]`; real catalogue integration                         |
| Order details                          | `116:3`                                     | `302:2`                                     | Existing `/order`; adapt the designed presentation                                     |
| Order documents                        | `117:2`                                     | `302:104`                                   | Existing `/order`; preserve per-offer checklist and review                             |
| Confirmation                           | `120:2`                                     | `302:327`                                   | Existing order success state; server-issued reference                                  |
| Tracking lookup                        | `126:2`                                     | `220:233`                                   | Existing `/track` plus required email-code step                                        |
| Tracking result                        | `127:2`, `130:2`                            | `237:2`, `242:40`                           | `/track`; map actual backend states                                                    |
| Request change                         | `131:335`                                   | `246:33`, `246:295`                         | Tracking interaction; verify existing API support before wiring                        |
| Guides / article                       | `121:3`, `133:2`                            | `219:2`, `247:39`                           | CMS `/guides`, `/guides/[slug]`; content templates                                     |
| About / contact / FAQ                  | `188:2`, `122:3`, `189:37`                  | `216:2`, `220:70`, `218:2`                  | CMS `/about`, `/contact`, `/faq`                                                       |
| Privacy / terms                        | `136:3`, `137:2`                            | `249:194`, `250:96`                         | Reserved `/privacy`, `/terms`; approved versioned content                              |
| Student / country / airport templates  | `151:2`, `162:2`, `186:509`                 | `251:2`, `255:2`, `256:988`                 | CMS sections / country pages; only publish distinct approved content                   |
| Comparison template                    | `182:2`                                     | `255:516`                                   | CMS template; only compare approved catalogue facts                                    |
| Plan finder                            | `291:3` through `293:73`                    | `305:2` through `305:492`                   | Global dialog / mobile sheet; mobility filters first                                   |
| 404 / search                           | `306:3`, `306:228`                          | `306:123`, `306:363`                        | `not-found.tsx`, proposed `/search`; supporting interactions                           |
| Accessibility / cookie UI              | `307:2`, `307:175`, `307:189`               | `307:96`, `307:226`, `307:240`              | Supporting pages / controls only where actual policy requires them                     |
| Form / tracking failures               | `369:2884`, `308:144`, `308:163`, `308:183` | `369:2734`, `308:207`, `308:226`, `308:246` | Actual validation, lookup and rate-limit states                                        |
| Home internet / city / province / form | `106:34`, `154:2`, `186:2`, `119:2`         | `212:51`, `252:360`, `256:510`, `302:207`   | Deferred; requires future service contracts and approved offers                        |
| Order / eSIM / install emails          | `309:3`, `309:53`, `309:102`                | Responsive email templates                  | Separate backend/outbox milestone; install and eSIM delivery need supported operations |

## Translation approach

### Components and theme

Use `@canadian-plans/ui` Button, Card, Badge, Input, Select, Dialog, Sheet,
Stepper, FormField, FileDrop, ReviewCard and SkipLink. Add a shared primitive
only when the existing set cannot express an approved interaction.

Define Canadian Plans' semantic token values once in `packages/ui`, scoped to
the storefront wrapper. Keep the admin's existing theme and Studio's independent
layout. Load the actual Google Sans Flex font locally or through the supported
Next.js font mechanism after checking available font files and licensing.
Validated Sanity brand settings can override approved colour/logo values;
content editors do not supply CSS or executable code.

Keep site-specific compositions in `apps/site-1/src/components/`: header,
mobile navigation, footer, hero, plan cards, FAQ, trust sections and the plan
finder. Translate desktop/mobile pairs into responsive Grid/Flex layouts.
Use absolute positioning only for intentional decorative overlays. Intermediate
widths must adapt smoothly, without overflow or a scaled-down desktop page.

Before each screen, inspect full Figma design context, screenshot, tokens,
Code Connect mappings and existing code. Reuse any mapped component at its
mapped node. If a context response is sparse, retrieve its visible children
before coding. Export static SVG/image assets to local files using the Figma
asset instructions; keep a node-to-file manifest and preserve asset dimensions.
Use screenshots only for comparison, never as the implemented page.

### CMS and commercial data

Add a read-only server-side `lib/cms.ts` with validated projections for site
settings, navigation, pages and slugs. Implement the home and CMS catch-all
renderer from the checkpoint, preserving `/order`, `/track`, `/plans`, legal,
Studio and API routes. Connect existing post/country-page models for content
templates rather than duplicating page copy.

Map existing section types to the design: hero, planGrid, faq, testimonials,
cta, imageText, steps, features, logos, stats and richText. Add only the missing
fields/approved variants needed by the first screen, such as a secondary CTA or
specific hero treatment. Keep one shared schema/type source in contracts; make
schema additions backward compatible and test affected consumers.

CMS owns copy, images, links and editorial placement. Backend typed responses
own purchasable offers and commercial facts. A CMS plan grid selects offer
references, then resolves their current commercial values through the backend;
it does not maintain a second price list. Preserve product identifiers when
linking to `/order?plan=<productId>`. Draft CMS previews must not turn draft or
unpublished offers into purchasable plans.

### Adaptations requiring visible review

| Design behavior / content                                                             | Planned mobility implementation                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internet/TV navigation, cards and address checker                                     | Exclude from the launch navigation and purchase journey; retain the future designs in this plan. Review the adapted home layout.                                 |
| Rogers/Fido/Chatr examples, prices, savings, ratings, dealer status and Surrey office | Populate only verified CMS/backend facts. Use clearly labelled TEST content in non-production previews.                                                          |
| Phone/WhatsApp CTAs and consent                                                       | Preserve the project's email channel; use approved contact email. Any new channel needs an explicit business decision and backend work.                          |
| Two-step order presentation                                                           | Reuse the existing Plan → Details → Documents → Review/terms → Confirmation semantics. Group visual steps only if all required checks remain visible and tested. |
| Fixed passport/visa fields and `$0 today`                                             | Follow the selected offer's checklist and server-issued quote. Do not add DOB/passport-number collection solely because it appears in a mockup.                  |
| Tracking by reference plus email or phone                                             | Preserve email-code verification and scoped access before revealing order details. Add the required verification screen in the same visual style.                |
| Simplified status sequence / eSIM QR delivery                                         | Render actual order/payment/delivery dimensions. Do not imply carrier provisioning, QR delivery or installation that the backend does not support.               |
| Plan finder “best match” and savings claims                                           | Start with explicit filters over available mobility offers. Document supported matching rules before implementing ranking. Keep PII out of the wizard.           |
| Cookie settings                                                                       | Match actual analytics/cookie behavior and approved policy; do not add decorative consent controls that have no effect.                                          |

These adaptations are reviewed in the first preview. Visual fidelity is measured
against the approved mobility version, with deviations from the broader source
design recorded explicitly.

## Ordered implementation slices

The first coding task is startable immediately: inspect the home hero/navigation
nodes and create the scoped theme mapping. Detail only the first three slices;
later slices remain milestones until the owner reviews the preview.

| Slice                             | App / package and work                                                                                                                                                               | Acceptance and evidence                                                                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Theme foundation               | `packages/ui`: scoped colour/radius/font tokens and any necessary primitive variants. No API/DB changes.                                                                             | A small local preview matches extracted tokens; existing admin styles and focus states remain intact. Package checks plus screenshots of affected consumers.                                                       |
| 2. Shared chrome and home preview | `apps/site-1`: desktop header, mobile navigation, promo, footer and home sections. Use labelled synthetic content while backend/CMS inputs are unavailable.                          | Side-by-side review at 1440 and 390 px, with 768 px and 1024 px checks. Links, FAQ toggles and menus work; no overflow. Record mobility adaptations and placeholder assets.                                        |
| 3. Sanity-driven home             | First a bounded `contracts/cms` schema slice if required, then a separate site-1 renderer slice: validated reads, section dispatch, home/catch-all, settings/navigation and preview. | Editing approved text/image/section order changes the preview without code changes. Drafts stay private/noindex; missing content fails safely; reserved routes still work. CMS fixture tests and browser evidence. |
| 4. Mobility browsing              | Pre-arrival and Canadian mobility pages, `/plans`, plan details, filters and plan-finder dialog/sheet.                                                                               | Offers and prices come from the backend; unavailable offers cannot be selected; loading/empty/failure states work; wizard handles no results and keyboard dismissal.                                               |
| 5. Order and tracking             | Restyle existing order/upload/review/confirmation and email-verified tracking; wire only supported change requests.                                                                  | The real browser → backend flow passes, including validation, quote failure, repeated submission, required documents and unauthorized tracking. Show desktop/mobile journey evidence.                              |
| 6. Content and supporting screens | Guides/article templates, about/contact/FAQ, legal/accessibility, 404/search and relevant failure states.                                                                            | Sanity owns content; correct metadata/headings; safe search; no personal data in URLs; policy versions remain recorded. Avoid publishing repetitive template pages without distinct content.                       |
| 7. Complete launch verification   | Verify the assembled mobility storefront and all existing Phase A gates. Production configuration and release remain owner actions.                                                  | Visual/asset review, accessibility, performance, type/boundary checks, regression journeys and launch evidence. Clear unresolved business/config inputs before accepting real orders.                              |

For each actual build task, fill [TASK_TEMPLATE.md](../../../docs/TASK_TEMPLATE.md): REQ IDs,
app/package, contracts/schema, negative tests, evidence and rollback. Principal
requirements are REQ 06–10 (independent CMS, previews, SEO/accessibility) and the
existing order/lead/document/tracking requirements for the changed journey.
Follow [BUILD_TASKS.md](../../../docs/BUILD_TASKS.md) dependencies; this visual plan supplements
Phase A rather than replacing its operational gates.

Critical path: theme → approved home/chrome preview → CMS renderer → mobility
catalogue → order/tracking → complete launch verification. Content templates can
be detailed after the home review. No launch date is inferred from this plan.

## Verification and risks

For changed packages/apps, use their current scripts: typecheck, lint, meaningful
Vitest coverage and build. For site-1 journey changes, use
`pnpm --filter site-1 run test:e2e`; run the credential/boundary security suite
when server/client data wiring changes. The existing Playwright configuration
already has 1440 px desktop and 390 px mobile projects and requires a disposable
Postgres harness. Use synthetic data and fake email for verification.

Capture matching screenshots for each implemented screen and interaction state.
Check typography, line breaks, spacing, radii, colour, asset placement and rendered
dimensions; every static asset must be local and nonempty. Test keyboard menus,
focus restoration, error announcements, reduced motion and WCAG 2.1 AA contrast.
Document design conflicts such as failing contrast instead of silently claiming
exact fidelity. Broaden testing to all affected consumers after shared changes.

| Risk / unresolved input                                          | Mitigation and blocking point                                                                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Missing approved photographs, logo assets or font files          | Inventory first; preserve explicit design slots in preview. Resolve before final visual acceptance/publication.                                                          |
| Illustrative prices, offers, reviews, contact details and claims | Owner-approved content/backend catalogue only; keep TEST content out of live publication.                                                                                |
| Design and existing business behavior differ                     | Review the adaptations above; preserve platform invariants and email verification.                                                                                       |
| Historical credential/scheduler/catalogue gaps                   | CHECKPOINT §6 records September findings, not current verified state. Recheck through authorized access during launch wiring; these do not block a local design preview. |
| Domain/legal content unresolved                                  | Keep preview noindex; resolve inputs in OPEN_INPUTS before publication.                                                                                                  |
| Existing CMS work and other local changes                        | Preserve them; establish each slice's diff against the starting state.                                                                                                   |
| Schema or theme regression in other apps                         | Additive CMS changes and scoped tokens; test/build the actual dependent consumers.                                                                                       |

Rollback: revert a reviewed slice's code/theme changes while keeping compatible
CMS fields until consumers no longer need them. Do not delete tenant records,
rename workspace identifiers or change deployed credentials for a visual rollback.

## Review handoff

The next proposed action is **slices 1–2: a responsive Canadian Plans home-page
preview**, using the confirmed mobility scope. The owner reviews that concrete
preview before the remaining screen templates and integration slices are detailed.
Internet/TV remains deferred as explicitly confirmed on 12 October 2026.

Planning/name-change verification: site-1 typecheck, targeted ESLint, all 35
site-1 Vitest tests, build, changed-file formatting, local plan links and Git
whitespace checks passed. The generated home title/heading use Canadian Plans.
Local browser smoke setup was rejected by automatic approval review with
"blocked by policy"; browser verification remains unrun. This is not evidence
that the planned visual implementation has been built or verified.
