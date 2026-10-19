import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import './guides-index.css';
export default function GuidesIndexLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-guides-index">
      {children}
      <Analytics />
    </div>
  );
}
