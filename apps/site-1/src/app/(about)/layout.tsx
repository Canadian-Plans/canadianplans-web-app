import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './about.css';

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-about">
      {children}
      <Analytics />
    </div>
  );
}
