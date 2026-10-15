import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/page-metadata';
import { LegalPage, getLegalScreen } from '@/components/legal/page';
import { legalDrafts } from '@content/legal';
export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalScreen('terms');
  return pageMetadata('/terms', {
    title: page.source === 'test_placeholder' ? legalDrafts.terms.title : page.title,
    ...(page.source === 'test_placeholder' ? { robots: { index: false, follow: false } } : {}),
  });
}
export default async function Page() {
  return <LegalPage slug="terms" page={await getLegalScreen('terms')} />;
}
