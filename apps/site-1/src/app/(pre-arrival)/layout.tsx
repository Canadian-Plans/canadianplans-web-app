import type { ReactNode } from 'react';
import '../landing-kit.css';

/** /pre-arrival-sim on the category landing kit (24 October 2026). Audience pages keep their own layout. */
export default function PreArrivalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-lp" data-landing="pre-arrival">
      {children}
    </div>
  );
}
