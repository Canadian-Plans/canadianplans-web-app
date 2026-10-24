import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { mobileLandingPage as page } from '@content/mobile-plans-landing';
import { MobileLanding } from '@/components/mobile-plans/landing';

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots(page.path),
});

/**
 * Mobile plans landing page (24 October 2026): bring your own phone, keep your number.
 * Copy: content/mobile-plans-landing.ts; kit: components/landing-kit.
 */
export default function MobilePlansPage() {
  return <MobileLanding />;
}
