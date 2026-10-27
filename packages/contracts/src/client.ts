import { websiteBotTokenSchema, type WebsiteBotProof } from './website-bot';
import type { z } from 'zod';
import { catalogueStatusResponseSchema, type CatalogueStatusResponse } from './catalogue';

import {
  createDownloadLinkResponseSchema,
  listWorkspaceFilesResponseSchema,
  reviewFileRequestSchema,
  reviewFileResponseSchema,
  type CreateDownloadLinkResponse,
  type ListWorkspaceFilesResponse,
  type ReviewFileRequest,
  type ReviewFileResponse,
} from './files';
import { healthResponseSchema, type HealthResponse } from './health';
import {
  listWorkspaceJobsResponseSchema,
  resolveUncertainJobRequestSchema,
  resolveUncertainJobResponseSchema,
  retryWorkspaceJobResponseSchema,
  type ListWorkspaceJobsResponse,
  type ResolveUncertainJobRequest,
  type ResolveUncertainJobResponse,
  type RetryWorkspaceJobResponse,
} from './jobs';
import {
  createLeadRequestSchema,
  createLeadResponseSchema,
  updateLeadRequestSchema,
  updateLeadResponseSchema,
  readLeadResponseSchema,
  type ReadLeadResponse,
  type CreateLeadRequest,
  type CreateLeadResponse,
  type UpdateLeadRequest,
  type UpdateLeadResponse,
} from './leads';
import {
  submitOrderRequestSchema,
  submitOrderResponseSchema,
  type SubmitOrderRequest,
  type SubmitOrderResponse,
} from './orders';
import {
  changeCommissionStateRequestSchema,
  changeCommissionStateResponseSchema,
  listPartnersResponseSchema,
  partnerDetailResponseSchema,
  partnerInvoiceRequestSchema,
  partnerInvoiceResponseSchema,
  type ChangeCommissionStateRequest,
  type ChangeCommissionStateResponse,
  type ListPartnersResponse,
  type PartnerDetailResponse,
  type PartnerInvoiceRequest,
  type PartnerInvoiceResponse,
} from './partners';
import {
  createQuoteRequestSchema,
  createQuoteResponseSchema,
  type CreateQuoteRequest,
  type CreateQuoteResponse,
} from './quotes';
import {
  createExportRequestSchema,
  createExportResponseSchema,
  type CreateExportRequest,
  type CreateExportResponse,
} from './exports';
import {
  apiErrorResponseSchema,
  inviteStaffRequestSchema,
  inviteStaffResponseSchema,
  revokeStaffResponseSchema,
  staffWorkspaceAccessResponseSchema,
  staffWorkspacesResponseSchema,
  type ApiErrorCode,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type RevokeStaffResponse,
  type StaffWorkspaceAccessResponse,
  type StaffWorkspacesResponse,
} from './staff-auth';
import {
  trackingChangeRequestRequestSchema,
  trackingChangeRequestResponseSchema,
  trackingInfoResponseRequestSchema,
  trackingOrderResponseSchema,
  trackingOrdersResponseSchema,
  trackingOtpRequestSchema,
  trackingOtpResponseSchema,
  trackingUploadFinalizeResponseSchema,
  trackingUploadIntentRequestSchema,
  trackingVerifyRequestSchema,
  trackingVerifyResponseSchema,
  type TrackingChangeRequestRequest,
  type TrackingChangeRequestResponse,
  type TrackingInfoResponseRequest,
  type TrackingOrderResponse,
  type TrackingOrdersResponse,
  type TrackingOtpRequest,
  type TrackingOtpResponse,
  type TrackingUploadFinalizeResponse,
  type TrackingUploadIntentRequest,
  type TrackingVerifyRequest,
  type TrackingVerifyResponse,
} from './tracking';
import {
  createUploadIntentRequestSchema,
  createUploadIntentResponseSchema,
  finalizeUploadRequestSchema,
  finalizeUploadResponseSchema,
  type CreateUploadIntentRequest,
  type CreateUploadIntentResponse,
  type FinalizeUploadRequest,
  type FinalizeUploadResponse,
} from './uploads';
import {
  createServiceCredentialRequestSchema,
  createServiceCredentialResponseSchema,
  listServiceCredentialsResponseSchema,
  revokeServiceCredentialResponseSchema,
  type CreateServiceCredentialRequest,
  type CreateServiceCredentialResponse,
  type ListServiceCredentialsResponse,
  type RevokeServiceCredentialResponse,
} from './website-auth';
import {
  bulkAssignOrdersRequestSchema,
  bulkAssignOrdersResponseSchema,
  cancelOrderInfoRequestResponseSchema,
  createOrderChangeRequestRequestSchema,
  createOrderChangeRequestResponseSchema,
  createOrderInfoRequestRequestSchema,
  createOrderInfoRequestResponseSchema,
  createOrderNoteRequestSchema,
  createOrderReminderRequestSchema,
  createOrderReminderResponseSchema,
  deleteOrderReminderResponseSchema,
  getWorkspaceOrderResponseSchema,
  listAssignableMembersResponseSchema,
  listOrderNotesResponseSchema,
  listWorkspaceOrdersResponseSchema,
  patchOrderArchiveRequestSchema,
  patchOrderAssigneeRequestSchema,
  patchWorkspaceOrderRequestSchema,
  patchWorkspaceOrderResponseSchema,
  recordOrderPaymentRequestSchema,
  recordOrderPaymentResponseSchema,
  resolveOrderChangeRequestRequestSchema,
  resolveOrderChangeRequestResponseSchema,
  type BulkAssignOrdersRequest,
  type BulkAssignOrdersResponse,
  type CancelOrderInfoRequestResponse,
  type CreateOrderChangeRequestRequest,
  type CreateOrderChangeRequestResponse,
  type CreateOrderInfoRequestRequest,
  type CreateOrderInfoRequestResponse,
  type CreateOrderNoteRequest,
  type CreateOrderReminderRequest,
  type CreateOrderReminderResponse,
  type DeleteOrderReminderResponse,
  type GetWorkspaceOrderResponse,
  type ListAssignableMembersResponse,
  type ListOrderNotesResponse,
  type ListWorkspaceOrdersQuery,
  type ListWorkspaceOrdersResponse,
  type PatchOrderArchiveRequest,
  type PatchOrderAssigneeRequest,
  type PatchWorkspaceOrderRequest,
  type PatchWorkspaceOrderResponse,
  type RecordOrderPaymentRequest,
  type RecordOrderPaymentResponse,
  type ResolveOrderChangeRequestRequest,
  type ResolveOrderChangeRequestResponse,
} from './workspace-orders';
import {
  listWorkspaceLeadsResponseSchema,
  type ListWorkspaceLeadsQuery,
  type ListWorkspaceLeadsResponse,
} from './workspace-leads';
import {
  sourceReportResponseSchema,
  type SourceReportQuery,
  type SourceReportResponse,
} from './reports';
import {
  deleteCustomerDataRequestSchema,
  deleteCustomerDataResponseSchema,
  findDeletionSubjectsRequestSchema,
  findDeletionSubjectsResponseSchema,
  requestSubjectDeletionResponseSchema,
  type DeletionSubjectType,
  type FindDeletionSubjectsRequest,
  type FindDeletionSubjectsResponse,
  type RequestSubjectDeletionResponse,
  type DeleteCustomerDataRequest,
  type DeleteCustomerDataResponse,
} from './deletion';
import {
  joinRegionWaitlistRequestSchema,
  joinRegionWaitlistResponseSchema,
  type JoinRegionWaitlistRequest,
  type JoinRegionWaitlistResponse,
} from './region-waitlist';
import {
  createSavedViewRequestSchema,
  deleteSavedViewResponseSchema,
  listSavedViewsResponseSchema,
  savedViewResponseSchema,
  updateSavedViewRequestSchema,
  type CreateSavedViewRequest,
  type DeleteSavedViewResponse,
  type ListSavedViewsResponse,
  type SavedViewObject,
  type SavedViewResponse,
  type UpdateSavedViewRequest,
} from './saved-views';
import {
  listWebsiteOffersQuerySchema,
  listWebsiteOffersResponseSchema,
  type ListWebsiteOffersQuery,
  type ListWebsiteOffersResponse,
} from './website-offers';

/**
 * The one typed backend client, consumed by both admin (staff session as the
 * credential) and the storefronts (service credential). Every method's request
 * and response types are `z.infer` of the same schemas the backend validates
 * against and the OpenAPI document is generated from, so a schema change breaks
 * both consumers at build time (REQ 50). Responses are validated at runtime, so
 * a backend that drifts from the contract fails loudly rather than silently.
 *
 * Transport is secure by default and safe for server-side storefront use:
 * fixed `/api/v1` paths only, bearer credential, no redirects, no caching, a
 * request timeout, a generated `x-request-id`, and no response-body leakage in
 * thrown errors (invariant 12).
 */

/** Thrown for any non-2xx response. Carries the contract error code, HTTP status and request id. */
export class BackendError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'internal_error',
    readonly status: number,
    readonly requestId: string,
  ) {
    super(code);
    this.name = 'BackendError';
  }
}

export interface BackendClientOptions {
  /** Backend origin, e.g. `https://api.example.com`. Paths are always `/api/v1/*`. */
  readonly baseUrl: string;
  /** Bearer credential: a staff Supabase access token, or a website service credential. */
  readonly credential: string;
  /** Injectable fetch for tests; defaults to the global. */
  readonly fetch?: typeof fetch;
  /** Per-request timeout in milliseconds. Defaults to 10s. */
  readonly timeoutMs?: number;
  /** Server-owned visitor digest; never a raw browser forwarding header. */
  readonly websiteVisitorId?: () => string | undefined | Promise<string | undefined>;
}

type HeaderMap = Record<string, string | undefined>;
type QueryMap = Record<string, string | number | undefined>;

interface CallConfig<TResponse> {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly responseSchema: z.ZodType<TResponse>;
  readonly body?: unknown;
  readonly query?: QueryMap;
  readonly headers?: HeaderMap;
  readonly signal?: AbortSignal;
}

function assertApiPath(url: URL, origin: string): void {
  if (
    url.origin !== origin ||
    !url.pathname.startsWith('/api/v1/') ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error('Invalid backend API path.');
  }
}

export interface BackendClient {
  health(): Promise<HealthResponse>;
  leads: {
    read(leadId: string, options: { draftGrant: string }): Promise<ReadLeadResponse>;
    create(body: CreateLeadRequest, proof?: WebsiteBotProof): Promise<CreateLeadResponse>;
    update(
      leadId: string,
      body: UpdateLeadRequest,
      options: { draftGrant: string } & WebsiteBotProof,
    ): Promise<UpdateLeadResponse>;
  };
  quotes: {
    create(
      body: CreateQuoteRequest,
      options: { draftGrant: string } & WebsiteBotProof,
    ): Promise<CreateQuoteResponse>;
  };
  offers: {
    /** The published offers; with a province, only those sold there plus national ones. */
    list(query?: ListWebsiteOffersQuery): Promise<ListWebsiteOffersResponse>;
  };
  regionWaitlist: {
    /** Leaves an email for a province we do not serve yet. Safe to repeat. */
    join(
      body: JoinRegionWaitlistRequest,
      proof?: WebsiteBotProof,
    ): Promise<JoinRegionWaitlistResponse>;
  };
  orders: {
    submit(
      body: SubmitOrderRequest,
      options: { draftGrant: string; idempotencyKey: string } & WebsiteBotProof,
    ): Promise<SubmitOrderResponse>;
  };
  uploads: {
    createIntent(
      body: CreateUploadIntentRequest,
      options: { draftGrant: string } & WebsiteBotProof,
    ): Promise<CreateUploadIntentResponse>;
    finalize(
      uploadId: string,
      body: FinalizeUploadRequest,
      options: { draftGrant: string } & WebsiteBotProof,
    ): Promise<FinalizeUploadResponse>;
  };
  files: {
    createDownloadLink(
      fileId: string,
      options: { draftGrant: string } & WebsiteBotProof,
    ): Promise<CreateDownloadLinkResponse>;
  };
  tracking: {
    otp(body: TrackingOtpRequest, proof?: WebsiteBotProof): Promise<TrackingOtpResponse>;
    verify(body: TrackingVerifyRequest, proof?: WebsiteBotProof): Promise<TrackingVerifyResponse>;
    listOrders(options: { customerGrant: string }): Promise<TrackingOrdersResponse>;
    getOrder(reference: string, options: { customerGrant: string }): Promise<TrackingOrderResponse>;
    requestChange(
      reference: string,
      body: TrackingChangeRequestRequest,
      options: { customerGrant: string },
    ): Promise<TrackingChangeRequestResponse>;
    answerInfoRequest(
      reference: string,
      infoRequestId: string,
      body: TrackingInfoResponseRequest,
      options: { customerGrant: string },
    ): Promise<TrackingChangeRequestResponse>;
    createUploadIntent(
      reference: string,
      body: TrackingUploadIntentRequest,
      options: { customerGrant: string } & WebsiteBotProof,
    ): Promise<CreateUploadIntentResponse>;
    finalizeUpload(
      reference: string,
      uploadId: string,
      body: FinalizeUploadRequest,
      options: { customerGrant: string } & WebsiteBotProof,
    ): Promise<TrackingUploadFinalizeResponse>;
  };
  staff: {
    listWorkspaces(): Promise<StaffWorkspacesResponse>;
    workspaceAccess(workspaceId: string): Promise<StaffWorkspaceAccessResponse>;
    invite(workspaceId: string, body: InviteStaffRequest): Promise<InviteStaffResponse>;
    revokeMembership(workspaceId: string, membershipId: string): Promise<RevokeStaffResponse>;
    listServiceCredentials(workspaceId: string): Promise<ListServiceCredentialsResponse>;
    listLeads(
      workspaceId: string,
      query?: ListWorkspaceLeadsQuery,
    ): Promise<ListWorkspaceLeadsResponse>;
    getSourceReport(workspaceId: string, query?: SourceReportQuery): Promise<SourceReportResponse>;
    catalogue(workspaceId: string): Promise<CatalogueStatusResponse>;
    listJobs(workspaceId: string): Promise<ListWorkspaceJobsResponse>;
    retryJob(workspaceId: string, jobId: string): Promise<RetryWorkspaceJobResponse>;
    resolveUncertainJob(
      workspaceId: string,
      jobId: string,
      body: ResolveUncertainJobRequest,
    ): Promise<ResolveUncertainJobResponse>;
    createServiceCredential(
      workspaceId: string,
      body: CreateServiceCredentialRequest,
    ): Promise<CreateServiceCredentialResponse>;
    revokeServiceCredential(
      workspaceId: string,
      credentialId: string,
    ): Promise<RevokeServiceCredentialResponse>;
    listOrders(
      workspaceId: string,
      query?: ListWorkspaceOrdersQuery,
    ): Promise<ListWorkspaceOrdersResponse>;
    listOrderAssignees(workspaceId: string): Promise<ListAssignableMembersResponse>;
    listSavedViews(workspaceId: string, object: SavedViewObject): Promise<ListSavedViewsResponse>;
    createSavedView(workspaceId: string, body: CreateSavedViewRequest): Promise<SavedViewResponse>;
    updateSavedView(
      workspaceId: string,
      viewId: string,
      body: UpdateSavedViewRequest,
    ): Promise<SavedViewResponse>;
    deleteSavedView(workspaceId: string, viewId: string): Promise<DeleteSavedViewResponse>;
    getOrder(workspaceId: string, orderId: string): Promise<GetWorkspaceOrderResponse>;
    patchOrder(
      workspaceId: string,
      orderId: string,
      body: PatchWorkspaceOrderRequest,
    ): Promise<PatchWorkspaceOrderResponse>;
    patchOrderAssignee(
      workspaceId: string,
      orderId: string,
      body: PatchOrderAssigneeRequest,
    ): Promise<PatchWorkspaceOrderResponse>;
    patchOrderArchive(
      workspaceId: string,
      orderId: string,
      body: PatchOrderArchiveRequest,
    ): Promise<PatchWorkspaceOrderResponse>;
    bulkAssignOrders(
      workspaceId: string,
      body: BulkAssignOrdersRequest,
    ): Promise<BulkAssignOrdersResponse>;
    listOrderNotes(workspaceId: string, orderId: string): Promise<ListOrderNotesResponse>;
    createOrderNote(
      workspaceId: string,
      orderId: string,
      body: CreateOrderNoteRequest,
    ): Promise<ListOrderNotesResponse>;
    createOrderReminder(
      workspaceId: string,
      orderId: string,
      body: CreateOrderReminderRequest,
    ): Promise<CreateOrderReminderResponse>;
    deleteOrderReminder(
      workspaceId: string,
      orderId: string,
      reminderId: string,
    ): Promise<DeleteOrderReminderResponse>;
    createOrderChangeRequest(
      workspaceId: string,
      orderId: string,
      body: CreateOrderChangeRequestRequest,
    ): Promise<CreateOrderChangeRequestResponse>;
    createOrderInfoRequest(
      workspaceId: string,
      orderId: string,
      body: CreateOrderInfoRequestRequest,
    ): Promise<CreateOrderInfoRequestResponse>;
    cancelOrderInfoRequest(
      workspaceId: string,
      orderId: string,
      infoRequestId: string,
    ): Promise<CancelOrderInfoRequestResponse>;
    approveOrderChangeRequest(
      workspaceId: string,
      orderId: string,
      changeRequestId: string,
      body: ResolveOrderChangeRequestRequest,
    ): Promise<ResolveOrderChangeRequestResponse>;
    rejectOrderChangeRequest(
      workspaceId: string,
      orderId: string,
      changeRequestId: string,
      body: ResolveOrderChangeRequestRequest,
    ): Promise<ResolveOrderChangeRequestResponse>;
    recordOrderPayment(
      workspaceId: string,
      orderId: string,
      body: RecordOrderPaymentRequest,
    ): Promise<RecordOrderPaymentResponse>;
    deleteCustomerData(
      workspaceId: string,
      orderId: string,
      body: DeleteCustomerDataRequest,
    ): Promise<DeleteCustomerDataResponse>;
    findDeletionSubjects(
      workspaceId: string,
      body: FindDeletionSubjectsRequest,
    ): Promise<FindDeletionSubjectsResponse>;
    requestSubjectDeletion(
      workspaceId: string,
      subjectType: DeletionSubjectType,
      subjectId: string,
      body: DeleteCustomerDataRequest,
    ): Promise<RequestSubjectDeletionResponse>;
    listPartners(workspaceId: string): Promise<ListPartnersResponse>;
    getPartner(workspaceId: string, partnerId: string): Promise<PartnerDetailResponse>;
    changeCommissionState(
      workspaceId: string,
      partnerId: string,
      body: ChangeCommissionStateRequest,
    ): Promise<ChangeCommissionStateResponse>;
    partnerInvoice(
      workspaceId: string,
      partnerId: string,
      body: PartnerInvoiceRequest,
    ): Promise<PartnerInvoiceResponse>;
    createExport(workspaceId: string, body: CreateExportRequest): Promise<CreateExportResponse>;
    listOrderFiles(workspaceId: string, orderId: string): Promise<ListWorkspaceFilesResponse>;
    reviewFile(
      workspaceId: string,
      fileId: string,
      body: ReviewFileRequest,
    ): Promise<ReviewFileResponse>;
    fileDownloadLink(workspaceId: string, fileId: string): Promise<CreateDownloadLinkResponse>;
  };
}

const encode = encodeURIComponent;

export function createBackendClient(options: BackendClientOptions): BackendClient {
  const origin = new URL(options.baseUrl).origin;
  const doFetch = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;

  async function call<TResponse>(config: CallConfig<TResponse>): Promise<TResponse> {
    const url = new URL(config.path, origin);
    assertApiPath(url, origin);
    for (const [key, value] of Object.entries(config.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const requestId = globalThis.crypto.randomUUID();
    const headers = new Headers({
      authorization: `Bearer ${options.credential}`,
      accept: 'application/json',
      'x-request-id': requestId,
    });
    if (config.body !== undefined) {
      headers.set('content-type', 'application/json');
    }
    for (const [key, value] of Object.entries(config.headers ?? {})) {
      if (value !== undefined) {
        headers.set(key, value);
      }
    }

    const visitor = await options.websiteVisitorId?.();
    if (visitor !== undefined) {
      if (!/^[a-f0-9]{64}$/.test(visitor)) throw new Error('Invalid website visitor assertion.');
      headers.set('x-website-visitor-id', visitor);
    }
    const response = await doFetch(url, {
      method: config.method,
      headers,
      body: config.body === undefined ? undefined : JSON.stringify(config.body),
      cache: 'no-store',
      redirect: 'error',
      signal: config.signal ?? AbortSignal.timeout(timeoutMs),
    });

    // An edge 502/504, an unknown path (Express's HTML 404) or an empty body is
    // not JSON. That is still an HTTP answer, so it becomes a BackendError with
    // the real status rather than a SyntaxError. Transport failures and
    // timeouts deliberately stay non-BackendErrors: callers treat those as
    // "outcome unknown" and retry with the same idempotency key.
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text.length === 0 ? undefined : JSON.parse(text);
    } catch {
      payload = undefined;
    }
    if (!response.ok) {
      const parsed = apiErrorResponseSchema.safeParse(payload);
      if (parsed.success) {
        throw new BackendError(
          parsed.data.error.code,
          response.status,
          parsed.data.error.requestId,
        );
      }
      throw new BackendError('internal_error', response.status, requestId);
    }
    if (payload === undefined) throw new BackendError('internal_error', response.status, requestId);
    return config.responseSchema.parse(payload);
  }

  function proofHeader(proof?: WebsiteBotProof): HeaderMap {
    return {
      'x-turnstile-token':
        proof?.turnstileToken === undefined
          ? undefined
          : websiteBotTokenSchema.parse(proof.turnstileToken),
    };
  }

  return {
    health: () =>
      call({ method: 'GET', path: '/api/v1/health', responseSchema: healthResponseSchema }),

    leads: {
      read: (leadId, opts) =>
        call({
          method: 'GET',
          path: `/api/v1/website/leads/${encode(leadId)}`,
          headers: { 'x-draft-grant': opts.draftGrant },
          responseSchema: readLeadResponseSchema,
        }),
      create: (body, proof) =>
        call({
          method: 'POST',
          path: '/api/v1/website/leads',
          body: createLeadRequestSchema.parse(body),
          headers: proofHeader(proof),
          responseSchema: createLeadResponseSchema,
        }),
      update: (leadId, body, opts) =>
        call({
          method: 'PATCH',
          path: `/api/v1/website/leads/${encode(leadId)}`,
          body: updateLeadRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant, ...proofHeader(opts) },
          responseSchema: updateLeadResponseSchema,
        }),
    },

    regionWaitlist: {
      join: (body, proof) =>
        call({
          method: 'POST',
          path: '/api/v1/website/region-waitlist',
          body: joinRegionWaitlistRequestSchema.parse(body),
          headers: proofHeader(proof),
          responseSchema: joinRegionWaitlistResponseSchema,
        }),
    },

    quotes: {
      create: (body, opts) =>
        call({
          method: 'POST',
          path: '/api/v1/quotes',
          body: createQuoteRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant, ...proofHeader(opts) },
          responseSchema: createQuoteResponseSchema,
        }),
    },

    offers: {
      list: (query) =>
        call({
          method: 'GET',
          path: '/api/v1/website/offers',
          query: listWebsiteOffersQuerySchema.parse(query ?? {}),
          responseSchema: listWebsiteOffersResponseSchema,
        }),
    },

    orders: {
      submit: (body, opts) =>
        call({
          method: 'POST',
          path: '/api/v1/orders',
          body: submitOrderRequestSchema.parse(body),
          headers: {
            'x-draft-grant': opts.draftGrant,
            'idempotency-key': opts.idempotencyKey,
            ...proofHeader(opts),
          },
          responseSchema: submitOrderResponseSchema,
        }),
    },

    uploads: {
      createIntent: (body, opts) =>
        call({
          method: 'POST',
          path: '/api/v1/website/uploads/intents',
          body: createUploadIntentRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant, ...proofHeader(opts) },
          responseSchema: createUploadIntentResponseSchema,
        }),
      finalize: (uploadId, body, opts) =>
        call({
          method: 'POST',
          path: `/api/v1/website/uploads/${encode(uploadId)}/finalize`,
          body: finalizeUploadRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant, ...proofHeader(opts) },
          responseSchema: finalizeUploadResponseSchema,
        }),
    },

    files: {
      createDownloadLink: (fileId, opts) =>
        call({
          method: 'POST',
          path: `/api/v1/website/files/${encode(fileId)}/download-link`,
          headers: { 'x-draft-grant': opts.draftGrant, ...proofHeader(opts) },
          responseSchema: createDownloadLinkResponseSchema,
        }),
    },

    tracking: {
      otp: (body, proof) =>
        call({
          method: 'POST',
          path: '/api/v1/website/tracking/otp',
          body: trackingOtpRequestSchema.parse(body),
          headers: proofHeader(proof),
          responseSchema: trackingOtpResponseSchema,
        }),
      verify: (body, proof) =>
        call({
          method: 'POST',
          path: '/api/v1/website/tracking/verify',
          body: trackingVerifyRequestSchema.parse(body),
          headers: proofHeader(proof),
          responseSchema: trackingVerifyResponseSchema,
        }),
      listOrders: (opts) =>
        call({
          method: 'GET',
          path: '/api/v1/website/tracking/orders',
          headers: { 'x-customer-grant': opts.customerGrant },
          responseSchema: trackingOrdersResponseSchema,
        }),
      getOrder: (reference, opts) =>
        call({
          method: 'GET',
          path: `/api/v1/website/tracking/orders/${encode(reference)}`,
          headers: { 'x-customer-grant': opts.customerGrant },
          responseSchema: trackingOrderResponseSchema,
        }),
      requestChange: (reference, body, opts) =>
        call({
          method: 'POST',
          path: `/api/v1/website/tracking/orders/${encode(reference)}/change-requests`,
          body: trackingChangeRequestRequestSchema.parse(body),
          headers: { 'x-customer-grant': opts.customerGrant },
          responseSchema: trackingChangeRequestResponseSchema,
        }),
      answerInfoRequest: (reference, infoRequestId, body, opts) =>
        call({
          method: 'POST',
          path: `/api/v1/website/tracking/orders/${encode(reference)}/info-requests/${encode(infoRequestId)}/response`,
          body: trackingInfoResponseRequestSchema.parse(body),
          headers: { 'x-customer-grant': opts.customerGrant },
          responseSchema: trackingChangeRequestResponseSchema,
        }),
      createUploadIntent: (reference, body, opts) =>
        call({
          method: 'POST',
          path: `/api/v1/website/tracking/orders/${encode(reference)}/uploads/intents`,
          body: trackingUploadIntentRequestSchema.parse(body),
          headers: { 'x-customer-grant': opts.customerGrant, ...proofHeader(opts) },
          responseSchema: createUploadIntentResponseSchema,
        }),
      finalizeUpload: (reference, uploadId, body, opts) =>
        call({
          method: 'POST',
          path: `/api/v1/website/tracking/orders/${encode(reference)}/uploads/${encode(uploadId)}/finalize`,
          body: finalizeUploadRequestSchema.parse(body),
          headers: { 'x-customer-grant': opts.customerGrant, ...proofHeader(opts) },
          responseSchema: trackingUploadFinalizeResponseSchema,
        }),
    },

    staff: {
      listWorkspaces: () =>
        call({
          method: 'GET',
          path: '/api/v1/staff/workspaces',
          responseSchema: staffWorkspacesResponseSchema,
        }),
      workspaceAccess: (workspaceId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/access`,
          responseSchema: staffWorkspaceAccessResponseSchema,
        }),
      invite: (workspaceId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/invitations`,
          body: inviteStaffRequestSchema.parse(body),
          responseSchema: inviteStaffResponseSchema,
        }),
      revokeMembership: (workspaceId, membershipId) =>
        call({
          method: 'DELETE',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/memberships/${encode(membershipId)}`,
          responseSchema: revokeStaffResponseSchema,
        }),
      listServiceCredentials: (workspaceId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/service-credentials`,
          responseSchema: listServiceCredentialsResponseSchema,
        }),
      listLeads: (workspaceId, query) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/leads`,
          query: { status: query?.status, page: query?.page, pageSize: query?.pageSize },
          responseSchema: listWorkspaceLeadsResponseSchema,
        }),
      getSourceReport: (workspaceId, query) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/reports/sources`,
          query: { from: query?.from, to: query?.to },
          responseSchema: sourceReportResponseSchema,
        }),
      catalogue: (workspaceId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/catalogue`,
          responseSchema: catalogueStatusResponseSchema,
        }),
      listJobs: (workspaceId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/jobs`,
          responseSchema: listWorkspaceJobsResponseSchema,
        }),
      retryJob: (workspaceId, jobId) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/jobs/${encode(jobId)}/retry`,
          responseSchema: retryWorkspaceJobResponseSchema,
        }),
      resolveUncertainJob: (workspaceId, jobId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/jobs/${encode(jobId)}/resolve`,
          body: resolveUncertainJobRequestSchema.parse(body),
          responseSchema: resolveUncertainJobResponseSchema,
        }),
      createServiceCredential: (workspaceId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/service-credentials`,
          body: createServiceCredentialRequestSchema.parse(body),
          responseSchema: createServiceCredentialResponseSchema,
        }),
      revokeServiceCredential: (workspaceId, credentialId) =>
        call({
          method: 'DELETE',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/service-credentials/${encode(credentialId)}`,
          responseSchema: revokeServiceCredentialResponseSchema,
        }),
      listOrders: (workspaceId, query) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders`,
          query: {
            status: query?.status,
            paymentState: query?.paymentState,
            assigneeId: query?.assigneeId,
            partnerId: query?.partnerId,
            partnerCode: query?.partnerCode,
            source: query?.source,
            submittedFrom: query?.submittedFrom,
            submittedTo: query?.submittedTo,
            archiveState: query?.archiveState,
            search: query?.search,
            sortBy: query?.sortBy,
            sortDirection: query?.sortDirection,
            page: query?.page,
            pageSize: query?.pageSize,
          },
          responseSchema: listWorkspaceOrdersResponseSchema,
        }),
      listSavedViews: (workspaceId, object) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/views`,
          query: { object },
          responseSchema: listSavedViewsResponseSchema,
        }),
      createSavedView: (workspaceId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/views`,
          body: createSavedViewRequestSchema.parse(body),
          responseSchema: savedViewResponseSchema,
        }),
      updateSavedView: (workspaceId, viewId, body) =>
        call({
          method: 'PATCH',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/views/${encode(viewId)}`,
          body: updateSavedViewRequestSchema.parse(body),
          responseSchema: savedViewResponseSchema,
        }),
      deleteSavedView: (workspaceId, viewId) =>
        call({
          method: 'DELETE',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/views/${encode(viewId)}`,
          responseSchema: deleteSavedViewResponseSchema,
        }),
      listOrderAssignees: (workspaceId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/members`,
          responseSchema: listAssignableMembersResponseSchema,
        }),
      getOrder: (workspaceId, orderId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}`,
          responseSchema: getWorkspaceOrderResponseSchema,
        }),
      patchOrder: (workspaceId, orderId, body) =>
        call({
          method: 'PATCH',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}`,
          body: patchWorkspaceOrderRequestSchema.parse(body),
          responseSchema: patchWorkspaceOrderResponseSchema,
        }),
      patchOrderAssignee: (workspaceId, orderId, body) =>
        call({
          method: 'PATCH',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/assignee`,
          body: patchOrderAssigneeRequestSchema.parse(body),
          responseSchema: patchWorkspaceOrderResponseSchema,
        }),
      patchOrderArchive: (workspaceId, orderId, body) =>
        call({
          method: 'PATCH',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/archive`,
          body: patchOrderArchiveRequestSchema.parse(body),
          responseSchema: patchWorkspaceOrderResponseSchema,
        }),
      bulkAssignOrders: (workspaceId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/bulk-assign`,
          body: bulkAssignOrdersRequestSchema.parse(body),
          responseSchema: bulkAssignOrdersResponseSchema,
        }),
      listOrderNotes: (workspaceId, orderId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/notes`,
          responseSchema: listOrderNotesResponseSchema,
        }),
      createOrderNote: (workspaceId, orderId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/notes`,
          body: createOrderNoteRequestSchema.parse(body),
          responseSchema: listOrderNotesResponseSchema,
        }),
      createOrderReminder: (workspaceId, orderId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/reminders`,
          body: createOrderReminderRequestSchema.parse(body),
          responseSchema: createOrderReminderResponseSchema,
        }),
      deleteOrderReminder: (workspaceId, orderId, reminderId) =>
        call({
          method: 'DELETE',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/reminders/${encode(reminderId)}`,
          responseSchema: deleteOrderReminderResponseSchema,
        }),
      createOrderChangeRequest: (workspaceId, orderId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/change-requests`,
          body: createOrderChangeRequestRequestSchema.parse(body),
          responseSchema: createOrderChangeRequestResponseSchema,
        }),
      createOrderInfoRequest: (workspaceId, orderId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/info-requests`,
          body: createOrderInfoRequestRequestSchema.parse(body),
          responseSchema: createOrderInfoRequestResponseSchema,
        }),
      cancelOrderInfoRequest: (workspaceId, orderId, infoRequestId) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/info-requests/${encode(infoRequestId)}/cancel`,
          responseSchema: cancelOrderInfoRequestResponseSchema,
        }),
      approveOrderChangeRequest: (workspaceId, orderId, changeRequestId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/change-requests/${encode(changeRequestId)}/approve`,
          body: resolveOrderChangeRequestRequestSchema.parse(body),
          responseSchema: resolveOrderChangeRequestResponseSchema,
        }),
      rejectOrderChangeRequest: (workspaceId, orderId, changeRequestId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/change-requests/${encode(changeRequestId)}/reject`,
          body: resolveOrderChangeRequestRequestSchema.parse(body),
          responseSchema: resolveOrderChangeRequestResponseSchema,
        }),
      recordOrderPayment: (workspaceId, orderId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/payments`,
          body: recordOrderPaymentRequestSchema.parse(body),
          responseSchema: recordOrderPaymentResponseSchema,
        }),
      deleteCustomerData: (workspaceId, orderId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/deletion`,
          body: deleteCustomerDataRequestSchema.parse(body),
          responseSchema: deleteCustomerDataResponseSchema,
        }),
      listPartners: (workspaceId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/partners`,
          responseSchema: listPartnersResponseSchema,
        }),
      findDeletionSubjects: (workspaceId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/customer-data/search`,
          body: findDeletionSubjectsRequestSchema.parse(body),
          responseSchema: findDeletionSubjectsResponseSchema,
        }),
      requestSubjectDeletion: (workspaceId, subjectType, subjectId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/customer-data/${encode(subjectType)}/${encode(subjectId)}/deletion`,
          body: deleteCustomerDataRequestSchema.parse(body),
          responseSchema: requestSubjectDeletionResponseSchema,
        }),
      getPartner: (workspaceId, partnerId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/partners/${encode(partnerId)}`,
          responseSchema: partnerDetailResponseSchema,
        }),
      changeCommissionState: (workspaceId, partnerId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/partners/${encode(partnerId)}/commissions`,
          body: changeCommissionStateRequestSchema.parse(body),
          responseSchema: changeCommissionStateResponseSchema,
        }),
      partnerInvoice: (workspaceId, partnerId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/partners/${encode(partnerId)}/invoices`,
          body: partnerInvoiceRequestSchema.parse(body),
          responseSchema: partnerInvoiceResponseSchema,
        }),
      createExport: (workspaceId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/exports`,
          body: createExportRequestSchema.parse(body),
          responseSchema: createExportResponseSchema,
        }),
      listOrderFiles: (workspaceId, orderId) =>
        call({
          method: 'GET',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/orders/${encode(orderId)}/files`,
          responseSchema: listWorkspaceFilesResponseSchema,
        }),
      reviewFile: (workspaceId, fileId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/files/${encode(fileId)}/review`,
          body: reviewFileRequestSchema.parse(body),
          responseSchema: reviewFileResponseSchema,
        }),
      fileDownloadLink: (workspaceId, fileId) =>
        call({
          method: 'POST',
          path: `/api/v1/staff/workspaces/${encode(workspaceId)}/files/${encode(fileId)}/download-link`,
          responseSchema: createDownloadLinkResponseSchema,
        }),
    },
  };
}
