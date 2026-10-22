import type { Metadata } from 'next';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { studentsLanding, studentsPlanHeading } from '@content/landing/students';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { PlanPicker } from '@/components/pre-arrival/interactive';
import { componentAssets } from '@content/components';
import { LandingPage } from '@/components/landing/landing-page';
import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';

const siteFooterBrand = 'Canadian Plans';
const page = studentsLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots('/pre-arrival-sim/students'),
});

export default function StudentsPage() {
  return (
    <>
      <a className="cp-arrival-skip" href={`#${page.mainId}`}>
        {page.skip}
      </a>
      <SiteHeader
        planHref="#plans"
        content={siteChromeWithPromo('Moving in? Add home internet from $55/mo.', {
          label: 'See home internet →',
          href: '/home-internet',
        })}
      />
      <LandingPage
        content={page}
        slots={{ plans: <PlanPicker defaultAudience="student" heading={studentsPlanHeading} /> }}
      />
      <Footer brand={siteFooterBrand} content={siteFooter} assets={componentAssets} brandHref="/" />
    </>
  );
}
