# LAUNCH_PLANS — plans, prices and promotions at launch

**Status: DRAFT, awaiting the owner's explicit "yes, correct" (20 October 2026).**
Nothing here is published, seeded or enabled until the owner confirms each table.
Prices are CAD. Feeds OPEN_INPUTS #3 and #4, tasks 2.2–2.6 and 3.7–3.9 of
[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md), and [ADR 0005](ADR/0005-static-catalogue-regional-plans.md).

## Owner decisions (20 October 2026)

- Launch with **all plans from the Canada Wide website**: internet, internet + TV, and
  mobile. This supersedes the 12 October "mobility first; internet and TV later" note in
  `PLATFORM_CONTEXT.md` §7.
- **Region = province.** Prices vary by province, never by city. Region is chosen by name.
- **Promotions also vary by province.**
- **Mobile plans** (the Canada Wide "bring your own device" plans and the pre-arrival eSIM
  plans) are **national**: same price in every province.
- **All mobile plans are bring-your-own-device (BYOD).**
- Sanity is **not** used for now. Plan data is hardcoded in the repo.
- A region we do not serve yet gets an **easy wish-list lead**, and we **count which
  regions and plans people look at**, so we know where to add data next.

Sources: Canada Wide repo (`Md-Takibuddin/canadawide-sales-website`, commit `dfcebf3`:
`lib/packages.ts`, `lib/mobility.ts`, `lib/landing-offer.ts`) and
`apps/site-1/content/pre-arrival.ts`, whose plan ids start with `preview-` (design
placeholders). Values below are copied, not yet confirmed as current.

## A. Internet and TV, by province (monthly)

| Province | Plan                                         | Price | Notes                                                     |
| -------- | -------------------------------------------- | ----: | --------------------------------------------------------- |
| SK       | High Speed Unlimited 1 Gbps                  |   $50 | Also the Saskatoon page; no city pricing                  |
| SK       | High Speed Unlimited 2 Gbps (popular)        |   $60 |                                                           |
| SK       | Internet + TV Bundle, 1 Gbps + 120+ channels |   $90 | 1 PVR box                                                 |
| MB       | High Speed Unlimited 500 Mbps                |   $90 |                                                           |
| MB       | High Speed Unlimited 2 Gbps (popular)        |  $100 |                                                           |
| MB       | Internet + TV Bundle, 2 Gbps + 120+ channels |  $150 | 1 PVR box                                                 |
| BC       | High Speed Unlimited 500 Mbps                |   $70 |                                                           |
| BC       | High Speed Unlimited 1 Gbps (popular)        |   $80 |                                                           |
| BC       | Internet + StreamSaver TV, 1 Gbps + app TV   |  $115 | 70+ channels on the app; Netflix, Disney+, Apple TV       |
| BC       | Internet + TV Bundle, 1 Gbps + 120+ channels |  $140 | 1 PVR box                                                 |
| AB       | Same four plans as BC, own ids (`ab-*`)      |  same | $70 / $80 / $115 / $140 — kept as separate ids on purpose |

Every internet plan: unlimited data, free WiFi router and modem, free professional
installation, no upfront payment, autopay discount included in the price. Taxes and
government fees are extra.

## B. Promotions, by province

| Province   | Promotion on Canada Wide                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| SK         | **2 months free**: first two months free once service is active; billing starts in month three         |
| MB, BC, AB | **Trial offer**: no upfront payment, first bill 15 days after install, 2-year price lock, 15-day trial |

## C. Mobile, bring your own device (national, postpaid, no connection fee)

| Plan                   | Data      | Price | Notes                                                                 |
| ---------------------- | --------- | ----: | --------------------------------------------------------------------- |
| Canada + US            | 100 GB 5G |   $40 | "Limited time offer"; roaming up to 5 GB/day                          |
| Canada + US + Mexico   | 150 GB 5G |   $65 | Roaming up to 5 GB/day                                                |
| 5G+ Complete Unlimited | Unlimited |   $90 | Speeds up to 2 Gbps, 50 GB hotspot, Canada/US/Mexico, no data sharing |

Unlimited talk and text on all three. eSIM or SIM card. Canada Wide runs an identity and
credit check on these, then an advisor confirms the price.

## D. Mobile, pre-arrival eSIM (national, all BYOD)

From the site-1 design content; all "$0 due today", prices before tax.

| Design id                  | Plan                 | Data   |    Price | "In store" price |
| -------------------------- | -------------------- | ------ | -------: | ---------------- |
| `preview-fido-essential`   | Fido Essential       | 75 GB  |   $35/mo | $60/mo           |
| `preview-rogers-plus`      | Rogers Plus          | 100 GB |   $40/mo | $80/mo           |
| `preview-rogers-unlimited` | Rogers Unlimited     | 120 GB |   $50/mo | none shown       |
| `preview-chatr-50`         | Chatr 50 GB          | 50 GB  | $35/30 d | none shown       |
| `preview-chatr-90`         | Chatr 90 GB          | 90 GB  | $40/30 d | $67              |
| `preview-chatr-90-day`     | Chatr 75 GB, 90 days | 75 GB  | $75/90 d | none shown       |

## E. Still needed from the owner before this becomes the real catalogue

- A "yes, correct" on tables A–D, or the corrections.
- Are the pre-arrival plans (D) sold alongside the Canada Wide mobile plans (C), and do the
  "in store" prices and the carrier names (Fido, Rogers, Chatr) hold up as public claims?
- When does the $40 "limited time offer" end?
- Any one-time fees (SIM, activation, shipping), and what the customer pays today per plan
  (OPEN_INPUTS #4, #5).
- Required documents per plan (OPEN_INPUTS #6); mobile currently needs ID plus a credit check.
- Tax handling and who collects each fee (OPEN_INPUTS #19).
