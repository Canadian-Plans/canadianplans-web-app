import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Card, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';
import type { WebsiteOffer } from '@canadian-plans/contracts';

import { siteConfig } from '@/site.config';
import { getBackendClient } from '@/lib/backendClient';
import { captureRawAttribution, type SearchParams } from '@/lib/attribution';
import { readOrderDraft } from './draft';
import { OrderForm } from './order-form';

export const metadata: Metadata = {
  title: 'Order a plan',
  // REQ 10: preview deployments are never indexed.
  robots: process.env.VERCEL_ENV === 'preview' ? { index: false, follow: false } : undefined,
};

/**
 * Step 1 (server side). The plan list comes from the backend's published-offer
 * read via the typed client, so the browser never receives a price it could
 * tamper with and never holds the site's service credential. Attribution is
 * captured here, from the URL and the referrer header, and passed to the form
 * for the lead save.
 */
export default async function OrderPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const headerList = await headers();
  const host = headerList.get('host');
  const origin = host ? `${headerList.get('x-forwarded-proto') ?? 'http'}://${host}` : undefined;
  const attribution = captureRawAttribution({
    searchParams: params,
    referrer: headerList.get('referer') ?? undefined,
    origin,
  });
  const draft = await readOrderDraft();

  let offers: WebsiteOffer[] = [];
  let loadFailed = false;
  try {
    const response = await getBackendClient().offers.list();
    offers = [...response.offers];
  } catch {
    loadFailed = true;
  }

  const requestedPlan = typeof params['plan'] === 'string' ? params['plan'] : undefined;
  const selected =
    offers.find((offer) => offer.productId === requestedPlan) ??
    (draft ? offers.find((offer) => offer.productId === draft.productId) : undefined);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Order your SIM plan</h1>
      {loadFailed ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl">Plans are unavailable right now</h2>
            </CardTitle>
            <CardDescription>
              We couldn&apos;t load the current plans. Please try again in a moment. No order has
              been created.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <OrderForm
          key={selected?.productId ?? 'plan-list'}
          offers={offers}
          selected={selected}
          attribution={attribution}
          consentVersion={siteConfig.legal.consentVersion}
          hasDraft={draft !== undefined}
        />
      )}
    </div>
  );
}
