import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { SkipLink } from '@canadian-plans/ui';
import { CpBreadcrumb, CpCtaBand } from '@canadian-plans/ui/canadian-plans';
import { guideList, guidesIndexAssets, guidesIndexCopy } from '@content/guides';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { categoryAsset } from '@/components/category-redesign/support';
import { GuidesIndexList } from '@/components/guides-index/guide-list';
import { GuideIndexCard } from '@/components/guides-index/guide-card';
export const metadata: Metadata = pageMetadata('/guides', {
  title: guidesIndexCopy.title,
  description: guidesIndexCopy.description,
  robots: publicRobots('/guides'),
});
export default function GuidesPage() {
  const featured = guideList.find((guide) => guide.featured);
  return (
    <>
      <SkipLink href="#guides-main" className="cp-guides-skip">
        {guidesIndexCopy.skip}
      </SkipLink>
      <SiteHeader
        planHref="/pre-arrival-sim#plans"
        content={{
          ...siteChrome,
          promoLink: { ...siteChrome.promoLink, href: '/pre-arrival-sim#plans' },
        }}
      />
      <main id="guides-main" tabIndex={-1}>
        <div className="cp-container cp-cat-page-breadcrumb">
          <CpBreadcrumb
            items={guidesIndexCopy.breadcrumb.items}
            label={guidesIndexCopy.breadcrumb.label}
            separator={guidesIndexCopy.breadcrumb.separator}
          />
        </div>
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
        <div className="cp-container cp-guides-cta">
          <CpCtaBand
            tone="amber"
            content={guidesIndexCopy.final}
            icon={categoryAsset('cta-pre-arrival')}
          />
        </div>
      </main>
      <Footer
        brand="Canadian Plans"
        content={siteFooter}
        assets={guidesIndexAssets}
        brandHref="/"
      />
    </>
  );
}
