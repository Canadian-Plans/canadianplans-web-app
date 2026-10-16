import { describe, expect, it } from 'vitest';

import { buildManifest, manifestArtifact, verifyManifestArtifacts } from './manifest.js';

describe('manifest', () => {
  const data = new TextEncoder().encode('roles.sql contents');
  const manifest = buildManifest({
    runId: 'run-1',
    capturedAt: new Date('2026-09-14T00:00:00.000Z'),
    sourceIds: { supabaseProjectRef: 'abc123' },
    toolVersions: { supabase: '1.0.0' },
    artifacts: [manifestArtifact('roles.sql', data)],
    counts: { orders: 3 },
    exclusions: ['edge_function_secrets'],
  });

  it('is a snapshot only when every artifact is present and its checksum matches', () => {
    const result = verifyManifestArtifacts(manifest, new Map([['roles.sql', data]]));
    expect(result).toEqual({ ok: true });
  });

  it('fails closed on a missing artifact', () => {
    const result = verifyManifestArtifacts(manifest, new Map());
    expect(result).toEqual({ ok: false, missing: ['roles.sql'], mismatched: [] });
  });

  it('fails closed on a checksum mismatch (tampered payload)', () => {
    const tampered = new TextEncoder().encode('different bytes, same name');
    const result = verifyManifestArtifacts(manifest, new Map([['roles.sql', tampered]]));
    expect(result).toEqual({ ok: false, missing: [], mismatched: ['roles.sql'] });
  });

  it('rejects a manifest that is missing required fields', () => {
    expect(() =>
      buildManifest({
        runId: 'run-1',
        capturedAt: new Date(),
        sourceIds: {},
        toolVersions: {},
        artifacts: [],
        counts: {},
        exclusions: [],
      }),
    ).toThrow();
  });
});
