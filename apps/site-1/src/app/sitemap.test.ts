import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';
import { getLegalPage } from '../lib/legal';
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
});
