import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseLegalDoc, testPlaceholder } from './legal';

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
