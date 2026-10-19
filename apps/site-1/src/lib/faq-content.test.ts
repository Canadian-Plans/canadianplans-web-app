import { describe, expect, it } from 'vitest';
import { faqGroups, type HelpFaqGroup } from '@content/faq';
import {
  buildFaqPageSchema,
  filterFaqGroup,
  normalizeFaqSearch,
  serializeFaqPageSchema,
} from './faq-content';

function matches(query: string) {
  return faqGroups.flatMap((group) => filterFaqGroup(group, query).items);
}

describe('FAQ search and structured content', () => {
  it('keeps all 19 questions and original groups for a blank search', () => {
    expect(matches(' \n ')).toHaveLength(19);
    expect(filterFaqGroup(faqGroups[0]!, '')).toBe(faqGroups[0]);
  });
  it('matches the source placeholder example through its credit-check alias', () => {
    expect(matches('no credit check').map((item) => item.id)).toEqual(['credit-history']);
  });
  it('normalizes Unicode, case and repeated whitespace', () => {
    expect(normalizeFaqSearch(' ＥＳＩＭ  PHYSICAL ')).toBe('esim physical');
    expect(matches(' ＥＳＩＭ  PHYSICAL ').map((item) => item.id)).toEqual(['esim-physical']);
  });
  it('searches supplied answer text as well as questions', () => {
    expect(matches('ship insert').map((item) => item.id)).toEqual(['esim-physical']);
  });
  it('requires every search term and returns an empty result for unknown content', () => {
    expect(matches('credit refund')).toEqual([]);
    expect(matches('unmatched-preview-xyz')).toEqual([]);
  });
  it('does not treat the pending editorial notice as FAQ answer content', () => {
    expect(matches('awaiting approved')).toEqual([]);
  });
  it('emits the 13 answered Q&A pairs and excludes the 6 pending answers', () => {
    const schema = buildFaqPageSchema(faqGroups);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema['@context']).toBe('https://schema.org');
    const complete = faqGroups.flatMap((group) =>
      group.items.filter((item) => item.answerStatus !== 'pending'),
    );
    expect(complete).toHaveLength(13);
    expect(schema.mainEntity).toHaveLength(13);
    expect(
      schema.mainEntity.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text })),
    ).toEqual(complete.map((item) => ({ question: item.question, answer: item.answer })));
  });
  it('excludes blank questions or answers even when marked complete', () => {
    const groups: readonly HelpFaqGroup[] = [
      {
        id: 'test',
        topic: 'Test',
        heading: { title: ['Test'] },
        items: [
          { id: 'empty-answer', question: 'Question', answer: ' ', answerStatus: 'figma' },
          { id: 'empty-question', question: ' ', answer: 'Answer', answerStatus: 'figma' },
        ],
      },
    ];
    expect(buildFaqPageSchema(groups).mainEntity).toEqual([]);
  });
  it('escapes script terminators without changing decoded answer text', () => {
    const answer = '</script><script>unexpected()</script> & "quoted"';
    const groups: readonly HelpFaqGroup[] = [
      {
        id: 'test',
        topic: 'Test',
        heading: { title: ['Test'] },
        items: [{ id: 'escaping', question: 'Safe serialization?', answer, answerStatus: 'figma' }],
      },
    ];
    const schema = buildFaqPageSchema(groups);
    const serialized = serializeFaqPageSchema(schema);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(schema);
  });
});
