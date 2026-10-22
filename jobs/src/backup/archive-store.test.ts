import { describe, expect, it } from 'vitest';

import {
  ArchiveCredentialDeniedError,
  InMemoryArchiveBackend,
  S3ArchiveReader,
  S3ArchiveRetentionAdmin,
  S3ArchiveWriter,
} from './archive-store.js';
import type { S3SigningConfig } from '@canadian-plans/adapters';

describe('InMemoryArchiveBackend role separation', () => {
  it('writer can put and list but not get or delete', async () => {
    const backend = new InMemoryArchiveBackend();
    const writer = backend.asWriter();
    await writer.putObject('run-1/manifest.json.age', new Uint8Array([1, 2, 3]));
    expect(await writer.listObjects('run-1/')).toHaveLength(1);
    // The runtime facade always exposes all four methods (so this negative
    // test can prove the denial); only ArchiveWriter's *type* hides get/delete.
    const asAdmin = backend.scoped(['put', 'list']);
    await expect(asAdmin.getObject('run-1/manifest.json.age')).rejects.toBeInstanceOf(
      ArchiveCredentialDeniedError,
    );
    await expect(asAdmin.deleteObject('run-1/manifest.json.age')).rejects.toBeInstanceOf(
      ArchiveCredentialDeniedError,
    );
  });

  it('reader can list and get but not put or delete', async () => {
    const backend = new InMemoryArchiveBackend();
    await backend.asWriter().putObject('run-1/data.sql.age', new Uint8Array([9]));
    const reader = backend.asReader();
    expect(await reader.getObject('run-1/data.sql.age')).toEqual(new Uint8Array([9]));
    const asReaderFacade = backend.scoped(['list', 'get']);
    await expect(asReaderFacade.putObject('run-1/x', new Uint8Array())).rejects.toBeInstanceOf(
      ArchiveCredentialDeniedError,
    );
    await expect(asReaderFacade.deleteObject('run-1/data.sql.age')).rejects.toBeInstanceOf(
      ArchiveCredentialDeniedError,
    );
  });

  it('only the retention-administrator facade can delete', async () => {
    const backend = new InMemoryArchiveBackend();
    await backend.asWriter().putObject('run-1/x', new Uint8Array([1]));
    const admin = backend.asRetentionAdmin();
    await admin.deleteObject('run-1/x');
    expect(await backend.asReader().getObject('run-1/x')).toBeUndefined();
  });

  it('getObject on a missing key returns undefined, not an error (missing-object detection)', async () => {
    const backend = new InMemoryArchiveBackend();
    expect(await backend.asReader().getObject('does/not/exist')).toBeUndefined();
  });
});

const config: S3SigningConfig = {
  accessKeyId: 'k',
  secretAccessKey: 's',
  endpoint: 'https://s3.us-west-002.backblazeb2.com',
  region: 'us-west-002',
  bucket: 'canadian-plans-backup-archive',
};

describe('S3ArchiveWriter / S3ArchiveReader / S3ArchiveRetentionAdmin', () => {
  it.each([S3ArchiveWriter, S3ArchiveReader, S3ArchiveRetentionAdmin])(
    '%s follows continuation tokens while preserving the requested prefix',
    async (Store) => {
      const requests: URL[] = [];
      const fakeFetch: typeof fetch = async (url) => {
        requests.push(new URL(String(url)));
        const next =
          requests.length === 1
            ? '<IsTruncated>true</IsTruncated><NextContinuationToken>a&amp;b+==</NextContinuationToken>'
            : '<IsTruncated>false</IsTruncated>';
        return new Response(
          `<ListBucketResult><Contents><Key>run-1/${requests.length}</Key><Size>1</Size></Contents>${next}</ListBucketResult>`,
        );
      };
      expect(await new Store(config, fakeFetch).listObjects('run-1/')).toEqual([
        { key: 'run-1/1', sizeBytes: 1 },
        { key: 'run-1/2', sizeBytes: 1 },
      ]);
      expect(requests.map((url) => url.searchParams.get('prefix'))).toEqual(['run-1/', 'run-1/']);
      expect(requests[1]?.searchParams.get('continuation-token')).toBe('a&b+==');
    },
  );

  it.each(['', '<NextContinuationToken>repeated</NextContinuationToken>'])(
    'fails closed for missing or repeated continuation tokens',
    async (continuation) => {
      let requests = 0;
      const fakeFetch: typeof fetch = async () => {
        requests += 1;
        return new Response(
          `<ListBucketResult><IsTruncated>true</IsTruncated>${continuation}</ListBucketResult>`,
        );
      };
      await expect(new S3ArchiveReader(config, fakeFetch).listObjects('')).rejects.toThrow(
        'archive_list_invalid_continuation',
      );
      expect(requests).toBeLessThanOrEqual(2);
    },
  );
  it('writer PUTs the object and lists via ListObjectsV2 XML parsing', async () => {
    const requests: { method: string; url: string }[] = [];
    const fakeFetch: typeof fetch = async (url, init) => {
      const method = init?.method ?? 'GET';
      requests.push({ method, url: String(url) });
      if (method === 'PUT') {
        return new Response(null, { status: 200, headers: { 'x-amz-version-id': 'v1' } });
      }
      const xml = `<?xml version="1.0"?><ListBucketResult><Contents><Key>run-1/data.sql.age</Key><LastModified>2026-10-21T06:17:03.000Z</LastModified><Size>42</Size></Contents></ListBucketResult>`;
      return new Response(xml, { status: 200 });
    };

    const writer = new S3ArchiveWriter(config, fakeFetch);
    const put = await writer.putObject('run-1/data.sql.age', new Uint8Array([1, 2]));
    expect(put.versionId).toBe('v1');
    const listed = await writer.listObjects('run-1/');
    expect(listed).toEqual([
      {
        key: 'run-1/data.sql.age',
        sizeBytes: 42,
        lastModified: new Date('2026-10-21T06:17:03.000Z'),
      },
    ]);
    expect(requests.map((r) => r.method)).toEqual(['PUT', 'GET']);
  });

  it('reader returns undefined on 404 (missing object)', async () => {
    const fakeFetch: typeof fetch = async () => new Response(null, { status: 404 });
    const reader = new S3ArchiveReader(config, fakeFetch);
    expect(await reader.getObject('missing')).toBeUndefined();
  });

  it('reader throws on non-404 failure', async () => {
    const fakeFetch: typeof fetch = async () => new Response('denied', { status: 403 });
    const reader = new S3ArchiveReader(config, fakeFetch);
    await expect(reader.getObject('x')).rejects.toThrow(/archive_get_failed:403/);
  });

  it('retention admin issues DELETE', async () => {
    const requests: string[] = [];
    const fakeFetch: typeof fetch = async (_url, init) => {
      requests.push(init?.method ?? 'GET');
      return new Response(null, { status: 204 });
    };
    const admin = new S3ArchiveRetentionAdmin(config, fakeFetch);
    await admin.deleteObject('run-1/old');
    expect(requests).toEqual(['DELETE']);
  });
});
