# T3 — Site 1 scaffold verification

Verified locally on 14 September 2026 with Node 22.19.0 and pnpm 9.15.0.

## Result

Site 1 builds with all seven requested public routes and the optional catch-all
Studio route. Public and server configuration are separate. The backend transport
uses the existing shared health schema, server-only credentials, request IDs,
no-store requests and redirect rejection. No DB client or DB package was added.

Studio uses the official NextStudio wrapper, disconnected setup content and
noindex metadata. No Sanity project was created. Project connection, shared CMS
schemas and editor gating remain T9. The storefront and Studio have separate
layouts; Studio does not load storefront analytics.

Umami loads when both public configuration fields are populated and is absent
when empty. Automatic collection remains disabled pending sanitized events in
T20. Name and domain remain recorded, unresolved, in OPEN_INPUTS #1/#2.

## Checks

| Check                                      | Result                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Frozen offline install                     | Passed; lockfile up to date                                                  |
| Repository type checks                     | All apps/packages passed                                                     |
| Shared ESLint and formatting               | Passed                                                                       |
| Tooling tests                              | 46 passed, including site-1 DB exclusion and affected builds                 |
| Vitest                                     | 28 passed across 5 files, including 13 site-1 transport cases                |
| Production builds                          | site-1, admin and backend passed                                             |
| Deliberate client import of backend.config | Next.js rejected the server-only import                                      |
| Synthetic credential scan                  | Absent from 45 browser assets and 40 rendered payloads in each configuration |
| Site-1 Playwright                          | 22 passed with Umami configured; 22 passed with it empty                     |
| Admin Playwright regression                | 24 passed                                                                    |

Browser checks cover desktop/mobile routes, Studio subroutes and noindex,
JavaScript errors, horizontal overflow, keyboard navigation, analytics loading
and absence of the synthetic credential in live HTML. Analytics requests are
fulfilled by the test runner; no real collection service is contacted.

Raw evidence: [security builds and browser tests](T3-security.txt),
[repository type checks](T3-typecheck.txt),
[admin regression](T3-admin-regression.txt).

## Integration changes

The root browser command and CI include site-1's security suite. Affected-build
tests now account for the third app. Shared Vitest defaults use `satisfies` to
preserve their narrow inferred type across the Vite versions required by tooling.

Sanity's CLI dependency selected a skills release incompatible with the pinned
Node runtime. Sanity 5.29.0 and a scoped skills 1.5.7 override preserve that runtime;
the rationale and future upgrade action are in the site README. The install still
reports a CLI-only tsconfck peer preference for TypeScript 5; the project's strict
TypeScript 6 checks and application builds pass. Sanity CLI provisioning was not
run in this task.

See [site-1 README](../../apps/site-1/README.md) for exact commands, configuration
boundaries and deferred work. Existing unrelated working-tree changes were preserved.
