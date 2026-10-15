import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import './home-internet.css';

export default function HomeInternetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-internet">
      {children}
      <Analytics />
    </div>
  );
}
