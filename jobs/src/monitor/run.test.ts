import { describe, expect, it } from 'vitest';

import { InMemoryArchiveBackend } from '../backup/archive-store.js';
import { publishHeartbeat, type Heartbeat } from '../backup/heartbeat.js';
import { PHASE_A_MAX_AGE_SECONDS, requiresAlert, runMonitor } from './run.js';

function heartbeatAt(completedAt: Date): Heartbeat {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    completedAt: completedAt.toISOString(),
    verified: true,
    manifestKey: 'run-1/manifest.json.enc',
    artifactCount: 3,
  };
}

describe('runMonitor', () => {
  it('reports ok well within the 26-hour Phase A threshold', async () => {
    const backend = new InMemoryArchiveBackend();
    await publishHeartbeat(backend.asWriter(), heartbeatAt(new Date('2026-09-14T00:00:00.000Z')));
    const status = await runMonitor({
      reader: backend.asReader(),
      now: () => new Date('2026-09-14T10:00:00.000Z'),
    });
    expect(status.status).toBe('ok');
    expect(requiresAlert(status)).toBe(false);
  });

  it('alerts once the latest verified snapshot exceeds 26 hours', async () => {
    const backend = new InMemoryArchiveBackend();
    await publishHeartbeat(backend.asWriter(), heartbeatAt(new Date('2026-09-13T00:00:00.000Z')));
    const status = await runMonitor({
      reader: backend.asReader(),
      now: () => new Date('2026-09-14T02:30:00.000Z'),
    });
    expect(status.status).toBe('stale');
    if (status.status !== 'stale') throw new Error('unreachable');
    expect(status.maxAgeSeconds).toBe(PHASE_A_MAX_AGE_SECONDS);
    expect(status.ageSeconds).toBeGreaterThan(PHASE_A_MAX_AGE_SECONDS);
    expect(requiresAlert(status)).toBe(true);
  });

  it('alerts when no heartbeat has ever been published (a stopped/never-completed run)', async () => {
    const backend = new InMemoryArchiveBackend();
    const status = await runMonitor({ reader: backend.asReader() });
    expect(status).toEqual({ status: 'missing' });
    expect(requiresAlert(status)).toBe(true);
  });

  it('alerts on a malformed heartbeat rather than treating it as success', async () => {
    const backend = new InMemoryArchiveBackend();
    await backend
      .asWriter()
      .putObject('heartbeat/latest.json', new TextEncoder().encode('not json'));
    const status = await runMonitor({ reader: backend.asReader() });
    expect(status).toEqual({ status: 'malformed' });
    expect(requiresAlert(status)).toBe(true);
  });

  it('a stopped/partial backup run (no heartbeat write) cannot masquerade as success', async () => {
    // runBackup only calls publishHeartbeat as its last step; simulate a crash
    // beforehand by simply never publishing one.
    const backend = new InMemoryArchiveBackend();
    await backend.asWriter().putObject('run-1/data.sql.enc', new Uint8Array([1]));
    const status = await runMonitor({ reader: backend.asReader() });
    expect(status.status).toBe('missing');
  });
});
