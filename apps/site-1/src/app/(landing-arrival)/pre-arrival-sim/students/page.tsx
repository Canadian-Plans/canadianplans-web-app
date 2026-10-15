import type { Metadata } from 'next';
import { arrivalChrome, arrivalChromeAssets, arrivalFooter } from '@content/pre-arrival';
import { studentsLanding, studentsPlanHeading } from '@content/landing/students';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import { ArrivalNavigation, PlanPicker } from '@/components/pre-arrival/interactive';
import { LandingPage } from '@/components/landing/landing-page';
import { pageMetadata } from '@/lib/page-metadata';

const page = studentsLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: { index: false, follow: false },
});

export default function StudentsPage() {
  return (
    <>
      <a className="cp-arrival-skip" href={`#${page.mainId}`}>
        {page.skip}
      </a>
      <UtilityBar content={arrivalChrome} assets={arrivalChromeAssets} planHref="#plans" />
      <ArrivalNavigation />
      <PromoStrip content={arrivalChrome} />
      <LandingPage
        content={page}
        slots={{ plans: <PlanPicker defaultAudience="student" heading={studentsPlanHeading} /> }}
      />
      <Footer
        brand={arrivalChrome.brand}
        content={arrivalFooter}
        assets={arrivalChromeAssets}
        brandHref="/"
      />
    </>
  );
}
