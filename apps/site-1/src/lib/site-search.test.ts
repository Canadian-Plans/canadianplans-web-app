import { describe, expect, it } from 'vitest';
import { normalizeSiteQuery, searchPreviewIndex } from './site-search';
import { siteSearchAction } from '@/app/(system)/search/actions';
describe('preview site search', () => {
  it('matches the design fixture and filters by category', () => {
    expect(searchPreviewIndex('student sim card')).toHaveLength(6);
    expect(searchPreviewIndex('student sim card', 'plans')).toHaveLength(2);
    expect(searchPreviewIndex('student sim card', 'guides')).toHaveLength(2);
    expect(searchPreviewIndex('Vancouver').map((item) => item.category)).toEqual(['cities']);
    expect(searchPreviewIndex('nonexistent xyz')).toEqual([]);
  });
  it('rejects contact details and malformed values before navigation', () => {
    for (const input of [
      'person@example.com',
      '+1 (604) 555-0123',
      'a',
      'a'.repeat(81),
      'hello\nworld',
      null,
      ['esim'],
    ])
      expect(normalizeSiteQuery(input)).toBeNull();
    expect(normalizeSiteQuery('  student   sim card ')).toBe('student sim card');
  });
  it('validates the server stub independently', async () => {
    const form = new FormData();
    form.set('query', 'person@example.com');
    expect(await siteSearchAction({ status: 'idle' }, form)).toEqual({ status: 'invalid' });
    form.set('query', 'esim');
    expect(await siteSearchAction({ status: 'idle' }, form)).toEqual({
      status: 'ready',
      query: 'esim',
    });
  });
});
