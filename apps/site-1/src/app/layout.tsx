import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteConfig } from '../site.config';
import { isIndexable, siteBaseUrl } from '../lib/seo';
export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: siteConfig.name,
  referrer: 'no-referrer',
  // REQ 10: only the production deployment is indexable; previews/local are not.
  robots: isIndexable() ? undefined : { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={siteConfig.locale}>
      <body>{children}</body>
    </html>
  );
}
