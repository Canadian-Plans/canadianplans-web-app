import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import '../redesign.css';
import './faq.css';

export default function FaqLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cp-design cp-faq-page">
      {children}
      <Analytics />
    </div>
  );
}
