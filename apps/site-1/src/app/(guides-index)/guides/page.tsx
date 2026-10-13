import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import {
  guideCopy,
  guideList,
  guidesIndexAssets,
  guidesIndexChrome,
  guidesIndexCopy,
  guidesIndexFooter,
} from '@content/guides';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  GuidesIndexNavigation,
  GuidesIndexFinderButton,
} from '@/components/guides-index/navigation';
import { GuidesIndexList } from '@/components/guides-index/guide-list';
import { GuideIndexCard } from '@/components/guides-index/guide-card';
export const metadata: Metadata = pageMetadata('/guides', {
  title: guidesIndexCopy.title,
  description: guidesIndexCopy.description,
  robots: { index: false, follow: false },
});
export default function GuidesPage() {
  const featured = guideList.find((guide) => guide.featured);
  return (
    <>
      <SkipLink href="#guides-main" className="cp-guides-skip">
        {guidesIndexCopy.skip}
      </SkipLink>
      <UtilityBar
        content={guidesIndexChrome}
        assets={guidesIndexAssets}
        planHref={guideCopy.destinations.plans}
      />
      <GuidesIndexNavigation />
      <PromoStrip content={guidesIndexChrome} />
      <main id="guides-main" tabIndex={-1}>
        <GuidesIndexList
          featured={featured ? <GuideIndexCard guide={featured} featured /> : null}
        />
        <section className="cp-guides-questions" aria-labelledby="guides-questions">
          <div className="cp-container">
            <h2 id="guides-questions">{guidesIndexCopy.peopleHeading}</h2>
            <ul>
              {guidesIndexCopy.questions.map((question) => (
                <li key={question.id}>
                  <a href={question.href}>
                    <span>{question.text}</span>
                    <span aria-hidden="true">{guidesIndexCopy.arrow}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="cp-guides-final" aria-labelledby="guides-final-title">
          <div className="cp-container cp-guides-final-card">
            <h2 id="guides-final-title">{guidesIndexCopy.final.heading}</h2>
            <p>{guidesIndexCopy.final.description}</p>
            <div className="cp-guides-final-actions">
              <GuidesIndexFinderButton />
              <CpButton asChild tone="outline-inverse" scale="large">
                <a href={guideCopy.destinations.advisor}>{guidesIndexCopy.final.secondary}</a>
              </CpButton>
            </div>
            <p className="cp-guides-final-note">{guidesIndexCopy.final.note}</p>
          </div>
        </section>
      </main>
      <Footer
        brand={guidesIndexChrome.brand}
        content={guidesIndexFooter}
        assets={guidesIndexAssets}
        brandHref="/"
      />
    </>
  );
}
