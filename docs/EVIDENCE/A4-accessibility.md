# A4 accessibility & SEO evidence (REQ 10, §16 gate 12)

Date: 2026-09-21

## Automated WCAG 2.1 AA (axe-core)

axe-core 4.10.2 (tags `wcag2a, wcag2aa, wcag21a, wcag21aa`) run against the
storefront (`site-1`) dev server. **Zero serious or critical violations**, and
exactly one `<h1>` on each page:

| Route    | serious/critical | lower (moderate/minor) | `<h1>`                    |
| -------- | ---------------- | ---------------------- | ------------------------- |
| `/`      | 0                | 0                      | 1                         |
| `/plans` | 0                | 0                      | 1                         |
| `/order` | 0                | 0                      | 1 ("Order your SIM plan") |
| `/track` | 0                | 0                      | 1                         |

The `/order` scan above is the initial render. The full multi-step order flow
(with a populated offer list from the backend) is scanned in CI by
`apps/site-1/e2e/accessibility.spec.ts`, which boots the built storefront against
the backend harness and enforces the same zero serious/critical gate plus the
one-`<h1>` assertion.

## SEO controls (REQ 10)

- `robots.txt` (`apps/site-1/src/app/robots.ts`) and `sitemap.xml`
  (`.../sitemap.ts`) verified against the real handlers.
  - Production (`VERCEL_ENV=production`): `allow /`, `disallow /studio, /api`,
    `sitemap`/`host` set; sitemap lists `/ , /plans, /order, /track, /privacy,
/terms` as absolute canonical URLs.
  - Non-production (preview/local): `Disallow: /` and an empty sitemap.
- Preview/non-production pages carry a page-level `noindex` (root layout).
- `/studio` is `noindex` (via `next-sanity` metadata) and disallowed in robots.

## Security headers

See `docs/RUNBOOKS/web-security-headers.md`; header presence verified live via
curl and a CI regression spec (`apps/site-1/e2e/security-headers.spec.ts`).

## Pending (needs a running production/staging deployment)

- **Lighthouse lab metrics**, recorded separately from field Core Web Vitals
  (gate 12). Requires the deployed site; not run here.
- The CI axe/header specs run under Playwright with the backend harness +
  Postgres, which is not available in this authoring environment; they are the
  durable regression guards.
