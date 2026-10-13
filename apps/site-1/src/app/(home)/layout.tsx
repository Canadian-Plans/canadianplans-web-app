import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './home.css';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-home">
      {children}
      <Analytics />
    </div>
  );
}
