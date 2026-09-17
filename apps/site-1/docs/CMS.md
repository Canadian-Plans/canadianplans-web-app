# CMS (Sanity) — site-1

Studio is embedded in this Next.js app at `/studio` (official `next-sanity`
setup), reading `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET`.
Content and datasets are local to this website's own Sanity project (REQ 09);
only schema **code** is shared across websites.

## Schema — shared source of truth

Document and section type definitions live in
[`packages/contracts/src/cms/schema-types.ts`](../../../packages/contracts/src/cms/schema-types.ts)
and are imported into [`sanity.config.ts`](../sanity.config.ts) via the
package's `./cms` export:

```ts
import { schemaTypes } from '@canadian-plans/contracts/cms';
```

This keeps the schema browser-safe (no provider secrets, no server-only SDK)
and importable by any future site (2/3) without copying the type definitions
(PLATFORM_CONTEXT.md §4a). A site imports the whole array; it never redefines
a document type locally.

### Document types

| Type                       | Purpose                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `siteSettings` (singleton) | Site name, default SEO, contact email, social links, footer                                  |
| `navigation` (singleton)   | Primary menu, with one level of submenu items                                                |
| `page`                     | Editorial page (home, static marketing pages); `sections` is the discriminated union below   |
| `countryPage`              | Per-country landing page; carries an ISO-3166-1 alpha-2 `countryCode` and its own `sections` |
| `post`                     | Blog post                                                                                    |
| `product`                  | Stable `productKey` + `title` + `slug` + `type` (`sim` only in Phase A)                      |
| `offer`                    | Commercial terms for a `product` — see below                                                 |
| `redirect`                 | Editable path redirect (`source` → `destination`, `permanent`)                               |
| `legalPage`                | Versioned legal text (terms/privacy); `version` increments on every substantive change       |

`siteSettings` and `navigation` are intended as singletons. The schema does
not yet enforce single-instance creation in the Studio structure pane (no
custom desk structure has been built); until a future task adds one, editors
must not create a second instance of either type.

### Page sections — versioned discriminated union

`page.sections` and `countryPage.sections` are arrays of object types, each
named `section<Kind>` (`sectionHero`, `sectionRichText`, `sectionPlanGrid`,
`sectionFaq`, `sectionTestimonials`, `sectionCta`, `sectionImageText`).
Sanity's own `_type` is the discriminant; each section type additionally
carries a required `schemaVersion` integer so a section's own field shape can
evolve later without invalidating existing content (the same "add before
remove, version the payload" convention used for API request payloads —
see `versionedFormSchema` in `packages/contracts/src/common.ts`). A future
schema change to, say, `sectionHero` should add a new version's fields
alongside the old ones and branch rendering on `schemaVersion`, not mutate
the existing fields in place.

`sectionPlanGrid` holds an array of references to `offer` documents — this is
how a page assembles a plan comparison from published offers.

### Offer completeness

Every field REQ 12 requires — currency, recurring charge, one-time fees,
amount payable today, `paymentRequired`, `documentChecklist`, eligibility,
availability, billing party, contract terms, `termsVersion`, and specs — is
`Rule.required()` on the `offer` type. Studio refuses to **publish** a
document with a failing required field (it can still be saved as an
incomplete draft), which is what makes "an incomplete offer fails
validation" true: remove any required field from a draft offer and Publish
is disabled with that field listed.

Two fields carry extra validation beyond "present":

- `documentChecklist` — a bounded enum (`passport`, `visa`,
  `address_proof`), validated with a custom rule so an unknown value is
  rejected, not silently accepted as free text.
- `type` on `product` — restricted to the current `PRODUCT_TYPE_VALUES`
  (`sim` only in Phase A).

This Studio-side validation is a content-authoring gate only. The backend's
catalogue sync (T10) does not trust it — REQ 13 requires the backend to
re-validate and hash the exact published payload itself before an offer
version is created; Studio validation and backend validation are two
independent checks on the same requirement, not one substituting the other.

`specs.carrier` and `specs.dataAllowance` are required unconditionally.
Phase A only has `sim` products; when site-2/site-3 (mobile-internet,
home-internet) are built in Phase B, `specs` will need conditional
requirements based on `product.type` (e.g. `speed`/`addressConditions`
required instead) — that is Phase B schema work, not built here.

`productKey` uniqueness and stability (REQ 11) is **not** enforced by this
schema — Studio's validation API cannot safely perform a live cross-document
uniqueness lookup at authoring time. The backend catalogue sync enforces
uniqueness as a database constraint (workspace, product, content hash) and
is the actual source of truth for "this product identifier is stable."

For T10, configure a GROQ-powered webhook whose signed JSON projection is
`{"documentId": _id}`. Set custom `X-Webhook-Selector` and
`X-Provider-Account` headers to the matching server-only registry entry. The
backend validates Sanity's `sanity-webhook-signature` against the raw body,
stores the delivery by `idempotency-key`, and then re-fetches the published
document; no price or terms from the webhook body are used.

## Draft preview — editor-only, allowlisted, no caching

Preview uses the standard `next-sanity` draft-mode pattern, restricted
further to an explicit allowlist (REQ 08 — drafts must never be visible
outside an authenticated editor session, and never on an arbitrary route):

- `sanity.config.ts` registers `presentationTool` with
  `previewUrl.previewMode.enable = '/api/draft-mode/enable'`.
- [`src/app/api/draft-mode/enable/route.ts`](../src/app/api/draft-mode/enable/route.ts)
  delegates authentication to `next-sanity`'s `defineEnableDraftMode`, which
  rejects any request that doesn't carry a valid Studio-issued preview
  session — an editor must be signed into `/studio` for this to succeed.
  Before delegating, the route independently rejects any `redirectTo` /
  `sanity-preview-pathname` target that isn't in
  [`src/lib/preview.ts`](../src/lib/preview.ts)'s allowlist (currently `/`,
  `/privacy`, `/terms`, and anything under `/plans`) and sets
  `Cache-Control: no-store` on its response.
- [`src/app/api/draft-mode/disable/route.ts`](../src/app/api/draft-mode/disable/route.ts)
  turns draft mode back off.
- The preview client uses `SITE_1_SANITY_PREVIEW_TOKEN` — a read-only,
  site-scoped token, set only on the server, never `NEXT_PUBLIC_*`. It is
  intentionally distinct from any token the backend's catalogue sync uses:
  least privilege per credential (PLATFORM_CONTEXT.md §4).

Pages that render CMS content are a later task (catalogue sync / storefront
rendering land in T10+); when they do, each allowlisted route must check
`draftMode().isEnabled` and skip response/data caching for that request —
this doc's allowlist is where that route list is kept in sync.

## TEST fixtures

Real Rogers plan names, prices, payment requirements and document checklists
are unresolved (OPEN_INPUTS #3–#6). Until the owner answers them, this
website's Sanity project keeps a **`test`** dataset, separate from
`production`, holding 3 products and 3 illustrative offers, each clearly
labelled `(TEST)` / `[TEST]` in every editorial field:

- `test-product-rogers-5gb`, `test-product-rogers-10gb`, and
  `test-product-rogers-unlimited` — one stable product identity per selectable
  plan, with matching `rogers-sim-*` product keys
- `test-offer-rogers-5gb`, `test-offer-rogers-10gb`,
  `test-offer-rogers-unlimited` — illustrative prices, `paymentRequired:
false`, `documentChecklist: ["passport"]`

Reseed (idempotent — replaces the same documents rather than duplicating
them) with:

```bash
SANITY_PROJECT_ID=<id> SANITY_DATASET=test SANITY_API_TOKEN=<write-token> \
  pnpm --filter site-1 run seed:test-offers
```

The script refuses to run against any dataset whose name doesn't contain
`test`, so it cannot seed fixtures into `production` by mistake. These
fixtures do not authorize real publishing, dispatch, activation or payout
(PLATFORM_CONTEXT.md §8) and must not be presented to a real customer.

## Verifying this task

- **Studio loads and publishes:** open `/studio` locally with
  `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` pointed at
  the `test` dataset and sign in as an Administrator; the document list
  shows `siteSettings`, `navigation`, `page`, `countryPage`, `post`,
  `product`, `offer`, `redirect`, `legalPage`; the 3 seeded TEST offers open
  and publish without error.
- **An incomplete offer fails validation:** duplicate a TEST offer, clear a
  required field (e.g. `eligibility`), and confirm the Publish action is
  disabled with that field flagged.
- **Preview is editor-only:** signed out of Studio, a `GET` to
  `/api/draft-mode/enable?redirectTo=/` returns a non-2xx response and does
  not set the Next.js draft-mode cookie; signed into Studio, using the
  Presentation tool's preview does. A `redirectTo` outside the allowlist
  (e.g. `/order`) is rejected with `403` regardless of session.
