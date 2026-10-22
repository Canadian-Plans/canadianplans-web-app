import type { ReactNode } from 'react';
import '../redesign.css';
import './pre-arrival.css';

export default function PreArrivalLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-arrival">{children}</div>;
}
