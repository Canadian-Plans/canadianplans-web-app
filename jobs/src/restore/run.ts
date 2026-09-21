import type { ArchiveReader } from '../backup/archive-store.js';
import type { Decryptor } from '../backup/encryptor.js';
import { backupManifestSchema, verifyManifestArtifacts, type BackupManifest } from '../backup/manifest.js';
import { reconcileLedger, type LedgerEventRecord, type LedgerReader } from './ledger.js';

/**
 * Restore orchestration (IMPLEMENTATION_PLAN §13 "Restore runbook",
 * docs/RUNBOOKS/restore.md). It never reports success from a stopped or
 * partial run: every stage either produces evidence or the run fails closed,
 * and no stage after a failure runs. It measures durations rather than
 * asserting a recovery-time or data-loss guarantee (REQ 43).
 */

export interface AuthRecoveryResult {
  status: 'ok' | 'failed';
  detail?: string;
}

export interface PostRestoreCheckResult {
  ok: boolean;
  detail?: string;
  counts?: Record<string, number>;
}

export interface RestoreDependencies {
  runId: string;
  reader: ArchiveReader;
  decryptor: Decryptor;
  ledger: LedgerReader;
  ledgerVerificationKey: string;
  /** Must be idempotent against the restored target. */
  replayLedgerEvent: (event: LedgerEventRecord) => Promise<void>;
  verifyAuthRecovery: () => Promise<AuthRecoveryResult>;
  /** Applies each decrypted artifact to the isolated target; optional so a
   * pure verification-only run can skip real provider restores. */
  applyArtifact?: (name: string, bytes: Uint8Array) => Promise<void>;
  postRestoreChecks?: () => Promise<PostRestoreCheckResult>;
  now?: () => Date;
  /** When the incident was detected, to measure (not guarantee) the loss window. */
  incidentDetectedAt?: Date;
}

export type RestoreStage =
  | 'manifest_fetch'
  | 'manifest_decrypt'
  | 'artifact_fetch_and_decrypt'
  | 'auth_recovery'
  | 'ledger_reconciliation'
  | 'post_restore_checks';

export interface RestoreReport {
  runId: string;
  reopened: boolean;
  failedStage?: RestoreStage;
  failureReason?: string;
  manifest?: BackupManifest;
  missingArtifacts: string[];
  mismatchedArtifacts: string[];
  authRecovery?: AuthRecoveryResult;
  ledgerReplayedEventIds: string[];
  postRestoreChecks?: PostRestoreCheckResult;
  measuredLossWindowMs?: number;
  restoreDurationMs: number;
}

function fail(
  runId: string,
  stage: RestoreStage,
  reason: string,
  startedAt: Date,
  now: () => Date,
  partial: Partial<RestoreReport> = {},
): RestoreReport {
  return {
    runId,
    reopened: false,
    failedStage: stage,
    failureReason: reason,
    missingArtifacts: [],
    mismatchedArtifacts: [],
    ledgerReplayedEventIds: [],
    restoreDurationMs: now().getTime() - startedAt.getTime(),
    ...partial,
  };
}

export async function runRestore(deps: RestoreDependencies): Promise<RestoreReport> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now();
  const manifestKey = `${deps.runId}/manifest.json.enc`;

  // 1. Fetch and decrypt the manifest. A missing key or corrupt/undecryptable
  // ciphertext both fail closed immediately — no partial credit.
  const manifestCiphertext = await deps.reader.getObject(manifestKey);
  if (!manifestCiphertext) {
    return fail(deps.runId, 'manifest_fetch', 'manifest_object_missing', startedAt, now);
  }
  let manifest: BackupManifest;
  try {
    const plaintext = await deps.decryptor.decrypt(manifestCiphertext);
    manifest = backupManifestSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch (error) {
    return fail(
      deps.runId,
      'manifest_decrypt',
      error instanceof Error ? error.message : 'manifest_decryption_failed',
      startedAt,
      now,
    );
  }

  // 2. Fetch and decrypt every referenced artifact; a snapshot is usable only
  // when every one is present and its checksum matches (REQ 42).
  const decrypted = new Map<string, Uint8Array>();
  const missingArtifacts: string[] = [];
  for (const artifact of manifest.artifacts) {
    const ciphertext = await deps.reader.getObject(`${deps.runId}/${artifact.name}.enc`);
    if (!ciphertext) {
      missingArtifacts.push(artifact.name);
      continue;
    }
    try {
      decrypted.set(artifact.name, await deps.decryptor.decrypt(ciphertext));
    } catch {
      missingArtifacts.push(artifact.name);
    }
  }
  const verification = verifyManifestArtifacts(manifest, decrypted);
  if (verification.ok === false) {
    return fail(deps.runId, 'artifact_fetch_and_decrypt', 'artifact_verification_failed', startedAt, now, {
      manifest,
      missingArtifacts: [...new Set([...missingArtifacts, ...verification.missing])],
      mismatchedArtifacts: verification.mismatched,
    });
  }

  if (deps.applyArtifact) {
    for (const [name, bytes] of decrypted) await deps.applyArtifact(name, bytes);
  }

  // 3. Staff identity/MFA recovery must independently succeed — a restored
  // database is never sufficient proof of usable access on its own.
  const authRecovery = await deps.verifyAuthRecovery();
  if (authRecovery.status !== 'ok') {
    return fail(deps.runId, 'auth_recovery', authRecovery.detail ?? 'auth_recovery_failed', startedAt, now, {
      manifest,
      authRecovery,
    });
  }

  // 4. Reconcile the independent ledger and replay before anything reopens.
  const ledgerResult = await reconcileLedger({
    reader: deps.ledger,
    verificationKey: deps.ledgerVerificationKey,
    now,
    replay: deps.replayLedgerEvent,
  });
  if (ledgerResult.status !== 'reconciled') {
    return fail(deps.runId, 'ledger_reconciliation', ledgerResult.reason, startedAt, now, {
      manifest,
      authRecovery,
    });
  }

  // 5. Post-restore functional checks (counts, checksums, catalogue
  // consistency, RLS probes) — supplied by the caller against the isolated target.
  const postRestoreChecks = deps.postRestoreChecks ? await deps.postRestoreChecks() : undefined;
  if (postRestoreChecks && !postRestoreChecks.ok) {
    return fail(deps.runId, 'post_restore_checks', postRestoreChecks.detail ?? 'post_restore_checks_failed', startedAt, now, {
      manifest,
      authRecovery,
      ledgerReplayedEventIds: ledgerResult.replayedEventIds,
      postRestoreChecks,
    });
  }

  const completedAt = now();
  return {
    runId: deps.runId,
    reopened: true,
    manifest,
    missingArtifacts: [],
    mismatchedArtifacts: [],
    authRecovery,
    ledgerReplayedEventIds: ledgerResult.replayedEventIds,
    postRestoreChecks,
    measuredLossWindowMs: deps.incidentDetectedAt
      ? deps.incidentDetectedAt.getTime() - new Date(manifest.capturedAt).getTime()
      : undefined,
    restoreDurationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
