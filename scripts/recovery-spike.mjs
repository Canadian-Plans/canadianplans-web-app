import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ENVELOPE_FORMAT = 'canadian-plans.recovery-envelope.v1';
const LEDGER_SCHEMA_VERSION = 1;
const KEY_CONTEXT = Buffer.from('canadian-plans/recovery-envelope/v1');

export class RecoveryGateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RecoveryGateError';
    this.code = code;
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function generateRecoveryKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('x25519');
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
  };
}

export function encryptArtifact(plaintext, publicKeyPem, metadata) {
  const recipient = createPublicKey(publicKeyPem);
  const ephemeral = generateKeyPairSync('x25519');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const sharedSecret = diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipient });
  const key = Buffer.from(hkdfSync('sha256', sharedSecret, salt, KEY_CONTEXT, 32));
  const aad = Buffer.from(stableStringify(metadata));
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return Buffer.from(
    JSON.stringify({
      format: ENVELOPE_FORMAT,
      algorithm: 'X25519-HKDF-SHA256+A256GCM',
      metadata,
      ephemeralPublicKey: ephemeral.publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      plaintextSha256: sha256(plaintext),
      ciphertext: ciphertext.toString('base64'),
    }),
  );
}

export function decryptArtifact(envelopeBytes, privateKeyPem) {
  let envelope;
  try {
    envelope = JSON.parse(envelopeBytes.toString('utf8'));
  } catch {
    throw new RecoveryGateError('artifact_invalid', 'Encrypted artifact is not valid JSON.');
  }
  if (envelope.format !== ENVELOPE_FORMAT) {
    throw new RecoveryGateError('artifact_invalid', 'Encrypted artifact format is unsupported.');
  }

  try {
    const privateKey = createPrivateKey(privateKeyPem);
    const ephemeralPublicKey = createPublicKey({
      key: Buffer.from(envelope.ephemeralPublicKey, 'base64'),
      type: 'spki',
      format: 'der',
    });
    const sharedSecret = diffieHellman({ privateKey, publicKey: ephemeralPublicKey });
    const key = Buffer.from(
      hkdfSync('sha256', sharedSecret, Buffer.from(envelope.salt, 'base64'), KEY_CONTEXT, 32),
    );
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAAD(Buffer.from(stableStringify(envelope.metadata)));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]);
    if (sha256(plaintext) !== envelope.plaintextSha256) {
      throw new Error('checksum mismatch');
    }
    return { metadata: envelope.metadata, plaintext };
  } catch {
    throw new RecoveryGateError(
      'artifact_unverifiable',
      'Encrypted artifact could not be authenticated or decrypted.',
    );
  }
}

export function createSyntheticObjectStore(label) {
  const objects = new Map();
  let available = true;

  function requireAvailable() {
    if (!available) throw new RecoveryGateError('storage_unavailable', `${label} is unavailable.`);
  }

  function credential(name, capabilities) {
    const allowed = new Set(capabilities);
    const requireCapability = (capability) => {
      requireAvailable();
      if (!allowed.has(capability)) {
        throw new RecoveryGateError(
          'credential_denied',
          `${name} lacks ${capability} on ${label}.`,
        );
      }
    };

    return {
      name,
      putCreateOnly(key, bytes) {
        requireCapability('write');
        const existing = objects.get(key);
        if (existing) {
          if (existing.equals(bytes)) return { created: false, idempotent: true };
          throw new RecoveryGateError(
            'object_conflict',
            `A different payload already exists at ${key}.`,
          );
        }
        objects.set(key, Buffer.from(bytes));
        return { created: true, idempotent: false };
      },
      get(key) {
        requireCapability('read');
        const value = objects.get(key);
        if (!value) throw new RecoveryGateError('object_missing', `${key} is missing.`);
        return Buffer.from(value);
      },
      list(prefix = '') {
        requireCapability('list');
        return [...objects.keys()].filter((key) => key.startsWith(prefix)).sort();
      },
      delete(key) {
        requireCapability('delete');
        return objects.delete(key);
      },
    };
  }

  return {
    credential,
    setAvailable(value) {
      available = value;
    },
  };
}

const ledgerFields = new Set([
  'operationId',
  'workspaceId',
  'subjectId',
  'recordId',
  'operation',
  'occurredAt',
  'schemaVersion',
  'contactDigest',
]);

export function validateLedgerEvent(event) {
  const keys = Object.keys(event);
  if (keys.some((key) => !ledgerFields.has(key))) {
    throw new RecoveryGateError(
      'ledger_sensitive_field',
      'Ledger event contains a forbidden field.',
    );
  }
  if (
    typeof event.operationId !== 'string' ||
    typeof event.workspaceId !== 'string' ||
    typeof event.subjectId !== 'string' ||
    typeof event.recordId !== 'string' ||
    !['delete', 'suppress', 'revoke'].includes(event.operation) ||
    typeof event.occurredAt !== 'string' ||
    event.schemaVersion !== LEDGER_SCHEMA_VERSION
  ) {
    throw new RecoveryGateError('ledger_event_invalid', 'Ledger event shape is invalid.');
  }
  return event;
}

export function ledgerObjectKey(event) {
  return `events/v${event.schemaVersion}/${event.workspaceId}/${event.operationId}.json.age`;
}

export function publishLedgerEvent(writer, publicKeyPem, event) {
  validateLedgerEvent(event);
  const plaintext = Buffer.from(stableStringify(event));
  const envelope = encryptArtifact(plaintext, publicKeyPem, {
    kind: 'deletion-ledger-event',
    operationId: event.operationId,
    schemaVersion: event.schemaVersion,
  });
  return {
    key: ledgerObjectKey(event),
    envelope,
    write: writer.putCreateOnly(ledgerObjectKey(event), envelope),
  };
}

export function retryLedgerEnvelope(writer, key, envelope) {
  return writer.putCreateOnly(key, envelope);
}

export function signCheckpoint(checkpoint, checkpointKey) {
  const payload = stableStringify(checkpoint);
  return {
    checkpoint,
    signature: createHmac('sha256', checkpointKey).update(payload).digest('hex'),
  };
}

function verifyCheckpoint(signedCheckpoint, checkpointKey, now) {
  const expected = createHmac('sha256', checkpointKey)
    .update(stableStringify(signedCheckpoint.checkpoint))
    .digest();
  const received = Buffer.from(signedCheckpoint.signature, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new RecoveryGateError('checkpoint_unverifiable', 'Ledger checkpoint signature failed.');
  }

  const checkpoint = signedCheckpoint.checkpoint;
  const issuedAt = Date.parse(checkpoint.issuedAt);
  const expiresAt = Date.parse(checkpoint.expiresAt);
  if (
    checkpoint.schemaVersion !== 1 ||
    !Number.isSafeInteger(checkpoint.sequence) ||
    checkpoint.sequence < 0 ||
    !Array.isArray(checkpoint.eventKeys) ||
    checkpoint.eventKeys.some((key) => typeof key !== 'string') ||
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    issuedAt > now.getTime() ||
    expiresAt < now.getTime()
  ) {
    throw new RecoveryGateError('checkpoint_stale', 'Ledger checkpoint is invalid or stale.');
  }
}

export function reconcileLedger({
  reader,
  signedCheckpoint,
  checkpointKey,
  privateKeyPem,
  now = new Date(),
}) {
  try {
    verifyCheckpoint(signedCheckpoint, checkpointKey, now);
    const expectedKeys = [...signedCheckpoint.checkpoint.eventKeys].sort();
    const actualKeys = reader.list('events/');
    if (stableStringify(actualKeys) !== stableStringify(expectedKeys)) {
      throw new RecoveryGateError(
        'ledger_checkpoint_mismatch',
        'Ledger contents do not match the authenticated checkpoint.',
      );
    }

    const events = expectedKeys.map((key) => {
      const { plaintext } = decryptArtifact(reader.get(key), privateKeyPem);
      const event = validateLedgerEvent(JSON.parse(plaintext.toString('utf8')));
      if (ledgerObjectKey(event) !== key) {
        throw new RecoveryGateError('ledger_key_mismatch', 'Ledger key and operation ID differ.');
      }
      return event;
    });
    return { allowReopen: true, events };
  } catch (error) {
    if (error instanceof RecoveryGateError) {
      throw new RecoveryGateError('restore_fail_closed', error.code);
    }
    throw new RecoveryGateError('restore_fail_closed', 'ledger_unverifiable');
  }
}

export function evaluateStaffRecovery(input) {
  const identityAction = input.identityPreserved
    ? 'keep-membership-actor-id'
    : 'create-pending-email-bootstrap-and-remap-membership';
  const passwordAction = input.passwordHashRestored
    ? 'require-fresh-password-sign-in'
    : 'require-password-recovery';
  const mfaAction = input.mfaFactorRestored
    ? 'challenge-restored-factor-to-reach-aal2'
    : 'owner-removes-lost-factor-then-user-re-enrols-totp';

  return {
    identityAction,
    passwordAction,
    mfaAction,
    invalidateExistingSessions: !input.sessionSigningKeyPreserved || !input.mfaFactorRestored,
    privilegedAccessAllowed: false,
    unlockCondition: 'fresh-session-verified-at-aal2',
  };
}

export function runSyntheticRecoverySpike() {
  const keyPair = generateRecoveryKeyPair();
  const ownerEscrowCopy = Buffer.from(keyPair.privateKeyPem);
  const checkpointKey = randomBytes(32);
  const archiveStore = createSyntheticObjectStore('independent-archive');
  const ledgerStore = createSyntheticObjectStore('deletion-ledger');
  const archiveWriter = archiveStore.credential('archive-writer', ['write', 'list']);
  const archiveReader = archiveStore.credential('restore-reader', ['read', 'list']);
  const ledgerWriter = ledgerStore.credential('ledger-writer', ['write', 'list']);
  const ledgerReader = ledgerStore.credential('ledger-recovery-reader', ['read', 'list']);

  const artifacts = [
    ['database/app-and-auth.sql', Buffer.from('-- synthetic database and Auth export')],
    ['r2/site-1/opaque-document-id', Buffer.from('synthetic retained document')],
    ['sanity/site-1.tar.gz', Buffer.from('synthetic Sanity documents and asset bytes')],
  ];
  const manifestEntries = [];
  for (const [key, plaintext] of artifacts) {
    const objectKey = `${key}.age`;
    const encrypted = encryptArtifact(plaintext, keyPair.publicKeyPem, { kind: 'archive', key });
    archiveWriter.putCreateOnly(objectKey, encrypted);
    manifestEntries.push({
      objectKey,
      plaintextBytes: plaintext.length,
      plaintextSha256: sha256(plaintext),
    });
  }
  const manifest = Buffer.from(stableStringify({ schemaVersion: 1, artifacts: manifestEntries }));
  archiveWriter.putCreateOnly(
    'manifest.json.age',
    encryptArtifact(manifest, keyPair.publicKeyPem, { kind: 'archive-manifest' }),
  );

  const event = {
    operationId: 'op-synthetic-0001',
    workspaceId: 'workspace-synthetic-a',
    subjectId: 'subject-opaque-1',
    recordId: 'record-opaque-1',
    operation: 'delete',
    occurredAt: '2026-09-14T00:00:00.000Z',
    schemaVersion: LEDGER_SCHEMA_VERSION,
  };
  const published = publishLedgerEvent(ledgerWriter, keyPair.publicKeyPem, event);
  const retry = retryLedgerEnvelope(ledgerWriter, published.key, published.envelope);
  const signedCheckpoint = signCheckpoint(
    {
      schemaVersion: 1,
      eventKeys: ledgerWriter.list('events/'),
      sequence: 1,
      issuedAt: '2026-09-14T00:00:00.000Z',
      expiresAt: '2026-09-15T00:00:00.000Z',
    },
    checkpointKey,
  );
  const reconciliation = reconcileLedger({
    reader: ledgerReader,
    signedCheckpoint,
    checkpointKey,
    privateKeyPem: ownerEscrowCopy,
    now: new Date('2026-09-14T12:00:00.000Z'),
  });

  const restoredManifest = JSON.parse(
    decryptArtifact(archiveReader.get('manifest.json.age'), ownerEscrowCopy).plaintext.toString(
      'utf8',
    ),
  );
  const restoredArtifacts = restoredManifest.artifacts.map((entry) => {
    const plaintext = decryptArtifact(
      archiveReader.get(entry.objectKey),
      ownerEscrowCopy,
    ).plaintext;
    if (plaintext.length !== entry.plaintextBytes || sha256(plaintext) !== entry.plaintextSha256) {
      throw new RecoveryGateError('artifact_manifest_mismatch', entry.objectKey);
    }
    return plaintext.toString('utf8');
  });
  return {
    artifactCount: restoredArtifacts.length,
    eventCount: reconciliation.events.length,
    idempotentRetry: retry.idempotent,
    manifestEncryptedAndVerified: true,
    recoveryKeyWorked: restoredArtifacts.length === artifacts.length,
    storesSeparated: archiveReader.list('events/').length === 0,
    allowReopen: reconciliation.allowReopen,
  };
}

if (process.argv[1]?.endsWith('recovery-spike.mjs')) {
  console.info(JSON.stringify(runSyntheticRecoverySpike(), null, 2));
}
