#!/usr/bin/env node
import { createErrorTrackerFromEnv } from '@canadian-plans/adapters';

import { S3ArchiveWriter } from './archive-store.js';
import { nodeRunCommand } from './command.js';
import { AgeCliEncryptor } from './encryptor.js';
import { PgBackupLease } from './lease.js';
import { createBackupRunId, runBackup } from './run.js';
import {
  PsqlReferencedObjectManifestSource,
  S3R2SourceReader,
  SanityCliExporter,
  SupabaseCliDatabaseExporter,
} from './sources.js';

/**
 * Production entry point for the pinned daily backup workflow
 * (.github/workflows/backup.yml). Reads every credential from the runner's
 * protected environment secrets; nothing is hardcoded and nothing here is
 * ever logged. See docs/RUNBOOKS/restore.md for the exact commands this
 * wires together.
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  const now = new Date();
  const runId = process.env.BACKUP_RUN_ID?.trim() || createBackupRunId(now);

  const sourceDbUrl = requiredEnv('SOURCE_DATABASE_URL');
  const leaseDbUrl = requiredEnv('BACKUP_LEASE_DATABASE_URL');
  const ageRecipient = requiredEnv('RECOVERY_AGE_RECIPIENT');
  const b2Endpoint = requiredEnv('B2_ARCHIVE_ENDPOINT');
  const b2Region = requiredEnv('B2_ARCHIVE_REGION');
  const b2Bucket = requiredEnv('B2_ARCHIVE_BUCKET');
  const b2AccessKeyId = requiredEnv('B2_ARCHIVE_WRITER_KEY_ID');
  const b2SecretAccessKey = requiredEnv('B2_ARCHIVE_WRITER_APPLICATION_KEY');
  // Optional until Sanity is connected: the storefront runs on the repo
  // catalogue today, and the database/document backup must not depend on it.
  const sanityProjectId = process.env.SANITY_PROJECT_ID?.trim();
  const sanityDataset = process.env.SANITY_DATASET?.trim() || 'production';
  const sanitySiteFilter = process.env.SANITY_SITE_FILTER?.trim() || 'site-1';
  const supabaseProjectRef = requiredEnv('SUPABASE_PROJECT_REF');

  // A full database dump is one PUT; the 30-second library default would fail
  // it as the data grows. Bounded well inside the workflow's 30-minute limit.
  const archiveWriter = new S3ArchiveWriter(
    {
      accessKeyId: b2AccessKeyId,
      secretAccessKey: b2SecretAccessKey,
      endpoint: b2Endpoint,
      region: b2Region,
      bucket: b2Bucket,
    },
    fetch,
    15 * 60_000,
  );

  const summary = await runBackup({
    runId,
    now: () => now,
    encryptor: new AgeCliEncryptor(ageRecipient, nodeRunCommand),
    archiveWriter,
    lease: new PgBackupLease(leaseDbUrl, nodeRunCommand),
    database: new SupabaseCliDatabaseExporter(sourceDbUrl, nodeRunCommand),
    referencedObjects: new PsqlReferencedObjectManifestSource(sourceDbUrl, nodeRunCommand),
    // Phase A has exactly one website/bucket; Phase B's per-site buckets need
    // a bucket→credentials map here before website 2/3 onboard (REQ 45).
    r2Source: new S3R2SourceReader(() => requiredR2Config(), fetch, 10 * 60_000),
    ...(sanityProjectId
      ? {
          sanity: new SanityCliExporter(
            { siteFilter: sanitySiteFilter, projectId: sanityProjectId, dataset: sanityDataset },
            nodeRunCommand,
          ),
        }
      : {}),
    sourceIds: {
      supabaseProjectRef,
      ...(sanityProjectId ? { sanityProjectId, sanityDataset } : {}),
    },
    // Recorded by the workflow from the installed binaries; never a placeholder.
    toolVersions: {
      age: process.env.AGE_VERSION?.trim() || 'unknown',
      supabaseCli: process.env.SUPABASE_CLI_VERSION?.trim() || 'unknown',
    },
  });

  // Never log secrets/document bytes — only counts and identifiers.
  console.info(
    JSON.stringify({
      event: 'backup_completed',
      runId: summary.runId,
      artifactCount: summary.artifactCount,
      referencedObjectCount: summary.referencedObjectCount,
      durationMs: summary.durationMs,
    }),
  );
}

function requiredR2Config(): {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  bucket: string;
} {
  return {
    accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    endpoint:
      process.env.R2_ENDPOINT?.trim() ||
      `https://${requiredEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    region: process.env.R2_REGION?.trim() || 'auto',
    bucket: requiredEnv('R2_BUCKET'),
  };
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'backup_failed',
      errorCode: error instanceof Error ? error.constructor.name : 'unknown_error',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  createErrorTrackerFromEnv().captureException(error, {
    requestId: process.env.BACKUP_RUN_ID?.trim() || 'backup',
    route: 'jobs:backup',
    release: process.env.RELEASE_SHA ?? 'unknown',
    environment: process.env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
  });
  process.exitCode = 1;
});
