import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { componentAssets } from '@content/components';
import { homeChrome, homeCopy, homeFooter } from '@content/home';
import { Footer, UtilityBar } from '@/components/shared/chrome';
import { HomeNavigation, PopularPlans } from '@/components/home/interactive';
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

/** Electric Blue homepage (14 October 2026). */
export default function HomePage() {
  return (
    <>
      <a href="#main-content" className="cp-home-skip">
        {homeCopy.skip}
      </a>
      <UtilityBar content={homeChrome} assets={componentAssets} planHref="#popular-plans" />
      <HomeNavigation />
      <main id="main-content" tabIndex={-1}>
        <RedesignHero />
        <CategoryPicker />
        <ServiceColumns />
        <CategoryExplorer />
        <PopularPlans />
        <RedesignHowItWorks />
        <Testimonials />
        <RedesignFaq />
        <FinalCta />
      </main>
      <Footer brand={homeChrome.brand} content={homeFooter} assets={componentAssets} brandHref="/" />
    </>
  );
}
