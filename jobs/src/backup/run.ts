import { documentObjectKey, sha256Hex } from '@canadian-plans/adapters';

import type { ArchiveWriter } from './archive-store.js';
import type { BackupLease } from './lease.js';
import type { Encryptor } from './encryptor.js';
import { publishHeartbeat, type Heartbeat } from './heartbeat.js';
import { buildManifest, manifestArtifact, type BackupManifest } from './manifest.js';
import type {
  DatabaseExporter,
  R2SourceReader,
  ReferencedObjectManifestSource,
  SanityExporter,
} from './sources.js';

/**
 * The daily backup runner (IMPLEMENTATION_PLAN §13, REQ 41/42): a consistent
 * database export with migration/version and supported Auth data; a
 * referenced-file manifest; every missing retained R2 object copied; Sanity
 * content/assets exported; every payload and the manifest encrypted before
 * upload; upload completeness verified; heartbeat published only after every
 * component succeeds.
 */

export class BackupIncompleteError extends Error {
  constructor(readonly missingOrMismatchedObjects: readonly string[]) {
    super(`backup_incomplete:${missingOrMismatchedObjects.length}_objects`);
    this.name = 'BackupIncompleteError';
  }
}

export class BackupUploadVerificationError extends Error {
  constructor(readonly missingKeys: readonly string[]) {
    super(`backup_upload_incomplete:${missingKeys.length}_keys`);
    this.name = 'BackupUploadVerificationError';
  }
}

export interface BackupRunDependencies {
  runId: string;
  now?: () => Date;
  encryptor: Encryptor;
  archiveWriter: ArchiveWriter;
  lease: BackupLease;
  database: DatabaseExporter;
  referencedObjects: ReferencedObjectManifestSource;
  r2Source: R2SourceReader;
  sanity: SanityExporter;
  sourceIds: Record<string, string>;
  toolVersions: Record<string, string>;
  /** Lease held for the whole run plus a safety margin past expected duration. */
  leaseTtlSeconds?: number;
}

export interface BackupRunSummary {
  runId: string;
  manifestKey: string;
  artifactCount: number;
  referencedObjectCount: number;
  durationMs: number;
  heartbeatPublished: true;
}

function runPrefix(runId: string): string {
  return `${runId}/`;
}

export async function runBackup(deps: BackupRunDependencies): Promise<BackupRunSummary> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now();
  await deps.lease.acquire(deps.runId, deps.leaseTtlSeconds ?? 1800);
  try {
    // 1. Consistent database/Auth/migration export.
    const db = await deps.database.exportAll();

    // 2. Referenced-object manifest, built while the lease blocks cleanup.
    const referenced = await deps.referencedObjects.listReferencedObjects();

    // 3. Copy every referenced R2 object; a snapshot is usable only when every
    // referenced object is present and its checksum matches (REQ 42) — never
    // accept a partial copy.
    const r2Artifacts = new Map<string, Uint8Array>();
    const problems: string[] = [];
    for (const object of referenced) {
      const bytes = await deps.r2Source.getObject(
        object.bucket,
        documentObjectKey(object.workspaceId, object.objectKey),
      );
      const label = `${object.bucket}/${object.objectKey}`;
      if (!bytes) {
        problems.push(label);
        continue;
      }
      if (sha256Hex(bytes) !== object.checksumSha256) {
        problems.push(label);
        continue;
      }
      r2Artifacts.set(`r2/${object.workspaceId}/${object.objectKey}`, bytes);
    }
    if (problems.length > 0) throw new BackupIncompleteError(problems);

    // 4. Sanity content/assets export.
    const sanity = await deps.sanity.exportDataset();

    // 5. Canonical artifact set and manifest.
    const namedArtifacts = new Map<string, Uint8Array>([
      ['roles.sql', db.roles],
      ['schema.sql', db.schema],
      ['data.sql', db.data],
      ...(db.historySchema ? ([['history_schema.sql', db.historySchema]] as const) : []),
      ...(db.historyData ? ([['history_data.sql', db.historyData]] as const) : []),
      ['sanity-export.tar.gz', sanity.archive],
      ...r2Artifacts,
    ]);

    const manifest: BackupManifest = buildManifest({
      runId: deps.runId,
      capturedAt: startedAt,
      sourceIds: deps.sourceIds,
      toolVersions: deps.toolVersions,
      artifacts: [...namedArtifacts.entries()].map(([name, bytes]) =>
        manifestArtifact(name, bytes),
      ),
      counts: {
        referencedObjects: referenced.length,
        sanityDocuments: sanity.documentCount,
        sanityAssets: sanity.assetCount,
      },
      exclusions: [
        'supabase_project_settings',
        'jwt_and_api_keys',
        'database_and_role_passwords',
        'smtp_oauth_secrets',
        'edge_function_code_and_secrets',
        'provider_account_mfa',
      ],
    });

    // 6. Encrypt every payload and the manifest, then upload.
    const prefix = runPrefix(deps.runId);
    const expectedKeys: string[] = [];
    for (const [name, bytes] of namedArtifacts) {
      const key = `${prefix}${name}.enc`;
      await deps.archiveWriter.putObject(key, await deps.encryptor.encrypt(bytes));
      expectedKeys.push(key);
    }
    const manifestKey = `${prefix}manifest.json.enc`;
    await deps.archiveWriter.putObject(
      manifestKey,
      await deps.encryptor.encrypt(new TextEncoder().encode(JSON.stringify(manifest))),
    );
    expectedKeys.push(manifestKey);

    // 7. Verify upload completeness (the writer can list, never read/delete).
    const uploaded = new Set((await deps.archiveWriter.listObjects(prefix)).map((o) => o.key));
    const missingUploads = expectedKeys.filter((key) => !uploaded.has(key));
    if (missingUploads.length > 0) throw new BackupUploadVerificationError(missingUploads);

    // 8. Heartbeat only after every component above succeeded.
    const completedAt = now();
    const heartbeat: Heartbeat = {
      schemaVersion: 1,
      runId: deps.runId,
      completedAt: completedAt.toISOString(),
      verified: true,
      manifestKey,
      artifactCount: expectedKeys.length - 1,
    };
    await publishHeartbeat(deps.archiveWriter, heartbeat);

    return {
      runId: deps.runId,
      manifestKey,
      artifactCount: expectedKeys.length - 1,
      referencedObjectCount: referenced.length,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      heartbeatPublished: true,
    };
  } finally {
    await deps.lease.release(deps.runId);
  }
}
