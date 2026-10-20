# 0005 — Repo-based catalogue with per-province plan variants

Date: 20 October 2026
Status: **PROPOSED** — awaiting owner approval. Supersedes the "Sanity is the only
catalogue source" assumption in [ADR 0003](0003-catalogue-orders-outbox.md) for launch;
Sanity returns later behind the same interface.

## Context

- The owner does not want Sanity at launch and will add it later. Today the backend can
  only build `offer_versions` from Sanity (`SanityCatalogueAdapter`), so without it
  `/order` cannot offer any plan.
- The owner wants to launch every plan from the Canada Wide website: internet and TV that
  **vary by province** (SK, MB, BC, AB), and mobile that is the same **nationally**.
  **Promotions also vary by province.** See [LAUNCH_PLANS.md](../LAUNCH_PLANS.md).
- Provinces we do not serve yet should capture an easy wish-list lead, and we want to learn
  which regions people look for.
- The platform has no region concept today: an offer has one price, and the Sanity
  `availability` field is free text.
- Invariants that apply: prices come only from the server (4), orders freeze a commercial
  snapshot (5), consent is recorded at capture (11), no PII in analytics or logs (12),
  every tenant table has `workspace_id` and RLS (1, 2).

## Decision

**D1 — One catalogue file in the repo is the plan source for launch.** A typed, Zod-checked
file lists every plan. The backend turns it into `products` and immutable `offer_versions`
the same way the Sanity sync does, so quotes, orders and snapshots are unchanged. Sanity
can later replace the file behind the same provider interface.

**D2 — A regional plan is its own catalogue entry (variant).** Entries carry a `regions`
list: one province code (`SK`, `MB`, `BC`, `AB`) or `CA` for national. Ids stay readable
and stable (`sk-1000`, `bc-1000`, `ab-1000`); BC and Alberta keep separate ids at equal
prices so analytics can tell them apart. Mobile and pre-arrival plans use `CA`.

**D3 — Promotions are part of the offer content, per variant.** The text and terms of the
promotion (for example "2 months free" in SK, "2-year price lock, 15-day trial" in
MB/BC/AB) live in the variant's content and are frozen into the order snapshot. A change
creates a new offer version, so an existing order never changes.

**D4 — Region is chosen by name and enforced by the server.** The visitor picks a province
name. The site lists only variants sold there. The quote request carries the province; the
backend rejects a plan not sold in it, prices from the server's catalogue, and stores the
province on the quote and the order.

**D5 — Unserved regions get a wish list and a demand signal.**

- A visitor picking a province with no plans can leave an email and optional plan interest.
  Stored in a new tenant table `region_waitlist` (`workspace_id`, province, email,
  interest, consent version and timestamp, created_at) with RLS. Consent follows the same
  capture rules as other leads.
- Which provinces and plans are viewed or selected is counted with PII-free analytics
  events (province code, served or not, plan id) through the existing analytics sink, with
  no new table. Waitlist rows give the exact demand per province.

**D6 — Scope.** Internet and TV launch with mobile, superseding the 12 October "mobility
first" note. Internet orders are requests: the service address is collected and an advisor
confirms availability before installation, as on Canada Wide.

**D7 — Order forms follow the Canada Wide forms, as three separate categories.** Each
category has its own form, stored in the versioned `form.payload` the lead and order
contracts already carry (no new tables for it):

- **Internet and TV:** full name, date of birth (18+), email, phone, service street
  address, apartment/unit, city, postal code, current provider, preferred installation
  time, contact consent. The province comes from the visitor's choice, and the server
  rejects a postal code that does not belong to it. The order is a request: an advisor
  confirms availability at the address before installation.
- **Mobile BYOD:** plan, number of lines (1–10), full name, email, phone, current provider,
  keep my number (yes/no), eSIM or physical SIM (no default for either), address, city,
  postal code, then a second step: ID type (driver's licence, provincial ID, passport), the
  ID file, and credit-check consent. The first step saves a resumable draft, so no lead is
  lost, as on Canada Wide.
- **Pre-arrival eSIM:** its own existing form, unchanged.

Changes from Canada Wide: the ID goes through the platform's private, signature-verified
uploads and the plan's document checklist (not a 4 MB request body); the credit-check
consent is recorded with a version at capture (invariant 11); the lead saves under the
platform's draft grant rather than a bare row id.

## Confirmed and verified

- Internet and TV are sold on the site-1 storefront and workspace — **confirmed by the
  owner, 20 October 2026.** (`PLATFORM_CONTEXT.md` describes internet as separate brands,
  sites 2 and 3; that remains a Phase B option.)
- A file-based provider fits the existing sync — **verified in code.** The sync only
  needs the three read methods of `SanityCatalogue` (`fetchPublishedByDocumentId`,
  `fetchPublishedByProductKey`, `listPublished`), each returning a `PublishedOffer`. A
  static provider implements them, and the provider resolver returns it (with a no-op
  revalidator) for a workspace with no Sanity entry. Quote logic is untouched.
- A province field needs no database migration: offer content is stored as JSON in
  `offer_versions.content`. It does need a field added to the shared offer contract.
  Promotion terms can ride in the existing `contractTerms` list, which is already frozen
  into the order snapshot.
- `region_waitlist` needs one new migration (`0020`); no change to existing tables.

## Consequences

- No database migration for plans themselves; one small migration for the wish list.
- Prices live in git: a price change is a reviewed commit and a deploy, not a CMS edit.
- The storefront pages and checkout read one source, so they cannot disagree (task 3.9).
- Adding a province is new data entries plus its promotion, no new code.
- Sanity can come back later without touching quotes or orders.

## Rollback

The file-based provider is additive. Switching it off leaves existing `offer_versions` and
orders intact; `region_waitlist` is a standalone table.
