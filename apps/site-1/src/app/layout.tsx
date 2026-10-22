import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteConfig } from '../site.config';
import { isIndexable, siteBaseUrl } from '../lib/seo';
import { googleSansFlex } from '../lib/fonts';
import { Analytics } from '@/components/analytics';
import { PlanFinderProvider } from '@/components/shared/plan-finder-provider';
import { CookieConsentProvider } from '@/components/shared/cookie-consent';
import { metadataCopy } from '@content/metadata';
import { cookieBootstrapScript } from '@/lib/cookie-bootstrap';
import './(storefront)/globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: siteConfig.name,
  description: metadataCopy.siteDescription,
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: metadataCopy.siteDescription,
    locale: 'en_CA',
  },
  referrer: 'no-referrer',
  // REQ 10: only the production deployment is indexable; previews/local are not.
  robots: isIndexable() ? undefined : { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={siteConfig.locale} className={googleSansFlex.variable} suppressHydrationWarning>
      <head>
        {/* This read-only visibility check must run before paint, including before hydration. */}
        <script
          id="cp-consent-bootstrap"
          dangerouslySetInnerHTML={{ __html: cookieBootstrapScript }}
        />
      </head>
      <body>
        <CookieConsentProvider>
          <PlanFinderProvider>{children}</PlanFinderProvider>
          {/* Once for every route; it skips the Studio and dev previews itself. */}
          <Analytics />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
