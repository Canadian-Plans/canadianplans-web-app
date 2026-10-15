import type { Metadata } from 'next';
import { vancouverInternetLanding } from '@content/landing/internet';
import { InternetLanding } from '@/components/landing/internet-landing';
import { pageMetadata } from '@/lib/page-metadata';

const page = vancouverInternetLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: { index: false, follow: false },
});

export default function VancouverInternetPage() {
  return <InternetLanding page={page} region="Vancouver" />;
}
