import type { Metadata } from 'next';
import { categoryRogers, categoryRogersChrome } from '@content/category-rogers';
import { categorySimAssets, categorySimFooter } from '@content/category-sim';
import { pageMetadata } from '@/lib/page-metadata';
import { UtilityBar, PromoStrip, Footer } from '@/components/shared/chrome';
import { CategoryNavigation } from '@/components/category-sim/interactive';
import { RogersPageContent } from '@/components/category-rogers/page-content';

export const metadata: Metadata = pageMetadata(categoryRogers.path, {
  title: categoryRogers.title,
  description: categoryRogers.description,
  robots: { index: false, follow: false },
});

export default function RogersPage() {
  return (
    <>
      <UtilityBar content={categoryRogersChrome} assets={categorySimAssets} planHref="#plans" />
      <CategoryNavigation
        content={categoryRogersChrome}
        assets={categorySimAssets}
        dialogCopy={{
          title: categoryRogers.ui.advisorTitle,
          description: categoryRogers.ui.advisorDescription,
          close: categoryRogers.ui.advisorClose,
        }}
      />
      <PromoStrip
        content={{
          ...categoryRogersChrome,
          promo: categoryRogers.promo,
          promoLink: { label: categoryRogers.promoAction, href: '#switch' },
          promoMobileLabel: categoryRogers.promoMobileAction,
        }}
      />
      <RogersPageContent />
      <Footer
        brand={categoryRogers.ui.company}
        content={categorySimFooter}
        assets={categorySimAssets}
        brandHref="/"
      />
    </>
  );
}
