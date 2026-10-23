# Landing pages: research, blueprint and plan/lead structure

Written 23 October 2026 for the redo of `/home-internet`, `/mobile-plans` and
`/pre-arrival-sim` (branch `redo/landing-pages`). The first page built to this
blueprint is home internet; the other two follow once the owner approves it.

## 1. What the research said

Pages read on 23 October 2026: Rogers Xfinity Internet, oxio, Virgin Plus Internet,
Verizon Fios, gFiber (Google Fiber), the owner's own Canada Wide site (home page, four
province pages, mobility page), plus general landing-page and SEO guidance (Telus, Bell,
Shaw, TekSavvy, Fizz, Start.ca and Distributel blocked automated reads). Patterns that
repeat across the pages that convert well:

- **Above the fold answers three questions in one glance:** what it is, is it for me,
  can I trust it. One headline with the service and the place, a price anchor
  ("from $X/mo"), one primary button, and two or three proof points. Verizon and
  gFiber both put the price and "check availability" in the hero; oxio leads with the
  promise ("zero price hikes") and backs it with third-party ratings.
- **One primary action, repeated.** Every section ends in the same next step. Canada
  Wide repeats "Claim this offer" in the hero, the sticky bar, each plan card and the
  footer. ConvertCart's telecom study says buyers drop off between "view plans" and
  "activate", so the path to the form must be short and obvious.
- **Plans are concrete cards, not a menu.** Speed, price, three to five bullets, a
  "popular" badge, and a button on each card (Verizon, gFiber, Virgin, Canada Wide).
  Prices shown as monthly, with the autopay or discount condition in the fine print.
- **A speed guide in everyday terms** ("how many 4K streams", "people in the home")
  appears on Virgin, oxio's FAQ and Rogers. It removes the biggest decision blocker.
- **How it works in three steps with timings** (Canada Wide: under a minute, we call
  within 24 hours, free installation; oxio: a five-step switch guide).
- **Trust is specific, not decorative:** real address and phone, "no hidden fees",
  "no contract", guarantees (Verizon's price guarantee, gFiber's uptime refund), and
  reviews only when they are real and attributed. Nothing invented.
- **FAQ answers the money questions:** first bill, hidden fees, installation, equipment,
  availability, what happens after the form.
- **Image + text rows that alternate sides** carry the story between the plans and the
  FAQ (Rogers, Verizon, Canada Wide's "why switch").
- **SEO:** one H1 that names the service and the place, question-style H2s, a short
  direct answer near the top, semantic lists and a real `<table>`, descriptive title and
  meta description, BreadcrumbList JSON-LD. Google removed FAQ rich results in May 2026
  (deprecation notice 8 May 2026; documentation removed 15 June 2026), so FAQPage
  markup is kept for other engines but earns nothing on Google.

## 2. The blueprint (home internet, applied to the other two pages next)

| #   | Section                   | Why it is there                                                                                                                                                                                            |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hero                      | Service + place in the H1, from-price, one button, no-contract/$0 chips.                                                                                                                                   |
| 2   | Proof strip               | Four owner-confirmed promises: nothing paid online, free install, unlimited data, cancel free before install.                                                                                              |
| 3   | Plans                     | Landing: one card per province (badge, from-price, five bullets, "View plans & offers"). Province page: that province's plans grouped Internet / Internet + TV, each "Get started" straight into `/order`. |
| 4   | What you get              | Four included items with icons.                                                                                                                                                                            |
| 5   | Image rows                | Three alternating photo + text rows (install, equipment, move-in day). Photo slots until the owner supplies images (`image.src` in content).                                                               |
| 6   | Speed guide               | Real `<table>` with the most popular speed highlighted.                                                                                                                                                    |
| 7   | How it works              | Three steps with timings; "moving in on a date" aside.                                                                                                                                                     |
| 8   | TV                        | Bundle facts for the two TV products.                                                                                                                                                                      |
| 9   | Who it is for             | Newcomers, renters, movers.                                                                                                                                                                                |
| 10  | Who you are buying from   | Authorised sales agent, provider bills you, office address, phone, hours.                                                                                                                                  |
| 11  | FAQ                       | Eleven money questions; province pages get their own first-bill answer.                                                                                                                                    |
| 12  | Final CTA + related links | Same primary action; the other provinces; related pages.                                                                                                                                                   |
| —   | Sticky bar (phones only)  | Appears once the plans block scrolls away; the utility bar and promo strip are hidden on phones.                                                                                                           |

Files: copy in `apps/site-1/content/home-internet-landing.ts`; composition in
`apps/site-1/src/components/home-internet/landing.tsx`; styles in
`apps/site-1/src/app/(home-internet)/home-internet-landing.css` (tokens only, `cp-hi-*`
classes); routes `/home-internet` and `/home-internet/[province]` (british-columbia,
alberta, saskatchewan, manitoba; anything else is a 404). `/home-internet/vancouver` and
`/home-internet/ontario` keep their own kit.

### Plan card pattern (Mobbin, 23 October 2026)

Checked against Mobbin pricing references (Webflow, Unify, Height, Grammarly, Vercel,
Hashnode, Circle, Netflix, Zendesk, Asana). What they share, and what the province and
plan cards now follow:

- Flat white card, one hairline border, no shadow, no tinted header, no icon chips.
- The same slots in every card, top to bottom: name, one line of context ("best for"
  or "3 plans · 2-year price lock"), the price with a small "/mo", one sub-line
  (currency, taxes, no contract), the button, a divider, then "Includes:" or
  "Everything in <previous plan>, plus:" with a short tick list.
- The button sits directly under the price, not at the bottom of the card.
- Exactly one card is highlighted: a brand-blue border, a tag on its top edge
  ("Popular" on a province page, "2 months free" for Saskatchewan on the landing page)
  and the only filled button; every other card uses an outline button.
- One row of cards, equal height, three or four across on desktop, one column on phones.

## 3. How plans work across the site

One source, three readers, no hand-copied prices in page code:

```
packages/adapters/src/static-catalogue/site-1-plans.ts   (ADR 0005: the catalogue)
        │  catalogue sync every 300 s → products + immutable offer_versions (backend)
        ├──► /api/v1/website/offers  ──► /order (plan list, quote, lead, order)
        │
apps/site-1/content/home-internet.ts  (display copy of the internet plans; ids = productKey)
        ├──► content/home-internet-landing.ts ──► /home-internet, /home-internet/<province>
        └──► content/landing/internet.ts      ──► /home-internet/vancouver, /ontario
apps/site-1/content/mobile-plans.ts   (display copy of the mobile plans)  ──► /mobile-plans
apps/site-1/content/pre-arrival.ts    (display copy of the eSIM plans)    ──► /pre-arrival-sim
```

Rules:

- A plan's `id` in storefront content equals its `productKey` in the catalogue. The
  storefront links `/order?plan=<id>&category=<type>&province=<code>`; `/order` resolves
  the plan from the backend's published offers, never from the page (invariant 4).
- Region = province (`SK`, `MB`, `BC`, `AB`) for internet and TV; `CA` for mobile and
  pre-arrival. Promotions are per province and frozen into each offer version (D3).
- Display content is checked against the catalogue by tests
  (`static-catalogue.test.ts` pins every price; `internet-order-summary.test.ts` and
  `plan-finder-flow.test.ts` read the content). A price change is one commit that
  touches the catalogue, the content file and `docs/LAUNCH_PLANS.md`.
- Verified against canadawideinternet.com on 23 October 2026: internet and TV match in
  every province (BC/AB $70/$80/$115/$140, SK $50/$60/$90, MB $90/$100/$150) with the
  same offers (SK two months free; MB/BC/AB no upfront payment, first bill 15 days after
  install, 2-year price lock, 15-day trial). **Mobile did not match** and was updated:
  5G+ Complete 100 GB $55, 175 GB $60 (limited time), Unlimited $90, all with a $10
  pre-authorised payment discount included, 5-year price lock and AI scam protection.
  Canada Wide also says "connected in as little as 2 days" and "we call within 24 hours";
  the storefront keeps "about 3 days" for installation (owner's earlier copy) and now
  says "within 24 hours" for the call. Confirm the install claim with the owner.

## 4. How a lead reaches the database

```
storefront /order (server action, never the browser)
   1. POST /api/v1/website/leads        → leads row: workspace_id, status=incomplete,
      contact (name, email, phone, country), form.payload (versioned, per category),
      attribution (sanitised UTM/partner/landing path), consent_version, product_id
      → response: draftGrant (lets this visitor resume their own draft)
   2. PATCH /api/v1/website/leads/:id   → same row updated on every save
   3. POST /api/v1/website/quotes       → server-priced quote for the chosen offer version + province
   4. POST /api/v1/website/orders       → order with frozen commercial snapshot, lead → submitted,
      acknowledgement email + analytics events through the outbox (invariant 7)
```

What each category's `form.payload` carries (ADR 0005 D7, mirrored from Canada Wide):

| Category         | Fields sent                                                                                                                                                                                            | Documents                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Internet and TV  | full name, date of birth (18+), email, phone, service street address, apt/unit, city, postal code (must belong to the chosen province), current provider, preferred installation time, contact consent | none; advisor confirms address    |
| Mobile BYOD      | plan, number of lines (1–10), full name, email, phone, current provider, keep my number, eSIM or SIM, address, city, postal code; then ID type + ID file + credit-check consent                        | `government_id` via signed upload |
| Pre-arrival eSIM | full name, email, phone with country, current country, destination, arrival date                                                                                                                       | none                              |

Province a visitor looked at is counted PII-free (`region_selected`), and a visitor in a
province without plans leaves an email in `region_waitlist` (D5). No price travels from
the browser; no payment is taken on any plan.

## 5. Open for the owner

- Photos for the three image rows and the hero (slots are labelled in the page).
- The "connected in 2 days" versus "about 3 days" install claim.
- Real, consented customer reviews before any rating or testimonial appears.
- Whether `/mobile-plans` and `/pre-arrival-sim` get the same blueprint (next step).
