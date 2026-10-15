import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { Card, SkipLink } from '@canadian-plans/ui';
import {
  CpAsset,
  CpButton,
  CpImageSlot,
  CpSectionHeading,
} from '@canadian-plans/ui/canadian-plans';
import { aboutAssets, aboutBenefits, aboutChrome, aboutCopy, aboutFooter } from '@content/about';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import { AboutNavigation } from '@/components/about/navigation';

export const metadata: Metadata = pageMetadata('/about', {
  title: aboutCopy.title,
  description: aboutCopy.hero.description,
  robots: { index: false, follow: false },
});

export default function AboutPage() {
  return (
    <>
      <SkipLink href="#about-main" className="cp-about-skip">
        {aboutCopy.skip}
      </SkipLink>
      <UtilityBar content={aboutChrome} assets={aboutAssets} planHref="/pre-arrival-sim#plans" />
      <AboutNavigation />
      <PromoStrip content={aboutChrome} />
      <main id="about-main" tabIndex={-1}>
        <section className="cp-about-hero cp-container" aria-labelledby="about-title">
          <p className="cp-about-eyebrow">{aboutCopy.hero.eyebrow}</p>
          <h1 id="about-title">
            {aboutCopy.hero.desktopLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p className="cp-about-intro">{aboutCopy.hero.description}</p>
          <CpImageSlot
            icon={aboutAssets.imageLight}
            label={aboutCopy.imageLabel}
            caption={aboutCopy.hero.imageCaption}
            className="cp-about-team-image"
          />
        </section>
        <section className="cp-about-story">
          <div className="cp-about-story-inner cp-container">
            <CpSectionHeading content={aboutCopy.story.heading} className="cp-about-story-copy" />
            <CpImageSlot
              icon={aboutAssets.imageLight}
              label={aboutCopy.imageLabel}
              caption={aboutCopy.story.imageCaption}
              className="cp-about-story-image"
            />
            <dl className="cp-about-stats">
              {aboutCopy.story.stats.map((stat) => (
                <div key={stat.id}>
                  <dt>{stat.value}</dt>
                  <dd>{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <section className="cp-about-benefits">
          <div className="cp-about-benefits-inner cp-container">
            <CpSectionHeading
              content={aboutCopy.benefitsHeading}
              className="cp-about-benefits-heading"
            />
            <ul className="cp-about-benefit-list">
              {aboutBenefits.map((benefit) => (
                <li key={benefit.id}>
                  <Card className="cp-about-benefit">
                    <div className="cp-about-benefit-icon">
                      <CpAsset asset={benefit.icon} />
                    </div>
                    <div className="cp-about-benefit-copy">
                      <h3>{benefit.title}</h3>
                      <p>{benefit.description}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="cp-about-dealer" aria-label={aboutCopy.dealer.label}>
          <div className="cp-container cp-about-dealer-inner">
            <p className="cp-about-dealer-label">{aboutCopy.dealer.label}</p>
            <ul>
              {aboutCopy.dealer.carriers.map((carrier) => (
                <li key={carrier}>{carrier}</li>
              ))}
            </ul>
            <p className="cp-about-dealer-description">{aboutCopy.dealer.description}</p>
          </div>
        </section>
        <section className="cp-about-final" aria-labelledby="about-final-title">
          <div className="cp-about-final-card cp-container">
            <h2 id="about-final-title">{aboutCopy.final.title}</h2>
            <p>{aboutCopy.final.description}</p>
            <div className="cp-about-final-actions">
              <CpButton asChild tone="sun" scale="large">
                <a href={aboutCopy.destinations.plans}>{aboutCopy.final.primary}</a>
              </CpButton>
              <CpButton asChild tone="outline-inverse" scale="large">
                <a href={aboutCopy.destinations.advisor}>{aboutCopy.final.secondary}</a>
              </CpButton>
            </div>
          </div>
        </section>
      </main>
      <Footer brand={aboutChrome.brand} content={aboutFooter} assets={aboutAssets} brandHref="/" />
    </>
  );
}
