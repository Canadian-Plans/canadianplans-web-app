import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import '../landing.css';
import '../(home-internet)/home-internet.css';

/** Home internet region pages (Electric Blue, 15 October 2026); reuses the address check. */
export default function InternetLandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-internet">
      {children}
      <Analytics />
    </div>
  );
}
