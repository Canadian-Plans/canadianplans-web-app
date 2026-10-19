import { readLatestHeartbeat, type Heartbeat } from '../backup/heartbeat.js';
import type { ArchiveReader } from '../backup/archive-store.js';

/**
 * Independent backup monitor (IMPLEMENTATION_PLAN §13, REQ 44): "A separate
 * monitor alerts when the latest complete verified snapshot exceeds 26
 * hours." It uses its own reader credential (never the daily writer's), and
 * because `runBackup` only ever publishes a heartbeat after every component
 * succeeds, a stopped or partially completed run leaves the previous
 * heartbeat in place — its age simply grows past the threshold — so a crash
 * mid-run can never look like success here.
 */

export const PHASE_A_MAX_AGE_SECONDS = 26 * 60 * 60;

export type MonitorStatus =
  | { status: 'ok'; heartbeat: Heartbeat; ageSeconds: number }
  | { status: 'stale'; heartbeat: Heartbeat; ageSeconds: number; maxAgeSeconds: number }
  | { status: 'missing' }
  | { status: 'malformed' };

export interface MonitorOptions {
  reader: ArchiveReader;
  now?: () => Date;
  maxAgeSeconds?: number;
}

export async function runMonitor(options: MonitorOptions): Promise<MonitorStatus> {
  const now = options.now ?? (() => new Date());
  const maxAgeSeconds = options.maxAgeSeconds ?? PHASE_A_MAX_AGE_SECONDS;
  const result = await readLatestHeartbeat(options.reader);
  if (result.status !== 'ok') return result;

  const ageSeconds = Math.max(
    0,
    (now().getTime() - new Date(result.heartbeat.completedAt).getTime()) / 1000,
  );
  if (ageSeconds > maxAgeSeconds) {
    return { status: 'stale', heartbeat: result.heartbeat, ageSeconds, maxAgeSeconds };
  }
  return { status: 'ok', heartbeat: result.heartbeat, ageSeconds };
}

/** True whenever the owner must be alerted (missing, malformed or stale). */
export function requiresAlert(status: MonitorStatus): boolean {
  return status.status !== 'ok';
}
