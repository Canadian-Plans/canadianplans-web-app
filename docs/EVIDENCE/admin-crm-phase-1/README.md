# Admin CRM Phase 1 — Orders list captures

Date: 27 October 2026. Branch `feat/admin-crm-orders`.

What was run: the admin dev server on `127.0.0.1` with the browser-test session seam
(`NEXT_PUBLIC_E2E_STAFF_BEARER`), against a throwaway local fixture backend serving 37
synthetic orders ("Test Customer A–E", `example.test` emails). The fixture backend and the
capture script lived in the session scratchpad and are not part of the repo. Headless
installed Chrome (Playwright, `channel: 'chrome'`) took the captures; no page errors were
reported.

| File | What it shows |
| --- | --- |
| `1-orders-list.png` | 1440px: dark Twenty-style frame, 220px sidebar, 48px header with count, view bar, 32px table with status tags. |
| `2-filter-menu.png` | Filter panel after choosing the Status field. |
| `3-filtered-with-side-panel.png` | Status chip, Reset and "Save as new view", and order CP-001003 open in the side panel. |
| `4-saved-view-switcher.png` | The saved view "Waiting on customer" selected, with rename and delete. |
| `5-phone-list.png` | 375px: stacked order list and compact view bar. |

Not shown here: the real backend and Postgres. Those journeys are covered by
`apps/admin/e2e/orders.spec.ts`, which runs in CI against the backend harness.
