import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { provinceFromSlug, provinceSlug } from '@canadian-plans/contracts';
import { internetProvinces, type InternetProvince } from '@content/home-internet';
import { internetProvincePage } from '@content/home-internet-landing';
import { InternetLanding } from '@/components/home-internet/landing';

/** The four provinces internet is sold in; anything else is a 404 (Vancouver/Ontario have their own pages). */
function soldProvince(slug: string): InternetProvince | undefined {
  const code = provinceFromSlug(slug);
  return internetProvinces.find((province) => province === code);
}

export const dynamicParams = false;

export function generateStaticParams() {
  return internetProvinces.map((province) => ({ province: provinceSlug(province) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string }>;
}): Promise<Metadata> {
  const province = soldProvince((await params).province);
  if (!province) return {};
  const page = internetProvincePage(province);
  return pageMetadata(page.path, {
    title: page.title,
    description: page.description,
    robots: publicRobots(page.path),
  });
}

/** /home-internet/<province>: that province's plans, prices and offer (23 October 2026). */
export default async function InternetProvincePage({
  params,
}: {
  params: Promise<{ province: string }>;
}) {
  const province = soldProvince((await params).province);
  if (!province) notFound();
  return <InternetLanding page={internetProvincePage(province)} province={province} />;
}
