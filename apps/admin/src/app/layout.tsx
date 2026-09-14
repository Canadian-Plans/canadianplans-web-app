import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { SkipLink } from '@canadian-plans/ui';

import './globals.css';

// Feeds the shared `--font-sans-inter` token (see @canadian-plans/ui tokens.css)
// per shadcn preset b4gfJS2z4 (font: inter). next/font self-hosts the files.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Canadian Plans — Admin',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Admin is dark-only. Force the `.dark` palette on the root instead of
  // wiring a theme toggle; the shared @canadian-plans/ui tokens keep the light
  // palette for storefronts that want it.
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
