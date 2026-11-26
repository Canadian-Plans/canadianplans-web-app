import { NextResponse, type NextRequest } from 'next/server';

import { CAMPAIGN_COOKIE, campaignCookieValue } from './lib/attribution';

/**
 * Remembers the campaign a visitor lands with (utm_* and partner code), on any
 * page, in a session cookie, so `/order` can attribute an order placed later in
 * the visit. A request without campaign parameters passes through untouched; a
 * new campaign link replaces the remembered one (last touch). Values are
 * screened by the same rules as the order's attribution before they are stored.
 */
export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const { searchParams, pathname } = request.nextUrl;
  if (searchParams.size === 0) return response;
  const value = campaignCookieValue(
    Object.fromEntries(searchParams),
    pathname,
    request.cookies.get(CAMPAIGN_COOKIE)?.value,
  );
  if (value) {
    response.cookies.set(CAMPAIGN_COOKIE, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  return response;
}

export const config = {
  // Pages only: never static assets, images, the API or Studio.
  matcher: [
    '/((?!_next/|api/|studio|favicon|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|.*\\.[a-z0-9]+$).*)',
  ],
};
