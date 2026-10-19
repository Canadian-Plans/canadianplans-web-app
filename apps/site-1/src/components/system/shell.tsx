import type { ReactNode } from 'react';
import { systemAssets, systemCopy } from '@content/system';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
export function SystemShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="cp-system-skip" href="#main-content">
        {systemCopy.skip}
      </a>
      <SiteHeader planHref="/pre-arrival-sim#plans" content={siteChrome} />
      {children}
      <Footer brand={siteChrome.brand} content={siteFooter} assets={systemAssets} brandHref="/" />
    </>
  );
}
