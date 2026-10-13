import type { ReactNode } from 'react';
import { Analytics } from '@/components/analytics';
import './category-internet.css';

export default function CategoryInternetLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="cp-design cp-catnet">
      {children}
      <Analytics />
    </div>
  );
}
