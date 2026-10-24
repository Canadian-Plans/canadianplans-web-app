import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { preArrivalLandingPage as page } from '@content/pre-arrival-landing';
import { PreArrivalLanding } from '@/components/pre-arrival/landing';

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots(page.path),
});

/**
 * Pre-arrival SIM landing page (24 October 2026): a Canadian number before you fly.
 * Copy: content/pre-arrival-landing.ts; kit: components/landing-kit.
 */
export default function PreArrivalPage() {
  return <PreArrivalLanding />;
}
