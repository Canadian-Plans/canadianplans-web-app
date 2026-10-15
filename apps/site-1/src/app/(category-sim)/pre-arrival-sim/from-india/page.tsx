import type { Metadata } from 'next';
import { CategorySimPage } from '@/components/category-sim/page-content';
import { categorySimPages } from '@content/category-sim';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata: Metadata = pageMetadata(categorySimPages.india.path, {
  title: categorySimPages.india.title,
  description: categorySimPages.india.description,
  robots: { index: false, follow: false },
});

export default function FromIndiaPage() {
  return <CategorySimPage pageKey="india" />;
}
