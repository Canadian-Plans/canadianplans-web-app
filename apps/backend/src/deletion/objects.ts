import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { deletionIntents, deletionObjects, withTenantTx } from '@canadian-plans/db';
import type { R2DocumentStore } from '@canadian-plans/adapters';
import { JobHandlerError, type JobHandler } from '@canadian-plans/jobs';
import { z } from 'zod';
import { completeDeletionIfReady } from './cleanup.js';

type CleanupDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const payloadSchema = z.object({ objectId: z.uuid() }).strict();

/** Each object has durable work and its own bounded provider request. The lease
 * is acquired/committed before network I/O; backup acquisition uses the same gate. */
export function createDeletionObjectHandler(options: {
  r2: R2DocumentStore | undefined;
  database?: CleanupDatabase;
}): JobHandler {
  const database = options.database ?? { withTenantTx };
  return async (job) => {
    const payload = payloadSchema.safeParse(job.payload);
    const actor = z.uuid().safeParse(job.actorId);
    if (job.payloadVersion !== 1 || !payload.success || !actor.success)
      throw new JobHandlerError('invalid_job_payload', false);
    const context = { workspaceId: job.workspaceId, actorId: actor.data };
    const ownerId = randomUUID();
    const acquired = await database.withTenantTx(context, async (tx) => {
      const [work] = await tx
        .select({
          object: deletionObjects,
          ack: deletionIntents.ledgerAckId,
          cleaned: deletionIntents.localCleanedAt,
        })
        .from(deletionObjects)
        .innerJoin(
          deletionIntents,
          and(
            eq(deletionIntents.workspaceId, deletionObjects.workspaceId),
            eq(deletionIntents.id, deletionObjects.deletionId),
          ),
        )
        .where(
          and(
            eq(deletionObjects.workspaceId, job.workspaceId),
            eq(deletionObjects.id, payload.data.objectId),
          ),
        )
        .limit(1);
      if (!work) throw new JobHandlerError('deletion_object_not_found', false);
      if (work.object.completedAt) return { status: 'done' as const };
      if (!work.ack || !work.cleaned) throw new JobHandlerError('deletion_not_acknowledged', true);
      const rows = await tx.execute<{ blocked_until: Date | string | null }>(
        sql`select app.try_document_cleanup_lease(${job.workspaceId}::uuid, ${work.object.id}::uuid, ${ownerId}::uuid) as blocked_until`,
      );
      const blocked = rows[0]?.blocked_until;
      if (blocked) return { status: 'deferred' as const, until: new Date(blocked) };
      return { status: 'acquired' as const, object: work.object };
    });
    if (acquired.status === 'done')
      return { status: 'completed', providerId: 'r2_object_already_deleted' };
    if (acquired.status === 'deferred')
      return {
        status: 'retry',
        errorCode: 'document_cleanup_deferred',
        availableAt: acquired.until,
      };
    try {
      if (!options.r2) throw new JobHandlerError('document_storage_not_configured', true);
      // One request with the adapter's ten-second deadline, outside all DB transactions.
      await options.r2.deleteObject({
        workspaceId: job.workspaceId,
        bucket: acquired.object.bucket,
        objectKey: acquired.object.objectKey,
      });
      await database.withTenantTx(context, async (tx) => {
        const rows = await tx.execute<{ owned: boolean }>(
          sql`select app.document_cleanup_lease_owned(${job.workspaceId}::uuid, ${acquired.object.id}::uuid, ${ownerId}::uuid) as owned`,
        );
        if (!rows[0]?.owned) throw new JobHandlerError('document_cleanup_lease_lost', true);
        await tx
          .update(deletionObjects)
          .set({ completedAt: new Date() })
          .where(
            and(
              eq(deletionObjects.workspaceId, job.workspaceId),
              eq(deletionObjects.id, acquired.object.id),
              isNull(deletionObjects.completedAt),
            ),
          );
        await completeDeletionIfReady(tx, job.workspaceId, acquired.object.deletionId);
      });
      return { status: 'completed', providerId: 'r2_object_deleted' };
    } finally {
      await database.withTenantTx(context, async (tx) => {
        await tx.execute(
          sql`select app.release_document_cleanup_lease(${job.workspaceId}::uuid, ${acquired.object.id}::uuid, ${ownerId}::uuid)`,
        );
      });
    }
  };
}
