import type { ReactNode } from 'react';
import { siteChrome, siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import type { LandingKitPage, LandingKitShared } from '@content/landing-kit';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { CategoryLanding } from './landing';
import { LandingStickyCta } from './sticky';

/** Skip link, header with the category promo, the landing, the phone sticky bar and the footer. */
export function LandingKitPageShell({
  shared,
  page,
  plans,
}: {
  shared: LandingKitShared;
  page: LandingKitPage;
  plans: ReactNode;
}) {
  return (
    <>
      <a href={`#${shared.mainId}`} className="cp-lp-skip">
        {shared.skip}
      </a>
      <SiteHeader
        planHref={page.hero.primary.href}
        content={siteChromeWithPromo(shared.promo.text, shared.promo.link)}
      />
      <CategoryLanding shared={shared} page={page} plans={plans} />
      <LandingStickyCta
        title={page.sticky.title}
        detail={page.sticky.detail}
        button={shared.stickyButton}
      />
      <Footer brand={siteChrome.brand} content={siteFooter} brandHref="/" />
    </>
  );
}
