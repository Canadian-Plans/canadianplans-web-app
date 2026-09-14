import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteConfig } from '../site.config';
export const metadata: Metadata = { title: siteConfig.name, referrer: 'no-referrer' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={siteConfig.locale}>
      <body>{children}</body>
    </html>
  );
}
