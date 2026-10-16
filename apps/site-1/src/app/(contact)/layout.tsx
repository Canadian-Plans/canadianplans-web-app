import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import './contact.css';

export default function ContactLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-contact">
      {children}
      <Analytics />
    </div>
  );
}
