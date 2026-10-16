import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SkipLink } from '@canadian-plans/ui';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import {
  internetOrderAssets as assets,
  internetOrderCopy as copy,
  selectInternetOrderPlan,
  internetOrderSummaryFor,
} from '@content/internet-order';
import { HomeInternetOrderForm } from '@/components/internet-order/form';
import { InternetOrderSummary } from '@/components/internet-order/summary';
import { BrandMark } from '@/components/shared/brand-mark';
export const metadata: Metadata = pageMetadata('/order/home-internet', {
  title: copy.title,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
});
export default async function InternetOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const plan = selectInternetOrderPlan((await searchParams).plan);
  if (!plan) notFound();
  const summary = internetOrderSummaryFor(plan);
  return (
    <>
      <SkipLink href="#io-main" className="cp-io-skip">
        {copy.skip}
      </SkipLink>
      <header className="cp-io-header">
        <div className="cp-container">
          <a href="/" className="cp-brand" aria-label={`${copy.brand} home`}>
            <BrandMark />
          </a>
          <div className="cp-io-desktop-help">
            <strong>{copy.header.payment}</strong>
            <a href={copy.destinations.contact}>{copy.header.help}</a>
          </div>
          <CpButton asChild tone="outline-brand" className="cp-io-call">
            <a href={copy.destinations.contact}>
              <CpAsset asset={assets.phone} />
              {copy.header.call}
            </a>
          </CpButton>
        </div>
      </header>
      <main id="io-main" tabIndex={-1} className="cp-container cp-io-body">
        <details className="cp-io-mobile-summary">
          <summary>
            <div>
              <strong>{summary.compactTitle}</strong>
              <p>{summary.compactPrice}</p>
            </div>
            <span>
              {copy.summary.details}
              <CpAsset asset={assets.chevron} />
            </span>
          </summary>
          <InternetOrderSummary plan={plan} />
        </details>
        <HomeInternetOrderForm key={plan.id} plan={plan} />
        <aside className="cp-io-desktop-summary">
          <InternetOrderSummary plan={plan} />
        </aside>
      </main>
    </>
  );
}
