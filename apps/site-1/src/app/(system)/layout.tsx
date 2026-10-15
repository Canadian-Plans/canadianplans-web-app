import type { ReactNode } from 'react';
import './system.css';
export default function Layout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-system">{children}</div>;
}
