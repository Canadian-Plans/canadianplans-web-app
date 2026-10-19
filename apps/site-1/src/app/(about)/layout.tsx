import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import '../landing.css';

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-about">
      {children}
      <Analytics />
    </div>
  );
}
