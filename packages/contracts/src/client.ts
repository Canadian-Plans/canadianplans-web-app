import type { z } from 'zod';
import { catalogueStatusResponseSchema, type CatalogueStatusResponse } from './catalogue';

import { createDownloadLinkResponseSchema, type CreateDownloadLinkResponse } from './files';
import { healthResponseSchema, type HealthResponse } from './health';
import {
  listWorkspaceJobsResponseSchema,
  retryWorkspaceJobResponseSchema,
  type ListWorkspaceJobsResponse,
  type RetryWorkspaceJobResponse,
} from './jobs';
import {
  createLeadRequestSchema,
  createLeadResponseSchema,
  updateLeadRequestSchema,
  updateLeadResponseSchema,
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
  partnerInvoiceRequestSchema,
  partnerInvoiceResponseSchema,
  type ChangeCommissionStateRequest,
  type ChangeCommissionStateResponse,
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
  trackingOtpRequestSchema,
  trackingOtpResponseSchema,
  trackingStatusResponseSchema,
  type TrackingOtpRequest,
  type TrackingOtpResponse,
  type TrackingStatusResponse,
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
  createOrderChangeRequestRequestSchema,
  createOrderChangeRequestResponseSchema,
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
  type CreateOrderChangeRequestRequest,
  type CreateOrderChangeRequestResponse,
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
import { listWebsiteOffersResponseSchema, type ListWebsiteOffersResponse } from './website-offers';

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
    create(body: CreateLeadRequest): Promise<CreateLeadResponse>;
    update(
      leadId: string,
      body: UpdateLeadRequest,
      options: { draftGrant: string },
    ): Promise<UpdateLeadResponse>;
  };
  quotes: {
    create(body: CreateQuoteRequest, options: { draftGrant: string }): Promise<CreateQuoteResponse>;
  };
  offers: {
    list(): Promise<ListWebsiteOffersResponse>;
  };
  orders: {
    submit(
      body: SubmitOrderRequest,
      options: { draftGrant: string; idempotencyKey: string },
    ): Promise<SubmitOrderResponse>;
  };
  uploads: {
    createIntent(body: CreateUploadIntentRequest): Promise<CreateUploadIntentResponse>;
    finalize(uploadId: string, body: FinalizeUploadRequest): Promise<FinalizeUploadResponse>;
  };
  files: {
    createDownloadLink(fileId: string): Promise<CreateDownloadLinkResponse>;
  };
  tracking: {
    otp(body: TrackingOtpRequest): Promise<TrackingOtpResponse>;
    get(options: { customerGrant: string }): Promise<TrackingStatusResponse>;
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
    catalogue(workspaceId: string): Promise<CatalogueStatusResponse>;
    listJobs(workspaceId: string): Promise<ListWorkspaceJobsResponse>;
    retryJob(workspaceId: string, jobId: string): Promise<RetryWorkspaceJobResponse>;
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

    const headers = new Headers({
      authorization: `Bearer ${options.credential}`,
      accept: 'application/json',
      'x-request-id': globalThis.crypto.randomUUID(),
    });
    if (config.body !== undefined) {
      headers.set('content-type', 'application/json');
    }
    for (const [key, value] of Object.entries(config.headers ?? {})) {
      if (value !== undefined) {
        headers.set(key, value);
      }
    }

    const response = await doFetch(url, {
      method: config.method,
      headers,
      body: config.body === undefined ? undefined : JSON.stringify(config.body),
      cache: 'no-store',
      redirect: 'error',
      signal: config.signal ?? AbortSignal.timeout(timeoutMs),
    });

    const payload: unknown = await response.json();
    if (!response.ok) {
      const parsed = apiErrorResponseSchema.safeParse(payload);
      if (parsed.success) {
        throw new BackendError(
          parsed.data.error.code,
          response.status,
          parsed.data.error.requestId,
        );
      }
      throw new BackendError('internal_error', response.status, 'unavailable');
    }
    return config.responseSchema.parse(payload);
  }

  return {
    health: () =>
      call({ method: 'GET', path: '/api/v1/health', responseSchema: healthResponseSchema }),

    leads: {
      create: (body) =>
        call({
          method: 'POST',
          path: '/api/v1/website/leads',
          body: createLeadRequestSchema.parse(body),
          responseSchema: createLeadResponseSchema,
        }),
      update: (leadId, body, opts) =>
        call({
          method: 'PATCH',
          path: `/api/v1/website/leads/${encode(leadId)}`,
          body: updateLeadRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant },
          responseSchema: updateLeadResponseSchema,
        }),
    },

    quotes: {
      create: (body, opts) =>
        call({
          method: 'POST',
          path: '/api/v1/quotes',
          body: createQuoteRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant },
          responseSchema: createQuoteResponseSchema,
        }),
    },

    offers: {
      list: () =>
        call({
          method: 'GET',
          path: '/api/v1/website/offers',
          responseSchema: listWebsiteOffersResponseSchema,
        }),
    },

    orders: {
      submit: (body, opts) =>
        call({
          method: 'POST',
          path: '/api/v1/orders',
          body: submitOrderRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant, 'idempotency-key': opts.idempotencyKey },
          responseSchema: submitOrderResponseSchema,
        }),
    },

    uploads: {
      createIntent: (body) =>
        call({
          method: 'POST',
          path: '/api/v1/website/uploads/intents',
          body: createUploadIntentRequestSchema.parse(body),
          responseSchema: createUploadIntentResponseSchema,
        }),
      finalize: (uploadId, body) =>
        call({
          method: 'POST',
          path: `/api/v1/website/uploads/${encode(uploadId)}/finalize`,
          body: finalizeUploadRequestSchema.parse(body),
          responseSchema: finalizeUploadResponseSchema,
        }),
    },

    files: {
      createDownloadLink: (fileId) =>
        call({
          method: 'POST',
          path: `/api/v1/website/files/${encode(fileId)}/download-link`,
          responseSchema: createDownloadLinkResponseSchema,
        }),
    },

    tracking: {
      otp: (body) =>
        call({
          method: 'POST',
          path: '/api/v1/website/tracking/otp',
          body: trackingOtpRequestSchema.parse(body),
          responseSchema: trackingOtpResponseSchema,
        }),
      get: (opts) =>
        call({
          method: 'GET',
          path: '/api/v1/website/tracking',
          headers: { 'x-customer-grant': opts.customerGrant },
          responseSchema: trackingStatusResponseSchema,
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
            page: query?.page,
            pageSize: query?.pageSize,
          },
          responseSchema: listWorkspaceOrdersResponseSchema,
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
    },
  };
}
