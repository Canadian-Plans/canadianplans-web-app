import type { ReactNode } from 'react';
import './home-design.css';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-home">{children}</div>;
}
