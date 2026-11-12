import { describe, expect, it, vi } from 'vitest';
import { documentTitle, pageMetadata } from './page-metadata';
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
  it('brands short titles that do not name the site and leaves the rest as written', () => {
    expect(documentTitle('Privacy Policy')).toBe('Privacy Policy | Canadian Plans');
    expect(documentTitle('Track your order | Canadian Plans')).toBe(
      'Track your order | Canadian Plans',
    );
    expect(documentTitle('Accessibility at Canadian Plans')).toBe(
      'Accessibility at Canadian Plans',
    );
    const headline = 'Rogers vs Fido vs Chatr for newcomers: which plan should you pick? (2026)';
    expect(documentTitle(headline)).toBe(headline);
    const metadata = pageMetadata('/terms', { title: 'Terms of Service' });
    expect(metadata.title).toBe('Terms of Service | Canadian Plans');
    // Sharing cards already show the site name beside the title.
    expect(metadata.openGraph).toMatchObject({ title: 'Terms of Service' });
  });
});
