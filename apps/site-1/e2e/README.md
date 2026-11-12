# Storefront browser suites

Playwright suites for `apps/site-1`, run at a desktop and a mobile width against
the **built** storefront (`next start`). They need no database and no secret.

```sh
pnpm run test:e2e                      # repository root: every suite, then the security check
pnpm --filter site-1 run test:e2e      # build, then every suite
pnpm --filter site-1 run test:security # client-bundle scan, then the security suites
```

Extra arguments go to Playwright, for example
`pnpm --filter site-1 run test:e2e order.spec.ts --project desktop --trace off`.
The storefront listens on port 3101 and the stub on 4100; set `E2E_SITE_PORT` or
`E2E_STUB_PORT` when another process holds one of them.

## What the storefront talks to

Not the real CRM. Playwright starts [`crm-stub/`](crm-stub/README.md), a small
in-memory stand-in for the Canadian Plans CRM's website API. It validates every
request with the schemas of `@canadian-plans/crm-contracts` and checks its own
answers against that package's response schemas, so a storefront change that no
longer fits the contract fails here. It does not prove the real CRM behaves the
same: **a test order of each kind against the live CRM, followed on `/track`, is
still the owner's final check** ([docs/STOREFRONT_ONLY.md](../../../docs/STOREFRONT_ONLY.md)).

Cloudflare Turnstile is replaced in the browser by `fixtures.ts` (the stub
accepts any proof, as the CRM does in its "delegated" bot-check mode), and the
signed upload URL's host is forwarded to the stub's storage endpoint.

## Suites

| File                       | What it proves                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order.spec.ts`            | The order journeys and what the CRM received for each: SIM order (plan, details, PDF and PNG uploads, review price, `MS-` reference), attribution from a campaign link, resume after a reload, changing the plan, internet and mobile orders (nothing sent before the one submit), validation, wish list, callback, CRM down. |
| `order-integrity.spec.ts`  | One order or none, however a submission goes wrong: a lost answer retried under the same idempotency key, `idempotency_conflict`, a 503, a plan withdrawn or repriced mid-checkout, an expired, unknown, already-submitted or forged draft.                                                                                   |
| `tracking.spec.ts`         | `/track`: emailed code, order list, order details, a change request limited to the customer's four details, a passport upload; unknown email, wrong code, expired session, an order that can no longer change.                                                                                                                |
| `accessibility.spec.ts`    | axe (WCAG 2.1 AA, no serious or critical findings) on the public pages, every step of the order form and every step of tracking.                                                                                                                                                                                              |
| `scaffold.spec.ts`         | Every top-level route renders, without the site key; keyboard navigation; analytics loads only when configured.                                                                                                                                                                                                               |
| `security-headers.spec.ts` | The production security headers and Content-Security-Policy.                                                                                                                                                                                                                                                                  |
| `site-key.spec.ts`         | The stub refuses a caller without the site key, and no response of an order journey contains it.                                                                                                                                                                                                                              |
| `preview-files.spec.ts`    | The pre-arrival preview form's local file storage.                                                                                                                                                                                                                                                                            |

`journeys.ts` holds the steps the suites share; `stub.ts` is the suites' side of
the stub's test-only controls.

## Not covered here

- The real CRM: its database, emails, rate limits, real Turnstile verification
  and real object storage.
- Marketing opt-in, documents for internet and mobile orders, and the mobile
  credit-check identity step: the storefront does not have them (see
  docs/STOREFRONT_ONLY.md).
