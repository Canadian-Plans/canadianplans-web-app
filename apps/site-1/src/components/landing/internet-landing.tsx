import { CpButton, CpSectionHeading } from '@canadian-plans/ui/canadian-plans';
import { componentAssets } from '@content/components';
import { internetCopy, type InternetProvince } from '@content/home-internet';
import { internetLandingPlans as copy } from '@content/landing/internet';
import type { LandingPageContent } from '@content/landing/types';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { InternetPlanCards } from '@/components/home-internet/interactive';
import { LandingPage } from './landing-page';

export interface InternetLandingPlans {
  readonly province: InternetProvince;
  readonly title: string;
  readonly price: string;
}

/**
 * Region page for home internet: the landing kit plus the province's plans from the
 * catalogue. A region with no plans yet (Ontario) links to the /order wish list instead.
 */
export function InternetLanding({
  page,
  region,
  plans,
}: {
  page: LandingPageContent;
  region: string;
  plans?: InternetLandingPlans;
}) {
  return (
    <>
      <a href={`#${page.mainId}`} className="cp-internet-skip">
        {page.skip}
      </a>
      <SiteHeader
        planHref="#plans"
        content={siteChromeWithPromo(
          plans
            ? `Moving in ${region}? Book your install before you get the keys.`
            : `Home internet in ${region} is coming soon.`,
          plans
            ? { label: 'See plans →', href: '#plans' }
            : { label: copy.ontario.action, href: copy.ontario.href },
        )}
      />
      <LandingPage
        content={page}
        slots={{
          plans: plans ? (
            <section id="plans" className="cp-internet-plans cp-internet-section">
              <div className="cp-container">
                <div className="cp-internet-plans-heading">
                  <CpSectionHeading content={{ eyebrow: copy.eyebrow, title: [plans.title] }} />
                  <p className="cp-internet-note">
                    <strong>{plans.price}</strong> {copy.priceNote} {copy.date}
                  </p>
                </div>
                <InternetPlanCards province={plans.province} />
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
