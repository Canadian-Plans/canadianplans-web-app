# CHECKPOINT — Sanity-driven storefront (site-1)

Historical CMS handoff, recorded 2026-09-27. The owner subsequently supplied the
Figma design and authorized storefront preview implementation and review on
12–13 October 2026. See [the current design plan](DESIGN_TO_CODE_PLAN.md) and
[design notes](../apps/site-1/DESIGN_NOTES.md). The CMS requirements below remain
future integration work; they do not describe the completed static design previews.

Read this together with [PLATFORM_CONTEXT.md](../PLATFORM_CONTEXT.md) and
[docs/BUILD_TASKS.md](BUILD_TASKS.md). This file records decisions and state that
are NOT otherwise derivable from the code.

---

## 1. Objective (current scope)

Build and publish **site-1** as a **Sanity-driven storefront**, launching with
**mobility plans only**. Internet and TV/cable come in later phases; the model is
designed so they slot in without a rebuild.

Mobility has exactly **two audience categories**: **Newcomers** and **Canadians**.

Mobility maps onto the existing SIM offer/order engine (Phase A) — this work is
mostly the **CMS content model + front-end rendering** on top, not a new engine.

## 2. Decisions locked

- **Content is Sanity-driven** (WordPress-style page builder). Editors add pages
  anytime and link them anywhere.
- **Brand = hybrid.** Logo + primary/accent colour + site name live in Sanity
  `siteSettings.brand`; the core design system stays in `@canadian-plans/ui`.
  The owner selected Canadian Plans and its Figma visual reference on 12 October 2026. The scoped token/font foundation is implemented; CMS brand settings
  remain future integration work.
- **Page model:** `page` documents rendered by a section renderer via a catch-all
  `/[slug]` route; home = slug `home`. `/order`, `/track`, `/plans`, `/privacy`,
  `/terms`, `/studio`, `/api/*` stay as app routes.
- **Mega menu:** each nav item is _simple_ (one link) or _mega_ (columns of links
  - optional promo box).
- **One reusable link picker** everywhere (internal page ref or external URL).
- **Plans = one central list**, referenced from pages (never recreated per page).
- **Plan areas:** `service` (mobility now; internet/tv dormant) + `audiences`
  (newcomer/canadian). Province (for internet later) = **separate plan per
  province**, made manageable via tags + duplicate + auto-listing.
- **Plan grid block:** hand-pick specific plans OR auto-by-area (service +
  audience filters).

## 3. Open / undecided

- **Brand visual look** (colours, fonts, logo) — owner will provide; default
  theme used until then.
- **Combos / bundles** (internet+TV, add-a-service pricing): deferred entirely.
  Two unresolved forks — customer experience (curated "meal deal" combos vs
  live "build-your-own") and price setting (typed bundle total vs discount rule).
  Not needed for the mobility launch.
- **Internet phase** (services + province plans) comes after mobility ships.

## 4. Implemented so far — Increment 1: content model (DONE, verified)

File: `packages/contracts/src/cms/schema-types.ts` (+ `cms/index.ts` exports).

- Reusable `link` object (internal page ref | external url), with `readStringField`
  helper for cast-free conditional `hidden`/`validation` (ESLint bans `as`/`any`).
- Mega-menu `navigation` (item `style` simple|mega, `link`, `columns[]`, `promo`).
- New page-section blocks: `sectionSteps`, `sectionFeatures`, `sectionLogos`,
  `sectionStats` (added to `pageSectionTypes`).
- `siteSettings.brand` (logo, logoAlt, primaryColor, accentColor; hex-validated).
- `offer.service` (SERVICE_VALUES = mobility|internet|tv, default mobility) and
  `offer.audiences` (AUDIENCE_VALUES = newcomer|canadian).
- `sectionPlanGrid`: `mode` pick|auto, `offers` (pick), `filterService` +
  `filterAudiences` (auto).
- New exports: `SERVICE_VALUES`, `AUDIENCE_VALUES`, `objectTypes`, types.

Verification (all green): `contracts` typecheck, ESLint on changed files,
`contracts` tests = 76 passed. Nothing deployed; schema/code only.

## 5. Next steps (not started)

- **Increment 2 — front-end rendering:** `lib/cms.ts` (read-only Sanity client +
  GROQ: getSiteSettings/getNavigation/getPage/getPageSlugs), a section renderer
  (one component per block in `apps/site-1/src/components/sections/`), catch-all
  `/[slug]` route + home, async layout reading navigation + brand, theming hook
  injecting `brand.primaryColor` over the `@canadian-plans/ui` tokens, plan-grid
  cards (sample mobility plans first).
- **Increment 3 — preview:** run site-1, show the owner a live preview, iterate.
- **Increment 4 — go-live wiring:** connect the real order path and publish
  (blocked on the production gaps in §6).

## 6. Production launch-readiness findings (discovered 2026-09-23)

The deployed storefront cannot take orders yet. Confirmed against prod:

- **site-1 has NO active service credential in the prod DB** (workspace `site-1`
  = `10000000-0000-4000-8000-000000000101`). The storefront's server-side call to
  `GET /api/v1/website/offers` throws → `/order` shows "Plans are unavailable".
  Fix: create a credential in admin (Settings, needs owner MFA), set it as
  `SITE_1_SERVICE_CREDENTIAL` on the site-1 Vercel project, redeploy.
- **Catalogue never syncs** (0 offer_versions, 0 sync events for site-1). The
  in-process scheduler appears **disabled** (`ENABLE_SCHEDULER` not `1`, or its
  `MACHINE_REGISTRY_JSON` scheduler entries lack `outbox:run`/`reconcile:run` for
  site-1). With it off, catalogue sync AND the outbox (acknowledgement emails,
  analytics, synthetic check, alerts) do not run in prod.
- **Prod Sanity `production` dataset is otherwise empty** (no siteSettings, no
  real offers). `test` dataset holds synthetic fixtures. Site name still shows
  the code placeholder `SITE_1_NAME_PLACEHOLDER` (separate from CMS siteName).
- **No staging Supabase project** is reachable (only prod, ref
  `ixbhodlvfyxjctpsjibj`). No Docker on the dev machine.
- Harness note: this session gated Railway/Vercel **production reads** and Sanity
  **production writes** unless the owner approves; Railway `list-variables`
  returns names only (values redacted to connected apps).

These are launch config/ops gaps, not code bugs. They must be resolved for
Increment 4. See also memory: deployment-state, launch-gates, backup-gate-open.

## 7. How to resume

1. Read §2–§5 here, then `PLATFORM_CONTEXT.md` §5/§6 and the offer/CMS schema.
2. If continuing the build: start Increment 2 (front-end rendering).
3. If going live: work §6 with the owner (credential + scheduler first).
4. Get the brand look from the owner before final styling (§3).
