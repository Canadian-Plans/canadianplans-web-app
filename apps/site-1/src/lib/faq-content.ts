import type { HelpFaqGroup } from '@content/faq';

export function normalizeFaqSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-CA').replace(/\s+/gu, ' ');
}
export function filterFaqGroup(group: HelpFaqGroup, query: string): HelpFaqGroup {
  const tokens = normalizeFaqSearch(query).split(' ').filter(Boolean);
  if (!tokens.length) return group;
  return {
    ...group,
    items: group.items.filter((item) => {
      // Editorial placeholder text is not an answer search target.
      const searchable = normalizeFaqSearch(
        [
          item.question,
          item.answerStatus !== 'pending' ? item.answer : '',
          ...(item.keywords ?? []),
        ].join(' '),
      );
      return tokens.every((token) => searchable.includes(token));
    }),
  };
}
interface FaqSchemaQuestion {
  readonly '@type': 'Question';
  readonly name: string;
  readonly acceptedAnswer: { readonly '@type': 'Answer'; readonly text: string };
}
export interface FaqPageSchema {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'FAQPage';
  readonly mainEntity: readonly FaqSchemaQuestion[];
}
/** Only complete source answers are emitted; UI placeholders never become structured answers. */
export function buildFaqPageSchema(groups: readonly HelpFaqGroup[]): FaqPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((group) =>
      group.items
        .filter(
          (item) => item.answerStatus !== 'pending' && item.question.trim() && item.answer.trim(),
        )
        .map((item): FaqSchemaQuestion => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    ),
  };
}
/** Native script JSON-LD uses the installed Next.js guide's script-terminator escaping. */
export function serializeFaqPageSchema(schema: FaqPageSchema): string {
  return JSON.stringify(schema).replace(/</gu, '\\u003c');
}
