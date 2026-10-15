import { describe, expect, it, vi } from 'vitest';
import { pageMetadata } from './page-metadata';
describe('page metadata', () => {
  it('keeps drafts unindexable and gives each page its own sharing URL and copy', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');
    try {
      const metadata = pageMetadata('/order/pre-arrival', {
        title: 'Pre-arrival order',
        robots: { index: false, follow: false },
        referrer: 'no-referrer',
      });
      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata.referrer).toBe('no-referrer');
      expect(metadata.alternates?.canonical).toBe('/order/pre-arrival');
      expect(metadata.openGraph).toMatchObject({
        title: 'Pre-arrival order',
        url: 'https://example.test/order/pre-arrival',
        description: 'Preview the pre-arrival SIM order form.',
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('preserves the article type, reviewer-approved description and CMS fields', () => {
    const metadata = pageMetadata('/guides/published-guide', {
      title: 'Published guide',
      description: 'Approved description',
      openGraph: { type: 'article', modifiedTime: '2026-10-12', authors: ['Editor'] },
    });
    expect(metadata.openGraph).toMatchObject({
      title: 'Published guide',
      description: 'Approved description',
      type: 'article',
      authors: ['Editor'],
    });
  });
});
