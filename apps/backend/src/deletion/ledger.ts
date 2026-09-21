import { and, eq } from 'drizzle-orm';
import { deletionIntents, withTenantTx } from '@canadian-plans/db';
import type { DeletionLedger } from '@canadian-plans/adapters';
import { JobHandlerError, type JobHandler } from '@canadian-plans/jobs';
import { z } from 'zod';

/**
 * Deletion-ledger integration (T21, IMPLEMENTATION_PLAN §13). The deletion
 * request commits a restricted local intent; this service publishes the
 * encrypted unique event to the independent ledger after commit, records the
 * durable acknowledgement locally, and retries idempotently. An unavailable or
 * unconfigured ledger leaves the intent failed/pending and fails the job closed
 * — it is never reported as complete.
 */

/**
 * Machine identity used for the ledger-mirror reads/writes. These are internal
 * reconciliation writes; the ledger event itself carries no human actor.
 */
const LEDGER_MIRROR_ACTOR = '00000000-0000-4000-8000-0000000000d1';

export interface DeletionIntentRecord {
  deletionId: string;
  workspaceId: string;
  subjectId: string;
  actorId: string;
  status: string;
  ledgerAckId: string | null;
}

export interface DeletionLedgerStore {
  loadIntent(input: {
    workspaceId: string;
    deletionId: string;
  }): Promise<DeletionIntentRecord | undefined>;
  markAcknowledged(input: {
    workspaceId: string;
    deletionId: string;
    acknowledgementId: string;
    actorId: string;
  }): Promise<void>;
  markFailed(input: {
    workspaceId: string;
    deletionId: string;
    errorCode: string;
    actorId: string;
  }): Promise<void>;
}

export class DatabaseDeletionLedgerStore implements DeletionLedgerStore {
  async loadIntent(input: {
    workspaceId: string;
    deletionId: string;
  }): Promise<DeletionIntentRecord | undefined> {
    return withTenantTx(
      { workspaceId: input.workspaceId, actorId: LEDGER_MIRROR_ACTOR },
      async (tx) => {
        const [row] = await tx
          .select({
            deletionId: deletionIntents.id,
            workspaceId: deletionIntents.workspaceId,
            subjectId: deletionIntents.subjectId,
            actorId: deletionIntents.actorId,
            status: deletionIntents.status,
            ledgerAckId: deletionIntents.ledgerAckId,
          })
          .from(deletionIntents)
          .where(
            and(
              eq(deletionIntents.workspaceId, input.workspaceId),
              eq(deletionIntents.id, input.deletionId),
            ),
          )
          .limit(1);
        return row;
      },
    );
  }

  async markAcknowledged(input: {
    workspaceId: string;
    deletionId: string;
    acknowledgementId: string;
    actorId: string;
  }): Promise<void> {
    await withTenantTx({ workspaceId: input.workspaceId, actorId: input.actorId }, async (tx) => {
      await tx
        .update(deletionIntents)
        .set({
          status: 'acknowledged',
          ledgerAckId: input.acknowledgementId,
          acknowledgedAt: new Date(),
          lastErrorCode: null,
        })
        .where(
          and(
            eq(deletionIntents.workspaceId, input.workspaceId),
            eq(deletionIntents.id, input.deletionId),
          ),
        );
    });
  }

  async markFailed(input: {
    workspaceId: string;
    deletionId: string;
    errorCode: string;
    actorId: string;
  }): Promise<void> {
    await withTenantTx({ workspaceId: input.workspaceId, actorId: input.actorId }, async (tx) => {
      await tx
        .update(deletionIntents)
        .set({ status: 'failed', lastErrorCode: input.errorCode })
        .where(
          and(
            eq(deletionIntents.workspaceId, input.workspaceId),
            eq(deletionIntents.id, input.deletionId),
          ),
        );
    });
  }
}

export type DeletionLedgerPublishResult =
  { status: 'acknowledged'; acknowledgementId: string } | { status: 'not_found' };

export interface DeletionLedgerServiceOptions {
  /** Absent means no ledger is configured; publication fails closed. */
  readonly ledger: DeletionLedger | undefined;
  readonly store: DeletionLedgerStore;
  readonly now?: () => Date;
}

function ledgerErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^[a-z0-9_]{1,64}$/.test(message) ? message : 'deletion_ledger_error';
}

export class DeletionLedgerService {
  constructor(private readonly options: DeletionLedgerServiceOptions) {}

  async publish(input: {
    workspaceId: string;
    deletionId: string;
  }): Promise<DeletionLedgerPublishResult> {
    const intent = await this.options.store.loadIntent(input);
    if (!intent) return { status: 'not_found' };
    if (intent.status === 'acknowledged' && intent.ledgerAckId) {
      return { status: 'acknowledged', acknowledgementId: intent.ledgerAckId };
    }

    const ledger = this.options.ledger;
    if (!ledger) throw new Error('deletion_ledger_not_configured');

    let acknowledgementId: string;
    try {
      const ack = await ledger.publish({
        eventId: intent.deletionId,
        workspaceId: intent.workspaceId,
        action: 'delete_customer_data',
        subjectType: 'order',
        subjectId: intent.subjectId,
        occurredAt: (this.options.now?.() ?? new Date()).toISOString(),
      });
      acknowledgementId = ack.acknowledgementId;
    } catch (error) {
      await this.options.store.markFailed({
        workspaceId: input.workspaceId,
        deletionId: intent.deletionId,
        errorCode: ledgerErrorCode(error),
        actorId: intent.actorId,
      });
      throw error;
    }

    await this.options.store.markAcknowledged({
      workspaceId: input.workspaceId,
      deletionId: intent.deletionId,
      acknowledgementId,
      actorId: intent.actorId,
    });
    return { status: 'acknowledged', acknowledgementId };
  }
}

const deletionLedgerPayloadSchema = z.object({ deletionId: z.uuid() });

/** The outbox handler that publishes one deletion intent and records its acknowledgement. */
export function createDeletionLedgerHandler(service: DeletionLedgerService): JobHandler {
  return async (job) => {
    if (job.payloadVersion !== 1) {
      throw new JobHandlerError('unsupported_payload_version', false);
    }
    const parsed = deletionLedgerPayloadSchema.safeParse(job.payload);
    if (!parsed.success) throw new JobHandlerError('invalid_job_payload', false);

    const result = await service.publish({
      workspaceId: job.workspaceId,
      deletionId: parsed.data.deletionId,
    });
    if (result.status === 'not_found') {
      throw new JobHandlerError('deletion_intent_not_found', false);
    }
    return { status: 'completed', providerId: result.acknowledgementId };
  };
}
