import { randomUUID } from 'node:crypto';
import {
  attributionSchema,
  createLeadRequestSchema,
  createLeadResponseSchema,
  idempotencyKeySchema,
  internetLeadPayloadSchema,
  mobilityLeadPayloadSchema,
  readLeadResponseSchema,
  simOrderLeadPayloadSchema,
  simOrderRef,
  submittedLeadStage,
  updateLeadRequestSchema,
  updateLeadResponseSchema,
  type Attribution,
  type LeadContact,
  type LeadForm,
  type LeadSummary,
  type WebsitePlan,
} from '@canadian-plans/crm-contracts';
import { z } from 'zod';

import {
  StubError,
  fingerprint,
  header,
  parseBody,
  reply,
  type Reply,
  type StubRequest,
} from './http';
import { state, type FrozenPlan, type StoredLead } from './state';

/**
 * `POST /website/leads`, `GET` and `PATCH /website/leads/:id`, with the
 * lead-type rules of the CRM's registry (`apps/backend/src/leads/types.ts`
 * there) that the storefront depends on.
 */

const WORKSPACE_ID = '10000000-0000-4000-8000-000000000e01';
const DRAFT_GRANT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type ContactField = 'fullName' | 'email' | 'phone';

interface LeadTypeRule {
  payload?: z.ZodType;
  /** Sent whole: must be created with `submit: true`. */
  oneShot: boolean;
  requiredContact: readonly ContactField[];
  /** Takes a plan (`order`). */
  order: boolean;
}

const LEAD_TYPES: Readonly<Record<string, LeadTypeRule>> = {
  internet: {
    payload: internetLeadPayloadSchema,
    oneShot: true,
    requiredContact: ['fullName', 'email', 'phone'],
    order: true,
  },
  mobility: {
    payload: mobilityLeadPayloadSchema,
    oneShot: true,
    requiredContact: ['fullName', 'email', 'phone'],
    order: true,
  },
  sim_order: {
    payload: simOrderLeadPayloadSchema,
    oneShot: false,
    requiredContact: [],
    order: true,
  },
  contact_message: { oneShot: false, requiredContact: [], order: false },
  partner_application: { oneShot: false, requiredContact: [], order: false },
};

const refused = (field: string) => new StubError(400, 'validation_error', { field });
const filled = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';

function ruleFor(leadType: string): LeadTypeRule {
  const rule = LEAD_TYPES[leadType];
  if (!rule) throw refused('leadType');
  return rule;
}

function checkForm(rule: LeadTypeRule, form: LeadForm | undefined): void {
  if (!rule.payload || form === undefined) return;
  if (form.schemaVersion !== 1 || !rule.payload.safeParse(form.payload).success) {
    throw refused('form');
  }
}

/** What a submission must carry, as the lead would stand after this save. */
function checkSubmit(
  leadType: string,
  rule: LeadTypeRule,
  lead: { contact: LeadContact; form: LeadForm | null; planId: string | null },
): void {
  if (rule.requiredContact.some((field) => !lead.contact[field])) throw refused('contact');
  if (leadType !== 'sim_order') return;
  if (!filled(lead.contact.fullName) || !filled(lead.contact.email)) throw refused('contact');
  if (lead.planId === null) throw refused('order');
  const delivery = lead.form?.payload['delivery'];
  if (delivery !== 'esim' && delivery !== 'pickup') throw refused('form');
  if (delivery === 'pickup' && !filled(lead.form?.payload['shippingAddress']))
    throw refused('form');
}

/** The plan the site sells under this id for this lead type, or `plan_not_available`. */
function planFor(leadType: string, planId: string): WebsitePlan {
  const plan = state.plans.find(
    (candidate) => candidate.id === planId && candidate.leadType === leadType,
  );
  if (!plan) throw new StubError(400, 'plan_not_available', { field: 'order' });
  return plan;
}

function freeze(plan: WebsitePlan): FrozenPlan {
  return {
    id: plan.id,
    name: plan.name,
    priceMinor: plan.priceMinor,
    billingPeriod: plan.billingPeriod,
    requiredDocuments: [...plan.requiredDocuments],
  };
}

/** Only the allowlisted attribution keys are kept, as the CRM's sanitizer does. */
function sanitizeAttribution(raw: Record<string, unknown> | undefined): Attribution {
  const kept = Object.fromEntries(
    Object.keys(attributionSchema.shape)
      .map((key) => [key, raw?.[key]])
      .filter(([, value]) => typeof value === 'string' || typeof value === 'boolean'),
  );
  const parsed = attributionSchema.safeParse(kept);
  return parsed.success ? parsed.data : {};
}

/** The optional `Idempotency-Key`: absent is fine, malformed is a 400. */
function idempotencyKey(request: StubRequest): string | undefined {
  const raw = header(request, 'idempotency-key');
  if (raw === undefined) return undefined;
  const key = idempotencyKeySchema.safeParse(raw);
  if (!key.success) throw refused('Idempotency-Key');
  return key.data;
}

/** The lead a key already made (same body), a conflict (another body), or nothing yet. */
function replayOf(key: string | undefined, print: string): StoredLead | undefined {
  if (key === undefined) return undefined;
  const record = state.idempotency.get(key);
  if (!record) return undefined;
  if (record.fingerprint !== print) throw new StubError(409, 'idempotency_conflict');
  return state.leads.get(record.leadId);
}

function summary(lead: StoredLead): LeadSummary {
  return {
    id: lead.id,
    workspaceId: WORKSPACE_ID,
    status: lead.status,
    externalRef: lead.externalRef,
    updatedAt: lead.updatedAt,
  };
}

function submit(lead: StoredLead, now: string): void {
  lead.status = 'submitted';
  lead.stage = submittedLeadStage(lead.leadType);
  lead.submittedAt = now;
  const planId = lead.order?.planId;
  const plan = state.plans.find((candidate) => candidate.id === planId);
  lead.frozenPlan = plan ? freeze(plan) : null;
}

export function createLead(request: StubRequest): Reply {
  const body = parseBody(request, createLeadRequestSchema);
  const key = idempotencyKey(request);
  const print = fingerprint(body);
  const rule = ruleFor(body.leadType);
  if (rule.oneShot && body.submit !== true) throw refused('submit');
  if (rule.payload && body.form === undefined && body.leadType !== 'sim_order')
    throw refused('form');
  checkForm(rule, body.form);
  if (rule.requiredContact.some((field) => !body.contact?.[field])) throw refused('contact');
  if (body.order && !rule.order) throw refused('order');
  if (body.submit === true) {
    checkSubmit(body.leadType, rule, {
      contact: body.contact ?? {},
      form: body.form ?? null,
      planId: body.order?.planId ?? null,
    });
  }

  const replayed = replayOf(key, print);
  if (replayed) {
    return reply(201, createLeadResponseSchema, {
      lead: summary(replayed),
      draftGrant: replayed.grant,
      replayed: true,
      requestId: request.requestId,
    });
  }
  if (body.order) planFor(body.leadType, body.order.planId);
  if (body.leadId !== undefined && state.leads.has(body.leadId)) {
    throw new StubError(409, 'lead_id_taken');
  }

  const now = new Date().toISOString();
  const lead: StoredLead = {
    id: body.leadId ?? randomUUID(),
    leadType: body.leadType,
    status: 'incomplete',
    stage: body.leadType === 'sim_order' ? 'incomplete' : 'new',
    externalRef:
      body.externalRef ??
      (body.leadType === 'sim_order' ? simOrderRef(state.nextSimOrderNumber++) : null),
    contact: body.contact ?? {},
    form: body.form ?? null,
    order: body.order ? { planId: body.order.planId, quantity: body.order.quantity } : null,
    frozenPlan: null,
    attribution: sanitizeAttribution(body.attribution),
    consentVersions: [body.consentVersion],
    grant:
      body.submit === true
        ? null
        : {
            token: `dg_e2e_${randomUUID()}`,
            expiresAt: new Date(Date.now() + DRAFT_GRANT_TTL_MS).toISOString(),
          },
    files: [],
    pendingChange: null,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
  };
  if (body.submit === true) submit(lead, now);
  state.leads.set(lead.id, lead);
  if (key !== undefined) state.idempotency.set(key, { fingerprint: print, leadId: lead.id });
  return reply(201, createLeadResponseSchema, {
    lead: summary(lead),
    draftGrant: lead.grant,
    requestId: request.requestId,
  });
}

/**
 * The draft a grant edits. Missing, unknown and another lead's grants look the
 * same (`draft_not_found`); a submitted lead's grant edits nothing more.
 */
export function draftForGrant(request: StubRequest, leadId?: string): StoredLead {
  const token = header(request, 'x-draft-grant');
  if (token === undefined) throw new StubError(401, 'draft_not_found');
  const lead = [...state.leads.values()].find((candidate) => candidate.grant?.token === token);
  if (!lead?.grant || (leadId !== undefined && lead.id !== leadId)) {
    throw new StubError(401, 'draft_not_found');
  }
  if (Date.parse(lead.grant.expiresAt) <= Date.now()) throw new StubError(401, 'draft_expired');
  if (lead.status === 'submitted') throw new StubError(409, 'draft_already_submitted');
  return lead;
}

function leadIdOf(raw: string): string {
  const id = z.uuid().safeParse(raw);
  if (!id.success) throw new StubError(400, 'validation_error');
  return id.data;
}

export function readLead(request: StubRequest, rawLeadId: string): Reply {
  const lead = draftForGrant(request, leadIdOf(rawLeadId));
  return reply(200, readLeadResponseSchema, {
    draft: {
      leadId: lead.id,
      leadType: lead.leadType,
      contact: lead.contact,
      form: lead.form,
      ...(lead.order ? { order: lead.order } : {}),
    },
    requestId: request.requestId,
  });
}

export function updateLead(request: StubRequest, rawLeadId: string): Reply {
  const leadId = leadIdOf(rawLeadId);
  const body = parseBody(request, updateLeadRequestSchema);
  // Only a submission is made once; a plain save is already repeatable.
  const key = body.submit === true ? idempotencyKey(request) : undefined;
  const print = fingerprint({ leadId, body });
  const replayed = replayOf(key, print);
  if (replayed) {
    return reply(200, updateLeadResponseSchema, {
      lead: summary(replayed),
      replayed: true,
      requestId: request.requestId,
    });
  }

  const lead = draftForGrant(request, leadId);
  const rule = ruleFor(lead.leadType);
  checkForm(rule, body.form);
  if (body.order && !rule.order) throw refused('order');
  const order = body.order
    ? { planId: body.order.planId, quantity: body.order.quantity }
    : lead.order;
  if (body.order) planFor(lead.leadType, body.order.planId);
  const contact = { ...lead.contact, ...body.contact };
  const form = body.form ?? lead.form;
  if (body.submit === true) {
    if (order) planFor(lead.leadType, order.planId);
    checkSubmit(lead.leadType, rule, { contact, form, planId: order?.planId ?? null });
  }

  const now = new Date().toISOString();
  lead.contact = contact;
  lead.form = form;
  lead.order = order;
  lead.updatedAt = now;
  if (body.attribution) lead.attribution = sanitizeAttribution(body.attribution);
  if (body.consentVersion !== undefined) lead.consentVersions.push(body.consentVersion);
  if (body.submit === true) {
    submit(lead, now);
    if (key !== undefined) state.idempotency.set(key, { fingerprint: print, leadId: lead.id });
  }
  return reply(200, updateLeadResponseSchema, {
    lead: summary(lead),
    requestId: request.requestId,
  });
}
