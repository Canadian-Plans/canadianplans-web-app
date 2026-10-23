import { guideArticles, guideCopy, type GuideArticle } from '@content/guides';
import { siteChrome } from '@content/site-chrome';

export function findGuide(slug: string): GuideArticle | undefined {
  return guideArticles.find((article) => article.slug === slug);
}
export function guideContents(article: GuideArticle) {
  return [
    { id: 'quick-answer', title: guideCopy.quick },
    ...article.blocks.flatMap((block) =>
      block.kind === 'section' ||
      block.kind === 'steps' ||
      block.kind === 'faq' ||
      block.kind === 'table'
        ? [{ id: block.id, title: block.title }]
        : [],
    ),
  ];
}
/** FAQPage schema for a guide's FAQ blocks, or null when the article has none. */
export function guideFaqSchema(article: GuideArticle) {
  const questions = article.blocks.flatMap((block) =>
    block.kind === 'faq'
      ? block.items
          .filter((item) => item.question.trim() && item.answer.trim())
          .map((item) => ({
            '@type': 'Question' as const,
            name: item.question,
            acceptedAnswer: { '@type': 'Answer' as const, text: item.answer },
          }))
      : [],
  );
  if (questions.length === 0) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: questions } as const;
}
export function serializeGuideFaqSchema(schema: NonNullable<ReturnType<typeof guideFaqSchema>>) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
/** Describes the rendered article; no guessed publication date or placeholder photo. */
export function articleSchema(article: GuideArticle, origin: string) {
  const url = `${origin.replace(/\/+$/, '')}/guides/${encodeURIComponent(article.slug)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    articleSection: article.category,
    // Credited to the team (owner decision 22 Oct 2026, SEC-18), so no Person.
    author: { '@type': 'Organization', name: article.author.name },
    publisher: { '@type': 'Organization', name: siteChrome.brand },
    dateModified: article.updated,
    inLanguage: 'en-CA',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}
export function serializeArticleSchema(article: GuideArticle, origin: string) {
  return JSON.stringify(articleSchema(article, origin)).replace(/</g, '\\u003c');
}
