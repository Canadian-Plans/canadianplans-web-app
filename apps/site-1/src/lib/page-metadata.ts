import type { Metadata } from 'next';
import { metadataCopy, pageDescriptions } from '@content/metadata';
import { siteConfig } from '@/site.config';
import { siteBaseUrl } from './seo';

/** The longest document title that still gets the brand appended; search results cut near 60. */
const BRANDED_TITLE_MAX = 60;

/**
 * A short title that does not name the site ("Privacy Policy", "Order a plan") gets
 * " | Canadian Plans" in the browser tab and in search results. Titles that already name
 * the site, and long article headlines, are left as written.
 */
export function documentTitle(title: string): string {
  if (title.toLowerCase().includes(siteConfig.name.toLowerCase())) return title;
  const branded = `${title} | ${siteConfig.name}`;
  return branded.length <= BRANDED_TITLE_MAX ? branded : title;
}

/** Complete each page's sharing fields while retaining its publication and privacy policy. */
export function pageMetadata(path: string, metadata: Metadata): Metadata {
  const title = typeof metadata.title === 'string' ? metadata.title : siteConfig.name;
  const description =
    metadata.description ?? pageDescriptions[path] ?? metadataCopy.siteDescription;
  const url = new URL(path, siteBaseUrl()).toString();
  return {
    ...metadata,
    title: typeof metadata.title === 'string' ? documentTitle(metadata.title) : metadata.title,
    description,
    alternates: { ...metadata.alternates, canonical: path },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      locale: 'en_CA',
      title,
      description,
      url,
      images: [
        { url: '/opengraph-image.png', width: 1200, height: 630, alt: metadataCopy.imageAlt },
      ],
      ...metadata.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image.png'],
      ...metadata.twitter,
    },
  };
}
