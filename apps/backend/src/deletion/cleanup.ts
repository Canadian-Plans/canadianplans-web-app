import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  auditEvents,
  deletedEmailMessages,
  deletionIntents,
  deletionObjects,
  dispatchRecords,
  draftGrants,
  emailMessages,
  emailProviderEvents,
  fileRevisions,
  files,
  followUpSchedules,
  leads,
  marketingConsents,
  orderAmendments,
  orderChangeRequests,
  orderNotes,
  orderReminders,
  orderStatusHistory,
  orders,
  outboxJobs,
  paymentRecords,
  regionWaitlist,
  trackingChallenges,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import { deletionSubjectTypeSchema } from '@canadian-plans/contracts';
import { JobHandlerError, type JobHandler } from '@canadian-plans/jobs';
import { z } from 'zod';
import type { DeletionScope } from './store.js';

type CleanupDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const payloadSchema = z.object({ deletionId: z.uuid() }).strict();
type CleanupResult = { status: 'completed' } | { status: 'deferred'; availableAt: Date };

/** Acknowledgement and this enqueue commit together, including crash/retry recovery. */
export async function enqueueCustomerCleanup(
  tx: TenantTransaction,
  workspaceId: string,
  deletionId: string,
): Promise<void> {
  await tx
    .insert(outboxJobs)
    .values({
      workspaceId,
      jobType: 'customer_data_cleanup',
      dedupeKey: deletionId,
      payload: { deletionId },
    })
    .onConflictDoNothing();
}

export async function completeDeletionIfReady(
  tx: TenantTransaction,
  workspaceId: string,
  deletionId: string,
): Promise<void> {
  const [intent] = await tx
    .select()
    .from(deletionIntents)
    .where(and(eq(deletionIntents.workspaceId, workspaceId), eq(deletionIntents.id, deletionId)))
    .limit(1)
    .for('update');
  if (!intent?.ledgerAckId || !intent.localCleanedAt || intent.completedAt) return;
  const [pending] = await tx
    .select({ id: deletionObjects.id })
    .from(deletionObjects)
    .where(
      and(
        eq(deletionObjects.workspaceId, workspaceId),
        eq(deletionObjects.deletionId, deletionId),
        isNull(deletionObjects.completedAt),
      ),
    )
    .limit(1);
  if (pending) return;
  const now = new Date();
  await tx
    .update(deletionIntents)
    .set({ completedAt: now })
    .where(and(eq(deletionIntents.workspaceId, workspaceId), eq(deletionIntents.id, deletionId)));
  if (intent.subjectType === 'order')
    await tx
      .update(orders)
      .set({ customerDataDeletedAt: now })
      .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, intent.subjectId)));
}

/** No provider calls in this transaction. Every private key survives in durable work before its source row is erased. */
export class DatabaseCustomerCleanup {
  constructor(private readonly database: CleanupDatabase = { withTenantTx }) {}
  async run(input: {
    workspaceId: string;
    actorId: string;
    deletionId: string;
  }): Promise<CleanupResult> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx): Promise<CleanupResult> => {
        // Take the shared backup gate before any row locks. With no active
        // backup it remains held through metadata erasure and transaction commit.
        const rows = await tx.execute<{ blocked_until: Date | string | null }>(
          sql`select app.customer_cleanup_backup_barrier(${input.workspaceId}::uuid) as blocked_until`,
        );
        const blocked = rows[0]?.blocked_until;
        if (blocked) return { status: 'deferred', availableAt: new Date(blocked) };
        const [intent] = await tx
          .select()
          .from(deletionIntents)
          .where(
            and(
              eq(deletionIntents.workspaceId, input.workspaceId),
              eq(deletionIntents.id, input.deletionId),
            ),
          )
          .limit(1)
          .for('update');
        if (!intent) throw new JobHandlerError('deletion_intent_not_found', false);
        if (intent.status !== 'acknowledged' || !intent.ledgerAckId)
          throw new JobHandlerError('deletion_not_acknowledged', true);
        if (intent.localCleanedAt) {
          await completeDeletionIfReady(tx, input.workspaceId, intent.id);
          return { status: 'completed' };
        }
        const subjectType = deletionSubjectTypeSchema.parse(intent.subjectType);
        let leadId =
          intent.relatedLeadId ?? (subjectType === 'lead' ? intent.subjectId : undefined);
        if (subjectType === 'order' && !leadId) {
          const [order] = await tx
            .select({ leadId: orders.leadId })
            .from(orders)
            .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, intent.subjectId)))
            .limit(1);
          leadId = order?.leadId;
          if (!leadId) throw new JobHandlerError('deletion_scope_unresolved', false);
          await tx
            .update(deletionIntents)
            .set({ relatedLeadId: leadId })
            .where(
              and(
                eq(deletionIntents.workspaceId, input.workspaceId),
                eq(deletionIntents.id, intent.id),
              ),
            );
        }
        const scope: DeletionScope = {
          workspaceId: input.workspaceId,
          subjectType,
          subjectId: intent.subjectId,
          leadId,
          orderId: subjectType === 'order' ? intent.subjectId : undefined,
        };
        if (leadId)
          await tx
            .select({ id: leads.id })
            .from(leads)
            .where(and(eq(leads.workspaceId, input.workspaceId), eq(leads.id, leadId)))
            .for('update');
        if (scope.orderId)
          await tx
            .select({ id: orders.id })
            .from(orders)
            .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, scope.orderId)))
            .for('update');
        await erasePersonalCopies(tx, scope, intent.id);
        await tx
          .update(deletionIntents)
          .set({ localCleanedAt: new Date(), lastErrorCode: null })
          .where(
            and(
              eq(deletionIntents.workspaceId, input.workspaceId),
              eq(deletionIntents.id, intent.id),
            ),
          );
        await completeDeletionIfReady(tx, input.workspaceId, intent.id);
        return { status: 'completed' };
      },
    );
  }
}

async function erasePersonalCopies(
  tx: TenantTransaction,
  scope: DeletionScope,
  deletionId: string,
): Promise<void> {
  const now = new Date();
  const fileScope = or(
    scope.leadId ? and(eq(files.recordType, 'lead'), eq(files.recordId, scope.leadId)) : undefined,
    scope.orderId
      ? and(eq(files.recordType, 'order'), eq(files.recordId, scope.orderId))
      : undefined,
  );
  const fileRows = fileScope
    ? await tx
        .select()
        .from(files)
        .where(and(eq(files.workspaceId, scope.workspaceId), fileScope))
        .for('update')
    : [];
  const keys = new Map<string, { bucket: string; objectKey: string; availableAt: Date }>();
  const revisions = fileRows.length
    ? await tx
        .select({ fileId: fileRevisions.fileId, objectKey: fileRevisions.objectKey })
        .from(fileRevisions)
        .where(
          and(
            eq(fileRevisions.workspaceId, scope.workspaceId),
            inArray(
              fileRevisions.fileId,
              fileRows.map((file) => file.id),
            ),
          ),
        )
    : [];
  const revisionKeys = new Map<string, string[]>();
  for (const revision of revisions) {
    const keysForFile = revisionKeys.get(revision.fileId) ?? [];
    keysForFile.push(revision.objectKey);
    revisionKeys.set(revision.fileId, keysForFile);
  }
  for (const file of fileRows) {
    // An already issued PUT can still write until its technical expiry. Wait
    // beyond it and the bounded verification calls before deleting any copies.
    const availableAt = new Date(Math.max(now.getTime(), file.expiresAt.getTime() + 60_000));
    for (const objectKey of [
      file.stagingKey,
      file.candidateKey,
      file.objectKey,
      ...(revisionKeys.get(file.id) ?? []),
    ]) {
      if (!objectKey) continue;
      const identity = `${file.bucket}\n${objectKey}`;
      const prior = keys.get(identity);
      if (!prior || prior.availableAt < availableAt)
        keys.set(identity, { bucket: file.bucket, objectKey, availableAt });
    }
  }
  for (const key of keys.values()) {
    const [work] = await tx
      .insert(deletionObjects)
      .values({ workspaceId: scope.workspaceId, deletionId, ...key })
      .onConflictDoNothing()
      .returning({ id: deletionObjects.id });
    if (work)
      await tx.insert(outboxJobs).values({
        workspaceId: scope.workspaceId,
        jobType: 'deletion_object_cleanup',
        dedupeKey: work.id,
        availableAt: key.availableAt,
        payload: { objectId: work.id },
      });
  }
  const messageScope = or(
    scope.leadId ? eq(emailMessages.leadId, scope.leadId) : undefined,
    scope.orderId ? eq(emailMessages.orderId, scope.orderId) : undefined,
  );
  const linkedMessages = messageScope
    ? await tx
        .select()
        .from(emailMessages)
        .where(and(eq(emailMessages.workspaceId, scope.workspaceId), messageScope))
        .for('update')
    : [];
  for (const message of linkedMessages) {
    await tx
      .insert(deletedEmailMessages)
      .values({
        workspaceId: scope.workspaceId,
        messageId: message.messageId,
        provider: message.provider,
        providerAccount: message.providerAccount,
        providerId: message.providerId,
      })
      .onConflictDoNothing();
    await tx
      .delete(emailProviderEvents)
      .where(
        and(
          eq(emailProviderEvents.workspaceId, scope.workspaceId),
          eq(emailProviderEvents.messageId, message.messageId),
        ),
      );
  }
  if (messageScope)
    await tx
      .delete(emailMessages)
      .where(and(eq(emailMessages.workspaceId, scope.workspaceId), messageScope));
  const consentScope = or(
    scope.leadId ? eq(marketingConsents.leadId, scope.leadId) : undefined,
    scope.orderId ? eq(marketingConsents.orderId, scope.orderId) : undefined,
  );
  if (consentScope) {
    // Keep only unlinked opt-out evidence: removing the latest false consent
    // must not reactivate an older opt-in on another record sharing the address.
    const optOuts = await tx
      .select({
        contactHash: marketingConsents.contactHash,
        capturedAt: marketingConsents.capturedAt,
      })
      .from(marketingConsents)
      .where(
        and(
          eq(marketingConsents.workspaceId, scope.workspaceId),
          consentScope,
          eq(marketingConsents.marketingOptIn, false),
        ),
      );
    for (const optOut of optOuts)
      await tx.insert(marketingConsents).values({
        workspaceId: scope.workspaceId,
        contactHash: optOut.contactHash,
        marketingOptIn: false,
        version: 'retained-opt-out',
        capturedAt: optOut.capturedAt,
      });
    await tx
      .delete(marketingConsents)
      .where(and(eq(marketingConsents.workspaceId, scope.workspaceId), consentScope));
  }
  const followScope = or(
    scope.leadId ? eq(followUpSchedules.leadId, scope.leadId) : undefined,
    scope.orderId ? eq(followUpSchedules.orderId, scope.orderId) : undefined,
  );
  if (followScope)
    await tx
      .delete(followUpSchedules)
      .where(and(eq(followUpSchedules.workspaceId, scope.workspaceId), followScope));
  const jobScope = or(
    scope.leadId ? sql`${outboxJobs.payload}->>'leadId' = ${scope.leadId}` : undefined,
    scope.orderId ? sql`${outboxJobs.payload}->>'orderId' = ${scope.orderId}` : undefined,
  );
  if (jobScope) {
    const jobs = await tx
      .select({ messageId: outboxJobs.messageId, jobType: outboxJobs.jobType })
      .from(outboxJobs)
      .where(and(eq(outboxJobs.workspaceId, scope.workspaceId), jobScope));
    for (const job of jobs)
      if (job.jobType.endsWith('_email'))
        await tx
          .insert(deletedEmailMessages)
          .values({ workspaceId: scope.workspaceId, messageId: job.messageId })
          .onConflictDoNothing();
    await tx
      .update(outboxJobs)
      .set({ payload: {}, outcome: {}, providerId: null, updatedAt: now })
      .where(
        and(
          eq(outboxJobs.workspaceId, scope.workspaceId),
          jobScope,
          sql`${outboxJobs.jobType} not in ('deletion_ledger_publish', 'customer_data_cleanup', 'deletion_object_cleanup', 'suppression_ledger_publish')`,
        ),
      );
  }
  const auditScope = or(
    scope.leadId
      ? and(eq(auditEvents.entity, 'lead'), eq(auditEvents.entityId, scope.leadId))
      : undefined,
    scope.orderId
      ? and(eq(auditEvents.entity, 'order'), eq(auditEvents.entityId, scope.orderId))
      : undefined,
    fileRows.length
      ? and(
          eq(auditEvents.entity, 'file'),
          inArray(
            auditEvents.entityId,
            fileRows.map((file) => file.id),
          ),
        )
      : undefined,
    scope.subjectType === 'region_waitlist'
      ? and(eq(auditEvents.entity, 'region_waitlist'), eq(auditEvents.entityId, scope.subjectId))
      : undefined,
  );
  if (auditScope)
    await tx
      .update(auditEvents)
      .set({ before: null, after: null })
      .where(and(eq(auditEvents.workspaceId, scope.workspaceId), auditScope));
  if (fileScope)
    await tx.delete(files).where(and(eq(files.workspaceId, scope.workspaceId), fileScope));
  if (scope.orderId) {
    const id = scope.orderId;
    await tx
      .delete(orderNotes)
      .where(and(eq(orderNotes.workspaceId, scope.workspaceId), eq(orderNotes.orderId, id)));
    await tx
      .delete(orderAmendments)
      .where(
        and(eq(orderAmendments.workspaceId, scope.workspaceId), eq(orderAmendments.orderId, id)),
      );
    await tx
      .delete(orderChangeRequests)
      .where(
        and(
          eq(orderChangeRequests.workspaceId, scope.workspaceId),
          eq(orderChangeRequests.orderId, id),
        ),
      );
    await tx
      .delete(orderReminders)
      .where(
        and(eq(orderReminders.workspaceId, scope.workspaceId), eq(orderReminders.orderId, id)),
      );
    await tx
      .update(orderStatusHistory)
      .set({ reason: null })
      .where(
        and(
          eq(orderStatusHistory.workspaceId, scope.workspaceId),
          eq(orderStatusHistory.orderId, id),
        ),
      );
    await tx
      .update(paymentRecords)
      .set({ method: null, paymentReference: null })
      .where(
        and(eq(paymentRecords.workspaceId, scope.workspaceId), eq(paymentRecords.orderId, id)),
      );
    await tx
      .delete(dispatchRecords)
      .where(
        and(eq(dispatchRecords.workspaceId, scope.workspaceId), eq(dispatchRecords.orderId, id)),
      );
    await tx
      .delete(trackingChallenges)
      .where(
        and(
          eq(trackingChallenges.workspaceId, scope.workspaceId),
          eq(trackingChallenges.orderId, id),
        ),
      );
    await tx
      .update(orders)
      .set({ payload: {}, consent: null, updatedAt: now })
      .where(and(eq(orders.workspaceId, scope.workspaceId), eq(orders.id, id)));
  }
  if (scope.leadId) {
    await tx
      .delete(draftGrants)
      .where(
        and(eq(draftGrants.workspaceId, scope.workspaceId), eq(draftGrants.leadId, scope.leadId)),
      );
    await tx
      .update(leads)
      .set({
        fullName: null,
        email: null,
        phone: null,
        countryCode: null,
        payload: null,
        attribution: {},
        partnerId: null,
        selectedOfferVersionId: null,
        updatedAt: now,
      })
      .where(and(eq(leads.workspaceId, scope.workspaceId), eq(leads.id, scope.leadId)));
  }
  if (scope.subjectType === 'region_waitlist')
    await tx
      .delete(regionWaitlist)
      .where(
        and(
          eq(regionWaitlist.workspaceId, scope.workspaceId),
          eq(regionWaitlist.id, scope.subjectId),
        ),
      );
}

export function createCustomerCleanupHandler(
  cleanup: DatabaseCustomerCleanup = new DatabaseCustomerCleanup(),
): JobHandler {
  return async (job) => {
    const payload = payloadSchema.safeParse(job.payload);
    const actor = z.uuid().safeParse(job.actorId);
    if (job.payloadVersion !== 1 || !payload.success || !actor.success)
      throw new JobHandlerError('invalid_job_payload', false);
    const result = await cleanup.run({
      workspaceId: job.workspaceId,
      actorId: actor.data,
      deletionId: payload.data.deletionId,
    });
    if (result.status === 'deferred')
      return {
        status: 'retry',
        errorCode: 'customer_cleanup_deferred',
        availableAt: result.availableAt,
        preserveAttempt: true,
      };
    return { status: 'completed', providerId: 'customer_data_cleanup_queued' };
  };
}
