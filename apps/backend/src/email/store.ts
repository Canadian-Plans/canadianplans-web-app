import { and, desc, eq, sql } from 'drizzle-orm';
import {
  emailMessages,
  emailProviderEvents,
  emailSuppressions,
  followUpSchedules,
  marketingConsents,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import type { EmailEligibilityChecker } from '@canadian-plans/jobs';
import type { SuppressionLedgerPublisher } from '@canadian-plans/adapters';

export type EmailMessageStatus =
  'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed' | 'uncertain';

export type SuppressionReason = 'hard_bounce' | 'complaint' | 'manual';

const suppressionReasons: readonly SuppressionReason[] = ['hard_bounce', 'complaint', 'manual'];

export interface QueueEmailMessageInput {
  workspaceId: string;
  actorId: string;
  messageId: string;
  template: string;
  messageClass: 'transactional' | 'marketing';
  contactHash: string;
  leadId?: string;
  orderId?: string;
}

export interface DeliveryStatusRow {
  messageId: string;
  template: string;
  status: EmailMessageStatus;
  providerId: string | null;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliverySummary {
  sent: number;
  delivered: number;
  failed: number;
  uncertain: number;
}

export interface ProviderEventInput {
  workspaceId: string;
  actorId: string;
  providerEventId: string;
  eventType: 'delivered' | 'bounce' | 'complaint' | 'reject';
  messageId?: string;
  contactHash?: string;
  receivedAt: Date;
}

export type ApplyProviderEventOutcome = 'applied' | 'duplicate' | 'invalid';

/**
 * The full email persistence surface T18 needs, beyond the pure eligibility
 * check `@canadian-plans/jobs` requires from every registry.
 */
export interface EmailStore extends EmailEligibilityChecker {
  queueMessage(input: QueueEmailMessageInput): Promise<void>;
  applyProviderEvent(input: ProviderEventInput): Promise<ApplyProviderEventOutcome>;
  listDelivery(workspaceId: string, actorId: string): Promise<DeliveryStatusRow[]>;
  deliverySummary(workspaceId: string, actorId: string): Promise<DeliverySummary>;
  recordUnsubscribe(input: {
    workspaceId: string;
    contactHash: string;
    leadId?: string;
    orderId?: string;
    version: string;
    now: Date;
  }): Promise<void>;
}

type EmailDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: EmailDatabase = { withTenantTx };

function statusValue(value: string): EmailMessageStatus {
  const known: readonly EmailMessageStatus[] = [
    'queued',
    'sent',
    'delivered',
    'bounced',
    'complained',
    'failed',
    'uncertain',
  ];
  return known.find((status) => status === value) ?? 'uncertain';
}

/**
 * DB-backed email store. `ledger` publishes durable suppression changes
 * (IMPLEMENTATION_PLAN.md §13); until the real ledger exists (T4R), this is
 * constructed with `FakeSuppressionLedgerPublisher` everywhere — see the
 * BLOCKERS note in the T18 report.
 */
export class DatabaseEmailStore implements EmailStore {
  constructor(
    private readonly ledger: SuppressionLedgerPublisher,
    private readonly database: EmailDatabase = defaultDatabase,
  ) {}

  async checkTransactional(input: {
    workspaceId: string;
    contactHash: string;
  }): Promise<{ eligible: boolean; reason?: string }> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: 'system:email' },
      async (tx) => {
        const suppressed = await isSuppressed(tx, input.workspaceId, input.contactHash);
        return suppressed ? { eligible: false, reason: suppressed } : { eligible: true };
      },
    );
  }

  async checkMarketing(input: {
    workspaceId: string;
    contactHash: string;
    leadId?: string;
    orderId?: string;
  }): Promise<{ eligible: boolean; reason?: string }> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: 'system:email' },
      async (tx) => {
        const suppressed = await isSuppressed(tx, input.workspaceId, input.contactHash);
        if (suppressed) return { eligible: false, reason: suppressed };
        const [latestConsent] = await tx
          .select({ marketingOptIn: marketingConsents.marketingOptIn })
          .from(marketingConsents)
          .where(
            and(
              eq(marketingConsents.workspaceId, input.workspaceId),
              eq(marketingConsents.contactHash, input.contactHash),
            ),
          )
          .orderBy(desc(marketingConsents.capturedAt))
          .limit(1);
        if (!latestConsent) return { eligible: false, reason: 'no_recorded_consent' };
        if (!latestConsent.marketingOptIn) return { eligible: false, reason: 'opted_out' };
        return { eligible: true };
      },
    );
  }

  async queueMessage(input: QueueEmailMessageInput): Promise<void> {
    await this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        await tx
          .insert(emailMessages)
          .values({
            workspaceId: input.workspaceId,
            messageId: input.messageId,
            template: input.template,
            messageClass: input.messageClass,
            leadId: input.leadId,
            orderId: input.orderId,
            contactHash: input.contactHash,
            status: 'queued',
          })
          .onConflictDoNothing();
      },
    );
  }

  async applyProviderEvent(input: ProviderEventInput): Promise<ApplyProviderEventOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const inserted = await tx
          .insert(emailProviderEvents)
          .values({
            workspaceId: input.workspaceId,
            providerEventId: input.providerEventId,
            eventType: input.eventType,
            messageId: input.messageId,
            contactHash: input.contactHash,
            receivedAt: input.receivedAt,
          })
          .onConflictDoNothing()
          .returning({ id: emailProviderEvents.id });
        if (inserted.length === 0) return 'duplicate';

        const now = new Date();
        if (input.messageId) {
          const status: EmailMessageStatus =
            input.eventType === 'delivered'
              ? 'delivered'
              : input.eventType === 'bounce'
                ? 'bounced'
                : input.eventType === 'complaint'
                  ? 'complained'
                  : 'failed';
          await tx
            .update(emailMessages)
            .set({ status, lastEventAt: now, updatedAt: now })
            .where(
              and(
                eq(emailMessages.workspaceId, input.workspaceId),
                eq(emailMessages.messageId, input.messageId),
              ),
            );
        }

        if (
          (input.eventType === 'bounce' || input.eventType === 'complaint') &&
          input.contactHash
        ) {
          const reason: SuppressionReason =
            input.eventType === 'bounce' ? 'hard_bounce' : 'complaint';
          const [row] = await tx
            .insert(emailSuppressions)
            .values({
              workspaceId: input.workspaceId,
              contactHash: input.contactHash,
              reason,
              sourceEventId: input.providerEventId,
            })
            .onConflictDoNothing()
            .returning({ id: emailSuppressions.id });
          if (row) {
            await this.ledger.publish({
              workspaceId: input.workspaceId,
              operationId: `suppress:${input.workspaceId}:${input.contactHash}:${reason}`,
              operation: 'suppress',
              contactHash: input.contactHash,
              reason,
              occurredAt: now.toISOString(),
            });
          }
        }

        await tx
          .update(emailProviderEvents)
          .set({ appliedAt: now })
          .where(
            and(
              eq(emailProviderEvents.workspaceId, input.workspaceId),
              eq(emailProviderEvents.providerEventId, input.providerEventId),
            ),
          );
        return 'applied';
      },
    );
  }

  async listDelivery(workspaceId: string, actorId: string): Promise<DeliveryStatusRow[]> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const rows = await tx
        .select({
          messageId: emailMessages.messageId,
          template: emailMessages.template,
          status: emailMessages.status,
          providerId: emailMessages.providerId,
          lastErrorCode: emailMessages.lastErrorCode,
          createdAt: emailMessages.createdAt,
          updatedAt: emailMessages.updatedAt,
        })
        .from(emailMessages)
        .where(eq(emailMessages.workspaceId, workspaceId))
        .orderBy(desc(emailMessages.createdAt))
        .limit(200);
      return rows.map((row) => ({ ...row, status: statusValue(row.status) }));
    });
  }

  async deliverySummary(workspaceId: string, actorId: string): Promise<DeliverySummary> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const rows = await tx
        .select({ status: emailMessages.status, count: sql<number>`count(*)::int` })
        .from(emailMessages)
        .where(eq(emailMessages.workspaceId, workspaceId))
        .groupBy(emailMessages.status);
      const summary: DeliverySummary = { sent: 0, delivered: 0, failed: 0, uncertain: 0 };
      for (const row of rows) {
        if (row.status === 'delivered') summary.delivered += row.count;
        else if (row.status === 'failed' || row.status === 'bounced' || row.status === 'complained')
          summary.failed += row.count;
        else if (row.status === 'uncertain') summary.uncertain += row.count;
        else summary.sent += row.count;
      }
      return summary;
    });
  }

  async recordUnsubscribe(input: {
    workspaceId: string;
    contactHash: string;
    leadId?: string;
    orderId?: string;
    version: string;
    now: Date;
  }): Promise<void> {
    await this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: 'public:unsubscribe' },
      async (tx) => {
        await tx.insert(marketingConsents).values({
          workspaceId: input.workspaceId,
          leadId: input.leadId,
          orderId: input.orderId,
          contactHash: input.contactHash,
          marketingOptIn: false,
          version: input.version,
          capturedAt: input.now,
        });
        // Cancel any still-scheduled marketing follow-ups for this contact's
        // lead/order so a pending job never fires after unsubscribe.
        if (input.leadId) {
          await tx
            .update(followUpSchedules)
            .set({ status: 'cancelled', cancelledReason: 'unsubscribed', updatedAt: input.now })
            .where(
              and(
                eq(followUpSchedules.workspaceId, input.workspaceId),
                eq(followUpSchedules.leadId, input.leadId),
                eq(followUpSchedules.status, 'scheduled'),
              ),
            );
        }
      },
    );
  }
}

async function isSuppressed(
  tx: TenantTransaction,
  workspaceId: string,
  contactHash: string,
): Promise<SuppressionReason | undefined> {
  const [row] = await tx
    .select({ reason: emailSuppressions.reason })
    .from(emailSuppressions)
    .where(
      and(
        eq(emailSuppressions.workspaceId, workspaceId),
        eq(emailSuppressions.contactHash, contactHash),
      ),
    )
    .limit(1);
  return row ? suppressionReasons.find((reason) => reason === row.reason) : undefined;
}
