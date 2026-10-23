import { describe, expect, it } from 'vitest';

import { CommandFailedError, stderrExcerpt } from './command.js';

describe('stderrExcerpt', () => {
  it('drops image-pull progress and keeps the real error at the end', () => {
    const stderr = [
      'Dumping roles from remote database...',
      '17.11.0.004: Pulling from supabase/postgres',
      'd0c1d894c237: Pulling fs layer',
      '2a7fe997b3bc: Download complete',
      'Digest: sha256:abc',
      'Status: Downloaded newer image for ghcr.io/supabase/postgres:17.11.0.004',
      'pg_dump: error: query failed: ERROR:  permission denied for schema auth',
    ].join('\n');
    expect(stderrExcerpt(stderr)).toBe(
      'pg_dump: error: query failed: ERROR:  permission denied for schema auth',
    );
  });

  it('keeps the end of a long message, which is where the cause is', () => {
    const excerpt = stderrExcerpt(`${'noise '.repeat(200)}FATAL: the real cause`, 50);
    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('FATAL: the real cause')).toBe(true);
    expect(excerpt.length).toBe(51);
  });

  it('never carries a database password', () => {
    const excerpt = stderrExcerpt(
      'failed to connect to postgresql://backup_reader.ref:s3cretPass@host:5432/postgres password=other',
    );
    expect(excerpt).not.toContain('s3cretPass');
    expect(excerpt).not.toContain('other');
    expect(excerpt).toContain('postgresql://backup_reader.ref:[redacted]@host:5432/postgres');
  });

  it('feeds CommandFailedError messages', () => {
    expect(new CommandFailedError('supabase', 1, 'x: Pulling from y\nreal error').message).toBe(
      'supabase_failed:1:real error',
    );
  });
});
