import type { ReactNode } from 'react';
import '../redesign.css';
import './guides-index.css';
export default function GuidesIndexLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-guides-index">{children}</div>;
}
