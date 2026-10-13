import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { CpBreadcrumb } from '@canadian-plans/ui/canadian-plans';
import {
  trackingCopy as copy,
  trackingChrome,
  trackingAssets,
  trackingFooter,
  trackingFixtures,
} from '@content/track-order';
import { parseTrackingState } from '@/lib/tracking-preview';
import { Footer, UtilityBar } from '@/components/shared/chrome';
import { TrackingNavigation } from '@/components/track-order/navigation';
import { TrackingPageClient } from '@/components/track-order/page-client';
export const metadata: Metadata = pageMetadata('/track-order', {
  title: copy.title,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const { state } = await searchParams;
  const selected = parseTrackingState(state);
  return (
    <>
      <SkipLink href="#tracking-main" className="cp-tracking-skip">
        {copy.skip}
      </SkipLink>
      <UtilityBar
        content={trackingChrome}
        assets={{
          ...trackingAssets,
          phone: selected === 'lookup' ? trackingAssets.phone : trackingAssets.resultPhone,
        }}
        planHref={copy.destinations.plans}
      />
      <TrackingNavigation />
      <div className="cp-tracking-breadcrumb">
        <CpBreadcrumb
          label={copy.breadcrumbLabel}
          items={copy.breadcrumb}
          separator={copy.separator}
        />
      </div>
      <TrackingPageClient key={selected} fixture={trackingFixtures[selected]} />
      <Footer
        brand={trackingChrome.brand}
        content={trackingFooter}
        assets={trackingAssets}
        brandHref={copy.destinations.home}
      />
    </>
  );
}
