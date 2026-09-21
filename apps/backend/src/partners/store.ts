import { and, eq, sql } from 'drizzle-orm';
import {
  auditEvents,
  commissionLineEvents,
  commissionLines,
  orders,
  partners,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import {
  commissionRuleSnapshotSchema,
  commissionStateSchema,
  orderFulfilmentStatusSchema,
  partnerStatusSchema,
  type CommissionLine,
  type CommissionLineEvent,
  type CommissionState,
  type Partner,
  type PartnerCommissionView,
  type PartnerReferredOrder,
  type PartnerSummary,
} from '@canadian-plans/contracts';

import { validateCommissionStateTransition } from './commission-state.js';

type PartnerDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: PartnerDatabase = { withTenantTx };

export interface PartnerDetail {
  partner: Partner;
  referredOrders: PartnerReferredOrder[];
  commissions: PartnerCommissionView[];
}

export interface ChangeCommissionStateInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  partnerId: string;
  commissionId: string;
  toState: CommissionState;
}

export type CommissionStateOutcome =
  | { status: 'updated'; commission: CommissionLine; history: CommissionLineEvent[] }
  | {
      status:
        | 'partner_not_found'
        | 'commission_not_found'
        | 'invalid_transition'
        | 'partner_paid_disabled';
    };

export interface PartnerStore {
  listPartners(workspaceId: string, actorId: string): Promise<PartnerSummary[]>;
  getPartnerDetail(
    workspaceId: string,
    actorId: string,
    partnerId: string,
  ): Promise<PartnerDetail | undefined>;
  changeCommissionState(input: ChangeCommissionStateInput): Promise<CommissionStateOutcome>;
}

function toPartner(row: {
  id: string;
  workspaceId: string;
  name: string;
  referralCode: string;
  status: string;
  createdAt: Date;
}): Partner {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    referralCode: row.referralCode,
    status: partnerStatusSchema.parse(row.status),
    createdAt: row.createdAt.toISOString(),
  };
}

async function commissionHistory(
  tx: TenantTransaction,
  workspaceId: string,
  commissionLineId: string,
): Promise<CommissionLineEvent[]> {
  const rows = await tx
    .select({
      id: commissionLineEvents.id,
      fromState: commissionLineEvents.fromState,
      toState: commissionLineEvents.toState,
      createdAt: commissionLineEvents.createdAt,
    })
    .from(commissionLineEvents)
    .where(
      and(
        eq(commissionLineEvents.workspaceId, workspaceId),
        eq(commissionLineEvents.commissionLineId, commissionLineId),
      ),
    )
    .orderBy(commissionLineEvents.createdAt);
  return rows.map((row) => ({
    id: row.id,
    fromState: row.fromState ? commissionStateSchema.parse(row.fromState) : null,
    toState: commissionStateSchema.parse(row.toState),
    createdAt: row.createdAt.toISOString(),
  }));
}

export class DatabasePartnerStore implements PartnerStore {
  constructor(
    private readonly database: PartnerDatabase = defaultDatabase,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listPartners(workspaceId: string, actorId: string): Promise<PartnerSummary[]> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const partnerRows = await tx
        .select()
        .from(partners)
        .where(eq(partners.workspaceId, workspaceId))
        .orderBy(partners.name);

      const orderCounts = await tx
        .select({ partnerId: orders.partnerId, count: sql<number>`count(*)::int` })
        .from(orders)
        .where(eq(orders.workspaceId, workspaceId))
        .groupBy(orders.partnerId);
      const commissionCounts = await tx
        .select({ partnerId: commissionLines.partnerId, count: sql<number>`count(*)::int` })
        .from(commissionLines)
        .where(eq(commissionLines.workspaceId, workspaceId))
        .groupBy(commissionLines.partnerId);

      const orderCountByPartner = new Map(
        orderCounts
          .filter((row) => row.partnerId !== null)
          .map((row) => [row.partnerId, row.count]),
      );
      const commissionCountByPartner = new Map(
        commissionCounts.map((row) => [row.partnerId, row.count]),
      );

      return partnerRows.map((row) => ({
        ...toPartner(row),
        referredOrderCount: orderCountByPartner.get(row.id) ?? 0,
        commissionLineCount: commissionCountByPartner.get(row.id) ?? 0,
      }));
    });
  }

  getPartnerDetail(
    workspaceId: string,
    actorId: string,
    partnerId: string,
  ): Promise<PartnerDetail | undefined> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [partnerRow] = await tx
        .select()
        .from(partners)
        .where(and(eq(partners.workspaceId, workspaceId), eq(partners.id, partnerId)))
        .limit(1);
      if (!partnerRow) return undefined;

      const referredOrderRows = await tx
        .select({
          id: orders.id,
          reference: orders.reference,
          status: orders.status,
          submittedAt: orders.submittedAt,
        })
        .from(orders)
        .where(and(eq(orders.workspaceId, workspaceId), eq(orders.partnerId, partnerId)))
        .orderBy(orders.submittedAt);

      const commissionRows = await tx
        .select({
          id: commissionLines.id,
          orderId: commissionLines.orderId,
          orderReference: orders.reference,
          state: commissionLines.state,
          amountMinor: commissionLines.amountMinor,
          currency: commissionLines.currency,
          invoiceId: commissionLines.invoiceId,
          earnedAt: commissionLines.earnedAt,
          updatedAt: commissionLines.updatedAt,
        })
        .from(commissionLines)
        .innerJoin(
          orders,
          and(
            eq(orders.workspaceId, commissionLines.workspaceId),
            eq(orders.id, commissionLines.orderId),
          ),
        )
        .where(
          and(
            eq(commissionLines.workspaceId, workspaceId),
            eq(commissionLines.partnerId, partnerId),
          ),
        )
        .orderBy(commissionLines.earnedAt);

      const referredOrders: PartnerReferredOrder[] = referredOrderRows.map((row) => ({
        id: row.id,
        reference: row.reference,
        fulfilmentStatus: orderFulfilmentStatusSchema.parse(row.status),
        submittedAt: row.submittedAt.toISOString(),
      }));
      const commissions: PartnerCommissionView[] = commissionRows.map((row) => ({
        id: row.id,
        orderId: row.orderId,
        orderReference: row.orderReference,
        state: commissionStateSchema.parse(row.state),
        amount: { amountMinor: row.amountMinor, currency: row.currency },
        invoiceId: row.invoiceId,
        earnedAt: row.earnedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));

      return { partner: toPartner(partnerRow), referredOrders, commissions };
    });
  }

  changeCommissionState(input: ChangeCommissionStateInput): Promise<CommissionStateOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [line] = await tx
          .select()
          .from(commissionLines)
          .where(
            and(
              eq(commissionLines.workspaceId, input.workspaceId),
              eq(commissionLines.id, input.commissionId),
              eq(commissionLines.partnerId, input.partnerId),
            ),
          )
          .limit(1)
          .for('update');
        if (!line) return { status: 'commission_not_found' };

        const fromState = commissionStateSchema.parse(line.state);
        const transition = validateCommissionStateTransition(fromState, input.toState);
        if (transition.status === 'partner_paid_disabled')
          return { status: 'partner_paid_disabled' };
        if (transition.status === 'invalid_transition') return { status: 'invalid_transition' };

        const now = this.now();
        await tx
          .update(commissionLines)
          .set({ state: input.toState, updatedAt: now })
          .where(
            and(
              eq(commissionLines.workspaceId, input.workspaceId),
              eq(commissionLines.id, input.commissionId),
            ),
          );

        await tx.insert(commissionLineEvents).values({
          workspaceId: input.workspaceId,
          commissionLineId: input.commissionId,
          actorId: input.actorId,
          fromState,
          toState: input.toState,
        });

        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'staff',
          action: 'commission.state_changed',
          entity: 'commission_line',
          entityId: input.commissionId,
          requestId: input.requestId,
          before: { state: fromState },
          after: { state: input.toState },
        });

        const history = await commissionHistory(tx, input.workspaceId, input.commissionId);
        const commission: CommissionLine = {
          id: line.id,
          workspaceId: line.workspaceId,
          orderId: line.orderId,
          partnerId: line.partnerId,
          ruleId: line.ruleId,
          ruleSnapshot: commissionRuleSnapshotSchema.parse(line.ruleSnapshot),
          amount: { amountMinor: line.amountMinor, currency: line.currency },
          state: input.toState,
          invoiceId: line.invoiceId,
          earnedAt: line.earnedAt.toISOString(),
          updatedAt: now.toISOString(),
        };
        return { status: 'updated', commission, history };
      },
    );
  }
}
