import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import {
  businessAssets,
  businessChrome,
  businessCopy,
  businessFaq,
} from '@content/business-internet';
import { categoryPages, redesignCategory } from '@content/category-redesign';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { siteFooter } from '@content/site-chrome';
import { CategoryTemplate } from '@/components/category-redesign/template';
import { BusinessQuoteForm } from '@/components/business-internet/quote-form';

export const metadata: Metadata = pageMetadata('/business-internet', {
  title: businessCopy.title,
  robots: { index: false, follow: false },
});

/**
 * Business Internet design preview (Electric Blue category template, 14 October 2026).
 * No plan list exists yet ([PRICE] is an open input), so the plan slot is a UI-only quote form.
 */
export default function BusinessInternetPage() {
  const page = categoryPages.business;
  return (
    <>
      <a className="cp-business-skip" href={`#${page.mainId}`}>
        {businessCopy.skip}
      </a>
      <SiteHeader planHref={page.planHref} content={businessChrome} />
      <CategoryTemplate
        category={redesignCategory('business')}
        page={page}
        faqItems={businessFaq}
        plans={<BusinessQuoteForm />}
      />
      <Footer
        brand={businessChrome.brand}
        content={siteFooter}
        assets={businessAssets}
        brandHref="/"
      />
    </>
  );
}
