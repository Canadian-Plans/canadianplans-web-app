import { guideList, type GuideListEntry, type GuideTopic } from '@content/guides';

export function filterGuides(
  query: string,
  topic: GuideTopic,
  entries: readonly GuideListEntry[] = guideList,
): readonly GuideListEntry[] {
  const words = query.toLocaleLowerCase('en-CA').trim().split(/\s+/).filter(Boolean);
  return entries.filter((guide) => {
    if (topic !== 'all' && guide.topic !== topic) return false;
    const searchable = [
      guide.title,
      guide.category,
      guide.description ?? '',
      guide.caption,
      ...(guide.keywords ?? []),
    ]
      .join(' ')
      .toLocaleLowerCase('en-CA');
    return words.every((word) => searchable.includes(word));
  });
}
