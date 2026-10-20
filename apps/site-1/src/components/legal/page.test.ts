import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as React from 'react';
const { createElement } = React;
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('server-only', () => ({}));
vi.mock('@/components/shared/site-header', () => ({ SiteHeader: () => null }));
import { LegalPage } from './page';
import { repoLegalPage, testPlaceholder } from '@/lib/legal';
import { legalDrafts } from '@content/legal';
describe('legal page source ownership', () => {
  beforeAll(() => vi.stubGlobal('React', React));
  afterAll(() => vi.unstubAllGlobals());
  it('clearly labels draft copy without inventing an accepted version', () => {
    for (const slug of ['privacy', 'terms'] as const) {
      const html = renderToStaticMarkup(
        createElement(LegalPage, { slug, page: testPlaceholder(slug) }),
      );
      expect(html).toContain('not approved legal text');
      expect(html.replace(/<!--.*?-->/gu, '')).toContain('Version 0');
      expect(html).not.toContain('DESIGN NOTE');
      expect(html).not.toContain('Version 1.0');
      for (const section of legalDrafts[slug].sections)
        expect(html).toContain(`id="${section.id}"`);
    }
  });
  it('renders authoritative published text and version without draft policy claims', () => {
    const html = renderToStaticMarkup(
      createElement(LegalPage, {
        slug: 'privacy',
        page: {
          title: 'Approved Privacy Policy',
          version: 7,
          effectiveDate: '2026-10-12',
          source: 'sanity',
          body: [{ _type: 'block', children: [{ text: 'Owner-approved published legal body.' }] }],
        },
      }),
    );
    expect(html).toContain('Owner-approved published legal body.');
    expect(html).toContain('Approved Privacy Policy');
    expect(html).toContain('2026-10-12');
    expect(html.replace(/<!--.*?-->/gu, '')).toContain('Version 7');
    expect(html).not.toContain('[X]');
    expect(html).not.toContain('privacy-who-we-are');
    expect(html).not.toContain('not approved legal text');
  });

  it('renders the repo legal text under the headings the site navigation uses', () => {
    for (const [slug, heading] of [
      ['terms', 'Terms of Service'],
      ['privacy', 'Privacy Policy'],
    ] as const) {
      const html = renderToStaticMarkup(
        createElement(LegalPage, { slug, page: repoLegalPage(slug) }),
      );
      expect(html).toContain(`<h1>${heading}</h1>`);
      expect(html).toContain('<h2');
      expect(html).toContain('9981 Whalley Blvd');
      expect(html.replace(/<!--.*?-->/gu, '')).toContain('Version 1');
      expect(html).not.toContain('not approved legal text');
    }
  });
});
