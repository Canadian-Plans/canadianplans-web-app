import type { z } from 'zod';

import { createDownloadLinkResponseSchema, type CreateDownloadLinkResponse } from './files';
import { healthResponseSchema, type HealthResponse } from './health';
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
  getWorkspaceOrderResponseSchema,
  listWorkspaceOrdersResponseSchema,
  patchWorkspaceOrderRequestSchema,
  patchWorkspaceOrderResponseSchema,
  type GetWorkspaceOrderResponse,
  type ListWorkspaceOrdersQuery,
  type ListWorkspaceOrdersResponse,
  type PatchWorkspaceOrderRequest,
  type PatchWorkspaceOrderResponse,
} from './workspace-orders';

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
    getOrder(workspaceId: string, orderId: string): Promise<GetWorkspaceOrderResponse>;
    patchOrder(
      workspaceId: string,
      orderId: string,
      body: PatchWorkspaceOrderRequest,
    ): Promise<PatchWorkspaceOrderResponse>;
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
          path: '/api/v1/website/quotes',
          body: createQuoteRequestSchema.parse(body),
          headers: { 'x-draft-grant': opts.draftGrant },
          responseSchema: createQuoteResponseSchema,
        }),
    },

    orders: {
      submit: (body, opts) =>
        call({
          method: 'POST',
          path: '/api/v1/website/orders',
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
            page: query?.page,
            pageSize: query?.pageSize,
          },
          responseSchema: listWorkspaceOrdersResponseSchema,
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
