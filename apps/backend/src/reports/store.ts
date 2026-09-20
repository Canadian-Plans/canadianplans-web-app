import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { leads, orders, partners, withTenantTx, type TenantTransaction } from '@canadian-plans/db';
import type { SourceReportDimension, SourceReportGroup } from '@canadian-plans/contracts';

/**
 * Lead-to-order source report (T20, REQ 35). All counting happens in Postgres
 * with `GROUP BY` over the stored, already-sanitized `attribution` JSONB and the
 * partner name — no row is fetched to the app to be aggregated, and every query
 * runs inside the workspace's RLS tenant context.
 */

export interface SourceReportInput {
  workspaceId: string;
  actorId: string;
  from?: Date;
  to?: Date;
}

export interface SourceReportResult {
  groups: SourceReportGroup[];
  totals: { leads: number; orders: number };
}

export interface ReportStore {
  sourceReport(input: SourceReportInput): Promise<SourceReportResult>;
}

type ReportDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;

const defaultDatabase: ReportDatabase = { withTenantTx };

/** The three UTM dimensions and the `attribution` JSONB key each reads. */
const UTM_DIMENSIONS: readonly [SourceReportDimension, string][] = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
];

export class DatabaseReportStore implements ReportStore {
  constructor(private readonly database: ReportDatabase = defaultDatabase) {}

  async sourceReport(input: SourceReportInput): Promise<SourceReportResult> {
    const { workspaceId, actorId, from, to } = input;
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const groups: SourceReportGroup[] = [];

      for (const [dimension, jsonKey] of UTM_DIMENSIONS) {
        groups.push(...(await this.utmGroups(tx, workspaceId, dimension, jsonKey, { from, to })));
      }
      groups.push(...(await this.partnerGroups(tx, workspaceId, { from, to })));

      const [leadTotal] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(leads)
        .where(
          and(
            eq(leads.workspaceId, workspaceId),
            from ? gte(leads.createdAt, from) : undefined,
            to ? lte(leads.createdAt, to) : undefined,
          ),
        );
      const [orderTotal] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            eq(orders.workspaceId, workspaceId),
            from ? gte(orders.submittedAt, from) : undefined,
            to ? lte(orders.submittedAt, to) : undefined,
          ),
        );

      return {
        groups,
        totals: { leads: leadTotal?.count ?? 0, orders: orderTotal?.count ?? 0 },
      };
    });
  }

  private async utmGroups(
    tx: TenantTransaction,
    workspaceId: string,
    dimension: SourceReportDimension,
    jsonKey: string,
    window: { from?: Date; to?: Date },
  ): Promise<SourceReportGroup[]> {
    const leadExpr = sql<string | null>`${leads.attribution} ->> ${jsonKey}`;
    const leadRows = await tx
      .select({ value: leadExpr, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(
        and(
          eq(leads.workspaceId, workspaceId),
          window.from ? gte(leads.createdAt, window.from) : undefined,
          window.to ? lte(leads.createdAt, window.to) : undefined,
        ),
      )
      .groupBy(leadExpr);

    const orderExpr = sql<string | null>`${leads.attribution} ->> ${jsonKey}`;
    const orderRows = await tx
      .select({ value: orderExpr, count: sql<number>`count(*)::int` })
      .from(orders)
      .innerJoin(leads, and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId)))
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          window.from ? gte(orders.submittedAt, window.from) : undefined,
          window.to ? lte(orders.submittedAt, window.to) : undefined,
        ),
      )
      .groupBy(orderExpr);

    return mergeDimensions(dimension, leadRows, orderRows);
  }

  private async partnerGroups(
    tx: TenantTransaction,
    workspaceId: string,
    window: { from?: Date; to?: Date },
  ): Promise<SourceReportGroup[]> {
    const leadRows = await tx
      .select({ value: partners.name, count: sql<number>`count(*)::int` })
      .from(leads)
      .innerJoin(
        partners,
        and(eq(partners.workspaceId, leads.workspaceId), eq(partners.id, leads.partnerId)),
      )
      .where(
        and(
          eq(leads.workspaceId, workspaceId),
          window.from ? gte(leads.createdAt, window.from) : undefined,
          window.to ? lte(leads.createdAt, window.to) : undefined,
        ),
      )
      .groupBy(partners.name);

    const orderRows = await tx
      .select({ value: partners.name, count: sql<number>`count(*)::int` })
      .from(orders)
      .innerJoin(
        partners,
        and(eq(partners.workspaceId, orders.workspaceId), eq(partners.id, orders.partnerId)),
      )
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          window.from ? gte(orders.submittedAt, window.from) : undefined,
          window.to ? lte(orders.submittedAt, window.to) : undefined,
        ),
      )
      .groupBy(partners.name);

    return mergeDimensions('partner', leadRows, orderRows);
  }
}

type CountRow = { value: string | null; count: number };

/** Combines lead and order buckets for one dimension, dropping empty values. */
function mergeDimensions(
  dimension: SourceReportDimension,
  leadRows: CountRow[],
  orderRows: CountRow[],
): SourceReportGroup[] {
  const buckets = new Map<string, { leads: number; orders: number }>();
  const add = (rows: CountRow[], key: 'leads' | 'orders') => {
    for (const row of rows) {
      const value = row.value?.trim();
      if (!value) continue;
      const bucket = buckets.get(value) ?? { leads: 0, orders: 0 };
      bucket[key] += row.count;
      buckets.set(value, bucket);
    }
  };
  add(leadRows, 'leads');
  add(orderRows, 'orders');

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, counts]) => ({ dimension, value, ...counts }));
}
