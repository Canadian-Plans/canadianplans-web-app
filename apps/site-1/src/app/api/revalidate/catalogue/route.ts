import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

function authorized(request: Request): boolean {
  const configured = process.env.SITE_1_REVALIDATE_SECRET;
  const header = request.headers.get('authorization');
  if (!configured || !header?.startsWith('Bearer ')) return false;
  return timingSafeEqual(digest(header.slice(7)), digest(configured));
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('productKey' in body) ||
    typeof body.productKey !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{0,119}$/.test(body.productKey)
  ) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  revalidatePath('/plans', 'layout');
  return NextResponse.json({ revalidated: true });
}
