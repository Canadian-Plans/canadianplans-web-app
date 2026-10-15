import type { Metadata } from 'next';
import { CategoryInternetPage } from '@/components/category-internet/page';
import { ontarioContent } from '@content/category-internet';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata: Metadata = pageMetadata('/home-internet/ontario', {
  title: ontarioContent.pageTitle,
  description: ontarioContent.previewNotice,
  robots: { index: false, follow: false },
});

export default function OntarioPage() {
  return <CategoryInternetPage content={ontarioContent} />;
}
