import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import '../landing.css';
import '../(mobile-plans)/mobile-plans.css';

/** Mobile brand landing pages (Electric Blue, 15 October 2026); reuses the mobile plan browser. */
export default function MobileLandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-mobile-plans">
      {children}
      <Analytics />
    </div>
  );
}
