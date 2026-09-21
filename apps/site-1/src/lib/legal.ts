import 'server-only';

import { createClient } from '@sanity/client';
import { z } from 'zod';

/**
 * Versioned legal pages (T21, REQ 34). `/privacy` and `/terms` render the
 * published Sanity `legalPage` document and its `version`; orders snapshot the
 * version accepted at submission and leads record the consent version at save.
 * Without a configured Sanity project the page falls back to a clearly labelled
 * TEST placeholder that still carries a version, so the route never 500s.
 */

export type LegalSlug = 'privacy' | 'terms';

export interface LegalBlock {
  readonly _type: string;
  readonly children?: readonly { readonly text?: string }[];
}

export interface LegalPage {
  readonly title: string;
  readonly version: number;
  readonly effectiveDate: string;
  readonly body: readonly LegalBlock[];
  readonly source: 'sanity' | 'test_placeholder';
}

const TEST_TITLES: Record<LegalSlug, string> = { privacy: 'Privacy', terms: 'Terms' };

const blockSchema = z.object({
  _type: z.string(),
  children: z.array(z.object({ text: z.string().optional() })).optional(),
});
const legalDocSchema = z.object({
  title: z.string().min(1),
  version: z.int().positive(),
  effectiveDate: z.string().min(1),
  body: z.array(blockSchema).min(1),
});

export type LegalDoc = z.infer<typeof legalDocSchema>;

/** Parses an untrusted Sanity result into a legal page body, or `undefined`. */
export function parseLegalDoc(value: unknown): LegalDoc | undefined {
  const parsed = legalDocSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** The clearly labelled TEST page used when Sanity is unconfigured or has no document. */
export function testPlaceholder(slug: LegalSlug): LegalPage {
  return {
    title: TEST_TITLES[slug],
    version: 0,
    effectiveDate: '1970-01-01',
    body: [
      {
        _type: 'block',
        children: [{ text: 'This content is pending owner-approved legal text and versioning.' }],
      },
    ],
    source: 'test_placeholder',
  };
}

interface SanityConfig {
  projectId: string;
  dataset: string;
  token?: string;
}

function getSanityConfig(): SanityConfig | undefined {
  const projectId = process.env['NEXT_PUBLIC_SANITY_PROJECT_ID']?.trim();
  const dataset = process.env['NEXT_PUBLIC_SANITY_DATASET']?.trim();
  if (!projectId || !dataset) return undefined;
  const token = process.env['SITE_1_SANITY_PREVIEW_TOKEN']?.trim();
  return { projectId, dataset, ...(token ? { token } : {}) };
}

const LEGAL_PAGE_QUERY = `*[_type == "legalPage" && slug.current == $slug] | order(version desc)[0]{
  title, version, effectiveDate, body
}`;

export async function getLegalPage(slug: LegalSlug): Promise<LegalPage> {
  const config = getSanityConfig();
  if (!config) return testPlaceholder(slug);
  try {
    const client = createClient({
      projectId: config.projectId,
      dataset: config.dataset,
      apiVersion: process.env['NEXT_PUBLIC_SANITY_API_VERSION']?.trim() || '2024-01-01',
      useCdn: true,
      ...(config.token ? { token: config.token } : {}),
    });
    const doc: unknown = await client.fetch(LEGAL_PAGE_QUERY, { slug });
    const parsed = parseLegalDoc(doc);
    if (!parsed) return testPlaceholder(slug);
    return { ...parsed, source: 'sanity' };
  } catch {
    return testPlaceholder(slug);
  }
}
