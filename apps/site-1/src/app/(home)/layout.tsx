import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './home.css';
import '../redesign.css';
import './home-redesign.css';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-home">
      {children}
      <Analytics />
    </div>
  );
}
