import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SkipLink } from '@canadian-plans/ui';
import { CpBreadcrumb } from '@canadian-plans/ui/canadian-plans';
import { trackingCopy as copy, trackingAssets, trackingFixtures } from '@content/track-order';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { parseTrackingState } from '@/lib/tracking-preview';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
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
  // Owner decision (22 Oct 2026): design previews 404 in production; Vercel
  // previews and local builds keep them for design checks.
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const selected = parseTrackingState(state);
  // Site header (15 Oct 2026); the tracking result and lookup states are unchanged.
  return (
    <>
      <SkipLink href="#tracking-main" className="cp-tracking-skip">
        {copy.skip}
      </SkipLink>
      <SiteHeader
        planHref={copy.destinations.plans}
        content={{ ...siteChrome, track: { ...siteChrome.track, href: '#tracking-main' } }}
      />
      <div className="cp-tracking-breadcrumb">
        <CpBreadcrumb
          label={copy.breadcrumbLabel}
          items={copy.breadcrumb}
          separator={copy.separator}
        />
      </div>
      <TrackingPageClient key={selected} fixture={trackingFixtures[selected]} />
      <Footer
        brand={siteChrome.brand}
        content={siteFooter}
        assets={trackingAssets}
        brandHref={copy.destinations.home}
      />
    </>
  );
}
