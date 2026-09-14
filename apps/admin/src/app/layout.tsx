import type { ReactNode } from 'react';
import { SkipLink } from '@canadian-plans/ui';

import './globals.css';

export const metadata = {
  title: 'Canadian Plans — Admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
