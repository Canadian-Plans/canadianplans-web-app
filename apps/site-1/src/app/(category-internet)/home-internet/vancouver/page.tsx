import type { Metadata } from 'next';
import { CategoryInternetPage } from '@/components/category-internet/page';
import { vancouverContent } from '@content/category-internet';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata: Metadata = pageMetadata('/home-internet/vancouver', {
  title: vancouverContent.pageTitle,
  description: vancouverContent.previewNotice,
  robots: { index: false, follow: false },
});

export default function VancouverPage() {
  return <CategoryInternetPage content={vancouverContent} />;
}
