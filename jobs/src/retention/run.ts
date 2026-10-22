import type { ArchiveRetentionAdmin } from '../backup/archive-store.js';
import type { Decryptor } from '../backup/encryptor.js';
import { HEARTBEAT_KEY } from '../backup/heartbeat.js';
import { backupManifestSchema } from '../backup/manifest.js';
import { defaultRetentionPolicy, selectRetainedRunIds, type RetentionPolicy } from './select.js';

/**
 * Separate, delete-capable retention job (IMPLEMENTATION_PLAN §13): "starts in
 * dry-run, computes the union of all retained manifest references, and
 * removes only unreferenced encrypted payloads after a grace period." It uses
 * a different credential from the daily writer (`ArchiveRetentionAdmin`, never
 * `ArchiveWriter`) and can never be invoked by the daily backup path.
 */

export interface RetentionRunOptions {
  admin: ArchiveRetentionAdmin;
  decryptor: Decryptor;
  now?: () => Date;
  policy?: RetentionPolicy;
  /** Only objects at least this old (by their run's captured time) are ever deleted. */
  graceSeconds?: number;
  dryRun: boolean;
}

export interface RetentionRunReport {
  totalRuns: number;
  unreadableManifests: string[];
  /** Attempts with no manifest, older than the grace period: deleted as abandoned. */
  abandonedRunIds: string[];
  /** Attempts with no manifest yet, still inside the grace period: kept for now. */
  pendingRunIds: string[];
  retainedRunIds: string[];
  candidateDeletions: string[];
  deleted: string[];
  dryRun: boolean;
}

interface RunInfo {
  runId: string;
  capturedAt: Date;
  objectKeys: Set<string>;
}

function extractRunId(key: string): string | undefined {
  const [first, ...rest] = key.split('/');
  if (!first || first === 'heartbeat' || rest.length === 0) return undefined;
  return first;
}

export async function runRetention(options: RetentionRunOptions): Promise<RetentionRunReport> {
  const now = options.now ?? (() => new Date());
  const policy = options.policy ?? defaultRetentionPolicy;
  const graceMs = (options.graceSeconds ?? 24 * 60 * 60) * 1000;

  const allObjects = await options.admin.listObjects('');
  const runIds = new Set<string>();
  // Newest upload time per run; undefined when any object's time is unknown.
  const lastUploadByRunId = new Map<string, number | undefined>();
  for (const object of allObjects) {
    const runId = extractRunId(object.key);
    if (!runId) continue;
    runIds.add(runId);
    const previous = lastUploadByRunId.has(runId) ? lastUploadByRunId.get(runId) : 0;
    const uploaded = object.lastModified?.getTime();
    lastUploadByRunId.set(
      runId,
      previous === undefined || uploaded === undefined ? undefined : Math.max(previous, uploaded),
    );
  }
  const cutoff = now().getTime() - graceMs;

  const runs: RunInfo[] = [];
  const unreadableManifests: string[] = [];
  const abandonedRunIds: string[] = [];
  const pendingRunIds: string[] = [];
  for (const runId of runIds) {
    const manifestKey = `${runId}/manifest.json.enc`;
    const ciphertext = await options.admin.getObject(manifestKey);
    if (!ciphertext) {
      // The backup writes its manifest last, so a run without one is an
      // attempt that failed part-way (or is still uploading). Every attempt
      // has its own run ID and is never resumed, so once its newest object
      // is past the grace period nothing can complete it: delete it. An
      // unknown upload time cannot prove that, so it fails visibly instead.
      const lastUpload = lastUploadByRunId.get(runId);
      if (lastUpload === undefined) unreadableManifests.push(manifestKey);
      else if (lastUpload < cutoff) abandonedRunIds.push(runId);
      else pendingRunIds.push(runId);
      continue;
    }
    try {
      const plaintext = await options.decryptor.decrypt(ciphertext);
      const manifest = backupManifestSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
      const objectKeys = new Set<string>([
        manifestKey,
        ...manifest.artifacts.map((artifact) => `${runId}/${artifact.name}.enc`),
      ]);
      runs.push({ runId, capturedAt: new Date(manifest.capturedAt), objectKeys });
    } catch {
      unreadableManifests.push(manifestKey);
    }
  }

  const retainedRunIds = selectRetainedRunIds(
    runs.map((run) => ({ runId: run.runId, capturedAt: run.capturedAt })),
    policy,
  );
  // A run whose manifest could not be read cannot be proven safe to delete —
  // treat it as retained too until it can be verified. Pending attempts may
  // still be uploading.
  for (const manifestKey of unreadableManifests) {
    const runId = extractRunId(manifestKey);
    if (runId) retainedRunIds.add(runId);
  }
  for (const runId of pendingRunIds) retainedRunIds.add(runId);
  const abandoned = new Set(abandonedRunIds);

  const retainedObjectKeys = new Set<string>([HEARTBEAT_KEY]);
  const runById = new Map(runs.map((run) => [run.runId, run]));
  for (const runId of retainedRunIds) {
    const run = runById.get(runId);
    if (run) for (const key of run.objectKeys) retainedObjectKeys.add(key);
  }

  const capturedAtByRunId = new Map(runs.map((run) => [run.runId, run.capturedAt.getTime()]));
  const candidateDeletions = allObjects
    .map((object) => object.key)
    .filter((key) => {
      if (retainedObjectKeys.has(key)) return false;
      const runId = extractRunId(key);
      if (!runId) return false;
      if (abandoned.has(runId)) return true;
      // Unknown run age (manifest unreadable) is already retained above, so
      // reaching here means the run's age is known; enforce the grace period.
      const capturedAt = capturedAtByRunId.get(runId);
      return capturedAt === undefined ? false : capturedAt < cutoff;
    });

  const deleted: string[] = [];
  if (!options.dryRun) {
    for (const key of candidateDeletions) {
      await options.admin.deleteObject(key);
      deleted.push(key);
    }
  }

  return {
    totalRuns: runIds.size,
    unreadableManifests,
    abandonedRunIds,
    pendingRunIds,
    retainedRunIds: [...retainedRunIds],
    candidateDeletions,
    deleted,
    dryRun: options.dryRun,
  };
}
