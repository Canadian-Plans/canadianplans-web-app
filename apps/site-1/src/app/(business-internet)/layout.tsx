import type { ReactNode } from 'react';
import '../redesign.css';
import './business-internet.css';

export default function BusinessInternetLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-business">{children}</div>;
}
