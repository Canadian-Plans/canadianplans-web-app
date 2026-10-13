import type { Metadata } from 'next';
import { metadataCopy, pageDescriptions } from '@content/metadata';
import { siteConfig } from '@/site.config';
import { siteBaseUrl } from './seo';

/** Complete each page's sharing fields while retaining its publication and privacy policy. */
export function pageMetadata(path: string, metadata: Metadata): Metadata {
  const title = typeof metadata.title === 'string' ? metadata.title : siteConfig.name;
  const description =
    metadata.description ?? pageDescriptions[path] ?? metadataCopy.siteDescription;
  const url = new URL(path, siteBaseUrl()).toString();
  return {
    ...metadata,
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
