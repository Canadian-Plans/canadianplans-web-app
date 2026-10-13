import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './category-rogers.css';

export default function CategoryRogersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-catrog">
      {children}
      <Analytics />
    </div>
  );
}
