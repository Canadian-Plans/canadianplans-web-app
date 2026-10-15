import type { ReactNode } from 'react';
import {
  CpBreadcrumb,
  CpCategoryBanner,
  CpCtaBand,
  CpFeatureRow,
  type FaqItemContent,
} from '@canadian-plans/ui/canadian-plans';
import type { RedesignCategory } from '@content/home-redesign';
import type { CategoryPageContent } from '@content/category-redesign';
import { RedesignFaqSection } from './faq';
import { CategorySupport, categoryAsset } from './support';

/**
 * Electric Blue category page template (14 October 2026). One composition for every
 * category: banner hero → quick answer → feature row → steps/cards → the page's own plan
 * block → optional extras → FAQ → CTA band. Category copy is shared with the homepage
 * explorer; the plan block keeps each page's existing behaviour and preview data.
 */
export function CategoryTemplate({
  category,
  page,
  faqItems,
  plans,
  afterPlans,
}: {
  category: RedesignCategory;
  page: CategoryPageContent;
  faqItems: readonly FaqItemContent[];
  /** The category's plan list / finder. Prices stay backend-authoritative. */
  plans: ReactNode;
  afterPlans?: ReactNode;
}) {
  return (
    <main id={page.mainId} tabIndex={-1}>
      <div className="cp-container cp-cat-page-breadcrumb">
        <CpBreadcrumb
          items={page.breadcrumb.items}
          label={page.breadcrumb.label}
          separator={page.breadcrumb.separator}
        />
      </div>
      <div className="cp-container cp-cat-page-top">
        <CpCategoryBanner
          headingLevel="h1"
          tone={category.tone}
          eyebrow={category.banner.eyebrow}
          title={category.banner.title}
          description={page.hero.description}
          action={{ label: page.hero.action, href: page.planHref }}
          price={category.banner.price}
          pricePrefix={category.banner.pricePrefix}
          priceSuffix={category.banner.priceSuffix}
          media={<span className="cp-rd-banner-photo">{category.banner.photo}</span>}
        />
        {page.quick ? (
          <section className="cp-cat-quick" aria-labelledby="category-quick-title">
            <div>
              <p className="cp-rd-eyebrow">{page.quick.eyebrow}</p>
              <h2 id="category-quick-title">{page.quick.title}</h2>
              <p>{page.quick.description}</p>
            </div>
          </section>
        ) : null}
      </div>
      <div className="cp-container cp-cat-page-intro">
        <CpFeatureRow
          art={categoryAsset(category.art)}
          title={category.feature.title}
          body={category.feature.body}
          headingLevel="h2"
        />
        <CategorySupport category={category} headingLevel="h2" />
      </div>
      {plans}
      {afterPlans}
      <RedesignFaqSection
        intro={page.faq}
        items={faqItems}
        name={`${category.key}-faq`}
        titleId={`${category.key}-faq-title`}
      />
      <div className="cp-container cp-cat-page-cta">
        <CpCtaBand
          tone={category.tone}
          content={{ ...category.cta, primary: { ...category.cta.primary, href: page.planHref } }}
          icon={categoryAsset(category.cta.icon)}
        />
      </div>
    </main>
  );
}
