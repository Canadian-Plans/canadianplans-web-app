import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './pre-arrival.css';

export default function PreArrivalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-arrival">
      {children}
      <Analytics />
    </div>
  );
}
