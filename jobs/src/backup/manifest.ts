import { sha256Hex } from '@canadian-plans/adapters';
import { z } from 'zod';

/**
 * The canonical, encrypted-before-upload manifest (IMPLEMENTATION_PLAN §13):
 * run id, source ids, tool versions, artifact names/hashes/counts and
 * exclusions. The manifest is sensitive (it names every artifact) and is
 * encrypted exactly like the payloads it describes.
 */

export const manifestArtifactSchema = z
  .object({
    name: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    bytes: z.number().int().nonnegative(),
  })
  .strict();
export type ManifestArtifact = z.infer<typeof manifestArtifactSchema>;

export const backupManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string().min(1),
    capturedAt: z.iso.datetime(),
    sourceIds: z.record(z.string(), z.string()),
    toolVersions: z.record(z.string(), z.string()),
    artifacts: z.array(manifestArtifactSchema).min(1),
    counts: z.record(z.string(), z.number().int().nonnegative()),
    exclusions: z.array(z.string()),
  })
  .strict();
export type BackupManifest = z.infer<typeof backupManifestSchema>;

export function manifestArtifact(name: string, bytes: Uint8Array): ManifestArtifact {
  return { name, bytes: bytes.byteLength, sha256: sha256Hex(bytes) };
}

export function buildManifest(input: {
  runId: string;
  capturedAt: Date;
  sourceIds: Record<string, string>;
  toolVersions: Record<string, string>;
  artifacts: ManifestArtifact[];
  counts: Record<string, number>;
  exclusions: string[];
}): BackupManifest {
  const manifest: BackupManifest = {
    schemaVersion: 1,
    runId: input.runId,
    capturedAt: input.capturedAt.toISOString(),
    sourceIds: input.sourceIds,
    toolVersions: input.toolVersions,
    artifacts: input.artifacts,
    counts: input.counts,
    exclusions: input.exclusions,
  };
  return backupManifestSchema.parse(manifest);
}

export type ManifestVerification =
  | { ok: true }
  | { ok: false; missing: string[]; mismatched: string[] };

/**
 * A snapshot is usable only when every referenced artifact is present and its
 * checksum matches (REQ 42). Never partial-accept a manifest.
 */
export function verifyManifestArtifacts(
  manifest: BackupManifest,
  decrypted: ReadonlyMap<string, Uint8Array>,
): ManifestVerification {
  const missing: string[] = [];
  const mismatched: string[] = [];
  for (const artifact of manifest.artifacts) {
    const bytes = decrypted.get(artifact.name);
    if (!bytes) {
      missing.push(artifact.name);
      continue;
    }
    if (bytes.byteLength !== artifact.bytes || sha256Hex(bytes) !== artifact.sha256) {
      mismatched.push(artifact.name);
    }
  }
  if (missing.length > 0 || mismatched.length > 0) return { ok: false, missing, mismatched };
  return { ok: true };
}
