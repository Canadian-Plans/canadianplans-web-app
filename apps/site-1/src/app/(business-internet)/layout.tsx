import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import './business-internet.css';

export default function BusinessInternetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-business">
      {children}
      <Analytics />
    </div>
  );
}
