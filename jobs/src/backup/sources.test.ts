import { describe, expect, it } from 'vitest';

import {
  FakeR2SourceReader,
  FakeReferencedObjectManifestSource,
  PsqlReferencedObjectManifestSource,
  S3R2SourceReader,
  SanityCliExporter,
  type ReadFile,
  type WithTempFile,
} from './sources.js';
import type { RunCommand } from './command.js';
import type { S3SigningConfig } from '@canadian-plans/adapters';

const inMemoryTempFile: WithTempFile = async (fn) => fn('/tmp/fake-path');

function fakeReadFile(bytes: Uint8Array): ReadFile {
  return async () => bytes;
}

describe('PsqlReferencedObjectManifestSource', () => {
  it('parses tab-separated rows into referenced objects', async () => {
    const run: RunCommand = async () => ({
      stdout: new TextEncoder().encode(
        'w1\tcanadian-plans-site-1\tobjects/abc\tdeadbeef\t1024\nw2\tcanadian-plans-site-1\tobjects/def\tfeedface\t2048\n',
      ),
      stderr: '',
      exitCode: 0,
    });
    const source = new PsqlReferencedObjectManifestSource('postgres://source/db', run);
    const objects = await source.listReferencedObjects();
    expect(objects).toEqual([
      {
        workspaceId: 'w1',
        bucket: 'canadian-plans-site-1',
        objectKey: 'objects/abc',
        checksumSha256: 'deadbeef',
        sizeBytes: 1024,
      },
      {
        workspaceId: 'w2',
        bucket: 'canadian-plans-site-1',
        objectKey: 'objects/def',
        checksumSha256: 'feedface',
        sizeBytes: 2048,
      },
    ]);
  });

  it('returns an empty list when there is nothing to reference', async () => {
    const run: RunCommand = async () => ({ stdout: new Uint8Array(), stderr: '', exitCode: 0 });
    const source = new PsqlReferencedObjectManifestSource('postgres://source/db', run);
    expect(await source.listReferencedObjects()).toEqual([]);
  });

  it('rejects a malformed row rather than silently dropping it', async () => {
    const run: RunCommand = async () => ({
      stdout: new TextEncoder().encode('w1\tbucket\tonly-three-fields\n'),
      stderr: '',
      exitCode: 0,
    });
    const source = new PsqlReferencedObjectManifestSource('postgres://source/db', run);
    await expect(source.listReferencedObjects()).rejects.toThrow('malformed_referenced_object_row');
  });
});

describe('FakeReferencedObjectManifestSource', () => {
  it('returns exactly the injected fixture', async () => {
    const objects = [
      { workspaceId: 'w1', bucket: 'b', objectKey: 'k', checksumSha256: 'h', sizeBytes: 1 },
    ];
    const source = new FakeReferencedObjectManifestSource(objects);
    expect(await source.listReferencedObjects()).toBe(objects);
  });
});

const r2Config: S3SigningConfig = {
  accessKeyId: 'k',
  secretAccessKey: 's',
  endpoint: 'https://account.r2.cloudflarestorage.com',
  region: 'auto',
  bucket: 'canadian-plans-site-1',
};

describe('S3R2SourceReader', () => {
  it('fetches an object with the SigV4-signed request', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    const reader = new S3R2SourceReader(() => r2Config, fakeFetch);
    expect(await reader.getObject('canadian-plans-site-1', 'objects/abc')).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it('returns undefined for a missing source object (missing-object detection)', async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 404 });
    const reader = new S3R2SourceReader(() => r2Config, fakeFetch);
    expect(await reader.getObject('canadian-plans-site-1', 'objects/missing')).toBeUndefined();
  });
});

describe('FakeR2SourceReader', () => {
  it('keys objects by bucket/key', async () => {
    const reader = new FakeR2SourceReader(new Map([['bucket/key', new Uint8Array([9])]]));
    expect(await reader.getObject('bucket', 'key')).toEqual(new Uint8Array([9]));
    expect(await reader.getObject('bucket', 'other')).toBeUndefined();
  });
});

describe('SanityCliExporter', () => {
  it('exports the dataset and reads the resulting archive', async () => {
    const calls: string[][] = [];
    const run: RunCommand = async (command, args) => {
      calls.push([command, ...args]);
      return { stdout: new Uint8Array(), stderr: 'exported 5 documents, 2 assets', exitCode: 0 };
    };
    const archiveBytes = new TextEncoder().encode('tarball');
    const exporter = new SanityCliExporter(
      { siteFilter: 'site-1', projectId: 'proj123', dataset: 'production' },
      run,
      inMemoryTempFile,
      fakeReadFile(archiveBytes),
    );
    const result = await exporter.exportDataset();
    expect(result.archive).toEqual(archiveBytes);
    expect(calls[0]).toEqual([
      'pnpm',
      '--filter',
      'site-1',
      'exec',
      'sanity',
      'datasets',
      'export',
      'production',
      '/tmp/fake-path',
      '-p',
      'proj123',
    ]);
  });

  it('fails the run when the CLI warns about a skipped asset', async () => {
    const run: RunCommand = async () => ({
      stdout: new Uint8Array(),
      stderr: 'warning: asset returned 403, skipping',
      exitCode: 0,
    });
    const exporter = new SanityCliExporter(
      { siteFilter: 'site-1', projectId: 'proj123', dataset: 'production' },
      run,
      inMemoryTempFile,
      fakeReadFile(new Uint8Array()),
    );
    await expect(exporter.exportDataset()).rejects.toThrow('sanity_export_skipped_asset');
  });

  it('fails the run when the CLI exits non-zero', async () => {
    const run: RunCommand = async () => ({
      stdout: new Uint8Array(),
      stderr: 'not authenticated',
      exitCode: 1,
    });
    const exporter = new SanityCliExporter(
      { siteFilter: 'site-1', projectId: 'proj123', dataset: 'production' },
      run,
      inMemoryTempFile,
      fakeReadFile(new Uint8Array()),
    );
    await expect(exporter.exportDataset()).rejects.toThrow('sanity_export_failed');
  });
});
