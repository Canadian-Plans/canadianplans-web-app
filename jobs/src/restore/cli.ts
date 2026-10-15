#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { createErrorTrackerFromEnv } from '@canadian-plans/adapters';

import { S3ArchiveReader } from '../backup/archive-store.js';
import { AgeCliDecryptor } from '../backup/encryptor.js';
import { runRestore, type PostRestoreCheckResult, type RestoreDependencies } from './run.js';
import type { LedgerEventRecord, LedgerReader } from './ledger.js';

/**
 * Operator-run restore drill entry point (docs/RUNBOOKS/restore.md). Never
 * scheduled and never given write/delete credentials — it uses only a
 * recovery-reader B2 credential and the separately escrowed private key.
 *
 * As shipped, this CLI proves full archive decryption/checksum verification
 * but has no ledger transport or Auth-recovery check wired in (`notConfigured`
 * below), so it always fails closed at those stages — it can never report a
 * reopened environment on its own. A real drill needs the isolated target
 * project's own Supabase Auth/session-verification and its own ledger reader
 * credentials, which this repository has no live instance of. This codebase's
 * import-boundary lint forbids a runtime-path plugin loader (module
 * specifiers must be static), so the correct way to run a real drill is to
 * copy this file, replace `notConfigured` with real target-specific
 * implementations of `RestoreIntegration`, and run that copy — not to
 * generically configure this one.
 */

interface RestoreIntegration {
  ledger: LedgerReader;
  replayLedgerEvent: (event: LedgerEventRecord) => Promise<void>;
  verifyAuthRecovery: RestoreDependencies['verifyAuthRecovery'];
  applyArtifact?: RestoreDependencies['applyArtifact'];
  postRestoreChecks?: () => Promise<PostRestoreCheckResult>;
}

const notConfigured: RestoreIntegration = {
  ledger: {
    listEvents: async () => {
      throw new Error('ledger_transport_not_configured_for_this_drill');
    },
    getFreshCheckpoint: async () => undefined,
  },
  replayLedgerEvent: async () => {
    throw new Error('ledger_replay_not_configured_for_this_drill');
  },
  verifyAuthRecovery: async () => ({
    status: 'failed',
    detail: 'auth_recovery_not_configured_for_this_drill',
  }),
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  const runId = requiredEnv('RESTORE_RUN_ID');
  const reader = new S3ArchiveReader({
    accessKeyId: requiredEnv('B2_ARCHIVE_READER_KEY_ID'),
    secretAccessKey: requiredEnv('B2_ARCHIVE_READER_APPLICATION_KEY'),
    endpoint: requiredEnv('B2_ARCHIVE_ENDPOINT'),
    region: requiredEnv('B2_ARCHIVE_REGION'),
    bucket: requiredEnv('B2_ARCHIVE_BUCKET'),
  });
  const identityPath = requiredEnv('RECOVERY_PRIVATE_KEY_PATH');
  readFileSync(identityPath);
  const decryptor = new AgeCliDecryptor(identityPath);
  const ledgerVerificationKey = requiredEnv('LEDGER_CHECKPOINT_VERIFICATION_KEY');
  const integration = notConfigured;

  const report = await runRestore({
    runId,
    reader,
    decryptor,
    ledgerVerificationKey,
    ledger: integration.ledger,
    replayLedgerEvent: integration.replayLedgerEvent,
    verifyAuthRecovery: integration.verifyAuthRecovery,
    applyArtifact: integration.applyArtifact,
    postRestoreChecks: integration.postRestoreChecks,
  });

  console.info(
    JSON.stringify({
      event: 'restore_report',
      runId: report.runId,
      reopened: report.reopened,
      failedStage: report.failedStage,
      failureReason: report.failureReason,
      missingArtifacts: report.missingArtifacts,
      mismatchedArtifacts: report.mismatchedArtifacts,
      restoreDurationMs: report.restoreDurationMs,
    }),
  );
  if (!report.reopened) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'restore_failed',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  createErrorTrackerFromEnv().captureException(error, {
    requestId: process.env.RESTORE_RUN_ID?.trim() || 'restore',
    route: 'jobs:restore',
    release: process.env.RELEASE_SHA ?? 'unknown',
    environment: process.env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
  });
  process.exitCode = 1;
});
