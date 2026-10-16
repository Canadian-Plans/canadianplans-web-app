import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { homeCopy } from '@content/home';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { HomeHero } from '@/components/home/design/hero';
import { HomePicker } from '@/components/home/design/picker';
import { HomeServiceColumns } from '@/components/home/design/service-columns';
import { HomeExplorer } from '@/components/home/design/explorer';
import { HomeHowItWorks } from '@/components/home/design/how-it-works';
import { HomeStories } from '@/components/home/design/stories';
import { HomeFaq } from '@/components/home/design/faq';
import { HomeFinalCta } from '@/components/home/design/final-cta';

export const metadata: Metadata = pageMetadata('/', {
  title: homeCopy.title,
  robots: { index: false, follow: false },
});

/**
 * Homepage built to the owner's final homepage export (16 October 2026): every section is
 * a home design component on the `--cp-hd-*` tokens (see src/app/(home)/home-design.css).
 */
export default function HomePage() {
  return (
    <>
      <a href="#main-content" className="cp-hd-skip">
        {homeCopy.skip}
      </a>
      <SiteHeader content={siteChrome} planHref="/pre-arrival-sim#plans" promo={false} />
      <main id="main-content" tabIndex={-1} className="cp-hd-main">
        <HomeHero />
        <HomePicker />
        <HomeServiceColumns />
        <HomeExplorer />
        <HomeHowItWorks />
        <HomeStories />
        <HomeFaq />
        <HomeFinalCta />
      </main>
      <Footer brand={siteChrome.brand} content={siteFooter} brandHref="/" />
    </>
  );
}
