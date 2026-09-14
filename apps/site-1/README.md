# Site 1 storefront scaffold

Next.js App Router storefront for the first brand. Public pages are placeholders:
`/`, `/plans`, `/plans/[slug]`, `/order`, `/track`, `/privacy` and `/terms`.
No prices, policies, orders, tracking or authentication are implemented.

Use `pnpm --filter site-1 dev` from the repository root (port 3001). Shared strict
TypeScript, ESLint, design tokens and UI primitives apply. The site never imports
DB packages, backend implementation or server-only adapters.

## Configuration boundaries

`src/site.config.ts` is public: site ID/slug, unresolved name, CAD, en-CA and public
Umami configuration. Site name/domain remain open in `docs/OPEN_INPUTS.md` #1/#2;
no domain or brand has been invented.

`src/backend.config.ts` is server-only. It reads `SITE_1_BACKEND_URL` (an HTTPS
origin, or HTTP localhost for development) and `SITE_1_SERVICE_CREDENTIAL` lazily.
Never prefix these names with NEXT_PUBLIC, export them from public configuration,
or pass their values into React props or Studio. Placeholder pages need no secrets.

`src/lib/backendClient.ts` is a server-only fetch transport until the shared typed
client exists. It attaches scoped Bearer authorization and a fresh request ID,
disables caching and redirects, and only accepts paths under `/api/v1/`. The health
helper validates through the existing contracts schema. It is not a browser proxy.

## Studio and analytics

`/studio/[[...tool]]` uses the official NextStudio wrapper and noindex metadata.
With no public Sanity project ID/dataset it renders a disconnected setup shell,
without attempting a fake project connection. T9 must configure this site's own
project, shared CMS schema types and editor access before editing is operational.
Noindex is not access control. Studio has its own layout, without storefront
navigation, Tailwind resets or analytics.

Umami loads only when both `NEXT_PUBLIC_UMAMI_SCRIPT_URL` and
`NEXT_PUBLIC_UMAMI_WEBSITE_ID` are nonempty at build time. Automatic tracking is
disabled until T20 implements sanitized events; the configured script still loads.
This prevents raw paths/referrers from being collected by the placeholder scaffold.
Search/hash exclusion and Do Not Track attributes are set as additional safeguards.

## Verification

- `pnpm --filter site-1 test`: transport success and failure cases.
- `pnpm --filter site-1 build`: credential-free production build.
- `pnpm --filter site-1 exec playwright test`: desktop/mobile journeys against the
  default analytics-disabled build on port 3101.
- `pnpm --filter site-1 test:security`: deliberately fails a client import of
  server configuration, then builds with a random synthetic credential and tests
  both enabled and disabled Umami configurations. Scans browser assets and rendered
  payloads for leaks and checks live HTML in Playwright. The analytics request is
  intercepted locally; no real analytics or backend service is contacted.

Install Chromium with `pnpm --filter site-1 exec playwright install chromium`.
The root `test:e2e` command and CI include the security/browser suite. Run it
without another site-1 build or server using the same output directory. It leaves
an analytics-disabled build and removes its temporary boundary probe source.

Sanity 5.29.0 satisfies next-sanity 13.3.4's peer range and the repository Node
22.19.0 baseline. The scoped `@sanity/cli>skills` override pins 1.5.7 within the
CLI's declared range: newer skills releases require Node 22.20.0. Revisit this
override with a deliberate runtime upgrade. The pinned Sanity/client/styling
dependencies support the official Studio integration; server-only enforces the
credential boundary.

References: [official Studio setup](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs)
and [Umami tracker configuration](https://docs.umami.is/docs/tracker-configuration).
