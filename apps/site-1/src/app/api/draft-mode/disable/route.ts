import { draftMode } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  (await draftMode()).disable();
  const response = NextResponse.redirect(new URL('/', request.url));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
