import { sha256Hex } from '@canadian-plans/adapters';
import { describe, expect, it } from 'vitest';

import {
  BackupIncompleteError,
  InMemoryArchiveBackend,
  InMemoryBackupLease,
  TestEnvelopeDecryptor,
  TestEnvelopeEncryptor,
  generateTestRecipientKeyPair,
  runBackup,
  type DatabaseExporter,
} from '../src/backup/index.js';
import {
  FakeR2SourceReader,
  FakeReferencedObjectManifestSource,
  FakeSanityExporter,
} from '../src/backup/sources.js';
import { runMonitor, requiresAlert } from '../src/monitor/index.js';
import { runRetention } from '../src/retention/index.js';
import { runRestore, signCheckpoint, type LedgerReader } from '../src/restore/index.js';

/**
 * A complete, self-contained local rehearsal of the daily backup → monitor →
 * retention → restore pipeline (IMPLEMENTATION_PLAN §13, REQ 41-44) using
 * synthetic data and this repository's own in-memory/test-envelope
 * implementations, wired exactly as production would wire the real B2/`age`/
 * provider adapters. It exercises the required negative paths — corrupt
 * ciphertext, a missing object, failed Auth recovery and an unavailable
 * ledger — and records measured durations. It is a repository-local proof of
 * the application semantics (see docs/EVIDENCE/A4-restore.md for what this
 * does and does not prove about the real B2/Supabase/Sanity/`age`
 * production path, which this environment has no credentials or binaries for).
 */

const LEDGER_KEY = 'owner-controlled-checkpoint-verification-key';

function buildSyntheticDatabaseExporter(): DatabaseExporter {
  return {
    exportAll: async () => ({
      roles: new TextEncoder().encode('-- synthetic roles.sql'),
      schema: new TextEncoder().encode('-- synthetic schema.sql'),
      data: new TextEncoder().encode('-- synthetic data.sql: 3 orders, 2 workspaces'),
      historySchema: new TextEncoder().encode('-- synthetic supabase_migrations schema'),
      historyData: new TextEncoder().encode('-- synthetic supabase_migrations rows'),
    }),
  };
}

function emptyLedger(now: Date, sequence = 1): LedgerReader {
  const checkpoint = signCheckpoint(
    {
      schemaVersion: 1,
      sequence,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      eventKeys: [],
    },
    LEDGER_KEY,
  );
  return { listEvents: async () => [], getFreshCheckpoint: async () => checkpoint };
}

describe('A4 backup/restore rehearsal (synthetic data, local isolated harness)', () => {
  it('runs a full daily backup, an ok then stale monitor read, retention dry-run, and a successful restore that reconciles the ledger', async () => {
    const timings: Record<string, number> = {};
    const backend = new InMemoryArchiveBackend();
    const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();

    const passportBytes = new TextEncoder().encode('%PDF-synthetic-passport-bytes');
    const passportChecksum = sha256Hex(passportBytes);

    const backupStart = performance.now();
    const summary = await runBackup({
      runId: 'run-2026-09-14',
      now: () => new Date('2026-09-14T02:00:00.000Z'),
      encryptor: new TestEnvelopeEncryptor(publicKeyBase64),
      archiveWriter: backend.asWriter(),
      lease: new InMemoryBackupLease(),
      database: buildSyntheticDatabaseExporter(),
      referencedObjects: new FakeReferencedObjectManifestSource([
        {
          workspaceId: 'w1',
          bucket: 'canadian-plans-site-1',
          objectKey: 'objects/passport.pdf',
          checksumSha256: passportChecksum,
          sizeBytes: passportBytes.byteLength,
        },
      ]),
      r2Source: new FakeR2SourceReader(
        new Map([['canadian-plans-site-1/objects/passport.pdf', passportBytes]]),
      ),
      sanity: new FakeSanityExporter({
        archive: new TextEncoder().encode('synthetic sanity tarball'),
        documentCount: 8,
        assetCount: 2,
      }),
      sourceIds: { supabaseProjectRef: 'synthetic-project' },
      toolVersions: { supabase: 'test', sanity: 'test', age: 'test-envelope-v1' },
    });
    timings.backupDurationMs = performance.now() - backupStart;

    expect(summary.referencedObjectCount).toBe(1);
    expect(summary.artifactCount).toBeGreaterThanOrEqual(6);

    // Monitor: immediately after the run, it is ok.
    const okStatus = await runMonitor({
      reader: backend.asReader(),
      now: () => new Date('2026-09-14T04:00:00.000Z'),
    });
    expect(okStatus.status).toBe('ok');
    expect(requiresAlert(okStatus)).toBe(false);

    // 27 hours later with no new run, the same heartbeat is now stale — the
    // owner is alerted, and no code path can report this as success.
    const staleStatus = await runMonitor({
      reader: backend.asReader(),
      now: () => new Date('2026-09-15T05:00:00.000Z'),
    });
    expect(staleStatus.status).toBe('stale');
    expect(requiresAlert(staleStatus)).toBe(true);

    // Retention dry-run over a single run changes nothing and retains it.
    const retentionReport = await runRetention({
      admin: backend.asRetentionAdmin(),
      decryptor: new TestEnvelopeDecryptor(privateKeyBase64),
      now: () => new Date('2026-09-14T04:00:00.000Z'),
      dryRun: true,
    });
    expect(retentionReport.retainedRunIds).toEqual(['run-2026-09-14']);
    expect(retentionReport.deleted).toEqual([]);

    // Restore into an isolated target: separate decryption key, separate
    // ledger reader, and an independent Auth-recovery check, all passing.
    const restoreStart = performance.now();
    const restoreReport = await runRestore({
      runId: 'run-2026-09-14',
      reader: backend.asReader(),
      decryptor: new TestEnvelopeDecryptor(privateKeyBase64),
      ledger: emptyLedger(new Date('2026-09-15T05:45:00.000Z')),
      ledgerVerificationKey: LEDGER_KEY,
      replayLedgerEvent: async () => {},
      verifyAuthRecovery: async () => ({ status: 'ok' }),
      postRestoreChecks: async () => ({
        ok: true,
        counts: { orders: 3, workspaces: 2, files: 1 },
      }),
      now: () => new Date('2026-09-15T06:00:00.000Z'),
      incidentDetectedAt: new Date('2026-09-15T05:30:00.000Z'),
    });
    timings.restoreDurationMs = performance.now() - restoreStart;

    expect(restoreReport.reopened).toBe(true);
    expect(restoreReport.missingArtifacts).toEqual([]);
    expect(restoreReport.mismatchedArtifacts).toEqual([]);
    expect(restoreReport.postRestoreChecks).toEqual({
      ok: true,
      counts: { orders: 3, workspaces: 2, files: 1 },
    });
    // Measured, not guaranteed (REQ 43): backup captured at 02:00, incident
    // detected at 05:30 the next day — the actual synthetic loss window.
    expect(restoreReport.measuredLossWindowMs).toBe(
      new Date('2026-09-15T05:30:00.000Z').getTime() -
        new Date('2026-09-14T02:00:00.000Z').getTime(),
    );

    // eslint-disable-next-line no-console
    console.log('[A4 rehearsal] measured durations (ms):', timings);
  });

  it('fails the backup closed (no heartbeat, no upload of a partial snapshot) on a missing source object', async () => {
    const backend = new InMemoryArchiveBackend();
    const { publicKeyBase64 } = generateTestRecipientKeyPair();
    await expect(
      runBackup({
        runId: 'run-missing-object',
        now: () => new Date('2026-09-14T02:00:00.000Z'),
        encryptor: new TestEnvelopeEncryptor(publicKeyBase64),
        archiveWriter: backend.asWriter(),
        lease: new InMemoryBackupLease(),
        database: buildSyntheticDatabaseExporter(),
        referencedObjects: new FakeReferencedObjectManifestSource([
          {
            workspaceId: 'w1',
            bucket: 'canadian-plans-site-1',
            objectKey: 'objects/never-uploaded.pdf',
            checksumSha256: 'a'.repeat(64),
            sizeBytes: 10,
          },
        ]),
        r2Source: new FakeR2SourceReader(new Map()),
        sanity: new FakeSanityExporter({
          archive: new Uint8Array(),
          documentCount: 0,
          assetCount: 0,
        }),
        sourceIds: {},
        toolVersions: {},
      }),
    ).rejects.toBeInstanceOf(BackupIncompleteError);
    expect(backend.size()).toBe(0);
  });

  it('fails the restore closed on corrupt ciphertext, a missing object, a failed Auth recovery, and an unavailable ledger — none reopen', async () => {
    const backend = new InMemoryArchiveBackend();
    const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const decryptor = new TestEnvelopeDecryptor(privateKeyBase64);
    const writer = backend.asWriter();

    const dataBytes = new TextEncoder().encode('synthetic order rows');
    const { buildManifest, manifestArtifact } = await import('../src/backup/manifest.js');
    const manifest = buildManifest({
      runId: 'run-negative',
      capturedAt: new Date('2026-09-14T02:00:00.000Z'),
      sourceIds: {},
      toolVersions: {},
      artifacts: [manifestArtifact('data.sql', dataBytes)],
      counts: {},
      exclusions: [],
    });
    await writer.putObject('run-negative/data.sql.enc', await encryptor.encrypt(dataBytes));
    await writer.putObject(
      'run-negative/manifest.json.enc',
      await encryptor.encrypt(new TextEncoder().encode(JSON.stringify(manifest))),
    );

    const goodDeps = {
      runId: 'run-negative',
      reader: backend.asReader(),
      decryptor,
      ledger: emptyLedger(new Date('2026-09-14T02:00:00.000Z')),
      ledgerVerificationKey: LEDGER_KEY,
      replayLedgerEvent: async () => {},
      verifyAuthRecovery: async () => ({ status: 'ok' as const }),
      now: () => new Date('2026-09-15T00:00:00.000Z'),
    };

    // Case 1: corrupt ciphertext (manifest tampered after upload).
    const corruptedManifest = Buffer.from(
      (await backend.asReader().getObject('run-negative/manifest.json.enc'))!,
    );
    corruptedManifest.writeUInt8(corruptedManifest.readUInt8(5) ^ 0xff, 5);
    const corruptBackend = new InMemoryArchiveBackend();
    await corruptBackend.asWriter().putObject('run-negative/manifest.json.enc', corruptedManifest);
    const corruptReport = await runRestore({ ...goodDeps, reader: corruptBackend.asReader() });
    expect(corruptReport.reopened).toBe(false);
    expect(corruptReport.failedStage).toBe('manifest_decrypt');

    // Case 2: missing object (artifact key never uploaded).
    const missingBackend = new InMemoryArchiveBackend();
    await missingBackend
      .asWriter()
      .putObject(
        'run-negative/manifest.json.enc',
        await encryptor.encrypt(new TextEncoder().encode(JSON.stringify(manifest))),
      );
    const missingReport = await runRestore({ ...goodDeps, reader: missingBackend.asReader() });
    expect(missingReport.reopened).toBe(false);
    expect(missingReport.failedStage).toBe('artifact_fetch_and_decrypt');
    expect(missingReport.missingArtifacts).toEqual(['data.sql']);

    // Case 3: failed Auth recovery — the archive itself is perfect.
    const authFailedReport = await runRestore({
      ...goodDeps,
      verifyAuthRecovery: async () => ({ status: 'failed', detail: 'no_verified_aal2_session' }),
    });
    expect(authFailedReport.reopened).toBe(false);
    expect(authFailedReport.failedStage).toBe('auth_recovery');

    // Case 4: unavailable deletion/suppression ledger.
    const unavailableLedgerReport = await runRestore({
      ...goodDeps,
      ledger: {
        listEvents: async () => {
          throw new Error('ledger_bucket_unreachable');
        },
        getFreshCheckpoint: async () => undefined,
      },
    });
    expect(unavailableLedgerReport.reopened).toBe(false);
    expect(unavailableLedgerReport.failedStage).toBe('ledger_reconciliation');
  });
});
