import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { CpBreadcrumb } from '@canadian-plans/ui/canadian-plans';
import { trackCopy as copy } from '@content/track';
import { trackingAssets } from '@content/track-order';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { pageMetadata } from '@/lib/page-metadata';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { TrackPageClient } from '@/components/track/track-page';
import { readTrackingGrant } from './grant';
import './track.css';

export const metadata: Metadata = pageMetadata('/track', {
  title: copy.title,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
});

/**
 * Live email-only order tracking (owner request, 25 Oct 2026), built on the
 * /track-order design. The flow is client-driven through server actions so the
 * service credential and tracking grant never reach the browser.
 */
export default async function Page() {
  // Only whether a grant exists: a new visitor gets the email form immediately.
  const hasSession = (await readTrackingGrant()) !== undefined;
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
      <TrackPageClient hasSession={hasSession} />
      <Footer
        brand={siteChrome.brand}
        content={siteFooter}
        assets={trackingAssets}
        brandHref={copy.destinations.home}
      />
    </>
  );
}
