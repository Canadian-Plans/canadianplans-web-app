# Admin browser checks

`shell.spec.ts` verifies the public sign-in, invitation, MFA, denial and recovery routes at desktop and mobile widths. It also proves that a deployment without an authenticated/configured staff session cannot render the workspace shell. Backend and component tests cover the active-membership workspace list; live Supabase journeys require the staging Auth project and SMTP configuration.

Run `pnpm --filter admin build`, then `pnpm run test:e2e` from the repository root. Playwright starts the production server automatically. Set `CAPTURE_SCREENSHOTS=1` to write review images to `docs/EVIDENCE/T2-screenshots`. These are static shell checks; they do not prove authentication or tenant authorization.

## Order journey (T14)

The full order-processing journey — list filters, permission-aware search, archive
toggle, bulk assign, and detail transitions through `in_progress` →
`ready_for_delivery` → dispatch → activate, plus the stale-edit reload and the
cancel-without-reason block — is covered by Vitest component tests in
`src/components/orders/orders-list.test.tsx` and
`src/components/orders/order-detail.test.tsx`. That suite drives the real
components against a stubbed typed client and a stateful test double of the
backend's transition map.

A live Playwright journey is blocked in CI for the same reason as every other
authenticated admin page: it needs a real Supabase Auth staff session, and no
Supabase credentials are available to CI or preview deployments (PLATFORM_CONTEXT
invariant 13). Add it to the staging run once staff Auth and SMTP are configured:
seed one order with an approved `ORDER_OPERATIONAL_TRANSITIONS` flag, sign in as
an `orders` actor, and repeat the steps above in the browser.
