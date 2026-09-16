import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  apiErrorResponseSchema,
  apiErrorSchema,
  changeCommissionStateRequestSchema,
  changeCommissionStateResponseSchema,
  createDownloadLinkResponseSchema,
  createExportRequestSchema,
  createExportResponseSchema,
  createLeadRequestSchema,
  createLeadResponseSchema,
  createQuoteRequestSchema,
  createQuoteResponseSchema,
  createUploadIntentRequestSchema,
  createUploadIntentResponseSchema,
  finalizeUploadRequestSchema,
  finalizeUploadResponseSchema,
  getWorkspaceOrderResponseSchema,
  listWorkspaceLeadsResponseSchema,
  listWorkspaceOrdersResponseSchema,
  partnerInvoiceRequestSchema,
  partnerInvoiceResponseSchema,
  patchWorkspaceOrderRequestSchema,
  patchWorkspaceOrderResponseSchema,
  submitOrderRequestSchema,
  submitOrderResponseSchema,
  trackingOtpRequestSchema,
  trackingOtpResponseSchema,
  trackingStatusResponseSchema,
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
    { orders: [orderSummary], page: { page: 1, pageSize: 25, total: 1 }, requestId: UUID_C },
  ],
  [
    'getWorkspaceOrderResponse',
    getWorkspaceOrderResponseSchema,
    {
      order: {
        ...orderSummary,
        assigneeId: null,
        partnerCode: null,
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
      },
      requestId: UUID_C,
    },
  ],
  [
    'patchOrder:assign',
    patchWorkspaceOrderRequestSchema,
    { action: 'assign', assigneeId: UUID_C, expectedVersion: 0 },
  ],
  [
    'patchOrder:note',
    patchWorkspaceOrderRequestSchema,
    { action: 'note', note: 'called customer', expectedVersion: 1 },
  ],
  [
    'patchOrder:dispatch',
    patchWorkspaceOrderRequestSchema,
    { action: 'dispatch', carrier: 'Canada Post', expectedVersion: 2 },
  ],
  [
    'patchOrder:activate',
    patchWorkspaceOrderRequestSchema,
    { action: 'activate', expectedVersion: 3 },
  ],
  [
    'patchWorkspaceOrderResponse',
    patchWorkspaceOrderResponseSchema,
    {
      order: {
        ...orderSummary,
        assigneeId: UUID_C,
        partnerCode: 'PART1',
        snapshot,
        payload: form,
        consent: null,
        history: [],
      },
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
    'trackingOtpRequest:request',
    trackingOtpRequestSchema,
    { action: 'request', email: 'a@b.co', orderReference: 'CP-000123' },
  ],
  [
    'trackingOtpRequest:verify',
    trackingOtpRequestSchema,
    { action: 'verify', email: 'a@b.co', orderReference: 'CP-000123', code: '123456' },
  ],
  [
    'trackingOtpResponse:sent',
    trackingOtpResponseSchema,
    { status: 'challenge_sent', requestId: UUID_C },
  ],
  [
    'trackingOtpResponse:verified',
    trackingOtpResponseSchema,
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
      trackingOtpRequestSchema.safeParse({
        action: 'verify',
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
