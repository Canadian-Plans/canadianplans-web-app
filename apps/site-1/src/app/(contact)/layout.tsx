import type { ReactNode } from 'react';
import '../redesign.css';
import './contact.css';

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <div className="cp-design cp-contact">{children}</div>;
}
