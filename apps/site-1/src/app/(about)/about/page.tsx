import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { aboutPage as page } from '@content/about';
import { componentAssets } from '@content/components';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { LandingPage } from '@/components/landing/landing-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: { index: false, follow: false },
});

/** Electric Blue landing kit (15 October 2026). */
export default function AboutPage() {
  return (
    <>
      <SkipLink href={`#${page.mainId}`} className="cp-landing-skip">
        {page.skip}
      </SkipLink>
      <SiteHeader
        planHref="/pre-arrival-sim#plans"
        content={siteChromeWithPromo(
          'Order your Canadian eSIM before you fly. It works from any country.',
          { label: 'See SIM plans →', href: '/pre-arrival-sim#plans' },
        )}
      />
      <LandingPage content={page} />
      <Footer brand="Canadian Plans" content={siteFooter} assets={componentAssets} brandHref="/" />
    </>
  );
}
