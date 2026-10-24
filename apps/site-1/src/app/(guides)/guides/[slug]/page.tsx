import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/page-metadata';
import { notFound } from 'next/navigation';
import { SkipLink } from '@canadian-plans/ui';
import { CpAsset, CpBreadcrumb, CpCtaBand } from '@canadian-plans/ui/canadian-plans';
import { GuideCover } from '@/components/guides/cover';
import { guideArticles, guideAssets, guideCopy, guideList, guidesIndexCopy } from '@content/guides';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { categoryAsset } from '@/components/category-redesign/support';
import {
  findGuide,
  guideContents,
  guideFaqSchema,
  serializeArticleSchema,
  serializeGuideFaqSchema,
} from '@/lib/guide-content';
import { publicRobots, siteBaseUrl } from '@/lib/seo';
import { Footer } from '@/components/shared/chrome';
import { GuideContents, GuideHelpful, GuideShare } from '@/components/guides/interactions';
import { ArticleBodyBlock, GuidePromotion, GuideText } from '@/components/guides/article-body';

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return guideArticles.map((article) => ({ slug: article.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findGuide((await params).slug);
  if (!article) notFound();
  return pageMetadata(`/guides/${article.slug}`, {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/guides/${article.slug}` },
    robots: publicRobots(`/guides/${article.slug}`),
    openGraph: { type: 'article', modifiedTime: article.updated },
  });
}
export default async function GuidePage({ params }: Props) {
  const article = findGuide((await params).slug);
  if (!article) notFound();
  const contents = guideContents(article);
  const faqSchema = guideFaqSchema(article);
  // Keep reading: the article's own topical picks, else real pages from the index; never itself.
  const others = guideList.filter((guide) => !guide.href.endsWith(`/${article.slug}`));
  const picked = (article.related ?? []).flatMap((id) => others.filter((guide) => guide.id === id));
  const related = (picked.length > 0 ? picked : others).slice(0, 3);
  return (
    <>
      <SkipLink href="#guide-main" className="cp-guide-skip">
        {guideCopy.skip}
      </SkipLink>
      <SiteHeader
        planHref={guideCopy.destinations.plans}
        content={{
          ...siteChrome,
          promoLink: { ...siteChrome.promoLink, href: guideCopy.destinations.plans },
        }}
      />
      <main id="guide-main" tabIndex={-1}>
        <article aria-labelledby="guide-title">
          <header className="cp-guide-header">
            <div className="cp-container cp-guide-header-inner">
              <CpBreadcrumb
                label={guideCopy.breadcrumb}
                separator={guideCopy.separator}
                items={[
                  { label: guideCopy.home, href: '/' },
                  { label: guideCopy.guides, href: '/guides' },
                  { label: article.breadcrumbTitle },
                ]}
              />
              <p className="cp-guide-category">{article.category}</p>
              <h1 id="guide-title">{article.title}</h1>
              <p className="cp-guide-description">{article.description}</p>
              <div className="cp-guide-byline">
                {[article.author, article.reviewer].map((person) => (
                  <div key={person.label} className="cp-guide-person">
                    <CpAsset asset={person.avatar} />
                    <div>
                      <p>{person.label}</p>
                      <p>{person.detail}</p>
                    </div>
                  </div>
                ))}
                <div className="cp-guide-date">
                  <time dateTime={article.updated}>{article.updatedLabel}</time>
                  <p>{article.readingLabel}</p>
                </div>
              </div>
              <GuideCover
                guideId={article.slug}
                className="cp-guide-header-image"
                caption={article.imageCaption}
              />
            </div>
          </header>
          <div className="cp-guide-body">
            <div className="cp-container cp-guide-body-grid">
              <GuideContents items={contents} />
              <div className="cp-guide-article">
                <section className="cp-guide-quick">
                  <div>
                    <h2 id="quick-answer" tabIndex={-1}>
                      {guideCopy.quick}
                    </h2>
                    <p>
                      <GuideText
                        text={article.quickAnswer}
                        mobileLines={article.quickMobileLines}
                      />
                    </p>
                    <ul className="cp-guide-quick-points">
                      {article.quickPoints.map((point) => (
                        <li key={point.label}>
                          <span>
                            <strong>{point.label}</strong> {point.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
                <GuidePromotion className="cp-guide-mobile-promotion" />
                <GuideCover
                  guideId={article.slug}
                  className="cp-guide-mobile-image"
                  caption={article.imageCaption}
                />
                <GuideContents items={contents} mobile />
                {article.blocks.map((block) => (
                  <ArticleBodyBlock key={'id' in block ? block.id : block.kind} block={block} />
                ))}
                <GuideHelpful />
                <p className="cp-guide-small">{article.sources}</p>
                <div className="cp-guide-mobile-share">
                  <GuideShare />
                </div>
              </div>
              <div className="cp-guide-aside">
                <GuidePromotion />
                <GuideShare />
              </div>
            </div>
          </div>
        </article>
        <section className="cp-guide-related" aria-labelledby="keep-reading">
          <div className="cp-container">
            <h2 id="keep-reading" tabIndex={-1}>
              {guideCopy.relatedTitle}
            </h2>
            <ul>
              {related.map((guide) => (
                <li key={guide.id}>
                  <a href={guide.href} className="cp-guide-related-card">
                    <GuideCover
                      guideId={guide.id}
                      className="cp-guide-related-image"
                      caption={guide.caption}
                    />
                    <div>
                      <p>{guide.category}</p>
                      <h3>{guide.title}</h3>
                      <p>{guide.detail}</p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <div className="cp-container cp-guide-cta">
          <CpCtaBand
            tone="amber"
            content={guidesIndexCopy.final}
            icon={categoryAsset('cta-pre-arrival')}
          />
        </div>
      </main>
      <Footer brand="Canadian Plans" content={siteFooter} assets={guideAssets} brandHref="/" />
      <script
        id="guide-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeArticleSchema(article, siteBaseUrl()) }}
      />
      {faqSchema ? (
        <script
          id="guide-faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeGuideFaqSchema(faqSchema) }}
        />
      ) : null}
    </>
  );
}
