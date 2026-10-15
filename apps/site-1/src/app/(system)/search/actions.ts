'use server';
import { normalizeSiteQuery, type SiteSearchState } from '@/lib/site-search';

/** UI-only search boundary: replace the preview index with a provider later. */
export async function siteSearchAction(
  _previous: SiteSearchState,
  form: FormData,
): Promise<SiteSearchState> {
  const query = normalizeSiteQuery(form.get('query'));
  return query ? { status: 'ready', query } : { status: 'invalid' };
}
