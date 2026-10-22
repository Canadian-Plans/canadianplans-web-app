import { runOrThrow, CommandFailedError, type RunCommand } from './command.js';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * Prevents R2 source-object cleanup from racing an in-flight backup's
 * referenced-object manifest and copy step (IMPLEMENTATION_PLAN §13:
 * "Prevent object cleanup racing the archive with a snapshot reference set and
 * lease."). Customer-requested erasure acquires a protected, short-lived
 * document cleanup lease before calling R2. Acquisition on both sides shares
 * a database gate, so neither can begin while the other has an active lease.
 * The technical expired-upload sweep also consults `app.backup_leases`.
 *
 * The lease is a simple, global pause for the run's duration plus a safety
 * margin, not a per-object lock: the backup window is short (minutes) and the
 * cleanup can remove customer-requested originals as well as staging/candidate
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
    private readonly pause: (ms: number) => Promise<void> = delay,
  ) {}

  async acquire(runId: string, ttlSeconds: number): Promise<void> {
    const args = [
      this.dbUrl,
      '--single-transaction',
      '--variable',
      'ON_ERROR_STOP=1',
      '--command',
      `insert into app.backup_leases (run_id, expires_at) values ('${sqlEscape(runId)}', now() + interval '${Math.max(1, Math.floor(ttlSeconds))} seconds') on conflict (run_id) do update set expires_at = excluded.expires_at;`,
    ];
    // Cleanup leases last at most 45 seconds. The protected DB trigger and
    // cleanup acquisition share one gate; retry contention without starting an
    // unsafe backup or requiring a separate operator retry.
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const result = await this.run('psql', args);
      if (result.exitCode === 0) return;
      if (!result.stderr.includes('document_cleanup_active') || attempt === 24)
        throw new CommandFailedError('psql', result.exitCode, 'backup_lease_unavailable');
      await this.pause(2000);
    }
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
