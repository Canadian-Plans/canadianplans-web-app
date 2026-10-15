import { describe, expect, it, vi } from 'vitest';
const clientMocks = vi.hoisted(() => {
  const fetch = vi.fn();
  return { fetch, createClient: vi.fn(() => ({ fetch })) };
});
vi.mock('@sanity/client', () => ({ createClient: clientMocks.createClient }));

vi.mock('server-only', () => ({}));

import { parseLegalDoc, testPlaceholder, getLegalPage } from './legal';

describe('parseLegalDoc', () => {
  it('accepts a complete versioned document', () => {
    const doc = parseLegalDoc({
      title: 'Terms',
      version: 2,
      effectiveDate: '2026-09-01',
      body: [{ _type: 'block', children: [{ text: 'Hello' }] }],
    });
    expect(doc).toMatchObject({ title: 'Terms', version: 2 });
  });

  it('rejects a document missing a version, effective date or body', () => {
    expect(
      parseLegalDoc({ title: 'Terms', effectiveDate: '2026-09-01', body: [] }),
    ).toBeUndefined();
    expect(
      parseLegalDoc({
        title: 'Terms',
        version: 0,
        effectiveDate: '2026-09-01',
        body: [{ _type: 'block' }],
      }),
    ).toBeUndefined();
    expect(parseLegalDoc(null)).toBeUndefined();
  });
});

describe('testPlaceholder', () => {
  it('carries a version and is labelled as a placeholder', () => {
    const page = testPlaceholder('privacy');
    expect(page.source).toBe('test_placeholder');
    expect(page.title).toBe('Privacy');
    expect(Number.isInteger(page.version)).toBe(true);
    expect(page.body.length).toBeGreaterThan(0);
  });
});
it('reads only published legal content even with a preview credential and older API version', async () => {
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'test-project');
  vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production');
  vi.stubEnv('NEXT_PUBLIC_SANITY_API_VERSION', '2024-01-01');
  vi.stubEnv('SITE_1_SANITY_PREVIEW_TOKEN', 'TEST_ONLY_TOKEN');
  clientMocks.fetch.mockResolvedValue({
    title: 'Published terms',
    version: 2,
    effectiveDate: '2026-10-01',
    body: [{ _type: 'block', children: [{ text: 'Approved copy' }] }],
  });
  try {
    expect(await getLegalPage('terms')).toMatchObject({
      source: 'sanity',
      title: 'Published terms',
    });
    expect(clientMocks.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ perspective: 'published', apiVersion: '2024-01-01' }),
    );
  } finally {
    vi.unstubAllEnvs();
    clientMocks.fetch.mockReset();
    clientMocks.createClient.mockClear();
  }
});
