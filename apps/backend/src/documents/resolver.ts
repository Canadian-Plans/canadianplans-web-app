import { and, eq } from 'drizzle-orm';
import { leads, offerVersions, orders, withTenantTx } from '@canadian-plans/db';
import { commercialOfferSchema } from '@canadian-plans/contracts';
import type { DocumentParentType } from '@canadian-plans/contracts';
import { z } from 'zod';

import type { DocumentContextResolver } from './service.js';

type DocumentDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;

const snapshotChecklistSchema = z.object({
  documentChecklist: z.array(z.string()).optional(),
});

/**
 * Reads the commercial context from the tenant DB. A lead's allowed document
 * types come from its selected offer version's content; an order's come from
 * its frozen snapshot. Everything runs under tenant RLS, so a parent belonging
 * to another workspace simply returns nothing (`found: false`).
 */
export class DatabaseDocumentContextResolver implements DocumentContextResolver {
  constructor(private readonly database: DocumentDatabase = { withTenantTx }) {}

  async resolveChecklist(input: {
    workspaceId: string;
    actorId: string;
    recordType: DocumentParentType;
    recordId: string;
  }): Promise<{ found: false } | { found: true; allowed: readonly string[] }> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        if (input.recordType === 'lead') {
          const [lead] = await tx
            .select({ offerVersionId: leads.selectedOfferVersionId })
            .from(leads)
            .where(and(eq(leads.workspaceId, input.workspaceId), eq(leads.id, input.recordId)))
            .limit(1);
          if (!lead) return { found: false };
          if (!lead.offerVersionId) return { found: true, allowed: [] };
          const [offer] = await tx
            .select({ content: offerVersions.content })
            .from(offerVersions)
            .where(
              and(
                eq(offerVersions.workspaceId, input.workspaceId),
                eq(offerVersions.id, lead.offerVersionId),
              ),
            )
            .limit(1);
          if (!offer) return { found: true, allowed: [] };
          const parsed = commercialOfferSchema.safeParse(offer.content);
          return { found: true, allowed: parsed.success ? parsed.data.documentChecklist : [] };
        }

        const [order] = await tx
          .select({ snapshot: orders.snapshot })
          .from(orders)
          .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, input.recordId)))
          .limit(1);
        if (!order) return { found: false };
        const parsed = snapshotChecklistSchema.safeParse(order.snapshot);
        return {
          found: true,
          allowed: parsed.success ? (parsed.data.documentChecklist ?? []) : [],
        };
      },
    );
  }

  async resolveOrderLeadId(input: {
    workspaceId: string;
    actorId: string;
    orderId: string;
  }): Promise<string | undefined> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [order] = await tx
          .select({ leadId: orders.leadId })
          .from(orders)
          .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, input.orderId)))
          .limit(1);
        return order?.leadId ?? undefined;
      },
    );
  }
}
