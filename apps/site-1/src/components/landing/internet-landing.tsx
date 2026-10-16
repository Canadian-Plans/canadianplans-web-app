import { CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { componentAssets } from '@content/components';
import { internetCopy } from '@content/home-internet';
import { internetLandingPlans as copy } from '@content/landing/internet';
import type { LandingPageContent } from '@content/landing/types';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import {
  AddressCheckForm,
  InternetPreviewProvider,
  InternetSpeedCards,
} from '@/components/home-internet/interactive';
import { LandingPage } from './landing-page';

/** Region page for home internet: landing kit + the /home-internet address check and speeds. */
export function InternetLanding({ page, region }: { page: LandingPageContent; region: string }) {
  return (
    <InternetPreviewProvider>
      <a href={`#${page.mainId}`} className="cp-internet-skip">
        {page.skip}
      </a>
      <SiteHeader
        planHref="#plans"
        content={siteChromeWithPromo(
          `Moving in ${region}? Book your install before you get the keys.`,
          {
            label: 'Check my address →',
            href: '#plans',
          },
        )}
      />
      <LandingPage
        content={page}
        slots={{
          plans: (
            <>
              <section
                id="plans"
                className="cp-container cp-cat-address cp-landing-address"
                aria-labelledby="address-intro-title"
              >
                <div className="cp-cat-address-copy">
                  <p className="cp-rd-eyebrow cp-rd-eyebrow-mint">{copy.eyebrow}</p>
                  <h2 id="address-intro-title" className="cp-rd-heading">
                    {copy.title}
                  </h2>
                  <p className="cp-cat-address-price">
                    <strong>{copy.price}</strong> {copy.priceNote}
                  </p>
                  <ul className="cp-cat-address-trust">
                    {internetCopy.hero.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <AddressCheckForm />
              </section>
              <section id="internet-plans" className="cp-internet-plans cp-internet-section">
                <div className="cp-container">
                  <div className="cp-internet-plans-heading">
                    <CpSectionHeading
                      content={{ eyebrow: copy.speedsEyebrow, title: [copy.speedsTitle] }}
                    />
                    <p className="cp-internet-note">{copy.date}</p>
                  </div>
                  <InternetSpeedCards />
                  <div className="cp-internet-includes">
                    <strong>{internetCopy.plans.includesTitle}</strong>
                    <ul>
                      {internetCopy.plans.includes.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </>
          ),
        }}
      />
      <Footer brand="Canadian Plans" content={siteFooter} assets={componentAssets} brandHref="/" />
    </InternetPreviewProvider>
  );
}
