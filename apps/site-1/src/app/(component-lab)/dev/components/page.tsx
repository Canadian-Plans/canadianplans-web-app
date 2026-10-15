import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CpBreadcrumb,
  CpComponentGroup,
  CpFaqAccordion,
  CpImageSlot,
  CpPriceCircle,
  CpReviewCard,
  CpSectionHeading,
} from '@canadian-plans/ui/canadian-plans';
import {
  breadcrumbExamples,
  buttonExamples,
  chromeContent,
  componentAssets,
  componentCopy,
  faqExamples,
  footerContent,
  planExamples,
  reviewExamples,
  sectionHeading,
} from '@content/components';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import {
  ButtonExamples,
  ChipExamples,
  ComponentLabProvider,
  MainAction,
  NavigationExample,
  PlanExamples,
  StickyExamples,
} from '@/components/shared/component-lab-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = pageMetadata('/dev/components', {
  title: componentCopy.title,
  robots: { index: false, follow: false },
});

export default function ComponentsPage() {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') notFound();
  return (
    <ComponentLabProvider copy={componentCopy}>
      <a href="#components" className="cp-lab-skip">
        {componentCopy.skipLink}
      </a>
      <UtilityBar content={chromeContent} assets={componentAssets} />
      <NavigationExample content={chromeContent} assets={componentAssets} />
      <PromoStrip content={chromeContent} />
      <main id="components" tabIndex={-1}>
        <div className="cp-container cp-lab-intro">
          <p className="cp-lab-notice">{componentCopy.previewNotice}</p>
          <h1>{componentCopy.title}</h1>
          <p>{componentCopy.intro}</p>
          <MainAction label={componentCopy.stickyDemoButton} />
        </div>
        <CpComponentGroup id="buttons" title={componentCopy.groups.buttons}>
          <ButtonExamples examples={buttonExamples} disabledLabel={componentCopy.disabled} />
        </CpComponentGroup>
        <CpComponentGroup id="chips" title={componentCopy.groups.chips}>
          <ChipExamples copy={componentCopy} />
        </CpComponentGroup>
        <div className="cp-lab-wash">
          <CpComponentGroup id="heading" title={componentCopy.groups.heading}>
            <CpSectionHeading content={sectionHeading} />
          </CpComponentGroup>
          <CpComponentGroup id="plans" title={componentCopy.groups.plans}>
            <PlanExamples plans={planExamples} copy={componentCopy} />
          </CpComponentGroup>
        </div>
        <CpComponentGroup id="faq" title={componentCopy.groups.faq}>
          <CpFaqAccordion
            items={faqExamples}
            name="component-faq"
            defaultOpenId="arrival"
            symbols={{ expand: componentCopy.plus, collapse: componentCopy.minus }}
          />
        </CpComponentGroup>
        <section id="reviews" className="cp-lab-reviews" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="cp-container cp-lab-heading">
            {componentCopy.groups.reviews}
          </h2>
          <div
            className="cp-review-strip"
            tabIndex={0}
            role="region"
            aria-label={componentCopy.reviewScrollLabel}
          >
            {reviewExamples.map((review) => (
              <CpReviewCard key={review.id} content={review} />
            ))}
          </div>
        </section>
        <CpComponentGroup id="price" title={componentCopy.groups.price}>
          <div className="cp-lab-price-stage">
            <CpPriceCircle
              label={componentCopy.priceLabel}
              amount={componentCopy.priceAmount}
              suffix={componentCopy.priceSuffix}
            />
          </div>
        </CpComponentGroup>
        <CpComponentGroup id="breadcrumb" title={componentCopy.groups.breadcrumb}>
          <CpBreadcrumb
            items={breadcrumbExamples}
            label={componentCopy.breadcrumbLabel}
            separator={componentCopy.breadcrumbSeparator}
          />
        </CpComponentGroup>
        <CpComponentGroup id="images" title={componentCopy.groups.images}>
          <div className="cp-image-pair">
            <CpImageSlot
              icon={componentAssets.imageLight}
              label={componentCopy.imageLabel}
              caption={componentCopy.imageCaption}
            />
            <CpImageSlot
              tone="on-blue"
              icon={componentAssets.imageBlue}
              label={componentCopy.imageLabel}
              caption={componentCopy.imageCaption}
            />
          </div>
        </CpComponentGroup>
        <section id="sticky" className="cp-sticky-section" aria-labelledby="sticky-heading">
          <h2 id="sticky-heading" className="cp-container cp-lab-heading">
            {componentCopy.groups.sticky}
          </h2>
          <StickyExamples copy={componentCopy} plans={planExamples} />
        </section>
      </main>
      <Footer brand={chromeContent.brand} content={footerContent} assets={componentAssets} />
    </ComponentLabProvider>
  );
}
