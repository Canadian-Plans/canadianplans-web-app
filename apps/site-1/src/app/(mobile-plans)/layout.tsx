import type { ReactNode } from 'react';
import '../landing-kit.css';

/** /mobile-plans on the category landing kit (24 October 2026). */
export default function MobilePlansLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-lp" data-landing="mobile-plans">
      {children}
    </div>
  );
}
