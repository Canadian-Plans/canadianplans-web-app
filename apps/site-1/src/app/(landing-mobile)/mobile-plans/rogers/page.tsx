import type { Metadata } from 'next';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { componentAssets } from '@content/components';
import { CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { rogersLanding, rogersPlansHeading } from '@content/landing/rogers';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { MobilePlanBrowser, MobilePlansProvider } from '@/components/mobile-plans/interactive';
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
      <SiteHeader
        planHref="/mobile-plans#mobile-plans"
        content={siteChromeWithPromo(
          'Switching carriers? Keep your number. We handle the transfer.',
          {
            label: 'How switching works →',
            href: '#switch',
          },
        )}
      />
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
      <Footer brand="Canadian Plans" content={siteFooter} assets={componentAssets} brandHref="/" />
    </MobilePlansProvider>
  );
}
