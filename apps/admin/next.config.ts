import type { NextConfig } from 'next';

/**
 * Security response headers for the staff admin (REQ 37, §16 gate 12). Admin
 * authenticates to the backend with a Supabase access token sent as an
 * `Authorization: Bearer` header (held in the browser, never an ambient cookie),
 * so it is not exposed to CSRF; these headers add transport hardening,
 * clickjacking protection, and a Content-Security-Policy that pins the origins
 * admin actually talks to. Origins are derived from the public env the app uses.
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

function dedupe(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_BASE_URL);
const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const sentryOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);

function buildCsp(): string {
  const scriptExtra = isProduction ? [] : ["'unsafe-eval'"];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'script-src': dedupe(["'self'", "'unsafe-inline'", ...scriptExtra]),
    // Backend API, Supabase Auth (token verification + refresh), and Sentry.
    'connect-src': dedupe(["'self'", apiOrigin, supabaseOrigin, sentryOrigin, 'https:']),
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@canadian-plans/contracts', '@canadian-plans/types', '@canadian-plans/ui'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: buildCsp() },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
