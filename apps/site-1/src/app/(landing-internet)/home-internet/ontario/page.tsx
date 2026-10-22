import type { Metadata } from 'next';
import { ontarioInternetLanding } from '@content/landing/internet';
import { InternetLanding } from '@/components/landing/internet-landing';
import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';

const page = ontarioInternetLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots('/home-internet/ontario'),
});

export default function OntarioInternetPage() {
  return <InternetLanding page={page} region="Ontario" />;
}
