import { expect, test } from './fixtures';

/**
 * REQ 37 / §16 gate 12 — security response headers on the storefront.
 *
 * Runs against the built (`next start`) storefront the Playwright config boots,
 * so it asserts the REAL production Content-Security-Policy — in particular that
 * production `script-src` does NOT carry `'unsafe-eval'` (only dev/HMR and the
 * embedded Studio need it). Header wiring itself is also verified live via curl
 * during development.
 */

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
} as const;

test('storefront routes carry the hardened security headers', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(headers[name], `missing/incorrect ${name}`).toBe(value);
  }
  expect(headers['x-frame-options']).toBe('DENY');

  const csp = headers['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("base-uri 'self'");
  expect(csp).toContain('https://challenges.cloudflare.com');
  expect(csp).toContain('frame-src https://challenges.cloudflare.com');
  expect(csp).toContain("font-src 'self' data:;");
  // Production must not permit eval on the storefront surface.
  expect(csp).not.toContain("'unsafe-eval'");
});

test('embedded Studio gets its own relaxed CSP and same-origin framing', async ({ request }) => {
  const response = await request.get('/studio');
  const headers = response.headers();
  const csp = headers['content-security-policy'] ?? '';

  // Studio needs eval, the Sanity realtime socket, and same-origin framing.
  expect(csp).toContain("'unsafe-eval'");
  expect(csp).toContain('wss://*.api.sanity.io');
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toContain("font-src 'self' data: https://design-system-static.sanity.io");
  expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  // Transport hardening is still present on Studio.
  expect(headers['strict-transport-security']).toBe(SECURITY_HEADERS['strict-transport-security']);
});
