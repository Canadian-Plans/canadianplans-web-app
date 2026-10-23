import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { internetLandingPage as page, internetLandingShared } from '@content/home-internet-landing';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { siteChrome, siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { InternetLanding } from '@/components/home-internet/landing';
import { InternetStickyCta } from '@/components/home-internet/sticky';

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots(page.path),
});

/**
 * Home internet landing page (23 October 2026): one card per province, then everything
 * about the service. Copy: content/home-internet-landing.ts; composition: components/home-internet.
 */
export default function HomeInternetPage() {
  return (
    <>
      <a href={`#${internetLandingShared.mainId}`} className="cp-hi-skip">
        {internetLandingShared.skip}
      </a>
      <SiteHeader
        planHref={page.hero.primary.href}
        content={siteChromeWithPromo(
          internetLandingShared.promo.text,
          internetLandingShared.promo.link,
        )}
      />
      <InternetLanding page={page} />
      <InternetStickyCta title={page.sticky.title} detail={page.sticky.detail} />
      <Footer brand={siteChrome.brand} content={siteFooter} brandHref="/" />
    </>
  );
}
