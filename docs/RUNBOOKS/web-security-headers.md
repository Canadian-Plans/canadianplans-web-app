# Web security headers, CSRF and SameSite (REQ 37, §16 gate 12)

Covers the browser-facing security posture of the storefront (`site-1`) and the
staff admin (`admin`). Backend abuse controls (Turnstile bot check, per-IP /
per-credential and per-endpoint rate limits) are in [ENV.md](../ENV.md) and the
website route middleware.

## Response headers

Both apps set these on every route via Next's `headers()`
([`apps/site-1/next.config.ts`](../../apps/site-1/next.config.ts),
[`apps/admin/next.config.ts`](../../apps/admin/next.config.ts)):

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | see below | Restrict script/connect/img/frame sources |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` (storefront/admin), `SAMEORIGIN` (`/studio`) | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | No PII in referrers (invariant 12) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Deny unused APIs |

### CSP

The CSP is built from the app's own public env (`NEXT_PUBLIC_API_BASE_URL`,
Supabase / Sanity / Umami / Sentry origins), so it follows each deployment
instead of hard-coding hosts. `frame-ancestors 'none'`, `object-src 'none'`,
`base-uri 'self'` and `form-action 'self'` are fixed.

- `'unsafe-eval'` is present only in local dev (React Refresh/HMR) and on the
  storefront's embedded Sanity Studio (`/studio`), which also needs the Sanity
  realtime socket (`wss://*.api.sanity.io`) and same-origin framing. Production
  storefront and admin pages carry **no** `'unsafe-eval'` — asserted by
  `apps/site-1/e2e/security-headers.spec.ts` against the built server.
- `'unsafe-inline'` remains in `script-src`/`style-src` because neither app uses
  nonce-based CSP yet. Nonce hardening is a tracked follow-up; it does not block
  this gate.

Verify live: `curl -sI https://<host>/` and `curl -sI https://<host>/studio`.

## CSRF and SameSite

**Neither app has a cookie-authenticated mutation, so classic CSRF does not
apply.** The credential is a bearer token in a request header the browser cannot
be tricked into attaching cross-site:

- **admin → backend**: the staff Supabase access token is held in the browser
  (localStorage via `persistSession`) and sent as `Authorization: Bearer`. No
  ambient session cookie authorizes a mutation. The backend additionally pins
  the admin `Origin` via its CORS allowlist (`ADMIN_ORIGIN`).
- **storefront → backend**: server-to-server with a scoped service credential
  (`Authorization: Bearer`), plus the draft-grant (`X-Draft-Grant`) and
  customer-grant (`X-Customer-Grant`) header tokens. None are cookies.
- **Supabase Auth cookies**: not used — the app uses the browser SDK, not the
  `@supabase/ssr` cookie flow. If a cookie-based session is ever introduced, it
  must be `SameSite=Lax` (or `Strict`) + `Secure` + `HttpOnly`, and any
  cookie-authenticated mutation must then add a CSRF token or origin check.

If a future feature adds a cookie-authenticated mutation, this posture changes
and must be revisited here.
