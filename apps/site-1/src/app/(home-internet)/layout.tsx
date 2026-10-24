import type { ReactNode } from 'react';
import '../landing-kit.css';

/** /home-internet landing pages on the category landing kit. Region pages keep their own layout. */
export default function HomeInternetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-lp" data-landing="home-internet">
      {children}
    </div>
  );
}
