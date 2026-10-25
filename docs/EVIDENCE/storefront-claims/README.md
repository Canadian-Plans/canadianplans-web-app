# Storefront claims review — 25 October 2026 (task 2.12)

Read-only sweep of `apps/site-1/content` by Claude. Nothing on the site was changed.

## Placeholders

- **No bracketed placeholders remain** (`git grep -nE "\[[A-Z][A-Z _/-]{2,}\]"`). The only
  matches are postal-code and country-code regexes in the order form.
- `you@example.com` appears only as input hint text, which is intended.
- **Customer stories:** the home page list is empty, so the section is hidden
  (`content/home-redesign.ts`, "never invent quotes"). The sample testimonials in
  `content/components.ts` render only on `/dev/components`, which returns 404 in production.
- **Sample person "Aarav Sharma"** appears only on the `/track-order` design preview, which
  returns 404 in production and is `noindex`.

## Claims that need the owner's yes or no

Counts exclude the component lab. "Backed" means a dated owner answer already exists in
`docs/LAUNCH_PLANS.md` or `docs/OPEN_INPUTS.md`.

| Claim as written on the site | Mentions | Status |
| ---------------------------- | -------: | ------ |
| "Authorized Rogers, Fido & Chatr reseller" and "authorized sales agent" | 23 in 15 files | **Owner to confirm**, including permission to use the carrier names |
| "No credit check" on pre-arrival eSIM plans | 71 in 18 files | **Owner to confirm**. Mobile BYOD pages correctly say a credit check applies (LAUNCH_PLANS §C) |
| "No SIN needed" | 8 in 6 files | **Owner to confirm** |
| "An advisor confirms, usually the same day" | 31 in 14 files | **Owner to confirm** this is a service level staff can keep |
| "Order in about 2 minutes" | 11 in 10 files | **Owner to confirm** or soften |
| "eSIM is activated 24 hours before your arrival date" | 19 in 9 files | **Owner to confirm** with the carrier process |
| "Your number usually transfers the same day" | 3 in 3 files | **Owner to confirm** |
| "Real people, no bots" | 4 in 2 files | **Owner to confirm** |
| "Nothing paid online" | 86 in 21 files | Backed: provider bills after activation (LAUNCH_PLANS §E, 22 Oct) |
| "No contract" | 61 in 16 files | Backed for mobile BYOD (LAUNCH_PLANS §C); **owner to confirm** for internet |
| "First two months free" (Saskatchewan internet) | 14 in 5 files | Backed (LAUNCH_PLANS table, SK row) |
| Surrey address, 9981 Whalley Blvd | 14 in 7 files | **Owner to confirm** it may be published |

Still open from LAUNCH_PLANS §E: whether the "in store" prices and carrier names in table D
hold up as public claims. The pre-arrival page no longer shows in-store prices, so only the
carrier names part remains.

## How to close 2.12

Answer each "Owner to confirm" row with keep, change (give the wording) or remove. Claude
then applies the answers, runs `pnpm --filter site-1 lint typecheck test`, and ticks 2.12.
