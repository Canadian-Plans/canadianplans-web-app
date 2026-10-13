import type { ReactNode } from 'react';
import { systemAssets, systemChrome, systemFooter, systemCopy } from '@content/system';
import { UtilityBar, Footer } from '@/components/shared/chrome';
import { SystemNavigation } from './navigation';
export function SystemShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="cp-system-skip" href="#main-content">
        {systemCopy.skip}
      </a>
      <UtilityBar content={systemChrome} assets={systemAssets} planHref="/pre-arrival-sim" />
      <SystemNavigation />
      {children}
      <Footer
        brand={systemChrome.brand}
        content={systemFooter}
        assets={systemAssets}
        brandHref="/"
      />
    </>
  );
}
