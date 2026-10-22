import { CpButton, CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { componentAssets } from '@content/components';
import { internetCopy } from '@content/home-internet';
import { internetLandingPlans as copy } from '@content/landing/internet';
import type { LandingPageContent } from '@content/landing/types';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { InternetPlanCards } from '@/components/home-internet/interactive';
import { LandingPage } from './landing-page';

/**
 * Region page for home internet: the landing kit plus the province's plans from the
 * catalogue. Ontario has no internet plans yet, so it links to the /order wish list.
 */
export function InternetLanding({
  page,
  region,
}: {
  page: LandingPageContent;
  region: 'Vancouver' | 'Ontario';
}) {
  const sold = region === 'Vancouver';
  return (
    <>
      <a href={`#${page.mainId}`} className="cp-internet-skip">
        {page.skip}
      </a>
      <SiteHeader
        planHref="#plans"
        content={siteChromeWithPromo(
          sold
            ? `Moving in ${region}? Book your install before you get the keys.`
            : `Home internet in ${region} is coming soon.`,
          sold
            ? { label: 'See plans →', href: '#plans' }
            : { label: copy.ontario.action, href: copy.ontario.href },
        )}
      />
      <LandingPage
        content={page}
        slots={{
          plans: sold ? (
            <section id="plans" className="cp-internet-plans cp-internet-section">
              <div className="cp-container">
                <div className="cp-internet-plans-heading">
                  <CpSectionHeading
                    content={{ eyebrow: copy.eyebrow, title: [copy.vancouver.title] }}
                  />
                  <p className="cp-internet-note">
                    <strong>{copy.vancouver.price}</strong> {copy.vancouver.priceNote} {copy.date}
                  </p>
                </div>
                <InternetPlanCards province="BC" />
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
          ) : (
            <section id="plans" className="cp-internet-plans cp-internet-section">
              <div className="cp-container">
                <CpSectionHeading
                  content={{
                    eyebrow: copy.eyebrow,
                    title: [copy.ontario.title],
                    description: copy.ontario.body,
                  }}
                />
                <CpButton asChild scale="large">
                  <a href={copy.ontario.href}>{copy.ontario.action}</a>
                </CpButton>
              </div>
            </section>
          ),
        }}
      />
      <Footer brand="Canadian Plans" content={siteFooter} assets={componentAssets} brandHref="/" />
    </>
  );
}
