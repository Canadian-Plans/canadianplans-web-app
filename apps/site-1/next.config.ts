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
// A deployment (Vercel sets VERCEL_ENV) is always served over https; a local
// `next start` of the production build is not.
const isDeployed = isProduction && Boolean(process.env.VERCEL_ENV);

// A production build without a public origin would ship localhost canonicals and
// noindex everywhere (REQ 10); fail the build instead of silently losing SEO.
if (
  process.env.VERCEL_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_SITE_URL &&
  !process.env.VERCEL_PROJECT_PRODUCTION_URL
) {
  throw new Error('NEXT_PUBLIC_SITE_URL must be set for a production build.');
}

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
const SANITY_CONNECT = [
  'https://*.sanity.io',
  'https://*.apicdn.sanity.io',
  'https://*.sanity-cdn.com',
  'wss://*.api.sanity.io',
];
const SANITY_IMG = ['https://cdn.sanity.io'];
// The Studio loads its realtime/presentation bridge from the Sanity CDN.
const SANITY_STUDIO_SCRIPT = ['https://core.sanity-cdn.com'];
// Sanity Studio 6 (@sanity/ui 5) loads its Inter font from this origin.
const SANITY_STUDIO_FONT = ['https://design-system-static.sanity.io'];

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
    'frame-src': scope === 'storefront' ? ['https://challenges.cloudflare.com'] : ["'self'"],
    'img-src': dedupe(["'self'", 'data:', 'blob:', 'https:', ...SANITY_IMG]),
    'font-src': ["'self'", 'data:', ...(scope === 'studio' ? SANITY_STUDIO_FONT : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Inline event-handler attributes are never used (React attaches listeners in
    // script), so an injected `onclick="…"` cannot run even though inline <script>
    // blocks, which Next's streamed payload needs on static pages, stay allowed.
    'script-src-attr': ["'none'"],
    'script-src': dedupe([
      "'self'",
      "'unsafe-inline'",
      umamiOrigin,
      ...(scope === 'storefront' ? ['https://challenges.cloudflare.com'] : []),
      ...(scope === 'studio' ? SANITY_STUDIO_SCRIPT : []),
      ...scriptExtra,
    ]),
    'connect-src': connect,
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    // Any http:// subresource is fetched over https instead (production only:
    // a local production build is served over plain http).
    ...(isDeployed ? { 'upgrade-insecure-requests': [] } : {}),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}

function commonSecurityHeaders(frameOption: 'DENY' | 'SAMEORIGIN') {
  return [
    // No other origin may hold a window reference to a storefront page. The
    // Studio signs in through a provider popup, so it keeps popups it opens.
    {
      key: 'Cross-Origin-Opener-Policy',
      value: frameOption === 'DENY' ? 'same-origin' : 'same-origin-allow-popups',
    },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: frameOption },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value:
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()',
    },
  ];
}

// The files under /public are not content-hashed, so they cannot be immutable.
// A day in the browser and a week of serving the stale copy while it is
// re-fetched keeps repeat visits off the network without pinning an old logo.
const PUBLIC_ASSET_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';

const config: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework in an `X-Powered-By` response header.
  poweredByHeader: false,
  transpilePackages: ['@canadian-plans/ui'],
  images: {
    // AVIF first (about 20-30 % smaller than WebP for the photo covers), WebP for
    // browsers without it. The sources never change under the same name, so the
    // optimised copies are kept for a month instead of the default four hours.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2_592_000,
  },
  async headers() {
    return [
      {
        source: '/:folder(brand|design|images)/:path*',
        headers: [{ key: 'Cache-Control', value: PUBLIC_ASSET_CACHE }],
      },
      {
        // Editor and machine routes never belong in a search index, whatever links to them.
        source: '/:area(studio|api)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
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
