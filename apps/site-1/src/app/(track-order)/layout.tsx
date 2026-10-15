import type { ReactNode } from 'react';
import '../redesign.css';
import './track-order.css';
export default function Layout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-tracking">{children}</div>;
}
