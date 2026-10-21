#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { createErrorTrackerFromEnv } from '@canadian-plans/adapters';

import { S3ArchiveRetentionAdmin } from '../backup/archive-store.js';
import { AgeCliDecryptor } from '../backup/encryptor.js';
import { nodeRunCommand, runOrThrow } from '../backup/command.js';
import { runRetention } from './run.js';

/**
 * Production entry point for the separate, delete-capable retention job
 * (.github/workflows/backup-retention.yml). Never invoked by the daily backup
 * workflow and never given the writer credential — see docs/RUNBOOKS/
 * restore.md. Defaults to dry-run; only `RETENTION_DRY_RUN=false` deletes.
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  // Fail before listing archive objects if the required executable is absent.
  await runOrThrow(nodeRunCommand, 'age', ['--version']);
  const admin = new S3ArchiveRetentionAdmin({
    accessKeyId: requiredEnv('B2_ARCHIVE_RETENTION_KEY_ID'),
    secretAccessKey: requiredEnv('B2_ARCHIVE_RETENTION_APPLICATION_KEY'),
    endpoint: requiredEnv('B2_ARCHIVE_ENDPOINT'),
    region: requiredEnv('B2_ARCHIVE_REGION'),
    bucket: requiredEnv('B2_ARCHIVE_BUCKET'),
  });
  const identityPath = requiredEnv('RECOVERY_PRIVATE_KEY_PATH');
  readFileSync(identityPath); // fail fast with a clear error if the escrowed key is unreadable
  const decryptor = new AgeCliDecryptor(identityPath);

  const dryRun = process.env.RETENTION_DRY_RUN?.trim().toLowerCase() !== 'false';
  const report = await runRetention({ admin, decryptor, dryRun });

  console.info(
    JSON.stringify({
      event: 'retention_completed',
      dryRun: report.dryRun,
      totalRuns: report.totalRuns,
      retainedRunCount: report.retainedRunIds.length,
      candidateDeletionCount: report.candidateDeletions.length,
      deletedCount: report.deleted.length,
      unreadableManifestCount: report.unreadableManifests.length,
      abandonedRunCount: report.abandonedRunIds.length,
      pendingRunCount: report.pendingRunIds.length,
    }),
  );
  if (report.unreadableManifests.length > 0) {
    console.warn(
      JSON.stringify({
        event: 'retention_unreadable_manifests',
        keys: report.unreadableManifests,
      }),
    );
    throw new Error('retention_unreadable_manifests');
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'retention_failed',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  createErrorTrackerFromEnv().captureException(error, {
    requestId: 'retention',
    route: 'jobs:retention',
    release: process.env.RELEASE_SHA ?? 'unknown',
    environment: process.env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
  });
  process.exitCode = 1;
});
