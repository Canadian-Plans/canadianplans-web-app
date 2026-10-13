import type { ReactNode } from 'react';
import './pre-arrival-order.css';
export default function Layout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-internet-order cp-prearrival-order">{children}</div>;
}
