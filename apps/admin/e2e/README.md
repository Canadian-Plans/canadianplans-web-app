# Admin browser checks

`shell.spec.ts` verifies the public sign-in, invitation, MFA, denial and recovery routes at desktop and mobile widths. It also proves that a deployment without an authenticated/configured staff session cannot render the workspace shell. Backend and component tests cover the active-membership workspace list; live Supabase journeys require the staging Auth project and SMTP configuration.

Run `pnpm --filter admin build`, then `pnpm run test:e2e` from the repository root. Playwright starts the production server automatically. Set `CAPTURE_SCREENSHOTS=1` to write review images to `docs/EVIDENCE/T2-screenshots`. These are static shell checks; they do not prove authentication or tenant authorization.
