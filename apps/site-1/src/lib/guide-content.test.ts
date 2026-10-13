import { describe, expect, it } from 'vitest';
import { studentIndiaGuide } from '@content/guides';
import { articleSchema, findGuide, guideContents, serializeArticleSchema } from './guide-content';

describe('guide resolution and Article schema', () => {
  it('resolves the supplied article and rejects unknown or inherited names', () => {
    expect(findGuide(studentIndiaGuide.slug)?.title).toBe(studentIndiaGuide.title);
    for (const slug of ['missing', 'toString', '__proto__', 'BEST-SIM-FOR-STUDENTS-FROM-INDIA'])
      expect(findGuide(slug)).toBeUndefined();
  });
  it('builds six contents targets from the structured article', () => {
    const contents = guideContents(studentIndiaGuide);
    expect(contents.map((item) => item.id)).toEqual([
      'quick-answer',
      'needs',
      'compare',
      'esim',
      'order',
      'guide-faq',
    ]);
    expect(new Set(contents.map((item) => item.id)).size).toBe(contents.length);
  });
  it('describes the same author, headline and update date as visible content', () => {
    const schema = articleSchema(studentIndiaGuide, 'https://preview.example/');
    expect(schema).toMatchObject({
      '@type': 'Article',
      headline: studentIndiaGuide.title,
      description: studentIndiaGuide.description,
      author: { name: studentIndiaGuide.author.name },
      dateModified: '2026-10-05',
      url: 'https://preview.example/guides/best-sim-for-students-from-india',
    });
    expect(schema.mainEntityOfPage['@id']).toBe(schema.url);
    expect(schema).not.toHaveProperty('datePublished');
    expect(schema).not.toHaveProperty('image');
  });
  it('escapes script-breaking copy without changing the parsed Article', () => {
    const article = { ...studentIndiaGuide, title: 'A </script><script>alert(1)</script> guide' };
    const encoded = serializeArticleSchema(article, 'https://preview.example');
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded).headline).toBe(article.title);
  });
});
