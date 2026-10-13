import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './category-sim.css';

export default function CategorySimLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-catsim">
      {children}
      <Analytics />
    </div>
  );
}
