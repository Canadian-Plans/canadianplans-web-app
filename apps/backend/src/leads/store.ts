import { prepareLeadIntake } from './intake.js';
import { loadLeadFields, lockLeadModel, recordSchema } from './model.js';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import {
  auditEvents,
  draftGrants,
  leads,
  offerVersions,
  outboxJobs,
  partners,
  productAvailability,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import {
  fieldApplies,
  attributionSchema,
  leadTypeSchema,
  type LeadType,
  leadContactSchema,
  leadFormSchema,
  leadStatusSchema,
  type Attribution,
  type LeadContact,
  type LeadForm,
  type LeadDraft,
  type LeadListItem,
  type LeadStatus,
  type LeadSummary,
  type RawAttribution,
} from '@canadian-plans/contracts';

import { sanitizeAttribution } from './attribution.js';
import { deriveSource } from './source.js';
import { generateDraftGrantToken, hashDraftGrantToken } from './token.js';

/** Proposed default: long enough for a customer to leave and resume the form later. */
const DEFAULT_DRAFT_GRANT_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface CreateLeadInput {
  leadType?: LeadType;
  customValues?: Record<string, unknown>;
  workspaceId: string;
  actorId: string;
  requestId: string;
  contact?: LeadContact;
  form?: LeadForm;
  productId?: string;
  attribution?: RawAttribution;
  consentVersion: string;
}

export interface CreateLeadResult {
  lead: LeadSummary;
  grant: { token: string; expiresAt: string };
}

export type UpdateLeadOutcome =
  | { status: 'updated'; lead: LeadSummary }
  | { status: 'grant_invalid' }
  | { status: 'grant_expired' }
  | { status: 'draft_submitted' };

export interface UpdateLeadInput {
  leadType?: LeadType;
  customValues?: Record<string, unknown>;
  workspaceId: string;
  actorId: string;
  requestId: string;
  leadId: string;
  grantToken: string;
  contact?: LeadContact;
  form?: LeadForm;
  productId?: string;
  attribution?: RawAttribution;
  consentVersion?: string;
}

export interface ListLeadsInput {
  workspaceId: string;
  actorId: string;
  status?: LeadStatus;
  page?: number;
  pageSize?: number;
}

export interface ListLeadsResult {
  leads: LeadListItem[];
  page: { page: number; pageSize: number; total: number };
}

export interface LeadStore {
  readLead(
    input: Pick<UpdateLeadInput, 'workspaceId' | 'actorId' | 'leadId' | 'grantToken'>,
  ): Promise<ReadLeadOutcome>;
  createLead(input: CreateLeadInput): Promise<CreateLeadResult>;
  updateLead(input: UpdateLeadInput): Promise<UpdateLeadOutcome>;
  listLeads(input: ListLeadsInput): Promise<ListLeadsResult>;
}

export type ReadLeadOutcome =
  | { status: 'read'; draft: LeadDraft }
  | { status: 'grant_invalid' | 'grant_expired' | 'draft_submitted' };

type LeadDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;

const defaultLeadDatabase: LeadDatabase = { withTenantTx };

function toSummary(row: {
  id: string;
  workspaceId: string;
  status: string;
  updatedAt: Date;
}): LeadSummary {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    status: leadStatusSchema.parse(row.status),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** True only when the code matches a currently `approved` partner in this workspace. */
async function findActivePartnerId(
  tx: TenantTransaction,
  workspaceId: string,
  referralCode: string,
): Promise<string | undefined> {
  const [row] = await tx
    .select({ id: partners.id })
    .from(partners)
    .where(
      and(
        eq(partners.workspaceId, workspaceId),
        eq(partners.status, 'approved'),
        sql`lower(${partners.referralCode}) = lower(${referralCode})`,
      ),
    )
    .limit(1);
  return row?.id ?? undefined;
}

/** Sanitizes attribution and returns the durable link for an approved partner code. */
async function prepareAttribution(
  tx: TenantTransaction,
  workspaceId: string,
  raw: RawAttribution | undefined,
): Promise<{ attribution: Attribution; partnerId?: string }> {
  const attribution = sanitizeAttribution(raw);
  if (!attribution.partnerCode) return { attribution };
  const partnerId = await findActivePartnerId(tx, workspaceId, attribution.partnerCode);
  return {
    attribution: { ...attribution, partnerCodeMatched: partnerId !== undefined },
    partnerId,
  };
}

/** The latest offer version for a product that is not currently withdrawn, or undefined. */
async function resolveOfferVersionId(
  tx: TenantTransaction,
  workspaceId: string,
  productId: string,
): Promise<string | undefined> {
  const [row] = await tx
    .select({ id: productAvailability.currentOfferVersionId })
    .from(productAvailability)
    .where(
      and(
        eq(productAvailability.workspaceId, workspaceId),
        eq(productAvailability.productId, productId),
        isNull(productAvailability.revokedAt),
        isNotNull(productAvailability.currentOfferVersionId),
      ),
    )
    .limit(1);
  return row?.id ?? undefined;
}

export class DatabaseLeadStore implements LeadStore {
  constructor(private readonly database: LeadDatabase = defaultLeadDatabase) {}

  async readLead(
    input: Pick<UpdateLeadInput, 'workspaceId' | 'actorId' | 'leadId' | 'grantToken'>,
  ): Promise<ReadLeadOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        await lockLeadModel(tx, input.workspaceId, true);
        const [row] = await tx
          .select({
            lead: leads,
            productId: offerVersions.productId,
            expiresAt: draftGrants.expiresAt,
            revokedAt: draftGrants.revokedAt,
          })
          .from(draftGrants)
          .innerJoin(
            leads,
            and(eq(leads.workspaceId, draftGrants.workspaceId), eq(leads.id, draftGrants.leadId)),
          )
          .leftJoin(
            offerVersions,
            and(
              eq(offerVersions.workspaceId, leads.workspaceId),
              eq(offerVersions.id, leads.selectedOfferVersionId),
            ),
          )
          .where(
            and(
              eq(draftGrants.workspaceId, input.workspaceId),
              isNull(leads.customerDataRestrictedAt),
              eq(draftGrants.leadId, input.leadId),
              eq(draftGrants.tokenHash, hashDraftGrantToken(input.grantToken)),
            ),
          )
          .limit(1);
        if (!row) return { status: 'grant_invalid' };
        if (row.revokedAt || row.expiresAt.getTime() <= Date.now())
          return { status: 'grant_expired' };
        if (row.lead.status !== 'incomplete') return { status: 'draft_submitted' };
        const fields = await loadLeadFields(tx, input.workspaceId);
        const customValues = Object.fromEntries(
          Object.entries(recordSchema.parse(row.lead.customValues)).filter(([key]) =>
            fields.some(
              (field) =>
                field.key === key &&
                field.origin === 'custom' &&
                field.active &&
                field.websiteAccepted &&
                fieldApplies(field, leadTypeSchema.parse(row.lead.leadType)),
            ),
          ),
        );

        return {
          status: 'read',
          draft: {
            ...(Object.keys(customValues).length ? { customValues } : {}),
            leadId: row.lead.id,
            productId: row.productId,
            contact: leadContactSchema.parse({
              fullName: row.lead.fullName ?? undefined,
              email: row.lead.email ?? undefined,
              phone: row.lead.phone ?? undefined,
              countryCode: row.lead.countryCode ?? undefined,
            }),
            form: row.lead.payload === null ? null : leadFormSchema.parse(row.lead.payload),
          },
        };
      },
    );
  }

  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        await lockLeadModel(tx, input.workspaceId);
        const { attribution, partnerId } = await prepareAttribution(
          tx,
          input.workspaceId,
          input.attribution,
        );
        const selectedOfferVersionId = input.productId
          ? await resolveOfferVersionId(tx, input.workspaceId, input.productId)
          : undefined;

        const intake = await prepareLeadIntake(tx, {
          workspaceId: input.workspaceId,
          leadType: input.leadType,
          form: input.form,
          customValues: input.customValues,
          selectedOfferVersionId,
        });
        const [leadRow] = await tx
          .insert(leads)
          .values({
            workspaceId: input.workspaceId,
            status: 'incomplete',
            fullName: input.contact?.fullName,
            email: input.contact?.email,
            phone: input.contact?.phone,
            countryCode: input.contact?.countryCode,
            partnerId: partnerId ?? null,
            selectedOfferVersionId: selectedOfferVersionId ?? null,
            payload: intake.form,
            leadType: intake.leadType,
            customValues: intake.customValues,
            attribution,
            consentVersion: input.consentVersion,
          })
          .returning({
            id: leads.id,
            workspaceId: leads.workspaceId,
            status: leads.status,
            updatedAt: leads.updatedAt,
          });
        if (!leadRow) throw new Error('lead insert did not return a row');

        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'website credential',
          action: 'lead.created',
          entity: 'lead',
          entityId: leadRow.id,
          requestId: input.requestId,
          after: {
            changedFields: ['leadType', ...Object.keys(input.contact ?? {}), ...intake.changedKeys],
          },
        });

        const { token, tokenHash } = generateDraftGrantToken();
        const expiresAt = new Date(Date.now() + DEFAULT_DRAFT_GRANT_TTL_SECONDS * 1000);
        await tx.insert(draftGrants).values({
          workspaceId: input.workspaceId,
          leadId: leadRow.id,
          tokenHash,
          expiresAt,
        });

        // The lead conversion event is emitted once from the outbox (never from
        // the browser), deduped per lead by (workspace, job type, dedupe key).
        await tx.insert(outboxJobs).values({
          workspaceId: input.workspaceId,
          jobType: 'analytics_lead_saved',
          dedupeKey: leadRow.id,
          payload: { leadId: leadRow.id },
        });

        return { lead: toSummary(leadRow), grant: { token, expiresAt: expiresAt.toISOString() } };
      },
    );
  }

  async updateLead(input: UpdateLeadInput): Promise<UpdateLeadOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        await lockLeadModel(tx, input.workspaceId);
        const tokenHash = hashDraftGrantToken(input.grantToken);
        // Matching on lead_id AND token_hash together means a real grant that
        // simply belongs to a *different* lead is indistinguishable from a
        // forged token — both resolve to zero rows. Joining the lead lets a
        // submitted draft be rejected before any write. Lock through the save
        // so submission and edits cannot act on an earlier incomplete status.
        const [grant] = await tx
          .select({
            id: draftGrants.id,
            expiresAt: draftGrants.expiresAt,
            revokedAt: draftGrants.revokedAt,
            leadStatus: leads.status,
            leadType: leads.leadType,
            leadPayload: leads.payload,
            customValues: leads.customValues,
            selectedOfferVersionId: leads.selectedOfferVersionId,
          })
          .from(draftGrants)
          .innerJoin(
            leads,
            and(eq(leads.workspaceId, draftGrants.workspaceId), eq(leads.id, draftGrants.leadId)),
          )
          .where(
            and(
              eq(draftGrants.workspaceId, input.workspaceId),
              isNull(leads.customerDataRestrictedAt),
              eq(draftGrants.leadId, input.leadId),
              eq(draftGrants.tokenHash, tokenHash),
            ),
          )
          .limit(1)
          .for('update');

        if (!grant) return { status: 'grant_invalid' };
        if (grant.revokedAt !== null || grant.expiresAt.getTime() <= Date.now()) {
          return { status: 'grant_expired' };
        }
        // A submitted draft's grant survives only for the exact-retry order
        // lookup (orders/store.ts). It must not authorise further edits to the
        // lead's contact, form, attribution or partner link (T12).
        if (grant.leadStatus !== 'incomplete') return { status: 'draft_submitted' };

        const updates: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
        if (input.contact) {
          if (input.contact.fullName !== undefined) updates.fullName = input.contact.fullName;
          if (input.contact.email !== undefined) updates.email = input.contact.email;
          if (input.contact.phone !== undefined) updates.phone = input.contact.phone;
          if (input.contact.countryCode !== undefined) {
            updates.countryCode = input.contact.countryCode;
          }
        }
        if (input.form !== undefined) updates.payload = input.form;
        if (input.consentVersion !== undefined) updates.consentVersion = input.consentVersion;
        const changedFields: string[] = [];
        if (input.contact !== undefined) changedFields.push('contact');
        if (input.form !== undefined) changedFields.push('form');
        if (input.consentVersion !== undefined) changedFields.push('consentVersion');
        if (input.attribution !== undefined) {
          const prepared = await prepareAttribution(tx, input.workspaceId, input.attribution);
          updates.attribution = prepared.attribution;
          updates.partnerId = prepared.partnerId ?? null;
          changedFields.push('attribution', 'partnerId');
        }
        if (input.productId !== undefined) {
          const selectedOfferVersionId = await resolveOfferVersionId(
            tx,
            input.workspaceId,
            input.productId,
          );
          updates.selectedOfferVersionId = selectedOfferVersionId ?? null;
          changedFields.push('selectedOfferVersionId');
        }

        const intake = await prepareLeadIntake(tx, {
          workspaceId: input.workspaceId,
          leadType: input.leadType,
          form: input.form,
          customValues: input.customValues,
          previousForm: grant.leadPayload,
          previousCustom: grant.customValues,
          previousType: leadTypeSchema.parse(grant.leadType),
          selectedOfferVersionId: updates.selectedOfferVersionId ?? grant.selectedOfferVersionId,
        });
        updates.leadType = intake.leadType;
        updates.customValues = intake.customValues;
        if (input.form) updates.payload = intake.form;
        changedFields.push(...intake.changedKeys, ...Object.keys(input.contact ?? {}));
        const [row] = await tx
          .update(leads)
          .set(updates)
          .where(and(eq(leads.workspaceId, input.workspaceId), eq(leads.id, input.leadId)))
          .returning({
            id: leads.id,
            workspaceId: leads.workspaceId,
            status: leads.status,
            updatedAt: leads.updatedAt,
          });
        // The grant resolved but the lead itself is gone — treat identically
        // to an invalid grant rather than throwing.
        if (!row) return { status: 'grant_invalid' };

        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'website credential',
          action: 'lead.updated',
          entity: 'lead',
          entityId: input.leadId,
          requestId: input.requestId,
          after: { changedFields },
        });

        return { status: 'updated', lead: toSummary(row) };
      },
    );
  }

  async listLeads(input: ListLeadsInput): Promise<ListLeadsResult> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        await lockLeadModel(tx, input.workspaceId, true);
        const fields = await loadLeadFields(tx, input.workspaceId);
        const active = (key: string) =>
          fields.some((field) => field.key === key && field.active && !field.sensitive);
        const page = input.page ?? 1;
        const pageSize = input.pageSize ?? 25;
        const offset = (page - 1) * pageSize;

        const conditions = and(
          eq(leads.workspaceId, input.workspaceId),
          isNull(leads.customerDataRestrictedAt),
          input.status ? eq(leads.status, input.status) : undefined,
        );

        const rows = await tx
          .select({
            id: leads.id,
            workspaceId: leads.workspaceId,
            status: leads.status,
            fullName: leads.fullName,
            email: leads.email,
            phone: leads.phone,
            countryCode: leads.countryCode,
            attribution: leads.attribution,
            selectedOfferVersionId: leads.selectedOfferVersionId,
            consentVersion: leads.consentVersion,
            createdAt: leads.createdAt,
            updatedAt: leads.updatedAt,
          })
          .from(leads)
          .where(conditions)
          .orderBy(desc(leads.updatedAt))
          .limit(pageSize)
          .offset(offset);

        const [totalRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(leads)
          .where(conditions);

        const items: LeadListItem[] = rows.map((row) => {
          const attribution = attributionSchema.parse(row.attribution ?? {});
          return {
            id: row.id,
            workspaceId: row.workspaceId,
            status: leadStatusSchema.parse(row.status),
            contact: leadContactSchema.parse({
              fullName: active('fullName') ? (row.fullName ?? undefined) : undefined,
              email: active('email') ? (row.email ?? undefined) : undefined,
              phone: active('phone') ? (row.phone ?? undefined) : undefined,
              countryCode: active('countryCode') ? (row.countryCode ?? undefined) : undefined,
            }),
            source: deriveSource(attribution),
            attribution,
            selectedOfferVersionId: row.selectedOfferVersionId,
            consentVersion: row.consentVersion,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          };
        });

        return { leads: items, page: { page, pageSize, total: totalRow?.count ?? 0 } };
      },
    );
  }
}
