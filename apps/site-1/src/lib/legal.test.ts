import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LegalBody } from '../components/legal-body';
const clientMocks = vi.hoisted(() => {
  const fetch = vi.fn();
  return { fetch, createClient: vi.fn(() => ({ fetch })) };
});
vi.mock('@sanity/client', () => ({ createClient: clientMocks.createClient }));

vi.mock('server-only', () => ({}));

import { parseLegalDoc, testPlaceholder, getLegalPage } from './legal';

describe('parseLegalDoc', () => {
  it('preserves CMS section headings and bullet lists through parsing and rendering', () => {
    const doc = parseLegalDoc({
      title: 'Terms',
      version: 1,
      effectiveDate: '2026-10-20',
      body: [
        { _type: 'block', style: 'h2', children: [{ text: 'Conditions' }] },
        { _type: 'block', listItem: 'bullet', children: [{ text: 'A condition' }] },
      ],
    });
    if (!doc) throw new Error('valid legal document rejected');
    const html = renderToStaticMarkup(createElement(LegalBody, { blocks: doc.body }));
    expect(html).toContain('<h2');
    expect(html).toContain('<ul');
    expect(html).toContain('<li>A condition</li>');
  });
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

it('shows a Sanity legal page only when its version equals the repo release', async () => {
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'test-project');
  vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production');
  const doc = (version: number) => ({
    title: 'Terms from Sanity',
    version,
    effectiveDate: '2026-10-01',
    body: [{ _type: 'block', children: [{ text: 'Copy' }] }],
  });
  try {
    clientMocks.fetch.mockResolvedValueOnce(doc(3));
    expect(await getLegalPage('terms')).toMatchObject({ source: 'repo', version: 2 });
    clientMocks.fetch.mockResolvedValueOnce(doc(2));
    expect(await getLegalPage('terms')).toMatchObject({ source: 'sanity', version: 2 });
    clientMocks.fetch.mockResolvedValueOnce(doc(1));
    expect(await getLegalPage('terms')).toMatchObject({ source: 'repo', version: 2 });
  } finally {
    vi.unstubAllEnvs();
    clientMocks.fetch.mockReset();
    clientMocks.createClient.mockClear();
  }
});

describe('getLegalPage without Sanity', () => {
  it('shows the legal text kept in the repo, with a real version, never the placeholder', async () => {
    for (const slug of ['privacy', 'terms'] as const) {
      const page = await getLegalPage(slug);
      expect(page.source).toBe('repo');
      expect(page.version).toBe(2);
      expect(page.effectiveDate).toBe('2026-10-21');
      const text = page.body.map((block) => block.children?.map((c) => c.text).join('')).join('\n');
      expect(text).toContain('9981 Whalley Blvd, Surrey, BC V3T 0A8');
      expect(text).toContain('info@canadianplans.com');
      expect(text).not.toMatch(/\[[^\]]*\]|TEST|OWNER TO CONFIRM/);
    }
  });

  it('states British Columbia law and the owner-confirmed request-only deletion policy', async () => {
    const terms = (await getLegalPage('terms')).body.map((b) => b.children?.[0]?.text).join('\n');
    const privacy = (await getLegalPage('privacy')).body
      .map((b) => b.children?.[0]?.text)
      .join('\n');
    expect(terms).toContain('governed by the laws of British Columbia');
    expect(privacy).toContain('until you ask us to delete them');
    expect(privacy).toContain('do not automatically delete');
    expect(privacy).not.toMatch(/6 months|six months|after your order is completed/);
  });
});

it('does not serve an older CMS privacy policy over the current owner-approved release', async () => {
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'test-project');
  vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production');
  clientMocks.fetch.mockResolvedValue({
    title: 'Old privacy',
    version: 1,
    effectiveDate: '2026-10-20',
    body: [
      {
        _type: 'block',
        children: [{ text: 'We delete identity documents 6 months after completion.' }],
      },
    ],
  });
  try {
    const page = await getLegalPage('privacy');
    expect(page).toMatchObject({ source: 'repo', version: 2, effectiveDate: '2026-10-21' });
    expect(
      page.body.map((block) => block.children?.map((child) => child.text).join('')).join('\n'),
    ).toContain('until you ask us to delete them');
  } finally {
    vi.unstubAllEnvs();
    clientMocks.fetch.mockReset();
    clientMocks.createClient.mockClear();
  }
});
