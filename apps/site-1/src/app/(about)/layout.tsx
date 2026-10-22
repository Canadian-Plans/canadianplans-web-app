import type { ReactNode } from 'react';
import '../redesign.css';
import '../landing.css';

export default function AboutLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-about">{children}</div>;
}
