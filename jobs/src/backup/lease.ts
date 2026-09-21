import { runOrThrow, type RunCommand } from './command.js';

/**
 * Prevents R2 source-object cleanup from racing an in-flight backup's
 * referenced-object manifest and copy step (IMPLEMENTATION_PLAN §13:
 * "Prevent object cleanup racing the archive with a snapshot reference set and
 * lease."). The backend's expired-upload sweep
 * (`apps/backend/src/documents/service.ts` `runCleanup`) consults the same
 * `app.backup_leases` table through its own `BackupLeaseGate` and withholds
 * physical object deletion while a lease is active; it never deletes rows
 * here directly, and this side never touches document tables.
 *
 * The lease is a simple, global pause for the run's duration plus a safety
 * margin, not a per-object lock: the backup window is short (minutes) and the
 * cleanup it defers only ever removes never-finalized staging/candidate
 * objects, so a short global pause is simpler and safer than trying to prove
 * per-key disjointness between two independently evolving object sets.
 */

export interface BackupLease {
  acquire(runId: string, ttlSeconds: number): Promise<void>;
  release(runId: string): Promise<void>;
}

/** Uses the protected migration/runner credential via `psql`, never drizzle. */
export class PgBackupLease implements BackupLease {
  constructor(
    private readonly dbUrl: string,
    private readonly run: RunCommand,
  ) {}

  async acquire(runId: string, ttlSeconds: number): Promise<void> {
    await runOrThrow(this.run, 'psql', [
      this.dbUrl,
      '--single-transaction',
      '--variable',
      'ON_ERROR_STOP=1',
      '--command',
      `insert into app.backup_leases (run_id, expires_at) values ('${sqlEscape(runId)}', now() + interval '${Math.max(1, Math.floor(ttlSeconds))} seconds') on conflict (run_id) do update set expires_at = excluded.expires_at;`,
    ]);
  }

  async release(runId: string): Promise<void> {
    await runOrThrow(this.run, 'psql', [
      this.dbUrl,
      '--single-transaction',
      '--variable',
      'ON_ERROR_STOP=1',
      '--command',
      `delete from app.backup_leases where run_id = '${sqlEscape(runId)}';`,
    ]);
  }
}

function sqlEscape(value: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('invalid_run_id');
  return value;
}

/** For tests and local rehearsals. */
export class InMemoryBackupLease implements BackupLease {
  readonly active = new Map<string, Date>();
  constructor(private readonly now: () => Date = () => new Date()) {}

  async acquire(runId: string, ttlSeconds: number): Promise<void> {
    this.active.set(runId, new Date(this.now().getTime() + ttlSeconds * 1000));
  }

  async release(runId: string): Promise<void> {
    this.active.delete(runId);
  }

  isAnyActive(): boolean {
    const now = this.now();
    return [...this.active.values()].some((expiresAt) => expiresAt > now);
  }
}
