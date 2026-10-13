import { Studio } from '../../../components/studio';
import { pageMetadata } from '@/lib/page-metadata';
import type { Viewport } from 'next';
import { siteConfig } from '@/site.config';
import { studioCopy } from '@content/metadata';
// Keep the vendor viewport/referrer values without importing its editor client graph.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export const metadata = pageMetadata('/studio', {
  title: `${siteConfig.name} ${studioCopy.suffix}`,
  referrer: 'same-origin',
  robots: { index: false, follow: false },
});
export const dynamic = 'force-static';
export default function StudioPage() {
  return <Studio />;
}
