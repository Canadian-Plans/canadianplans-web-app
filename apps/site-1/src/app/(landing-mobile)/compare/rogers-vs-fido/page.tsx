import type { Metadata } from 'next';
import { siteChromeWithPromo, siteFooter } from '@content/site-chrome';
import { componentAssets } from '@content/components';
import { rogersVsFidoLanding } from '@content/landing/rogers-vs-fido';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { LandingPage } from '@/components/landing/landing-page';
import { pageMetadata } from '@/lib/page-metadata';

const page = rogersVsFidoLanding;

export const metadata: Metadata = pageMetadata(page.path, {
  title: page.title,
  description: page.description,
  robots: { index: false, follow: false },
});

export default function RogersVsFidoPage() {
  return (
    <>
      <a className="cp-mobile-skip" href={`#${page.mainId}`}>
        {page.skip}
      </a>
      <SiteHeader
        planHref="/mobile-plans#mobile-plans"
        content={siteChromeWithPromo(
          'Switching carriers? Keep your number. We handle the transfer.',
          {
            label: 'How switching works →',
            href: '#switch',
          },
        )}
      />
      <LandingPage content={page} />
      <Footer brand="Canadian Plans" content={siteFooter} assets={componentAssets} brandHref="/" />
    </>
  );
}
