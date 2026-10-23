import { pageMetadata } from '@/lib/page-metadata';
import { publicRobots } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { provinceFromSlug, provinceSlug } from '@canadian-plans/contracts';
import { internetProvinces, type InternetProvince } from '@content/home-internet';
import { internetLandingShared, internetProvincePage } from '@content/home-internet-landing';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { siteChrome, siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { InternetLanding } from '@/components/home-internet/landing';
import { InternetStickyCta } from '@/components/home-internet/sticky';

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
  const page = internetProvincePage(province);
  return (
    <>
      <a href={`#${internetLandingShared.mainId}`} className="cp-hi-skip">
        {internetLandingShared.skip}
      </a>
      <SiteHeader
        planHref={page.hero.primary.href}
        content={siteChromeWithPromo(
          internetLandingShared.promo.text,
          internetLandingShared.promo.link,
        )}
      />
      <InternetLanding page={page} />
      <InternetStickyCta title={page.sticky.title} detail={page.sticky.detail} />
      <Footer brand={siteChrome.brand} content={siteFooter} brandHref="/" />
    </>
  );
}
