#!/usr/bin/env node
import {
  createErrorTrackerFromEnv,
  createOwnerAlertChannelFromEnv,
} from '@canadian-plans/adapters';

import { S3ArchiveReader } from '../backup/archive-store.js';
import { requiresAlert, runMonitor, type MonitorStatus } from './run.js';

/**
 * Production entry point for the independent monitor
 * (.github/workflows/backup-monitor.yml). Uses only a recovery-reader
 * credential (list+get) — never the daily writer's, never the retention
 * admin's. A non-zero exit fails the workflow run, which GitHub notifies the
 * repository's default recipients about; it also emails the owner directly
 * (REQ 40, IMPLEMENTATION_PLAN §10 — "Alerts route to the owner by email ...
 * for: ... backup age"), since a failing scheduled workflow's own
 * notification is easy to miss. `createOwnerAlertChannelFromEnv` is a no-op
 * (logs, does not throw) when no channel is configured, so this never turns
 * an unconfigured alert channel into a second failure mode.
 */

function alertDetail(status: MonitorStatus): string {
  switch (status.status) {
    case 'stale':
      return `stale:age_seconds:${Math.round(status.ageSeconds)}`;
    case 'missing':
      return 'missing';
    case 'malformed':
      return 'malformed';
    case 'ok':
      return 'ok';
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  const reader = new S3ArchiveReader({
    accessKeyId: requiredEnv('B2_ARCHIVE_READER_KEY_ID'),
    secretAccessKey: requiredEnv('B2_ARCHIVE_READER_APPLICATION_KEY'),
    endpoint: requiredEnv('B2_ARCHIVE_ENDPOINT'),
    region: requiredEnv('B2_ARCHIVE_REGION'),
    bucket: requiredEnv('B2_ARCHIVE_BUCKET'),
  });

  const status = await runMonitor({ reader });
  console.info(JSON.stringify({ event: 'monitor_status', ...status }));

  if (requiresAlert(status)) {
    console.error(JSON.stringify({ event: 'monitor_alert', status: status.status }));
    await createOwnerAlertChannelFromEnv()
      .send({
        kind: 'backup_stale',
        detail: alertDetail(status),
        occurredAt: new Date().toISOString(),
      })
      .catch((error: unknown) => {
        console.error(
          JSON.stringify({
            event: 'monitor_alert_delivery_failed',
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      });
    process.exitCode = 1;
  }
}

main().catch(async (error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'monitor_failed',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  createErrorTrackerFromEnv().captureException(error, {
    requestId: 'monitor',
    route: 'jobs:monitor',
    release: process.env.RELEASE_SHA ?? 'unknown',
    environment: process.env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
  });
  process.exitCode = 1;
  await createOwnerAlertChannelFromEnv()
    .send({ kind: 'backup_stale', detail: 'monitor_failed', occurredAt: new Date().toISOString() })
    .catch(() => {
      console.error(JSON.stringify({ event: 'monitor_alert_delivery_failed' }));
    });
});
