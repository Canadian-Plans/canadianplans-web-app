import type { Metadata } from 'next';
import { provinceInternetPlans, vancouverInternetLanding } from '@content/landing/internet';
import { InternetLanding } from '@/components/landing/internet-landing';
import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';

const page = vancouverInternetLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: publicRobots('/home-internet/vancouver'),
});

export default function VancouverInternetPage() {
  return <InternetLanding page={page} region="Vancouver" plans={provinceInternetPlans('BC')} />;
}
