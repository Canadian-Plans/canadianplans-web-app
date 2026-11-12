import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The response-header policy lives in next.config.ts. The browser suite
 * (e2e/security-headers.spec.ts) checks it on a running server; this checks the
 * same policy without one, so it runs with every unit-test pass.
 */
type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<HeaderRule[]> {
  vi.resetModules();
  const { default: config } = await import('../../next.config');
  return (await config.headers?.()) ?? [];
}

function headersFor(all: HeaderRule[], source: string): Record<string, string> {
  const rule = all.find((entry) => entry.source === source);
  if (!rule) throw new Error(`No header rule for ${source}`);
  return Object.fromEntries(rule.headers.map(({ key, value }) => [key.toLowerCase(), value]));
}

const STOREFRONT = '/((?!studio).*)';
const STUDIO = '/studio/:path*';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('security response headers', () => {
  it('hardens every storefront route', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const headers = headersFor(await rules(), STOREFRONT);
    expect(headers['strict-transport-security']).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['permissions-policy']).toContain('camera=()');

    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('frame-src https://challenges.cloudflare.com');
    expect(csp).toContain("font-src 'self' data:;");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    // A local production build is plain http; only a deployment upgrades requests.
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('upgrades insecure requests on a deployment', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    const csp = headersFor(await rules(), STOREFRONT)['content-security-policy'] ?? '';
    expect(csp).toMatch(/; upgrade-insecure-requests$/u);
  });

  it('allows only the configured analytics origin to run script', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_UMAMI_SCRIPT_URL', 'https://stats.example.test/script.js');
    const csp = headersFor(await rules(), STOREFRONT)['content-security-policy'] ?? '';
    const scriptSrc = csp.split('; ').find((part) => part.startsWith('script-src '));
    expect(scriptSrc).toBe(
      "script-src 'self' 'unsafe-inline' https://stats.example.test https://challenges.cloudflare.com",
    );
  });

  it('gives the Studio its own relaxed policy and same-origin framing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const headers = headersFor(await rules(), STUDIO);
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('wss://*.api.sanity.io');
    expect(csp).toContain("frame-ancestors 'self'");
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    expect(headers['strict-transport-security']).toBeDefined();
  });

  it('keeps editor and machine routes out of search and caches public files', async () => {
    const all = await rules();
    expect(headersFor(all, '/:area(studio|api)/:path*')['x-robots-tag']).toBe('noindex, nofollow');
    expect(headersFor(all, '/:folder(brand|design|images)/:path*')['cache-control']).toBe(
      'public, max-age=86400, stale-while-revalidate=604800',
    );
  });

  it('does not advertise the framework', async () => {
    vi.resetModules();
    const { default: config } = await import('../../next.config');
    expect(config.poweredByHeader).toBe(false);
  });
});
