import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import {
  businessAssets,
  businessChrome,
  businessCopy,
  businessFaq,
  businessFooter,
} from '@content/business-internet';
import { categoryPages, redesignCategory } from '@content/category-redesign';
import { Footer, PromoStrip, UtilityBar } from '@/components/shared/chrome';
import { CategoryTemplate } from '@/components/category-redesign/template';
import { BusinessNavigation } from '@/components/business-internet/navigation';
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
      <UtilityBar content={businessChrome} assets={businessAssets} planHref={page.planHref} />
      <BusinessNavigation />
      <PromoStrip content={businessChrome} />
      <CategoryTemplate
        category={redesignCategory('business')}
        page={page}
        faqItems={businessFaq}
        plans={<BusinessQuoteForm />}
      />
      <Footer brand={businessChrome.brand} content={businessFooter} assets={businessAssets} brandHref="/" />
    </>
  );
}
