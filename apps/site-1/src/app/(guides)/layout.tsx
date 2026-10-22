import type { ReactNode } from 'react';
import '../redesign.css';
import './guides.css';
export default function GuidesLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-guide">{children}</div>;
}
