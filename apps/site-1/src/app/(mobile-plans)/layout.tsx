import type { ReactNode } from 'react';
import '../redesign.css';
import './mobile-plans.css';

export default function MobilePlansLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-mobile-plans">{children}</div>;
}
