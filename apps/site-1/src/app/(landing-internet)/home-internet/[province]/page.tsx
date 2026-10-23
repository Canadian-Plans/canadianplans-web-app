import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  internetProvinceFromSlug,
  internetProvinceSlugs,
  internetProvinces,
} from '@content/home-internet';
import { provinceInternetLanding, provinceInternetPlans } from '@content/landing/internet';
import { InternetLanding } from '@/components/landing/internet-landing';
import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';

type Props = { params: Promise<{ province: string }> };

/** One page per province that sells internet (23 October 2026): every plan and its price. */
export const dynamicParams = false;
export function generateStaticParams() {
  return internetProvinces.map((province) => ({ province: internetProvinceSlugs[province] }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const province = internetProvinceFromSlug((await params).province);
  if (!province) notFound();
  const page = provinceInternetLanding(province);
  return pageMetadata(page.path, {
    title: page.title,
    description: page.description,
    robots: publicRobots(page.path),
  });
}

export default async function ProvinceInternetPage({ params }: Props) {
  const province = internetProvinceFromSlug((await params).province);
  if (!province) notFound();
  const plans = provinceInternetPlans(province);
  return (
    <InternetLanding page={provinceInternetLanding(province)} region={plans.name} plans={plans} />
  );
}
