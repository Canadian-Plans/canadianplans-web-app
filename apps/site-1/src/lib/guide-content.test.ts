import { describe, expect, it } from 'vitest';
import { guideArticles, guideList, internetCostGuide, studentIndiaGuide } from '@content/guides';
import {
  articleSchema,
  findGuide,
  guideContents,
  guideFaqSchema,
  serializeArticleSchema,
  serializeGuideFaqSchema,
} from './guide-content';

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
      author: { '@type': 'Organization', name: studentIndiaGuide.author.name },
      dateModified: studentIndiaGuide.updated,
      url: 'https://preview.example/guides/best-sim-for-students-from-india',
    });
    expect(schema.mainEntityOfPage['@id']).toBe(schema.url);
    expect(schema).not.toHaveProperty('datePublished');
    expect(schema).not.toHaveProperty('image');
    expect(schema).not.toHaveProperty('reviewedBy');
  });
  it('lists table blocks in the contents and builds a FAQPage from the FAQ block', () => {
    expect(guideContents(internetCostGuide).map((item) => item.id)).toContain('price-table');
    const schema = guideFaqSchema(internetCostGuide);
    expect(schema?.['@type']).toBe('FAQPage');
    expect(schema?.mainEntity.length).toBeGreaterThan(0);
    expect(guideFaqSchema({ ...internetCostGuide, blocks: [] })).toBeNull();
    const faq = {
      ...internetCostGuide,
      blocks: [
        {
          kind: 'faq' as const,
          id: 'q',
          title: 'FAQ',
          items: [{ id: 'x', question: 'A </script> q?', answer: 'Yes.' }],
        },
      ],
    };
    const encoded = serializeGuideFaqSchema(guideFaqSchema(faq)!);
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded).mainEntity[0].name).toBe('A </script> q?');
  });
  it('gives every guide a short quick answer followed by three to five bold-label points', () => {
    for (const article of guideArticles) {
      expect(article.quickAnswer.length, article.slug).toBeLessThanOrEqual(220);
      expect(article.quickPoints.length, article.slug).toBeGreaterThanOrEqual(3);
      expect(article.quickPoints.length, article.slug).toBeLessThanOrEqual(5);
      const labels = article.quickPoints.map((point) => point.label);
      expect(new Set(labels).size, article.slug).toBe(labels.length);
      for (const point of article.quickPoints) {
        expect(point.label.trim(), article.slug).not.toBe('');
        expect(point.text.length, article.slug).toBeLessThanOrEqual(160);
      }
    }
  });
  it('publishes no placeholders or raw site paths in guide copy', () => {
    for (const article of guideArticles) {
      const { title, description, quickAnswer, quickPoints, blocks, sources } = article;
      const text = JSON.stringify({
        title,
        description,
        quickAnswer,
        quickPoints,
        blocks,
        sources,
      });
      expect(text, article.slug).not.toMatch(/\[(CONFIRM|VERIFY)/);
      expect(text, article.slug).not.toContain('/guides/');
    }
  });
  it('keeps slugs unique and points related links at other listed guides', () => {
    const slugs = guideArticles.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const listed = new Set(guideList.map((entry) => entry.id));
    for (const article of guideArticles) {
      expect(listed.has(article.slug), article.slug).toBe(true);
      for (const id of article.related ?? []) {
        expect(listed.has(id), `${article.slug} → ${id}`).toBe(true);
        expect(id).not.toBe(article.slug);
      }
    }
  });
  it('escapes script-breaking copy without changing the parsed Article', () => {
    const article = { ...studentIndiaGuide, title: 'A </script><script>alert(1)</script> guide' };
    const encoded = serializeArticleSchema(article, 'https://preview.example');
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded).headline).toBe(article.title);
  });
});
