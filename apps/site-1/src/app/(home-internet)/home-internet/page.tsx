import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { internetLandingPage as page } from '@content/home-internet-landing';
import { InternetLanding } from '@/components/home-internet/landing';

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots(page.path),
});

/**
 * Home internet landing page (23 October 2026): one card per province, then everything
 * about the service. Copy: content/home-internet-landing.ts; kit: components/landing-kit.
 */
export default function HomeInternetPage() {
  return <InternetLanding page={page} />;
}
