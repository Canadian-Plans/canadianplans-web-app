import type { WebsiteOffer } from '@/lib/offers';
import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Card, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';
import { productTypeSchema, provinceFromName } from '@canadian-plans/contracts';

import { getBackendClient } from '@/lib/backendClient';
import { captureRawAttribution, type SearchParams } from '@/lib/attribution';
import { offersFromPlans } from '@/lib/offers';
import { hasSavedLead, readOrderDraft } from './draft';
import { OrderForm } from './order-form';
import { selectOrderDraft, type SavedOrderDraft } from './resume';

export const metadata: Metadata = pageMetadata('/order', {
  title: 'Order a plan',
  robots: { index: false, follow: false },
  // Preview/non-production noindex is applied centrally in the root layout (REQ 10).
});

/**
 * Step 1 (server side). The plan list comes from the CRM (`GET /website/plans`)
 * through the typed client, so the browser never holds the site's key. The
 * price shown is display only: the CRM looks it up again and freezes it when
 * the order is submitted. Attribution is captured here, from the URL and the
 * referrer header, and passed to the form for the lead save.
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
  let savedDraft: SavedOrderDraft | undefined;
  // Only a SIM order has a draft in the CRM to read back.
  if (hasSavedLead(draft)) {
    try {
      const saved = (
        await getBackendClient().leads.read(draft.leadId, { draftGrant: draft.draftGrant })
      ).draft;
      savedDraft = {
        productId: saved.order?.planId ?? draft.productId,
        contact: saved.contact,
        form: saved.form,
      };
    } catch {
      // Expired, revoked and submitted drafts never prefill personal details.
      // Keep the cookie so an uncertain submission can still retry its exact key.
    }
  }

  let offers: WebsiteOffer[] = [];
  let loadFailed = false;
  try {
    const response = await getBackendClient().plans.list();
    offers = offersFromPlans(response.plans);
  } catch {
    loadFailed = true;
  }

  // Internet and TV are priced by province, chosen by name (or code) in the picker.
  const requestedProvince = typeof params['province'] === 'string' ? params['province'] : undefined;
  const province = requestedProvince ? provinceFromName(requestedProvince) : undefined;
  const category = productTypeSchema.safeParse(params['category']);
  const requestedPlan = typeof params['plan'] === 'string' ? params['plan'] : undefined;
  const restored = selectOrderDraft({
    offers,
    draft: savedDraft,
    requestedPlan,
    province,
    category: category.success ? category.data : undefined,
  });
  const selected = restored.selected;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Order a plan</h1>
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
          key={`${selected?.productId ?? 'plan-list'}:${restored.province ?? ''}`}
          offers={offers}
          selected={selected}
          province={restored.province}
          category={category.success ? category.data : undefined}
          attribution={attribution}
          restoredDetails={restored.details}
        />
      )}
    </div>
  );
}
