import { searchItems, type SearchCategory } from '@content/system';

/** Preview index only. Reject contact details before putting a query in a URL. */
export function normalizeSiteQuery(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 160 ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === '@',
    )
  )
    return null;
  const query = value.trim().replace(/\s+/gu, ' ');
  if (query.length < 2 || query.length > 80 || /(?:\d[\s()+.-]*){7,}/u.test(query)) return null;
  return query;
}

export function searchPreviewIndex(query: unknown, category: SearchCategory = 'all') {
  const normalized = normalizeSiteQuery(query);
  if (!normalized) return [];
  const words = normalized.toLocaleLowerCase('en-CA').split(' ');
  return searchItems.filter((item) => {
    const text = [item.title, item.description, ...item.keywords]
      .join(' ')
      .toLocaleLowerCase('en-CA');
    return (
      (category === 'all' || item.category === category) &&
      words.every((word) => text.includes(word))
    );
  });
}

export type SiteSearchState =
  { status: 'idle' | 'invalid' | 'failed' } | { status: 'ready'; query: string };
