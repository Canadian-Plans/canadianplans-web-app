import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';
import { getLegalPage } from '../lib/legal';
import { INDEXABLE_PATHS, publicRobots } from '../lib/seo';
vi.mock('../lib/legal', () => ({ getLegalPage: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe('publication-aware sitemap', () => {
  it('does not advertise any routes from a preview deployment', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await sitemap()).toEqual([]);
    expect(getLegalPage).not.toHaveBeenCalled();
  });
  it('excludes draft legal pages, fixture catalogues and private order/lookup routes', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');
    vi.mocked(getLegalPage).mockImplementation(async (slug) => ({
      title: slug,
      version: 1,
      effectiveDate: '2026-10-12',
      body: [],
      source: slug === 'privacy' ? 'sanity' : 'test_placeholder',
    }));
    expect((await sitemap()).map((row) => row.url)).toEqual([
      'https://example.test/accessibility',
      'https://example.test/privacy',
    ]);
  });
  it('keeps commercial pages noindex while launch step 6.1 is closed', () => {
    for (const path of ['/', '/mobile-plans', '/guides/best-sim-for-students-from-india']) {
      expect(publicRobots(path)).toEqual({ index: false, follow: false });
    }
    expect(publicRobots('/order')).toEqual({ index: false, follow: false });
  });
});
describe('sitemap once indexing is open', () => {
  it('lists every indexable path, the guides and published legal pages', async () => {
    vi.resetModules();
    vi.doMock('../lib/seo', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../lib/seo')>()),
      STOREFRONT_INDEXING_OPEN: true,
    }));
    const { default: openSitemap } = await import('./sitemap');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');
    vi.mocked(getLegalPage).mockResolvedValue({
      title: 'x',
      version: 1,
      effectiveDate: '2026-10-12',
      body: [],
      source: 'sanity',
    });
    const urls = (await openSitemap()).map((row) => row.url);
    for (const path of INDEXABLE_PATHS) expect(urls).toContain(`https://example.test${path}`);
    expect(urls).toContain('https://example.test/guides/best-sim-for-students-from-india');
    expect(urls).toContain('https://example.test/privacy');
    expect(urls).not.toContain('https://example.test/order');
    vi.doUnmock('../lib/seo');
  });
});
