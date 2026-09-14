import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RecoveryGateError,
  createSyntheticObjectStore,
  decryptArtifact,
  encryptArtifact,
  evaluateStaffRecovery,
  generateRecoveryKeyPair,
  publishLedgerEvent,
  reconcileLedger,
  retryLedgerEnvelope,
  runSyntheticRecoverySpike,
  signCheckpoint,
} from './recovery-spike.mjs';

const event = {
  operationId: 'op-test-1',
  workspaceId: 'workspace-test-a',
  subjectId: 'subject-opaque-1',
  recordId: 'record-opaque-1',
  operation: 'suppress',
  occurredAt: '2026-09-14T00:00:00.000Z',
  schemaVersion: 1,
};

test('recovers database, R2, and Sanity artifacts only with the escrowed key', () => {
  const primary = generateRecoveryKeyPair();
  const wrong = generateRecoveryKeyPair();
  const envelope = encryptArtifact(Buffer.from('synthetic database dump'), primary.publicKeyPem, {
    kind: 'database',
  });

  assert.equal(
    decryptArtifact(envelope, primary.privateKeyPem).plaintext.toString(),
    'synthetic database dump',
  );
  assert.throws(
    () => decryptArtifact(envelope, wrong.privateKeyPem),
    (error) => error instanceof RecoveryGateError && error.code === 'artifact_unverifiable',
  );

  const tampered = Buffer.from(envelope);
  tampered[tampered.length - 2] ^= 1;
  assert.throws(() => decryptArtifact(tampered, primary.privateKeyPem), RecoveryGateError);
});

test('ledger writer can create and list but cannot read or delete', () => {
  const store = createSyntheticObjectStore('ledger');
  const writer = store.credential('writer', ['write', 'list']);
  writer.putCreateOnly('events/one', Buffer.from('encrypted'));

  assert.deepEqual(writer.list('events/'), ['events/one']);
  assert.throws(() => writer.get('events/one'), /lacks read/);
  assert.throws(() => writer.delete('events/one'), /lacks delete/);
});

test('ledger retries are idempotent and conflicting payloads are rejected', () => {
  const keys = generateRecoveryKeyPair();
  const store = createSyntheticObjectStore('ledger');
  const writer = store.credential('writer', ['write', 'list']);
  const published = publishLedgerEvent(writer, keys.publicKeyPem, event);

  assert.deepEqual(retryLedgerEnvelope(writer, published.key, published.envelope), {
    created: false,
    idempotent: true,
  });
  assert.throws(
    () => writer.putCreateOnly(published.key, Buffer.from('different encrypted event')),
    (error) => error instanceof RecoveryGateError && error.code === 'object_conflict',
  );
});

test('checkpoint reconciliation allows reopening only for a complete verified ledger', () => {
  const keys = generateRecoveryKeyPair();
  const checkpointKey = Buffer.alloc(32, 7);
  const store = createSyntheticObjectStore('ledger');
  const writer = store.credential('writer', ['write', 'list']);
  const reader = store.credential('reader', ['read', 'list']);
  publishLedgerEvent(writer, keys.publicKeyPem, event);
  const signedCheckpoint = signCheckpoint(
    {
      schemaVersion: 1,
      eventKeys: writer.list('events/'),
      sequence: 1,
      issuedAt: '2026-09-14T00:00:00.000Z',
      expiresAt: '2026-09-15T00:00:00.000Z',
    },
    checkpointKey,
  );

  assert.equal(
    reconcileLedger({
      reader,
      signedCheckpoint,
      checkpointKey,
      privateKeyPem: keys.privateKeyPem,
      now: new Date('2026-09-14T12:00:00.000Z'),
    }).allowReopen,
    true,
  );
});

test('missing or unavailable deletion ledger fails the restore closed', () => {
  const keys = generateRecoveryKeyPair();
  const checkpointKey = Buffer.alloc(32, 8);
  const store = createSyntheticObjectStore('ledger');
  const reader = store.credential('reader', ['read', 'list']);
  const missingCheckpoint = signCheckpoint(
    {
      schemaVersion: 1,
      eventKeys: ['events/v1/missing/event.json.age'],
      sequence: 1,
      issuedAt: '2026-09-14T00:00:00.000Z',
      expiresAt: '2026-09-15T00:00:00.000Z',
    },
    checkpointKey,
  );

  assert.throws(
    () =>
      reconcileLedger({
        reader,
        signedCheckpoint: missingCheckpoint,
        checkpointKey,
        privateKeyPem: keys.privateKeyPem,
        now: new Date('2026-09-14T12:00:00.000Z'),
      }),
    (error) => error instanceof RecoveryGateError && error.code === 'restore_fail_closed',
  );

  store.setAvailable(false);
  assert.throws(
    () =>
      reconcileLedger({
        reader,
        signedCheckpoint: signCheckpoint(
          {
            schemaVersion: 1,
            eventKeys: [],
            sequence: 0,
            issuedAt: '2026-09-14T00:00:00.000Z',
            expiresAt: '2026-09-15T00:00:00.000Z',
          },
          checkpointKey,
        ),
        checkpointKey,
        privateKeyPem: keys.privateKeyPem,
        now: new Date('2026-09-14T12:00:00.000Z'),
      }),
    (error) => error instanceof RecoveryGateError && error.code === 'restore_fail_closed',
  );
});

test('stale or tampered checkpoints fail the restore closed', () => {
  const keys = generateRecoveryKeyPair();
  const checkpointKey = Buffer.alloc(32, 9);
  const store = createSyntheticObjectStore('ledger');
  const reader = store.credential('reader', ['read', 'list']);
  const stale = signCheckpoint(
    {
      schemaVersion: 1,
      eventKeys: [],
      sequence: 0,
      issuedAt: '2026-09-12T00:00:00.000Z',
      expiresAt: '2026-09-13T00:00:00.000Z',
    },
    checkpointKey,
  );

  assert.throws(
    () =>
      reconcileLedger({
        reader,
        signedCheckpoint: stale,
        checkpointKey,
        privateKeyPem: keys.privateKeyPem,
        now: new Date('2026-09-14T12:00:00.000Z'),
      }),
    (error) => error instanceof RecoveryGateError && error.code === 'restore_fail_closed',
  );

  const tampered = structuredClone(stale);
  tampered.checkpoint.expiresAt = '2026-09-15T00:00:00.000Z';
  assert.throws(
    () =>
      reconcileLedger({
        reader,
        signedCheckpoint: tampered,
        checkpointKey,
        privateKeyPem: keys.privateKeyPem,
        now: new Date('2026-09-14T12:00:00.000Z'),
      }),
    (error) => error instanceof RecoveryGateError && error.code === 'restore_fail_closed',
  );
});

test('ledger schema rejects raw identifying fields', () => {
  const keys = generateRecoveryKeyPair();
  const store = createSyntheticObjectStore('ledger');
  const writer = store.credential('writer', ['write', 'list']);

  assert.throws(
    () => publishLedgerEvent(writer, keys.publicKeyPem, { ...event, email: 'nobody@example.test' }),
    (error) => error instanceof RecoveryGateError && error.code === 'ledger_sensitive_field',
  );
});

test('staff recovery never grants privileged access before a fresh aal2 session', () => {
  assert.deepEqual(
    evaluateStaffRecovery({
      identityPreserved: false,
      passwordHashRestored: true,
      mfaFactorRestored: false,
      sessionSigningKeyPreserved: false,
    }),
    {
      identityAction: 'create-pending-email-bootstrap-and-remap-membership',
      passwordAction: 'require-fresh-password-sign-in',
      mfaAction: 'owner-removes-lost-factor-then-user-re-enrols-totp',
      invalidateExistingSessions: true,
      privilegedAccessAllowed: false,
      unlockCondition: 'fresh-session-verified-at-aal2',
    },
  );
});

test('full disposable spike restores all synthetic artifacts and reconciles its ledger', () => {
  assert.deepEqual(runSyntheticRecoverySpike(), {
    artifactCount: 3,
    eventCount: 1,
    idempotentRetry: true,
    manifestEncryptedAndVerified: true,
    recoveryKeyWorked: true,
    storesSeparated: true,
    allowReopen: true,
  });
});
