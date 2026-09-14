# Admin browser checks

`shell.spec.ts` verifies all seven T2 routes at 1440×900 and 390×844: rendering, one H1/main landmark, keyboard skip links, navigation, focus, workspace switching, mobile dismissal, disabled login and unknown routes.

Run `pnpm --filter admin build`, then `pnpm run test:e2e` from the repository root. Playwright starts the production server automatically. Set `CAPTURE_SCREENSHOTS=1` to write review images to `docs/EVIDENCE/T2-screenshots`. These are static shell checks; they do not prove authentication or tenant authorization.
