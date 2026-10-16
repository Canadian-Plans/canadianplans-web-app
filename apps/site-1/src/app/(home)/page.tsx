import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { componentAssets } from '@content/components';
import { homeCopy } from '@content/home';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { RedesignHero } from '@/components/home/redesign/hero';
import { RedesignHowItWorks } from '@/components/home/redesign/how-it-works';
import {
  CategoryExplorer,
  CategoryPicker,
  FinalCta,
  RedesignFaq,
  ServiceColumns,
  Testimonials,
} from '@/components/home/redesign/sections';

export const metadata: Metadata = pageMetadata('/', {
  title: homeCopy.title,
  robots: { index: false, follow: false },
});

/** Electric Blue homepage (14 October 2026; final design pass 16 October 2026). */
export default function HomePage() {
  return (
    <>
      <a href="#main-content" className="cp-home-skip">
        {homeCopy.skip}
      </a>
      <SiteHeader content={siteChrome} planHref="/pre-arrival-sim#plans" promo={false} />
      <main id="main-content" tabIndex={-1}>
        <RedesignHero />
        <CategoryPicker />
        <ServiceColumns />
        <CategoryExplorer />
        <RedesignHowItWorks />
        <Testimonials />
        <RedesignFaq />
        <FinalCta />
      </main>
      <Footer
        brand={siteChrome.brand}
        content={siteFooter}
        assets={componentAssets}
        brandHref="/"
      />
    </>
  );
}
