import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './guides.css';
export default function GuidesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-guide">
      {children}
      <Analytics />
    </div>
  );
}
