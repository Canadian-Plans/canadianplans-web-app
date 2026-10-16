import { guideArticles, guideCopy, type GuideArticle } from '@content/guides';
import { siteChrome } from '@content/site-chrome';

export function findGuide(slug: string): GuideArticle | undefined {
  return guideArticles.find((article) => article.slug === slug);
}
export function guideContents(article: GuideArticle) {
  return [
    { id: 'quick-answer', title: guideCopy.quick },
    ...article.blocks.flatMap((block) =>
      block.kind === 'section' || block.kind === 'steps' || block.kind === 'faq'
        ? [{ id: block.id, title: block.title }]
        : [],
    ),
  ];
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
    author: { '@type': 'Person', name: article.author.name },
    reviewedBy: { '@type': 'Person', name: article.reviewer.name },
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
