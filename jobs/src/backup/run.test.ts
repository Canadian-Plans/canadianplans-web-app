import { sha256Hex } from '@canadian-plans/adapters';
import { describe, expect, it } from 'vitest';

import { InMemoryArchiveBackend } from './archive-store.js';
import {
  generateTestRecipientKeyPair,
  TestEnvelopeDecryptor,
  TestEnvelopeEncryptor,
} from './encryptor.js';
import { readLatestHeartbeat } from './heartbeat.js';
import { InMemoryBackupLease } from './lease.js';
import { verifyManifestArtifacts, backupManifestSchema } from './manifest.js';
import { BackupIncompleteError, BackupUploadVerificationError, runBackup } from './run.js';
import {
  FakeR2SourceReader,
  FakeReferencedObjectManifestSource,
  FakeSanityExporter,
  type DatabaseExporter,
} from './sources.js';

const fakeDatabase: DatabaseExporter = {
  exportAll: async () => ({
    roles: new TextEncoder().encode('roles'),
    schema: new TextEncoder().encode('schema'),
    data: new TextEncoder().encode('data'),
    historySchema: new TextEncoder().encode('history-schema'),
    historyData: new TextEncoder().encode('history-data'),
  }),
};

function baseDeps() {
  const backend = new InMemoryArchiveBackend();
  const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
  const r2Bytes = new TextEncoder().encode('customer-document-bytes');
  const checksum = sha256Hex(r2Bytes);
  const lease = new InMemoryBackupLease();
  return {
    backend,
    privateKeyBase64,
    lease,
    deps: {
      runId: 'run-2026-09-14',
      now: () => new Date('2026-09-14T02:00:00.000Z'),
      encryptor: new TestEnvelopeEncryptor(publicKeyBase64),
      archiveWriter: backend.asWriter(),
      lease,
      database: fakeDatabase,
      referencedObjects: new FakeReferencedObjectManifestSource([
        {
          workspaceId: 'w1',
          bucket: 'canadian-plans-site-1',
          objectKey: 'objects/passport.pdf',
          checksumSha256: checksum,
          sizeBytes: r2Bytes.byteLength,
        },
      ]),
      r2Source: new FakeR2SourceReader(
        new Map([['canadian-plans-site-1/objects/passport.pdf', r2Bytes]]),
      ),
      sanity: new FakeSanityExporter({
        archive: new TextEncoder().encode('sanity-tarball'),
        documentCount: 12,
        assetCount: 3,
      }),
      sourceIds: { supabaseProjectRef: 'proj-abc' },
      toolVersions: { supabase: '1.0.0' },
    },
  };
}

describe('runBackup', () => {
  it('encrypts, uploads and verifies every artifact, then publishes a heartbeat', async () => {
    const { backend, privateKeyBase64, deps } = baseDeps();
    const summary = await runBackup(deps);
    expect(summary.referencedObjectCount).toBe(1);
    expect(summary.artifactCount).toBeGreaterThanOrEqual(6);

    const reader = backend.asReader();
    const heartbeatResult = await readLatestHeartbeat(reader);
    expect(heartbeatResult.status).toBe('ok');
    if (heartbeatResult.status !== 'ok') throw new Error('unreachable');
    expect(heartbeatResult.heartbeat.runId).toBe('run-2026-09-14');
    expect(heartbeatResult.heartbeat.verified).toBe(true);

    // Decrypt the manifest and every artifact with the separately recovered
    // key and prove the manifest's own checksums/counts (REQ 42 "verify
    // checksums and key recovery").
    const decryptor = new TestEnvelopeDecryptor(privateKeyBase64);
    const manifestCiphertext = await reader.getObject(heartbeatResult.heartbeat.manifestKey);
    if (!manifestCiphertext) throw new Error('manifest missing');
    const manifest = backupManifestSchema.parse(
      JSON.parse(new TextDecoder().decode(await decryptor.decrypt(manifestCiphertext))),
    );

    const decrypted = new Map<string, Uint8Array>();
    for (const artifact of manifest.artifacts) {
      const ciphertext = await reader.getObject(`${manifest.runId}/${artifact.name}.enc`);
      if (!ciphertext) throw new Error(`missing ciphertext for ${artifact.name}`);
      decrypted.set(artifact.name, await decryptor.decrypt(ciphertext));
    }
    expect(verifyManifestArtifacts(manifest, decrypted)).toEqual({ ok: true });
  });

  it('releases the lease even on success', async () => {
    const { deps, lease } = baseDeps();
    await runBackup(deps);
    expect(lease.isAnyActive()).toBe(false);
  });

  it('fails closed (no heartbeat) when a referenced R2 object is missing', async () => {
    const { backend, deps } = baseDeps();
    deps.r2Source = new FakeR2SourceReader(new Map());
    await expect(runBackup(deps)).rejects.toBeInstanceOf(BackupIncompleteError);
    expect((await readLatestHeartbeat(backend.asReader())).status).toBe('missing');
  });

  it('fails closed when a referenced object exists but its checksum does not match', async () => {
    const { backend, deps } = baseDeps();
    deps.r2Source = new FakeR2SourceReader(
      new Map([
        ['canadian-plans-site-1/objects/passport.pdf', new TextEncoder().encode('tampered')],
      ]),
    );
    await expect(runBackup(deps)).rejects.toBeInstanceOf(BackupIncompleteError);
    expect((await readLatestHeartbeat(backend.asReader())).status).toBe('missing');
  });

  it('releases the lease even when the run fails', async () => {
    const { deps, lease } = baseDeps();
    deps.r2Source = new FakeR2SourceReader(new Map());
    await expect(runBackup(deps)).rejects.toThrow();
    expect(lease.isAnyActive()).toBe(false);
  });

  it('fails closed when an upload does not verifiably land in the archive', async () => {
    const { deps } = baseDeps();
    const writer = deps.archiveWriter;
    // Simulate a writer whose list is missing one key after upload (e.g. an
    // eventually-consistent listing or a dropped request) without touching
    // real network conditions.
    deps.archiveWriter = {
      putObject: writer.putObject.bind(writer),
      listObjects: async (prefix: string) => (await writer.listObjects(prefix)).slice(0, -1),
    };
    await expect(runBackup(deps)).rejects.toBeInstanceOf(BackupUploadVerificationError);
  });
});
