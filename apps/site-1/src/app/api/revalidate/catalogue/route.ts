import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Cache tag for one product's catalogue page. The stable CMS identifier is the
 * `productKey`, while the storefront route is `/plans/[slug]` and that slug is
 * the product's title-derived (and therefore mutable) slug — so the page path
 * cannot be derived from the key alone. The plan page attaches this tag to its
 * catalogue read, which lets revalidation invalidate exactly the changed
 * product's cached page without touching the others.
 */
function catalogueTag(productKey: string): string {
  return `plan:${productKey}`;
}

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

  // Per-product invalidation keyed by the stable CMS product key (the tag the
  // plan page reads under), plus the /plans index, which lists every product
  // and therefore also changes. The index is revalidated as a single page
  // rather than with the previous `revalidatePath('/plans', 'layout')`, which
  // also invalidated every per-product page on any one product's change.
  // `{ expire: 0 }` is the Next.js-recommended profile for a webhook/route-handler
  // invalidation that must take effect immediately (see revalidateTag docs).
  revalidateTag(catalogueTag(body.productKey), { expire: 0 });
  revalidatePath('/plans');
  return NextResponse.json({ revalidated: true });
}
