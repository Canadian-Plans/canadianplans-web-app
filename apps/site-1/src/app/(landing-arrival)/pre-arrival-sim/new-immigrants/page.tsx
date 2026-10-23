import type { Metadata } from 'next';
import { arrivalChrome } from '@content/pre-arrival';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { newImmigrantsLanding, newImmigrantsPlanHeading } from '@content/landing/new-immigrants';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { PlanPicker } from '@/components/pre-arrival/interactive';
import { componentAssets } from '@content/components';
import { LandingPage } from '@/components/landing/landing-page';
import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';

const siteFooterBrand = 'Canadian Plans';
const page = newImmigrantsLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots(page.path),
});

/** Audience landing page on the Electric Blue landing kit (23 October 2026). */
export default function NewImmigrantsPage() {
  return (
    <>
      <a className="cp-arrival-skip" href={`#${page.mainId}`}>
        {page.skip}
      </a>
      <SiteHeader
        planHref="#plans"
        content={siteChromeWithPromo(arrivalChrome.promo, {
          label: 'See home internet →',
          href: '/home-internet',
        })}
      />
      <LandingPage
        content={page}
        slots={{
          plans: <PlanPicker defaultAudience="resident" heading={newImmigrantsPlanHeading} />,
        }}
      />
      <Footer brand={siteFooterBrand} content={siteFooter} assets={componentAssets} brandHref="/" />
    </>
  );
}
