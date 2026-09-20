import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  apiErrorResponseSchema,
  apiErrorSchema,
  bulkAssignOrdersRequestSchema,
  bulkAssignOrdersResponseSchema,
  changeCommissionStateRequestSchema,
  changeCommissionStateResponseSchema,
  createDownloadLinkResponseSchema,
  createExportRequestSchema,
  createExportResponseSchema,
  createLeadRequestSchema,
  createLeadResponseSchema,
  createOrderChangeRequestRequestSchema,
  createOrderChangeRequestResponseSchema,
  createOrderNoteRequestSchema,
  createOrderReminderRequestSchema,
  createOrderReminderResponseSchema,
  createQuoteRequestSchema,
  createQuoteResponseSchema,
  createUploadIntentRequestSchema,
  createUploadIntentResponseSchema,
  deleteOrderReminderResponseSchema,
  finalizeUploadRequestSchema,
  finalizeUploadResponseSchema,
  getWorkspaceOrderResponseSchema,
  listAssignableMembersResponseSchema,
  listOrderNotesResponseSchema,
  listWorkspaceLeadsResponseSchema,
  listWorkspaceOrdersResponseSchema,
  partnerInvoiceRequestSchema,
  partnerInvoiceResponseSchema,
  patchOrderArchiveRequestSchema,
  patchOrderAssigneeRequestSchema,
  patchWorkspaceOrderRequestSchema,
  patchWorkspaceOrderResponseSchema,
  recordOrderPaymentRequestSchema,
  recordOrderPaymentResponseSchema,
  resolveOrderChangeRequestRequestSchema,
  submitOrderRequestSchema,
  submitOrderResponseSchema,
  trackingOtpRequestSchema,
  trackingOtpResponseSchema,
  trackingStatusResponseSchema,
  trackingVerifyRequestSchema,
  trackingVerifyResponseSchema,
  updateLeadRequestSchema,
  updateLeadResponseSchema,
  versionedFormSchema,
  webhookAckResponseSchema,
  webhookDeliveryRequestSchema,
} from './index';

const UUID_A = '00000000-0000-4000-8000-000000000001';
const UUID_B = '00000000-0000-4000-8000-000000000002';
const UUID_C = '00000000-0000-4000-8000-000000000003';
const NOW = '2026-09-14T00:00:00.000Z';
const CAD = (amountMinor: number) => ({ amountMinor, currency: 'CAD' });

const form = { schemaVersion: 1, payload: { plan: 'rogers-basic' } };
const offer = {
  productKey: 'rogers-basic',
  productTitle: 'Rogers Basic',
  productType: 'sim',
  offerName: 'Basic 10 GB',
  currency: 'CAD',
  recurringChargeAmountMinor: 4500,
  oneTimeFees: [],
  amountPayableTodayMinor: 0,
  paymentRequired: false,
  documentChecklist: ['passport'],
  eligibility: 'New arrivals',
  availability: 'Canada',
  billingParty: 'Rogers',
  contractTerms: [{ _type: 'block', children: [] }],
  termsVersion: 'terms-2026-09',
  specs: { carrier: 'Rogers', dataAllowance: '10 GB' },
};
const snapshot = {
  quoteId: UUID_C,
  productId: UUID_A,
  offerVersionId: UUID_B,
  offer,
  currency: 'CAD',
  charges: [{ code: 'base', label: 'Monthly plan', amount: CAD(4500) }],
  total: CAD(4500),
  amountPayableToday: CAD(0),
  paymentRequired: false,
  documentChecklist: ['passport'],
  termsVersion: 'terms-2026-09',
};
const orderSummary = {
  id: UUID_A,
  workspaceId: UUID_B,
  reference: 'CP-000123',
  fulfilmentStatus: 'submitted',
  paymentState: 'not_required',
  deliveryState: 'none',
  archiveState: 'active',
  total: CAD(4500),
  amountPayableToday: CAD(0),
  recordVersion: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

const orderCustomer = {
  fullName: 'Jane Doe',
  email: 'jane@example.test',
  phone: '+14165550123',
  countryCode: 'CA',
};
const orderCapabilities = {
  canManageOrders: true,
  canRecordPayment: true,
  canSearchContact: true,
};
const orderDetail = {
  ...orderSummary,
  assigneeId: null,
  partnerCode: null,
  customer: orderCustomer,
  source: 'direct',
  submittedAt: NOW,
  snapshot,
  payload: form,
  consent: { termsVersion: 'terms-2026-09', marketingOptIn: true },
  history: [
    {
      at: NOW,
      actorId: UUID_C,
      action: 'created',
      fromStatus: null,
      toStatus: 'submitted',
      recordVersion: 1,
    },
  ],
  audit: [
    {
      id: UUID_A,
      at: NOW,
      actorId: UUID_C,
      action: 'order.status_changed',
      before: { status: 'submitted', version: 1 },
      after: { status: 'in_progress', version: 2 },
    },
  ],
  notes: [{ id: UUID_A, authorId: UUID_C, body: 'called customer', createdAt: NOW }],
  reminders: [],
  changeRequests: [],
  amendments: [],
  payments: [],
  dispatch: null,
  allowedTransitions: ['in_progress', 'cancelled'],
  capabilities: orderCapabilities,
};

/** [name, schema, a valid value]. Each must parse and round-trip through JSON unchanged. */
const cases: ReadonlyArray<readonly [string, z.ZodType, unknown]> = [
  ['apiError', apiErrorSchema, { code: 'validation_error', message: 'bad', requestId: UUID_C }],
  [
    'apiError+details',
    apiErrorSchema,
    { code: 'version_conflict', message: 'stale', requestId: UUID_C, details: { expected: 3 } },
  ],
  [
    'apiErrorResponse',
    apiErrorResponseSchema,
    { error: { code: 'not_found', message: 'x', requestId: UUID_C } },
  ],
  [
    'versionedForm',
    versionedFormSchema(webhookDeliveryRequestSchema),
    { schemaVersion: 1, payload: { documentId: 'sanity-offer-1' } },
  ],
  [
    'createLeadRequest',
    createLeadRequestSchema,
    { contact: { email: 'a@b.co' }, form, consentVersion: 'terms-2026-09' },
  ],
  [
    'createLeadResponse',
    createLeadResponseSchema,
    {
      lead: { id: UUID_A, workspaceId: UUID_B, status: 'incomplete', updatedAt: NOW },
      draftGrant: { token: 'grant', expiresAt: NOW },
      requestId: UUID_C,
    },
  ],
  ['updateLeadRequest', updateLeadRequestSchema, { contact: { fullName: 'A B' } }],
  [
    'updateLeadResponse',
    updateLeadResponseSchema,
    {
      lead: { id: UUID_A, workspaceId: UUID_B, status: 'incomplete', updatedAt: NOW },
      requestId: UUID_C,
    },
  ],
  [
    'listWorkspaceLeadsResponse',
    listWorkspaceLeadsResponseSchema,
    {
      leads: [
        {
          id: UUID_A,
          workspaceId: UUID_B,
          status: 'incomplete',
          contact: { email: 'a@b.co' },
          source: 'utm:google/cpc',
          attribution: { utmSource: 'google', utmMedium: 'cpc' },
          selectedOfferVersionId: null,
          consentVersion: 'terms-2026-09',
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      page: { page: 1, pageSize: 25, total: 1 },
      requestId: UUID_C,
    },
  ],
  ['createQuoteRequest', createQuoteRequestSchema, { leadId: UUID_B, productId: UUID_A, form }],
  [
    'createQuoteResponse',
    createQuoteResponseSchema,
    {
      quote: {
        id: UUID_A,
        workspaceId: UUID_B,
        productId: UUID_C,
        offerVersionId: UUID_A,
        currency: 'CAD',
        charges: [{ code: 'base', label: 'Plan', amount: CAD(4500) }],
        total: CAD(4500),
        amountPayableToday: CAD(0),
        paymentRequired: false,
        documentChecklist: ['passport', 'study_permit'],
        termsVersion: 'terms-2026-09',
        createdAt: NOW,
        expiresAt: NOW,
      },
      requestId: UUID_C,
    },
  ],
  [
    'submitOrderRequest',
    submitOrderRequestSchema,
    {
      quoteId: UUID_A,
      termsVersion: 'terms-2026-09',
      form,
      consent: { termsVersion: 'terms-2026-09', marketingOptIn: true },
    },
  ],
  ['submitOrderResponse', submitOrderResponseSchema, { order: orderSummary, requestId: UUID_C }],
  [
    'listWorkspaceOrdersResponse',
    listWorkspaceOrdersResponseSchema,
    {
      orders: [
        {
          ...orderSummary,
          assigneeId: null,
          partnerCode: null,
          customer: orderCustomer,
          source: 'direct',
          submittedAt: NOW,
        },
      ],
      page: { page: 1, pageSize: 25, total: 1 },
      capabilities: orderCapabilities,
      requestId: UUID_C,
    },
  ],
  [
    'getWorkspaceOrderResponse',
    getWorkspaceOrderResponseSchema,
    { order: orderDetail, requestId: UUID_C },
  ],
  [
    'listAssignableMembersResponse',
    listAssignableMembersResponseSchema,
    {
      members: [{ membershipId: UUID_A, roles: ['orders'], isSelf: true }],
      requestId: UUID_C,
    },
  ],
  [
    'patchOrder:dispatch',
    patchWorkspaceOrderRequestSchema,
    { action: 'dispatch', courier: 'Canada Post', trackingReference: 'TRACK1', expectedVersion: 2 },
  ],
  [
    'patchOrder:activate',
    patchWorkspaceOrderRequestSchema,
    { action: 'activate', expectedVersion: 3 },
  ],
  [
    'patchOrder:cancel',
    patchWorkspaceOrderRequestSchema,
    { action: 'cancel', reason: 'customer withdrew', expectedVersion: 3 },
  ],
  [
    'patchOrderAssignee',
    patchOrderAssigneeRequestSchema,
    { assigneeId: UUID_C, expectedVersion: 1 },
  ],
  ['patchOrderArchive', patchOrderArchiveRequestSchema, { archived: true, expectedVersion: 1 }],
  [
    'bulkAssignOrdersRequest',
    bulkAssignOrdersRequestSchema,
    { assigneeId: UUID_C, orders: [{ orderId: UUID_A, expectedVersion: 1 }] },
  ],
  [
    'bulkAssignOrdersResponse',
    bulkAssignOrdersResponseSchema,
    { results: [{ orderId: UUID_A, status: 'assigned', version: 2 }], requestId: UUID_C },
  ],
  ['createOrderNoteRequest', createOrderNoteRequestSchema, { body: 'called customer' }],
  [
    'listOrderNotesResponse',
    listOrderNotesResponseSchema,
    {
      notes: [{ id: UUID_A, authorId: UUID_C, body: 'called customer', createdAt: NOW }],
      requestId: UUID_C,
    },
  ],
  [
    'createOrderReminderRequest',
    createOrderReminderRequestSchema,
    { remindAt: NOW, note: 'follow up' },
  ],
  [
    'createOrderReminderResponse',
    createOrderReminderResponseSchema,
    {
      reminder: {
        id: UUID_A,
        createdBy: UUID_C,
        remindAt: NOW,
        note: 'follow up',
        createdAt: NOW,
      },
      requestId: UUID_C,
    },
  ],
  [
    'deleteOrderReminderResponse',
    deleteOrderReminderResponseSchema,
    { reminderId: UUID_A, requestId: UUID_C },
  ],
  [
    'createOrderChangeRequestRequest',
    createOrderChangeRequestRequestSchema,
    { patch: { contact: { fullName: 'New Name' } }, note: 'customer emailed' },
  ],
  [
    'createOrderChangeRequestResponse',
    createOrderChangeRequestResponseSchema,
    {
      changeRequest: {
        id: UUID_A,
        requestedBy: UUID_C,
        status: 'pending',
        patch: { form: { destination: 'Toronto' } },
        note: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: NOW,
      },
      requestId: UUID_C,
    },
  ],
  [
    'resolveOrderChangeRequestRequest',
    resolveOrderChangeRequestRequestSchema,
    { reason: 'verified with customer', expectedVersion: 1 },
  ],
  [
    'recordOrderPaymentRequest',
    recordOrderPaymentRequestSchema,
    {
      paymentState: 'paid',
      method: 'interac',
      reference: 'PAY-1',
      amountMinor: 4500,
      expectedVersion: 2,
    },
  ],
  [
    'patchWorkspaceOrderResponse',
    patchWorkspaceOrderResponseSchema,
    {
      order: orderDetail,
      requestId: UUID_C,
    },
  ],
  [
    'recordOrderPaymentResponse',
    recordOrderPaymentResponseSchema,
    {
      order: orderDetail,
      requestId: UUID_C,
    },
  ],
  [
    'createUploadIntentRequest',
    createUploadIntentRequestSchema,
    {
      parentType: 'order',
      parentId: UUID_A,
      documentType: 'passport',
      fileName: 'passport.pdf',
      contentType: 'application/pdf',
      sizeBytes: 12345,
    },
  ],
  [
    'createUploadIntentResponse',
    createUploadIntentResponseSchema,
    {
      uploadId: UUID_A,
      url: 'https://r2.example.com/put',
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      expiresAt: NOW,
      requestId: UUID_C,
    },
  ],
  ['finalizeUploadRequest', finalizeUploadRequestSchema, { checksumSha256: 'a'.repeat(64) }],
  [
    'finalizeUploadResponse',
    finalizeUploadResponseSchema,
    {
      file: {
        id: UUID_A,
        workspaceId: UUID_B,
        parentType: 'order',
        parentId: UUID_C,
        documentType: 'passport',
        contentType: 'image/png',
        sizeBytes: 999,
        status: 'available',
        checksumSha256: 'b'.repeat(64),
        createdAt: NOW,
      },
      requestId: UUID_C,
    },
  ],
  [
    'createDownloadLinkResponse',
    createDownloadLinkResponseSchema,
    { url: 'https://r2.example.com/get?sig=1', expiresAt: NOW, requestId: UUID_C },
  ],
  [
    'changeCommissionStateRequest',
    changeCommissionStateRequestSchema,
    { commissionId: UUID_A, toState: 'carrier_paid' },
  ],
  [
    'changeCommissionStateResponse',
    changeCommissionStateResponseSchema,
    {
      commission: {
        id: UUID_A,
        workspaceId: UUID_B,
        orderId: UUID_C,
        partnerId: UUID_A,
        ruleId: UUID_B,
        amount: CAD(500),
        state: 'earned',
        earnedAt: NOW,
        updatedAt: NOW,
      },
      requestId: UUID_C,
    },
  ],
  [
    'partnerInvoiceRequest:generate',
    partnerInvoiceRequestSchema,
    { action: 'generate', periodStart: '2026-09-01', periodEnd: '2026-09-30' },
  ],
  [
    'partnerInvoiceRequest:approve',
    partnerInvoiceRequestSchema,
    { action: 'approve', invoiceId: UUID_A },
  ],
  [
    'partnerInvoiceResponse',
    partnerInvoiceResponseSchema,
    {
      invoice: {
        id: UUID_A,
        workspaceId: UUID_B,
        partnerId: UUID_C,
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        status: 'draft',
        total: CAD(500),
        lines: [{ id: UUID_A, commissionId: UUID_B, orderId: UUID_C, amount: CAD(500) }],
        createdAt: NOW,
        approvedAt: null,
      },
      requestId: UUID_C,
    },
  ],
  ['createExportRequest', createExportRequestSchema, { kind: 'orders' }],
  [
    'createExportResponse',
    createExportResponseSchema,
    {
      job: { id: UUID_A, workspaceId: UUID_B, kind: 'orders', status: 'queued', createdAt: NOW },
      requestId: UUID_C,
    },
  ],
  [
    'trackingOtpRequest',
    trackingOtpRequestSchema,
    { email: 'a@b.co', orderReference: 'CP-000123' },
  ],
  [
    'trackingVerifyRequest',
    trackingVerifyRequestSchema,
    { email: 'a@b.co', orderReference: 'CP-000123', code: '123456' },
  ],
  [
    'trackingOtpResponse',
    trackingOtpResponseSchema,
    { status: 'challenge_sent', requestId: UUID_C },
  ],
  [
    'trackingVerifyResponse',
    trackingVerifyResponseSchema,
    { status: 'verified', grant: { token: 't', expiresAt: NOW }, requestId: UUID_C },
  ],
  [
    'trackingStatusResponse',
    trackingStatusResponseSchema,
    {
      reference: 'CP-000123',
      fulfilmentStatus: 'in_progress',
      paymentState: 'paid',
      deliveryState: 'dispatched',
      trackingReference: 'TRACK-1',
      documentsRequired: ['passport'],
      updatedAt: NOW,
      requestId: UUID_C,
    },
  ],
  [
    'webhookAckResponse',
    webhookAckResponseSchema,
    { received: true, eventId: UUID_A, requestId: UUID_C },
  ],
];

describe('contract schemas round-trip', () => {
  for (const [name, schema, value] of cases) {
    it(`${name} parses and round-trips`, () => {
      const parsed = schema.parse(value);
      expect(parsed).toEqual(value);
      // A parsed value re-serialised and re-parsed is stable.
      expect(schema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(value);
    });
  }
});

describe('contract schemas reject invalid input', () => {
  it('rejects a non-integer money amount', () => {
    expect(
      createQuoteResponseSchema.safeParse({
        quote: { total: { amountMinor: 1.5, currency: 'CAD' } },
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown order transition action', () => {
    expect(
      patchWorkspaceOrderRequestSchema.safeParse({ action: 'teleport', expectedVersion: 0 })
        .success,
    ).toBe(false);
  });

  it('rejects a disallowed upload media type', () => {
    expect(
      createUploadIntentRequestSchema.safeParse({
        parentType: 'order',
        parentId: UUID_A,
        documentType: 'passport',
        fileName: 'evil.exe',
        contentType: 'application/x-msdownload',
        sizeBytes: 10,
      }).success,
    ).toBe(false);
  });

  it('rejects an upload larger than the 10 MB limit', () => {
    expect(
      createUploadIntentRequestSchema.safeParse({
        parentType: 'order',
        parentId: UUID_A,
        documentType: 'passport',
        fileName: 'big.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
  });

  it('rejects a tracking code that is not six digits', () => {
    expect(
      trackingVerifyRequestSchema.safeParse({
        email: 'a@b.co',
        orderReference: 'CP-1',
        code: '12',
      }).success,
    ).toBe(false);
  });

  it('accepts an optional error details object and omits it when absent', () => {
    expect(
      apiErrorSchema.parse({ code: 'not_found', message: 'x', requestId: UUID_C }).details,
    ).toBeUndefined();
  });
});
