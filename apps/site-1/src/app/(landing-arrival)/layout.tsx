import type { ReactNode } from 'react';
import '../redesign.css';
import '../landing.css';
import '../(pre-arrival)/pre-arrival.css';

/** Pre-arrival landing pages (Electric Blue, 15 October 2026); reuses the category plan picker. */
export default function ArrivalLandingLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-arrival">{children}</div>;
}
