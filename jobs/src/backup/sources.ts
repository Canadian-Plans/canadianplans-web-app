import { presignS3Url, signS3Request, type S3SigningConfig } from '@canadian-plans/adapters';

import { runOrThrow, type RunCommand } from './command.js';

export type ReadFile = (path: string) => Promise<Uint8Array>;

/** Production default: reads the temp file the CLI wrote its output to. */
export const nodeReadFile: ReadFile = async (path) => {
  const { readFile } = await import('node:fs/promises');
  return new Uint8Array(await readFile(path));
};

export type WithTempFile = <T>(fn: (path: string) => Promise<T>) => Promise<T>;

/** Production default: a uniquely named file under the OS temp directory, removed after use. */
export const nodeWithTempFile: WithTempFile = async (fn) => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const dir = await mkdtemp(path.join(tmpdir(), 'cp-backup-'));
  const filePath = path.join(dir, 'artifact.out');
  try {
    return await fn(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

/**
 * Pluggable backup sources (IMPLEMENTATION_PLAN §13). Every production
 * implementation shells to the exact provider CLI/API the runbook records
 * (docs/RUNBOOKS/restore.md); nothing here reimplements provider protocols.
 * Fakes let `run.ts` and its tests exercise the full pipeline without real
 * credentials.
 */

// --- Supabase database/Auth export ------------------------------------------

export interface DatabaseDumpArtifacts {
  roles: Uint8Array;
  schema: Uint8Array;
  data: Uint8Array;
  historySchema?: Uint8Array;
  historyData?: Uint8Array;
}

export interface DatabaseExporter {
  exportAll(): Promise<DatabaseDumpArtifacts>;
}

/**
 * The three-file `supabase db dump` sequence from docs/RUNBOOKS/restore.md,
 * including migration-history capture. Uses a temp file per dump because the
 * Supabase CLI writes to `-f <path>`, not stdout.
 */
export class SupabaseCliDatabaseExporter implements DatabaseExporter {
  constructor(
    private readonly dbUrl: string,
    private readonly run: RunCommand,
    private readonly withTempFile: WithTempFile = nodeWithTempFile,
    private readonly readFile: ReadFile = nodeReadFile,
  ) {}

  async exportAll(): Promise<DatabaseDumpArtifacts> {
    const roles = await this.dump(['--role-only']);
    const schema = await this.dump([]);
    const data = await this.dump([
      '--use-copy',
      '--data-only',
      '-x',
      'storage.buckets_vectors',
      '-x',
      'storage.vector_indexes',
    ]);
    const historySchema = await this.dump(['--schema', 'supabase_migrations']);
    const historyData = await this.dump([
      '--use-copy',
      '--data-only',
      '--schema',
      'supabase_migrations',
    ]);
    return { roles, schema, data, historySchema, historyData };
  }

  private dump(extraArgs: string[]): Promise<Uint8Array> {
    return this.withTempFile(async (path) => {
      await runOrThrow(this.run, 'supabase', [
        'db',
        'dump',
        '--db-url',
        this.dbUrl,
        '-f',
        path,
        ...extraArgs,
      ]);
      return this.readFile(path);
    });
  }
}

// --- Referenced-object manifest (prevents source cleanup racing the archive) --

export interface ReferencedObject {
  workspaceId: string;
  bucket: string;
  objectKey: string;
  checksumSha256: string;
  sizeBytes: number;
}

export interface ReferencedObjectManifestSource {
  listReferencedObjects(): Promise<ReferencedObject[]>;
}

const REFERENCED_OBJECTS_QUERY =
  "select workspace_id, bucket, object_key, checksum_sha256, size_bytes from app.files where status = 'available' and object_key is not null";

/** Runs the read-only query the runbook's restore verification also uses. */
export class PsqlReferencedObjectManifestSource implements ReferencedObjectManifestSource {
  constructor(
    private readonly dbUrl: string,
    private readonly run: RunCommand,
  ) {}

  async listReferencedObjects(): Promise<ReferencedObject[]> {
    const stdout = await runOrThrow(this.run, 'psql', [
      this.dbUrl,
      '--tuples-only',
      '--no-align',
      '--field-separator',
      '\t',
      '--command',
      REFERENCED_OBJECTS_QUERY,
    ]);
    const text = new TextDecoder().decode(stdout).trim();
    if (!text) return [];
    return text.split('\n').map((line) => {
      const [workspaceId, bucket, objectKey, checksumSha256, sizeBytes] = line.split('\t');
      if (!workspaceId || !bucket || !objectKey || !checksumSha256 || !sizeBytes) {
        throw new Error('malformed_referenced_object_row');
      }
      return { workspaceId, bucket, objectKey, checksumSha256, sizeBytes: Number(sizeBytes) };
    });
  }
}

export class FakeReferencedObjectManifestSource implements ReferencedObjectManifestSource {
  constructor(private readonly objects: ReferencedObject[]) {}
  async listReferencedObjects(): Promise<ReferencedObject[]> {
    return this.objects;
  }
}

// --- R2 source object reader (list + get only; R2 is a source, never the archive) --

export interface R2SourceReader {
  getObject(bucket: string, key: string): Promise<Uint8Array | undefined>;
}

export class S3R2SourceReader implements R2SourceReader {
  constructor(
    private readonly configFor: (bucket: string) => S3SigningConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 30_000,
  ) {}

  async getObject(bucket: string, key: string): Promise<Uint8Array | undefined> {
    const config = this.configFor(bucket);
    const { url, headers } = signS3Request(config, { method: 'GET', key, headers: {} });
    const response = await this.fetchImpl(url, {
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`r2_source_get_failed:${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}

export class FakeR2SourceReader implements R2SourceReader {
  constructor(private readonly objects: Map<string, Uint8Array>) {}
  async getObject(bucket: string, key: string): Promise<Uint8Array | undefined> {
    return this.objects.get(`${bucket}/${key}`);
  }
}

export function presignR2SourceGet(
  config: S3SigningConfig,
  key: string,
  expiresInSeconds: number,
): string {
  return presignS3Url(config, { method: 'GET', key, expiresInSeconds });
}

// --- Sanity dataset export ---------------------------------------------------

export interface SanityExportResult {
  archive: Uint8Array;
  documentCount: number;
  assetCount: number;
}

export interface SanityExporter {
  exportDataset(): Promise<SanityExportResult>;
}

/**
 * The exact CLI form from docs/RUNBOOKS/restore.md. Any warning about a
 * skipped (401/403/404) asset is treated as an incomplete backup, never a
 * soft success — the runbook is explicit that this must fail the run.
 */
export class SanityCliExporter implements SanityExporter {
  constructor(
    private readonly options: { siteFilter: string; projectId: string; dataset: string },
    private readonly run: RunCommand,
    private readonly withTempFile: WithTempFile = nodeWithTempFile,
    private readonly readFile: ReadFile = nodeReadFile,
  ) {}

  async exportDataset(): Promise<SanityExportResult> {
    return this.withTempFile(async (path) => {
      const result = await this.run(
        'pnpm',
        [
          '--filter',
          this.options.siteFilter,
          'exec',
          'sanity',
          'datasets',
          'export',
          this.options.dataset,
          path,
          '-p',
          this.options.projectId,
        ],
        {},
      );
      if (result.exitCode !== 0) {
        throw new Error(`sanity_export_failed:${result.stderr.slice(0, 300)}`);
      }
      if (/asset/i.test(result.stderr) && /\b(401|403|404)\b/.test(result.stderr)) {
        throw new Error('sanity_export_skipped_asset');
      }
      const archive = await this.readFile(path);
      const documentCount = countMatches(result.stderr, /document/gi);
      const assetCount = countMatches(result.stderr, /asset/gi);
      return { archive, documentCount, assetCount };
    });
  }
}

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

export class FakeSanityExporter implements SanityExporter {
  constructor(private readonly result: SanityExportResult) {}
  async exportDataset(): Promise<SanityExportResult> {
    return this.result;
  }
}
