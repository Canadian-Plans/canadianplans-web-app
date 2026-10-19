import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * Restore-side reconciliation of the independent deletion/suppression ledger
 * (IMPLEMENTATION_PLAN §13). The publish side already exists
 * (`apps/backend/src/deletion/ledger.ts`, `packages/adapters/src/
 * deletion-ledger.ts`) and commits/publishes idempotent events; this module
 * is the missing restore-time half: list every event, verify a fresh
 * authenticated checkpoint reconciles exactly against it, replay events
 * idempotently against the restored data, and fail closed on anything
 * missing, stale, tampered or unverifiable. "An operator cannot waive this
 * check."
 */

export const ledgerEventSchema = z
  .object({
    eventId: z.string().min(1),
    workspaceId: z.string().min(1),
    subjectType: z.literal('order'),
    subjectId: z.string().min(1),
    action: z.literal('delete_customer_data'),
    occurredAt: z.iso.datetime(),
    schemaVersion: z.literal(1),
    versionId: z.string().min(1),
  })
  .strict();
export type LedgerEventRecord = z.infer<typeof ledgerEventSchema>;

export interface LedgerCheckpoint {
  schemaVersion: 1;
  sequence: number;
  issuedAt: string;
  expiresAt: string;
  /** Exact `${eventId}:${versionId}` set the checkpoint attests to. */
  eventKeys: string[];
  /** hex HMAC-SHA-256 over the canonical payload, using the owner-controlled verification key. */
  signatureHex: string;
}

function canonicalCheckpointPayload(checkpoint: Omit<LedgerCheckpoint, 'signatureHex'>): string {
  return JSON.stringify({
    schemaVersion: checkpoint.schemaVersion,
    sequence: checkpoint.sequence,
    issuedAt: checkpoint.issuedAt,
    expiresAt: checkpoint.expiresAt,
    eventKeys: [...checkpoint.eventKeys].sort(),
  });
}

export function signCheckpoint(
  checkpoint: Omit<LedgerCheckpoint, 'signatureHex'>,
  verificationKey: string,
): LedgerCheckpoint {
  const signatureHex = createHmac('sha256', verificationKey)
    .update(canonicalCheckpointPayload(checkpoint))
    .digest('hex');
  return { ...checkpoint, signatureHex };
}

function verifyCheckpointSignature(checkpoint: LedgerCheckpoint, verificationKey: string): boolean {
  const expected = createHmac('sha256', verificationKey)
    .update(canonicalCheckpointPayload(checkpoint))
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(checkpoint.signatureHex, 'hex');
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export interface LedgerReader {
  /** Throws (or the caller catches) when the ledger itself is unreachable. */
  listEvents(): Promise<LedgerEventRecord[]>;
  /** `undefined` means no independently authenticated checkpoint is available. */
  getFreshCheckpoint(): Promise<LedgerCheckpoint | undefined>;
}

export type ReconcileResult =
  | { status: 'reconciled'; replayedEventIds: string[] }
  | { status: 'restore_fail_closed'; reason: string };

export interface ReconcileOptions {
  reader: LedgerReader;
  verificationKey: string;
  now?: () => Date;
  /** Must be idempotent: replaying an already-applied event is a no-op. */
  replay: (event: LedgerEventRecord) => Promise<void>;
}

function eventKey(event: LedgerEventRecord): string {
  return `${event.eventId}:${event.versionId}`;
}

/**
 * "The restore remains closed when the ledger or checkpoint is missing,
 * unavailable, expired, stale, malformed, undecryptable, has an invalid
 * signature, differs from its key/version inventory, contains forbidden raw
 * PII, or cannot be reconciled with the restored database. An operator cannot
 * waive this check." (docs/RUNBOOKS/restore.md)
 */
export async function reconcileLedger(options: ReconcileOptions): Promise<ReconcileResult> {
  const now = options.now ?? (() => new Date());

  let checkpoint: LedgerCheckpoint | undefined;
  try {
    checkpoint = await options.reader.getFreshCheckpoint();
  } catch {
    return { status: 'restore_fail_closed', reason: 'checkpoint_unavailable' };
  }
  if (!checkpoint) return { status: 'restore_fail_closed', reason: 'checkpoint_unavailable' };
  if (!verifyCheckpointSignature(checkpoint, options.verificationKey)) {
    return { status: 'restore_fail_closed', reason: 'checkpoint_invalid_signature' };
  }
  const nowMs = now().getTime();
  if (
    Number.isNaN(Date.parse(checkpoint.issuedAt)) ||
    Number.isNaN(Date.parse(checkpoint.expiresAt))
  ) {
    return { status: 'restore_fail_closed', reason: 'checkpoint_malformed' };
  }
  if (new Date(checkpoint.expiresAt).getTime() <= nowMs) {
    return { status: 'restore_fail_closed', reason: 'checkpoint_stale' };
  }

  let events: LedgerEventRecord[];
  try {
    const raw = await options.reader.listEvents();
    events = raw.map((event) => ledgerEventSchema.parse(event));
  } catch {
    return { status: 'restore_fail_closed', reason: 'ledger_unavailable_or_malformed' };
  }

  const actualKeys = [...new Set(events.map(eventKey))].sort();
  const expectedKeys = [...new Set(checkpoint.eventKeys)].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return { status: 'restore_fail_closed', reason: 'checkpoint_key_mismatch' };
  }

  const replayedEventIds: string[] = [];
  for (const event of events) {
    try {
      await options.replay(event);
      replayedEventIds.push(event.eventId);
    } catch {
      return { status: 'restore_fail_closed', reason: `replay_failed:${event.eventId}` };
    }
  }
  return { status: 'reconciled', replayedEventIds };
}
