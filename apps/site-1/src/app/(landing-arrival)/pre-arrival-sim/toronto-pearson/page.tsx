import type { Metadata } from 'next';
import { arrivalChrome } from '@content/pre-arrival';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { torontoPearsonLanding, torontoPearsonPlanHeading } from '@content/landing/toronto-pearson';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { PlanPicker } from '@/components/pre-arrival/interactive';
import { componentAssets } from '@content/components';
import { LandingPage } from '@/components/landing/landing-page';
import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';

const siteFooterBrand = 'Canadian Plans';
const page = torontoPearsonLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots('/pre-arrival-sim/toronto-pearson'),
});

export default function TorontoPearsonPage() {
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
          plans: <PlanPicker defaultAudience="student" heading={torontoPearsonPlanHeading} />,
        }}
      />
      <Footer brand={siteFooterBrand} content={siteFooter} assets={componentAssets} brandHref="/" />
    </>
  );
}
