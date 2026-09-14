import Link from 'next/link';
import type { ReactNode } from 'react';
import { SkipLink } from '@canadian-plans/ui';
import { siteConfig } from '../../site.config';
import { Analytics } from '../../components/analytics';
import './globals.css';

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipLink />
      <header className="border-b px-6 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6">
          <Link href="/" className="font-semibold focus-visible:outline-2">
            {siteConfig.name}
          </Link>
          <nav aria-label="Main navigation" className="flex gap-6">
            <Link href="/plans" className="focus-visible:outline-2">
              Plans
            </Link>
            <Link href="/order" className="focus-visible:outline-2">
              Order
            </Link>
            <Link href="/track" className="focus-visible:outline-2">
              Track
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-16">
        {children}
      </main>
      <footer className="mx-auto flex max-w-5xl flex-wrap gap-6 border-t px-6 py-8 text-sm">
        <Link href="/privacy" className="focus-visible:outline-2">
          Privacy
        </Link>
        <Link href="/terms" className="focus-visible:outline-2">
          Terms
        </Link>
        <span>
          {siteConfig.currency} · {siteConfig.locale}
        </span>
      </footer>
      <Analytics />
    </div>
  );
}
