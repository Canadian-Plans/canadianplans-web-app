import type { Metadata } from 'next';
import { CategorySimPage } from '@/components/category-sim/page-content';
import { categorySimPages } from '@content/category-sim';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata: Metadata = pageMetadata(categorySimPages.students.path, {
  title: categorySimPages.students.title,
  description: categorySimPages.students.description,
  robots: { index: false, follow: false },
});

export default function StudentsPage() {
  return <CategorySimPage pageKey="students" />;
}
