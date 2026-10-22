import { describe, expect, it } from 'vitest';

import { InMemoryArchiveBackend } from '../backup/archive-store.js';
import {
  TestEnvelopeDecryptor,
  TestEnvelopeEncryptor,
  generateTestRecipientKeyPair,
} from '../backup/encryptor.js';
import { readLatestHeartbeat, publishHeartbeat, type Heartbeat } from '../backup/heartbeat.js';
import { buildManifest, manifestArtifact, verifyManifestArtifacts } from '../backup/manifest.js';
import { runRetention } from './run.js';
import type { ArchiveWriter } from '../backup/archive-store.js';
import type { Encryptor, Decryptor } from '../backup/encryptor.js';

async function seedRun(
  writer: ArchiveWriter,
  encryptor: Encryptor,
  runId: string,
  capturedAt: Date,
): Promise<void> {
  clock = capturedAt;
  const artifactBytes = new TextEncoder().encode(`payload-for-${runId}`);
  const manifest = buildManifest({
    runId,
    capturedAt,
    sourceIds: {},
    toolVersions: {},
    artifacts: [manifestArtifact('data.sql', artifactBytes)],
    counts: {},
    exclusions: [],
  });
  await writer.putObject(`${runId}/data.sql.enc`, await encryptor.encrypt(artifactBytes));
  await writer.putObject(
    `${runId}/manifest.json.enc`,
    await encryptor.encrypt(new TextEncoder().encode(JSON.stringify(manifest))),
  );
}

// The in-memory archive stamps each upload with this clock, so a seeded run's
// manifest carries the capture time retention now reads from the listing.
let clock = new Date('2026-09-14T02:00:00.000Z');

function daysAgo(n: number): Date {
  const d = new Date('2026-09-14T02:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

describe('runRetention', () => {
  it('dry-run reports candidate deletions without deleting anything', async () => {
    const backend = new InMemoryArchiveBackend(() => clock);
    const { publicKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const writer = backend.asWriter();

    for (let i = 0; i < 35; i++) {
      await seedRun(writer, encryptor, `run-${i}`, daysAgo(i));
    }
    const sizeBefore = backend.size();

    const report = await runRetention({
      admin: backend.asRetentionAdmin(),
      now: () => new Date('2026-09-14T02:00:00.000Z'),
      dryRun: true,
    });

    expect(report.dryRun).toBe(true);
    expect(report.totalRuns).toBe(35);
    expect(report.retainedRunIds).toHaveLength(30);
    expect(report.candidateDeletions.length).toBeGreaterThan(0);
    expect(report.deleted).toEqual([]);
    expect(backend.size()).toBe(sizeBefore);
  });

  it('deletes only unreferenced payloads outside the grace period, and a retained snapshot remains fully restorable', async () => {
    const backend = new InMemoryArchiveBackend(() => clock);
    const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const decryptor: Decryptor = new TestEnvelopeDecryptor(privateKeyBase64);
    const writer = backend.asWriter();

    for (let i = 0; i < 35; i++) {
      await seedRun(writer, encryptor, `run-${i}`, daysAgo(i));
    }

    const report = await runRetention({
      admin: backend.asRetentionAdmin(),
      now: () => new Date('2026-09-14T02:00:00.000Z'),
      graceSeconds: 0,
      dryRun: false,
    });

    expect(report.retainedRunIds).toHaveLength(30);
    expect(report.deleted.length).toBe(report.candidateDeletions.length);
    expect(report.deleted.length).toBeGreaterThan(0);

    // The oldest (unretained) run's objects are gone.
    const reader = backend.asReader();
    expect(await reader.getObject('run-34/manifest.json.enc')).toBeUndefined();
    expect(await reader.getObject('run-34/data.sql.enc')).toBeUndefined();

    // A retained run (the most recent) is still completely present and
    // decrypts/verifies exactly as it would during a real restore.
    const manifestCiphertext = await reader.getObject('run-0/manifest.json.enc');
    expect(manifestCiphertext).toBeDefined();
    const manifest = JSON.parse(
      new TextDecoder().decode(await decryptor.decrypt(manifestCiphertext!)),
    );
    const artifactCiphertext = await reader.getObject('run-0/data.sql.enc');
    expect(artifactCiphertext).toBeDefined();
    const artifactBytes = await decryptor.decrypt(artifactCiphertext!);
    expect(verifyManifestArtifacts(manifest, new Map([['data.sql', artifactBytes]]))).toEqual({
      ok: true,
    });
  });

  it('never deletes anything from a run whose manifest age is unknown (fail-safe, not fail-open)', async () => {
    const backend = new InMemoryArchiveBackend(() => clock);
    const { publicKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const writer = backend.asWriter();

    for (let i = 0; i < 35; i++) {
      await seedRun(writer, encryptor, `run-${i}`, daysAgo(i));
    }
    // Retention never decrypts a manifest; it ages a run by the manifest
    // object's upload time. Hide that time for the oldest run so it cannot be
    // proven safe to delete.
    const admin = backend.asRetentionAdmin();
    const report = await runRetention({
      admin: {
        ...admin,
        listObjects: async (prefix) =>
          (await admin.listObjects(prefix)).map((object) =>
            object.key === 'run-34/manifest.json.enc'
              ? { key: object.key, sizeBytes: object.sizeBytes }
              : object,
          ),
      },
      now: () => new Date('2026-09-14T02:00:00.000Z'),
      graceSeconds: 0,
      dryRun: false,
    });

    expect(report.unreadableManifests).toEqual(['run-34/manifest.json.enc']);
    expect(report.retainedRunIds).toContain('run-34');
    expect(await backend.asReader().getObject('run-34/data.sql.enc')).toBeDefined();
  });

  it('deletes an abandoned attempt without a manifest once it is past the grace period', async () => {
    let clock = new Date('2026-09-10T06:17:00.000Z');
    const backend = new InMemoryArchiveBackend(() => clock);
    const { publicKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const writer = backend.asWriter();
    await seedRun(writer, encryptor, 'run-complete', clock);
    // A failed attempt uploaded one artifact and stopped before its manifest.
    await writer.putObject('run-failed/data.sql.enc', new Uint8Array([1]));
    clock = new Date('2026-09-10T06:30:00.000Z');
    // A later attempt is still uploading when retention starts.
    await writer.putObject('run-uploading/data.sql.enc', new Uint8Array([2]));

    const report = await runRetention({
      admin: backend.asRetentionAdmin(),
      now: () => new Date('2026-09-11T06:20:00.000Z'),
      dryRun: false,
    });

    expect(report.unreadableManifests).toEqual([]);
    expect(report.abandonedRunIds).toEqual(['run-failed']);
    expect(report.pendingRunIds).toEqual(['run-uploading']);
    expect(report.deleted).toEqual(['run-failed/data.sql.enc']);
    expect(await backend.asReader().getObject('run-uploading/data.sql.enc')).toBeDefined();
    expect(await backend.asReader().getObject('run-complete/manifest.json.enc')).toBeDefined();
  });

  it('fails visibly instead of deleting a manifest-less attempt of unknown age', async () => {
    const backend = new InMemoryArchiveBackend(() => clock);
    const admin = backend.asRetentionAdmin();
    await backend.asWriter().putObject('run-unknown/data.sql.enc', new Uint8Array([1]));
    const report = await runRetention({
      admin: {
        ...admin,
        listObjects: async (prefix) =>
          (await admin.listObjects(prefix)).map(({ key, sizeBytes }) => ({ key, sizeBytes })),
      },
      now: () => new Date('2030-01-01T00:00:00.000Z'),
      graceSeconds: 0,
      dryRun: false,
    });
    expect(report.unreadableManifests).toEqual(['run-unknown/manifest.json.enc']);
    expect(report.deleted).toEqual([]);
  });

  it('never deletes the heartbeat object', async () => {
    const backend = new InMemoryArchiveBackend(() => clock);
    const { publicKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const writer = backend.asWriter();
    await seedRun(writer, encryptor, 'run-0', new Date('2026-09-14T02:00:00.000Z'));
    const heartbeat: Heartbeat = {
      schemaVersion: 1,
      runId: 'run-0',
      completedAt: new Date('2026-09-14T02:00:00.000Z').toISOString(),
      verified: true,
      manifestKey: 'run-0/manifest.json.enc',
      artifactCount: 1,
    };
    await publishHeartbeat(writer, heartbeat);

    await runRetention({
      admin: backend.asRetentionAdmin(),
      now: () => new Date('2027-01-01T00:00:00.000Z'),
      graceSeconds: 0,
      dryRun: false,
    });
    expect((await readLatestHeartbeat(backend.asReader())).status).not.toBe('missing');
  });
});
