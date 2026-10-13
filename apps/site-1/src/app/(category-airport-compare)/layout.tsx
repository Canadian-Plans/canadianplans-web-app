import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './category-airport-compare.css';

export default function CategoryAirportCompareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-catac">
      {children}
      <Analytics />
    </div>
  );
}
