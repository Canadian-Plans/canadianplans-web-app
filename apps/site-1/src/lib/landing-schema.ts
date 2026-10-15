import type { BreadcrumbItem } from '@canadian-plans/ui/canadian-plans';
import type { LandingFaqItem } from '@content/landing/types';

interface SchemaQuestion {
  readonly '@type': 'Question';
  readonly name: string;
  readonly acceptedAnswer: { readonly '@type': 'Answer'; readonly text: string };
}

interface SchemaListItem {
  readonly '@type': 'ListItem';
  readonly position: number;
  readonly name: string;
  readonly item?: string;
}

export interface LandingSchema {
  readonly '@context': 'https://schema.org';
  readonly '@graph': readonly (
    | { readonly '@type': 'FAQPage'; readonly mainEntity: readonly SchemaQuestion[] }
    | { readonly '@type': 'BreadcrumbList'; readonly itemListElement: readonly SchemaListItem[] }
  )[];
}

/**
 * JSON-LD for a landing page: FAQPage (approved answers only) and BreadcrumbList.
 * Pending answers are visible on the page but never advertised to search engines.
 */
export function buildLandingSchema(
  base: string,
  breadcrumb: readonly BreadcrumbItem[],
  faq: readonly LandingFaqItem[],
): LandingSchema {
  const questions = faq
    .filter((item) => !item.pending && item.question.trim() && item.answer.trim())
    .map((item): SchemaQuestion => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    }));
  const crumbs = breadcrumb.map((item, index): SchemaListItem => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    ...(item.href ? { item: new URL(item.href, base).toString() } : {}),
  }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ...(questions.length ? [{ '@type': 'FAQPage' as const, mainEntity: questions }] : []),
      { '@type': 'BreadcrumbList', itemListElement: crumbs },
    ],
  };
}

/** Same script-terminator escaping as the FAQ page schema. */
export function serializeLandingSchema(schema: LandingSchema): string {
  return JSON.stringify(schema).replace(/</gu, '\\u003c');
}
