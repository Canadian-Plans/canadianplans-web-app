import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { searchCopy } from '@content/system';
import { normalizeSiteQuery, searchPreviewIndex } from '@/lib/site-search';
import { SystemShell } from '@/components/system/shell';
import { SearchResults } from '@/components/system/search-results';
export const metadata: Metadata = pageMetadata('/search', {
  title: searchCopy.submit,
  robots: { index: false, follow: false },
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = q === undefined ? searchCopy.initialQuery : normalizeSiteQuery(q);
  return (
    <SystemShell>
      <main id="main-content" tabIndex={-1} className="cp-system-search-page">
        <SearchResults
          key={query ?? 'invalid'}
          query={query ?? ''}
          items={searchPreviewIndex(query)}
          invalid={query === null}
        />
      </main>
    </SystemShell>
  );
}
