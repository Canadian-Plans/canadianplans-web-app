import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './mobile-plans.css';

export default function MobilePlansLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-mobile-plans">
      {children}
      <Analytics />
    </div>
  );
}
