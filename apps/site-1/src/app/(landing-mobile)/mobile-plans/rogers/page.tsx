import type { Metadata } from 'next';
import { CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { mobileChrome, mobileChromeAssets, mobileFooter } from '@content/mobile-plans';
import { rogersChrome, rogersLanding, rogersPlansHeading } from '@content/landing/rogers';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  MobilePlanBrowser,
  MobilePlansNavigation,
  MobilePlansProvider,
} from '@/components/mobile-plans/interactive';
import { LandingPage } from '@/components/landing/landing-page';
import { defaultMobileFilters } from '@/lib/mobile-plan-filters';
import { pageMetadata } from '@/lib/page-metadata';

const page = rogersLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: { index: false, follow: false },
});

export default function RogersPage() {
  return (
    <MobilePlansProvider initialFilters={{ ...defaultMobileFilters, brand: 'rogers' }}>
      <a className="cp-mobile-skip" href={`#${page.mainId}`}>
        {page.skip}
      </a>
      <UtilityBar content={mobileChrome} assets={mobileChromeAssets} planHref="#mobile-plans" />
      <MobilePlansNavigation />
      <PromoStrip content={rogersChrome} />
      <LandingPage
        content={page}
        slots={{
          plans: (
            <section id="mobile-plans" className="cp-mobile-list">
              <div className="cp-container">
                <div className="cp-mobile-list-heading">
                  <CpSectionHeading
                    content={{
                      eyebrow: rogersPlansHeading.eyebrow,
                      title: [rogersPlansHeading.title],
                    }}
                  />
                  <p className="cp-mobile-note">{rogersPlansHeading.note}</p>
                </div>
                <MobilePlanBrowser />
              </div>
            </section>
          ),
        }}
      />
      <Footer
        brand={mobileChrome.brand}
        content={mobileFooter}
        assets={mobileChromeAssets}
        brandHref="/"
      />
    </MobilePlansProvider>
  );
}
