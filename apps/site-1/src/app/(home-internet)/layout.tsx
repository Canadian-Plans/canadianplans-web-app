import type { ReactNode } from 'react';
import './home-internet-landing.css';

/** /home-internet landing page (23 October 2026). Region pages keep their own layout. */
export default function HomeInternetLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-hi">{children}</div>;
}
