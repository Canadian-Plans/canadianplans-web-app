# T1/T2 review evidence

Date: 14 September 2026. Scope: the monorepo scaffold and static admin shell requested by the owner. All project Markdown documents were read before improvements, including the complete platform context, detailed plans/requirements, owner playbook, both input registers, package READMEs, ADRs and existing evidence.

## Result

The original implementation was incomplete against T1/T2. The reviewed shell now passes the local checks below after correcting tooling boundaries, build selection, accessibility and missing verification evidence. These results cover a local scaffold, not production readiness.

## Findings and corrections

| Finding                                                                                                                | Correction                                                                                                                                                                                        | Evidence                                               |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| DB lint only caught static named package imports; direct DB clients and dynamic/relative paths could bypass it         | Shared boundary rule covers import/re-export/require/dynamic/type imports, direct DB SDKs and frontend imports of backend/provider code; full Supabase clients cannot escape auth-only extraction | Real CLI rejection plus tooling tests                  |
| Entire jobs/scripts trees had DB access                                                                                | Exact-file offline allowlist, currently empty; backend and defining DB package remain allowed                                                                                                     | Positive and negative importer tests                   |
| Config package lacked its own tsconfig/index/typecheck                                                                 | Added strict config-package setup and declared TypeScript dependency                                                                                                                              | All eight child workspace projects typecheck           |
| CI labelled unconditional builds as affected; Vercel script used app-relative git paths and omitted root configuration | Shared selector anchored at repo root, transitive workspace dependency graph, root-tooling invalidation, build-all fallback for missing history                                                   | Affected-build regression cases; full local builds     |
| Action/runtime versions were not all pinned                                                                            | Action commit SHAs, Node 22.19.0, pnpm 9.15.0 and Ubuntu 24.04                                                                                                                                    | Workflow and frozen-lockfile installation              |
| Admin pages lacked H1s and nested main landmarks                                                                       | Shared CardTitle asChild and a single focusable SidebarInset/main per route                                                                                                                       | Browser assertions on every route at both sizes        |
| Mobile navigation stayed open; hidden tooltips intercepted Escape; focus styling could be overridden                   | Close on route selection, mount tooltips only on collapsed desktop links, restore trigger focus, shared explicit focus outline                                                                    | Keyboard, focus trap, Escape and route-switching tests |
| No committed T2 screenshots/e2e suite; docs overstated completion and used missing paths                               | Added repeatable browser suite, fourteen screenshots, root forwarding links, current README and ADR corrections                                                                                   | Linked screenshots and logs below                      |

The workspace switcher remains static. No database schema, Supabase Auth, real data, provider account or deployment was added. The existing dark-only admin preference is preserved.

## Local verification

[Full local CI output](T1-T2-local-ci.txt) records installation, strict types, lint, formatting, tooling tests, unit/component tests, builds and Playwright. [Deliberate boundary failure output](T1-T2-boundary-demo.txt) records the real temporary file linted inside apps/admin and removed afterward.

```text
Frozen-lockfile install: passed
Strict typecheck: all 8 child projects passed
ESLint: passed
Prettier: passed
Tooling regression tests: 45 passed
Vitest: 4 files, 15 tests passed
Builds: backend and admin passed
Playwright: 24 passed (desktop and mobile)
Deliberate admin DB import + any + unchecked cast: 3 errors, exit 1 (expected)
```

Browser checks cover one H1/main, no page/console errors on every specified route, visible keyboard skip links, no horizontal overflow, sidebar navigation, current-page state, collapsed navigation, workspace switching that preserves the section, mobile focus trapping/dismissal/return, disabled login, denied-page navigation and a negative unknown-route case.

The workspace menu test waits for each focus movement before sending its next key, avoiding a false failure caused by sending keys before Radix finishes moving focus. Screenshots were also visually inspected.

## Screenshots

| Route               | Desktop (1440×900)                              | Mobile (390×844)                              |
| ------------------- | ----------------------------------------------- | --------------------------------------------- |
| /login              | [Desktop](T2-screenshots/login-desktop.png)     | [Mobile](T2-screenshots/login-mobile.png)     |
| /denied             | [Desktop](T2-screenshots/denied-desktop.png)    | [Mobile](T2-screenshots/denied-mobile.png)    |
| /w/site-1/orders    | [Desktop](T2-screenshots/orders-desktop.png)    | [Mobile](T2-screenshots/orders-mobile.png)    |
| /w/site-1/leads     | [Desktop](T2-screenshots/leads-desktop.png)     | [Mobile](T2-screenshots/leads-mobile.png)     |
| /w/site-1/partners  | [Desktop](T2-screenshots/partners-desktop.png)  | [Mobile](T2-screenshots/partners-mobile.png)  |
| /w/site-1/documents | [Desktop](T2-screenshots/documents-desktop.png) | [Mobile](T2-screenshots/documents-mobile.png) |
| /w/site-1/settings  | [Desktop](T2-screenshots/settings-desktop.png)  | [Mobile](T2-screenshots/settings-mobile.png)  |

Regenerate: build admin, set `CAPTURE_SCREENSHOTS=1`, then run `pnpm run test:e2e`. The server starts automatically on port 3100.

## Limits and later tasks

- The original ADR records shadcn MCP/preset use. No callable shadcn MCP was available during this review, so historical sourcing/template selection is documented rather than independently proven. Existing primitives were retained.
- CI commands ran locally on Windows. A hosted GitHub Actions run and deployed Vercel behavior were not invoked. Production promotion remains owner-controlled and requires checking the actual Vercel project settings.
- No schema/Auth/provider integration was tested because none belongs to these tasks. Site-1 implementation is T3; additional storefronts are Phase B. The admin's placeholder health fetch stays a scaffold until the shared generated client arrives in T7.
- Import lint is a development guardrail, not tenant isolation. New SDKs, aliases and network calls still require review; backend authorization and RLS arrive later.
- Existing `OPEN_INPUTS.md`, `docs/OPEN_INPUTS.md` and ADR 0000 are unchanged. Canonical detailed planning files remain in docs; root forwarding files fix prompt paths without duplicating their content.

## Changed documentation and rollback

README and four root planning forwarders; ADR 0001/0002; API and ENV; jobs/config/db/ui/e2e READMEs; this evidence file, CLI logs and screenshots. The task template and schema-history skeleton were reviewed and need no change.

Rollback is a source-control revert of the review changes. No external resources or schema migrations need rollback. Do not revert unrelated owner changes.

## Implementation references

[ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules), [Playwright configuration](https://playwright.dev/docs/test-configuration), [shadcn sidebar](https://ui.shadcn.com/docs/components/sidebar), and [Vercel project configuration](https://vercel.com/docs/project-configuration) were consulted for the relevant tooling contracts.
