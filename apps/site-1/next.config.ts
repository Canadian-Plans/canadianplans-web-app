import type { NextConfig } from 'next';

/**
 * Security response headers (REQ 37, §16 gate 12). Applied to every route via
 * Next's `headers()`. The storefront gets a strict Content-Security-Policy; the
 * embedded Sanity Studio at `/studio` needs a relaxed variant (`'unsafe-eval'`,
 * blob workers, the Sanity realtime socket), so it has its own block below.
 *
 * Origins are derived from the same public env the app already uses, so the CSP
 * follows the deployment instead of hard-coding hosts. Local dev additionally
 * needs `'unsafe-eval'` for React Refresh / HMR, gated on NODE_ENV.
 */
const isProduction = process.env.NODE_ENV === 'production';

function originOf(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_BASE_URL);
const umamiOrigin = originOf(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL);
const sentryOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);

// Sanity CDN / API hosts used by the storefront queries and the embedded Studio.
const SANITY_CONNECT = ['https://*.sanity.io', 'https://*.apicdn.sanity.io', 'wss://*.api.sanity.io'];
const SANITY_IMG = ['https://cdn.sanity.io'];

function dedupe(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function buildCsp(scope: 'storefront' | 'studio'): string {
  const scriptExtra = !isProduction || scope === 'studio' ? ["'unsafe-eval'"] : [];
  const connect = dedupe([
    "'self'",
    apiOrigin,
    umamiOrigin,
    sentryOrigin,
    // Signed R2 download URLs are same-scheme https fetches issued by the backend.
    'https:',
    ...(scope === 'studio' ? SANITY_CONNECT : []),
  ]);
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': scope === 'studio' ? ["'self'"] : ["'none'"],
    'form-action': ["'self'"],
    'img-src': dedupe(["'self'", 'data:', 'blob:', 'https:', ...SANITY_IMG]),
    'font-src': ["'self'", 'data:'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'script-src': dedupe(["'self'", "'unsafe-inline'", umamiOrigin, ...scriptExtra]),
    'connect-src': connect,
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

function commonSecurityHeaders(frameOption: 'DENY' | 'SAMEORIGIN') {
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: frameOption },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
  ];
}

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@canadian-plans/ui'],
  async headers() {
    return [
      {
        source: '/studio/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: buildCsp('studio') },
          ...commonSecurityHeaders('SAMEORIGIN'),
        ],
      },
      {
        // Every route except the embedded Studio, which has its own block above.
        source: '/((?!studio).*)',
        headers: [
          { key: 'Content-Security-Policy', value: buildCsp('storefront') },
          ...commonSecurityHeaders('DENY'),
        ],
      },
    ];
  },
};

export default config;
