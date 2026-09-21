import { describe, expect, it } from 'vitest';

import { InMemoryArchiveBackend } from '../backup/archive-store.js';
import {
  TestEnvelopeDecryptor,
  TestEnvelopeEncryptor,
  generateTestRecipientKeyPair,
} from '../backup/encryptor.js';
import { buildManifest, manifestArtifact } from '../backup/manifest.js';
import { signCheckpoint, type LedgerEventRecord, type LedgerReader } from './ledger.js';
import { runRestore, type RestoreDependencies } from './run.js';
import type { ArchiveReader } from '../backup/archive-store.js';
import type { Decryptor, Encryptor } from '../backup/encryptor.js';

const LEDGER_KEY = 'checkpoint-key';

async function seedArchive(): Promise<{ reader: ArchiveReader; decryptor: Decryptor; encryptor: Encryptor }> {
  const backend = new InMemoryArchiveBackend();
  const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
  const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
  const decryptor: Decryptor = new TestEnvelopeDecryptor(privateKeyBase64);
  const writer = backend.asWriter();

  const dataBytes = new TextEncoder().encode('order rows');
  const manifest = buildManifest({
    runId: 'run-1',
    capturedAt: new Date('2026-09-14T02:00:00.000Z'),
    sourceIds: {},
    toolVersions: {},
    artifacts: [manifestArtifact('data.sql', dataBytes)],
    counts: {},
    exclusions: [],
  });
  await writer.putObject('run-1/data.sql.enc', await encryptor.encrypt(dataBytes));
  await writer.putObject(
    'run-1/manifest.json.enc',
    await encryptor.encrypt(new TextEncoder().encode(JSON.stringify(manifest))),
  );
  return { reader: backend.asReader(), decryptor, encryptor };
}

function noEvents(): LedgerReader {
  const checkpoint = signCheckpoint(
    {
      schemaVersion: 1,
      sequence: 1,
      issuedAt: '2026-09-14T02:00:00.000Z',
      expiresAt: '2026-09-15T02:00:00.000Z',
      eventKeys: [],
    },
    LEDGER_KEY,
  );
  return { listEvents: async () => [], getFreshCheckpoint: async () => checkpoint };
}

function baseDeps(overrides: Partial<RestoreDependencies> = {}) {
  return async (): Promise<RestoreDependencies> => {
    const { reader, decryptor } = await seedArchive();
    return {
      runId: 'run-1',
      reader,
      decryptor,
      ledger: noEvents(),
      ledgerVerificationKey: LEDGER_KEY,
      replayLedgerEvent: async () => {},
      verifyAuthRecovery: async () => ({ status: 'ok' as const }),
      now: () => new Date('2026-09-14T03:00:00.000Z'),
      ...overrides,
    };
  };
}

describe('runRestore', () => {
  it('reopens only after manifest verification, auth recovery and ledger reconciliation all pass', async () => {
    const deps = await baseDeps()();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(true);
    expect(report.missingArtifacts).toEqual([]);
    expect(report.mismatchedArtifacts).toEqual([]);
    expect(report.authRecovery).toEqual({ status: 'ok' });
    expect(report.ledgerReplayedEventIds).toEqual([]);
    expect(report.restoreDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('measures (never guarantees) a loss window against the manifest capture time', async () => {
    const deps = await baseDeps({ incidentDetectedAt: new Date('2026-09-14T05:00:00.000Z') })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(true);
    expect(report.measuredLossWindowMs).toBe(
      new Date('2026-09-14T05:00:00.000Z').getTime() - new Date('2026-09-14T02:00:00.000Z').getTime(),
    );
  });

  it('fails closed when the manifest object is missing', async () => {
    const backend = new InMemoryArchiveBackend();
    const { privateKeyBase64 } = generateTestRecipientKeyPair();
    const deps = await baseDeps({
      reader: backend.asReader(),
      decryptor: new TestEnvelopeDecryptor(privateKeyBase64),
    })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(false);
    expect(report.failedStage).toBe('manifest_fetch');
  });

  it('fails closed on corrupt/tampered manifest ciphertext', async () => {
    const backend = new InMemoryArchiveBackend();
    const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const writer = backend.asWriter();
    const ciphertext = Buffer.from(await encryptor.encrypt(new TextEncoder().encode('{}')));
    ciphertext.writeUInt8(ciphertext.readUInt8(0) ^ 0xff, 0);
    await writer.putObject('run-1/manifest.json.enc', ciphertext);

    const deps = await baseDeps({
      reader: backend.asReader(),
      decryptor: new TestEnvelopeDecryptor(privateKeyBase64),
    })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(false);
    expect(report.failedStage).toBe('manifest_decrypt');
  });

  it('fails closed when a referenced artifact object is missing', async () => {
    const backend = new InMemoryArchiveBackend();
    const { publicKeyBase64, privateKeyBase64 } = generateTestRecipientKeyPair();
    const encryptor: Encryptor = new TestEnvelopeEncryptor(publicKeyBase64);
    const writer = backend.asWriter();
    const manifest = buildManifest({
      runId: 'run-1',
      capturedAt: new Date('2026-09-14T02:00:00.000Z'),
      sourceIds: {},
      toolVersions: {},
      artifacts: [manifestArtifact('data.sql', new TextEncoder().encode('rows'))],
      counts: {},
      exclusions: [],
    });
    // Upload the manifest but never the artifact it names.
    await writer.putObject(
      'run-1/manifest.json.enc',
      await encryptor.encrypt(new TextEncoder().encode(JSON.stringify(manifest))),
    );
    const deps = await baseDeps({
      reader: backend.asReader(),
      decryptor: new TestEnvelopeDecryptor(privateKeyBase64),
    })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(false);
    expect(report.failedStage).toBe('artifact_fetch_and_decrypt');
    expect(report.missingArtifacts).toEqual(['data.sql']);
  });

  it('fails closed when Auth recovery fails, even though the archive is fully verified', async () => {
    const deps = await baseDeps({
      verifyAuthRecovery: async () => ({ status: 'failed' as const, detail: 'no_totp_factor_recovered' }),
    })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(false);
    expect(report.failedStage).toBe('auth_recovery');
    expect(report.failureReason).toBe('no_totp_factor_recovered');
  });

  it('fails closed when the ledger is unavailable', async () => {
    const deps = await baseDeps({
      ledger: {
        listEvents: async () => {
          throw new Error('ledger_bucket_unreachable');
        },
        getFreshCheckpoint: async () => undefined,
      },
    })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(false);
    expect(report.failedStage).toBe('ledger_reconciliation');
    expect(report.failureReason).toBe('checkpoint_unavailable');
  });

  it('fails closed when post-restore checks (counts/RLS/catalogue) fail', async () => {
    const deps = await baseDeps({
      postRestoreChecks: async () => ({ ok: false, detail: 'order_count_mismatch' }),
    })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(false);
    expect(report.failedStage).toBe('post_restore_checks');
  });

  it('replays ledger events idempotently before reopening', async () => {
    const event: LedgerEventRecord = {
      eventId: 'op-1',
      workspaceId: 'w1',
      subjectType: 'order',
      subjectId: 'order-1',
      action: 'delete_customer_data',
      occurredAt: '2026-09-14T00:00:00.000Z',
      schemaVersion: 1,
      versionId: 'v1',
    };
    const checkpoint = signCheckpoint(
      {
        schemaVersion: 1,
        sequence: 1,
        issuedAt: '2026-09-14T02:00:00.000Z',
        expiresAt: '2026-09-15T02:00:00.000Z',
        eventKeys: ['op-1:v1'],
      },
      LEDGER_KEY,
    );
    const replayed: string[] = [];
    const deps = await baseDeps({
      ledger: { listEvents: async () => [event], getFreshCheckpoint: async () => checkpoint },
      replayLedgerEvent: async (e) => {
        replayed.push(e.eventId);
      },
    })();
    const report = await runRestore(deps);
    expect(report.reopened).toBe(true);
    expect(report.ledgerReplayedEventIds).toEqual(['op-1']);
    expect(replayed).toEqual(['op-1']);
  });
});
