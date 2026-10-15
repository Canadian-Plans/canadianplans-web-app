import type { ReactNode } from 'react';
import { SkipLink } from '@canadian-plans/ui';
import { componentAssets } from '@content/components';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { Analytics } from '../../components/analytics';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import './globals.css';
import './storefront.css';

/**
 * Backend-connected order flow (/plans, /order, /track). Electric Blue restyle
 * (15 October 2026): the site header and footer and home-page type replace the bare
 * scaffold chrome. Page behaviour, forms and data loading are unchanged.
 */
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-storefront cp-legacy-controls min-h-screen bg-background text-foreground">
      <SkipLink />
      <SiteHeader planHref="/pre-arrival-sim#plans" content={siteChrome} />
      <main id="main-content" tabIndex={-1} className="cp-container cp-storefront-main">
        {children}
      </main>
      <Footer
        brand={siteChrome.brand}
        content={siteFooter}
        assets={componentAssets}
        brandHref="/"
      />
      <Analytics />
    </div>
  );
}
