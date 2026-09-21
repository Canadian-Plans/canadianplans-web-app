import { describe, expect, it, vi } from 'vitest';

import { InMemoryBackupLease, PgBackupLease } from './lease.js';
import type { RunCommand } from './command.js';

describe('InMemoryBackupLease', () => {
  it('is active only until its TTL expires', async () => {
    let now = new Date('2026-09-14T00:00:00.000Z');
    const lease = new InMemoryBackupLease(() => now);
    await lease.acquire('run-1', 60);
    expect(lease.isAnyActive()).toBe(true);
    now = new Date(now.getTime() + 61_000);
    expect(lease.isAnyActive()).toBe(false);
  });

  it('release clears the lease immediately', async () => {
    const lease = new InMemoryBackupLease();
    await lease.acquire('run-1', 3600);
    await lease.release('run-1');
    expect(lease.isAnyActive()).toBe(false);
  });
});

describe('PgBackupLease', () => {
  it('upserts a lease row scoped to the run id via psql', async () => {
    const run = vi.fn<RunCommand>(async () => ({ stdout: new Uint8Array(), stderr: '', exitCode: 0 }));
    const lease = new PgBackupLease('postgres://runner@host/db', run);
    await lease.acquire('run-2026-09-14', 1800);
    expect(run).toHaveBeenCalledTimes(1);
    const [command, args] = run.mock.calls[0]!;
    expect(command).toBe('psql');
    expect(args).toContain('postgres://runner@host/db');
    expect(args.join(' ')).toContain('insert into app.backup_leases');
    expect(args.join(' ')).toContain("'run-2026-09-14'");
  });

  it('rejects a run id that is not a safe identifier before shelling out', async () => {
    const run = vi.fn<RunCommand>(async () => ({ stdout: new Uint8Array(), stderr: '', exitCode: 0 }));
    const lease = new PgBackupLease('postgres://runner@host/db', run);
    await expect(lease.acquire("run'; drop table x; --", 60)).rejects.toThrow('invalid_run_id');
    expect(run).not.toHaveBeenCalled();
  });

  it('release deletes the lease row', async () => {
    const run = vi.fn<RunCommand>(async () => ({ stdout: new Uint8Array(), stderr: '', exitCode: 0 }));
    const lease = new PgBackupLease('postgres://runner@host/db', run);
    await lease.release('run-2026-09-14');
    const [, args] = run.mock.calls[0]!;
    expect(args.join(' ')).toContain('delete from app.backup_leases');
  });
});
