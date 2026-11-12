import { randomInt, randomUUID } from 'node:crypto';
import {
  CHANGE_REQUEST_DOCUMENTS,
  CHANGE_REQUEST_STAGES,
  TRACKING_CODE_TTL_MS,
  TRACKING_GRANT_TTL_MS,
  TRACKING_MAX_ATTEMPTS,
  createTrackedChangeRequestSchema,
  createUploadIntentResponseSchema,
  finalizeUploadRequestSchema,
  simOrderLeadPayloadSchema,
  trackedChangeResponseSchema,
  trackingCodeRequestSchema,
  trackingCodeResponseSchema,
  trackingOrdersResponseSchema,
  trackingReferenceSchema,
  trackingStageWord,
  trackingUploadIntentRequestSchema,
  trackingVerifyRequestSchema,
  trackingVerifyResponseSchema,
  type TrackingOrder,
} from '@canadian-plans/crm-contracts';

import { StubError, header, parseBody, reply, type Reply, type StubRequest } from './http';
import { normalizeEmail, state, type StoredChangeRequest, type StoredLead } from './state';
import { openUpload, uploadIdOf, verifyUpload } from './uploads';

/**
 * Customer order tracking: an emailed six-digit code, a 30-minute grant
 * (`X-Customer-Grant`), the verified email's orders, a change request and a
 * passport or visa for it. Status codes follow the CRM's `routes/tracking.ts`.
 */

const ORDER_TYPES: readonly string[] = ['sim_order', 'internet', 'mobility'];

function ordersOf(email: string): StoredLead[] {
  return [...state.leads.values()]
    .filter(
      (lead) =>
        lead.status === 'submitted' &&
        ORDER_TYPES.includes(lead.leadType) &&
        lead.contact.email !== undefined &&
        normalizeEmail(lead.contact.email) === email,
    )
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
}

export const referenceOf = (lead: StoredLead): string => lead.externalRef ?? lead.id;

const isChangeable = (lead: StoredLead): boolean =>
  lead.leadType === 'sim_order' && CHANGE_REQUEST_STAGES.some((stage) => stage === lead.stage);

function trackedOrder(lead: StoredLead): TrackingOrder {
  const leadType = ORDER_TYPES.find((type) => type === lead.leadType);
  if (leadType !== 'sim_order' && leadType !== 'internet' && leadType !== 'mobility') {
    throw new Error('not an order lead type');
  }
  const sim =
    leadType === 'sim_order' ? simOrderLeadPayloadSchema.safeParse(lead.form?.payload) : undefined;
  const form = sim?.success ? sim.data : undefined;
  const plan = lead.frozenPlan;
  return {
    reference: referenceOf(lead),
    leadType,
    stage: lead.stage,
    stageLabel: trackingStageWord(leadType, lead.stage),
    submittedAt: lead.submittedAt ?? lead.updatedAt,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          priceMinor: plan.priceMinor,
          billingPeriod: plan.billingPeriod,
        }
      : null,
    quantity: lead.order?.quantity ?? 1,
    delivery: form?.delivery ?? null,
    courier: null,
    trackingNumber: null,
    dispatchedAt: null,
    simNumber: null,
    details: {
      fullName: lead.contact.fullName ?? null,
      phone: lead.contact.phone ?? null,
      arrivalDate: form?.arrivalDate ?? null,
      permitType: form?.permitType ?? null,
      canadaAddress: form?.canadaAddress ?? null,
      shippingAddress: form?.shippingAddress ?? null,
      flightBooked: form?.flightBooked ?? null,
    },
    documents: (plan?.requiredDocuments ?? []).map((documentType) => ({
      documentType,
      state: lead.files.some((file) => file.documentType === documentType) ? 'received' : 'missing',
    })),
    canRequestChange: isChangeable(lead),
    pendingChange: lead.pendingChange,
  };
}

export function requestTrackingCode(request: StubRequest): Reply {
  const body = parseBody(request, trackingCodeRequestSchema);
  const email = normalizeEmail(body.email);
  // The same answer either way; only an email with orders is "sent" a code.
  if (ordersOf(email).length > 0) {
    state.trackingCodes.set(email, {
      code: String(randomInt(0, 1_000_000)).padStart(6, '0'),
      expiresAt: Date.now() + TRACKING_CODE_TTL_MS,
      attempts: 0,
    });
  }
  return reply(200, trackingCodeResponseSchema, {
    status: 'code_sent',
    requestId: request.requestId,
  });
}

export function verifyTrackingCode(request: StubRequest): Reply {
  const body = parseBody(request, trackingVerifyRequestSchema);
  const email = normalizeEmail(body.email);
  const sent = state.trackingCodes.get(email);
  const invalid = new StubError(400, 'tracking_challenge_invalid');
  if (!sent || sent.expiresAt <= Date.now()) throw invalid;
  if (sent.code !== body.code) {
    sent.attempts += 1;
    if (sent.attempts >= TRACKING_MAX_ATTEMPTS) state.trackingCodes.delete(email);
    throw invalid;
  }
  state.trackingCodes.delete(email);
  const expiresAt = Date.now() + TRACKING_GRANT_TTL_MS;
  const token = `cg_e2e_${randomUUID()}`;
  state.trackingGrants.set(token, { email, expiresAt });
  return reply(200, trackingVerifyResponseSchema, {
    grant: { token, expiresAt: new Date(expiresAt).toISOString() },
    requestId: request.requestId,
  });
}

/** The grant's email. Missing, forged and expired grants look the same: 401 `not_found`. */
function verifiedEmail(request: StubRequest): string {
  const grant = state.trackingGrants.get(header(request, 'x-customer-grant') ?? '');
  if (!grant || grant.expiresAt <= Date.now()) throw new StubError(401, 'not_found');
  return grant.email;
}

/** The order a reference names among the verified email's own, never another's. */
function trackedLead(email: string, rawReference: string): StoredLead {
  const reference = trackingReferenceSchema.safeParse(rawReference);
  if (!reference.success) throw new StubError(400, 'validation_error', { field: 'reference' });
  const lead = ordersOf(email).find((candidate) => referenceOf(candidate) === reference.data);
  if (!lead) throw new StubError(404, 'order_not_found');
  return lead;
}

export function listTrackedOrders(request: StubRequest): Reply {
  const email = verifiedEmail(request);
  return reply(200, trackingOrdersResponseSchema, {
    orders: ordersOf(email).map(trackedOrder),
    requestId: request.requestId,
  });
}

function pendingChangeOf(lead: StoredLead): StoredChangeRequest {
  const now = new Date().toISOString();
  lead.pendingChange ??= {
    requestNo: state.nextChangeRequestNumber++,
    fields: {},
    documents: [],
    createdAt: now,
    updatedAt: now,
  };
  lead.pendingChange.updatedAt = now;
  return lead.pendingChange;
}

export function requestTrackedChange(request: StubRequest, rawReference: string): Reply {
  const email = verifiedEmail(request);
  const body = parseBody(request, createTrackedChangeRequestSchema);
  const lead = trackedLead(email, rawReference);
  if (!isChangeable(lead)) throw new StubError(409, 'change_request_not_allowed');
  // A new request replaces the fields of the one already pending.
  const change = pendingChangeOf(lead);
  change.fields = body.fields;
  return reply(201, trackedChangeResponseSchema, {
    changeRequest: change,
    requestId: request.requestId,
  });
}

export function createTrackedUpload(request: StubRequest, rawReference: string): Reply {
  const email = verifiedEmail(request);
  const body = parseBody(request, trackingUploadIntentRequestSchema);
  const lead = trackedLead(email, rawReference);
  if (!isChangeable(lead)) throw new StubError(409, 'change_request_not_allowed');
  if (!lead.frozenPlan?.requiredDocuments.includes(body.documentType)) {
    throw new StubError(409, 'checklist_mismatch');
  }
  const intent = openUpload({
    leadId: lead.id,
    documentType: body.documentType,
    contentType: body.contentType,
    sizeBytes: body.sizeBytes,
  });
  return reply(201, createUploadIntentResponseSchema, { ...intent, requestId: request.requestId });
}

export function finalizeTrackedUpload(
  request: StubRequest,
  rawReference: string,
  rawUploadId: string,
): Reply {
  const email = verifiedEmail(request);
  const uploadId = uploadIdOf(rawUploadId);
  const body = parseBody(request, finalizeUploadRequestSchema);
  const lead = trackedLead(email, rawReference);
  const file = verifyUpload(uploadId, lead.id, body.checksumSha256);
  const documentType = CHANGE_REQUEST_DOCUMENTS.find((type) => type === file.documentType);
  if (!documentType) throw new StubError(409, 'checklist_mismatch');
  // The document is held with the change request until staff decide on it.
  const change = pendingChangeOf(lead);
  if (!change.documents.includes(documentType)) change.documents.push(documentType);
  return reply(200, trackedChangeResponseSchema, {
    changeRequest: change,
    requestId: request.requestId,
  });
}
