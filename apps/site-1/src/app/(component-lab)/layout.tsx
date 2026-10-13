import type { ReactNode } from 'react';
import './components.css';

export default function ComponentLabLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-component-lab">{children}</div>;
}
