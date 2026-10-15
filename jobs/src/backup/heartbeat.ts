import { z } from 'zod';

import type { ArchiveReader, ArchiveWriter } from './archive-store.js';

/**
 * "Publish heartbeat only after every component succeeds" (IMPLEMENTATION_PLAN
 * §13). The monitor (`jobs/monitor`) only ever trusts this object; a stopped
 * or partially completed run must never publish one, so a crash mid-run is
 * silence, not a false success.
 */
export const heartbeatSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string().min(1),
    completedAt: z.iso.datetime(),
    verified: z.literal(true),
    manifestKey: z.string().min(1),
    artifactCount: z.number().int().positive(),
  })
  .strict();
export type Heartbeat = z.infer<typeof heartbeatSchema>;

export const HEARTBEAT_KEY = 'heartbeat/latest.json';

export async function publishHeartbeat(writer: ArchiveWriter, heartbeat: Heartbeat): Promise<void> {
  const validated = heartbeatSchema.parse(heartbeat);
  await writer.putObject(HEARTBEAT_KEY, new TextEncoder().encode(JSON.stringify(validated)));
}

export type HeartbeatReadResult =
  { status: 'ok'; heartbeat: Heartbeat } | { status: 'missing' } | { status: 'malformed' };

export async function readLatestHeartbeat(reader: ArchiveReader): Promise<HeartbeatReadResult> {
  const bytes = await reader.getObject(HEARTBEAT_KEY);
  if (!bytes) return { status: 'missing' };
  try {
    const parsed = heartbeatSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
    return { status: 'ok', heartbeat: parsed };
  } catch {
    return { status: 'malformed' };
  }
}
