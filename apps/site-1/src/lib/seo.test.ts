import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIndexable, siteBaseUrl } from './seo';
afterEach(() => vi.unstubAllEnvs());
describe('canonical origin and publication gate', () => {
  it('does not index production builds with a missing or unsafe public origin', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    for (const value of [
      '',
      'not a URL',
      'https://user:password@example.test',
      'http://example.test',
      'https://localhost',
      'https://example.test/?secret=test',
      'https://example.test/path',
    ]) {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', value);
      expect(isIndexable()).toBe(false);
    }
  });
  it('uses a configured HTTPS origin only on a production deployment', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test/');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(siteBaseUrl()).toBe('https://example.test');
    expect(isIndexable()).toBe(false);
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isIndexable()).toBe(true);
  });
});
