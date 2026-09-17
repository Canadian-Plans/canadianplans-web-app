import type { z } from 'zod';
import { catalogueStatusResponseSchema } from './catalogue';

import { createDownloadLinkResponseSchema } from './files';
import {
  createLeadRequestSchema,
  createLeadResponseSchema,
  updateLeadRequestSchema,
  updateLeadResponseSchema,
} from './leads';
import { submitOrderRequestSchema, submitOrderResponseSchema } from './orders';
import { createQuoteRequestSchema, createQuoteResponseSchema } from './quotes';
import {
  createServiceCredentialRequestSchema,
  createServiceCredentialResponseSchema,
  listServiceCredentialsResponseSchema,
  revokeServiceCredentialResponseSchema,
} from './website-auth';
import {
  changeCommissionStateRequestSchema,
  changeCommissionStateResponseSchema,
  partnerInvoiceRequestSchema,
  partnerInvoiceResponseSchema,
} from './partners';
import { createExportRequestSchema, createExportResponseSchema } from './exports';
import { healthResponseSchema } from './health';
import { listWorkspaceJobsResponseSchema, retryWorkspaceJobResponseSchema } from './jobs';
import {
  inviteStaffRequestSchema,
  inviteStaffResponseSchema,
  revokeStaffResponseSchema,
  staffWorkspaceAccessResponseSchema,
  staffWorkspacesResponseSchema,
} from './staff-auth';
import {
  trackingOtpRequestSchema,
  trackingOtpResponseSchema,
  trackingStatusResponseSchema,
} from './tracking';
import {
  createUploadIntentRequestSchema,
  createUploadIntentResponseSchema,
  finalizeUploadRequestSchema,
  finalizeUploadResponseSchema,
} from './uploads';
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
  listWorkspaceOrdersQuerySchema,
  listWorkspaceOrdersResponseSchema,
  patchOrderArchiveRequestSchema,
  patchOrderAssigneeRequestSchema,
  patchWorkspaceOrderRequestSchema,
  patchWorkspaceOrderResponseSchema,
  recordOrderPaymentRequestSchema,
  recordOrderPaymentResponseSchema,
  resolveOrderChangeRequestRequestSchema,
  resolveOrderChangeRequestResponseSchema,
} from './workspace-orders';
import { listWorkspaceLeadsQuerySchema, listWorkspaceLeadsResponseSchema } from './workspace-leads';
import { listWebsiteOffersResponseSchema } from './website-offers';
import { webhookAckResponseSchema, webhookDeliveryRequestSchema } from './webhooks';

/**
 * The single registry of every `/api/v1` operation. It drives OpenAPI
 * generation (`openapi.ts`) and is the coverage backstop for the typed client
 * (`client.ts`). Each entry pairs a route with the exact request/response Zod
 * schemas the backend must honour, so a schema change surfaces in the generated
 * document and the client together (REQ 50).
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** How the operation is authenticated. Drives the OpenAPI security requirement. */
export type EndpointAuth = 'public' | 'staff' | 'website' | 'customer' | 'machine';

export interface EndpointHeader {
  readonly name: string;
  readonly required: boolean;
  readonly description: string;
}

export interface EndpointDef {
  readonly operationId: string;
  readonly method: HttpMethod;
  /** OpenAPI path template with `{param}` placeholders, always under `/api/v1`. */
  readonly path: string;
  readonly summary: string;
  readonly auth: EndpointAuth;
  readonly successStatus: number;
  readonly request?: z.ZodType;
  readonly query?: z.ZodType;
  readonly response: z.ZodType;
  readonly headers?: readonly EndpointHeader[];
}

const IDEMPOTENCY_KEY: EndpointHeader = {
  name: 'Idempotency-Key',
  required: true,
  description: 'Scoped idempotency key. A retry with the same key returns the existing order.',
};
const DRAFT_GRANT: EndpointHeader = {
  name: 'X-Draft-Grant',
  required: true,
  description: 'Scoped grant token that authorises resuming this draft.',
};
const CUSTOMER_GRANT: EndpointHeader = {
  name: 'X-Customer-Grant',
  required: true,
  description: 'Scoped customer grant issued after order-tracking OTP verification.',
};
const WEBHOOK_SIGNATURE: EndpointHeader = {
  name: 'Sanity-Webhook-Signature',
  required: true,
  description: 'Timestamped Sanity HMAC signature over the raw body.',
};
const WEBHOOK_SELECTOR: EndpointHeader = {
  name: 'X-Webhook-Selector',
  required: true,
  description: 'Untrusted registry selector; context is derived only after signature verification.',
};
const PROVIDER_ACCOUNT: EndpointHeader = {
  name: 'X-Provider-Account',
  required: true,
  description: 'Sanity project/account identifier that must match the registry entry.',
};
const DELIVERY_ID: EndpointHeader = {
  name: 'Idempotency-Key',
  required: true,
  description: 'Sanity delivery identifier used to deduplicate the durable inbox.',
};

export const endpoints: readonly EndpointDef[] = [
  {
    operationId: 'getHealth',
    method: 'GET',
    path: '/api/v1/health',
    summary: 'Liveness check.',
    auth: 'public',
    successStatus: 200,
    response: healthResponseSchema,
  },

  // Staff — bootstrap and workspace access
  {
    operationId: 'listStaffWorkspaces',
    method: 'GET',
    path: '/api/v1/staff/workspaces',
    summary: "List the actor's active memberships.",
    auth: 'staff',
    successStatus: 200,
    response: staffWorkspacesResponseSchema,
  },
  {
    operationId: 'getStaffWorkspaceAccess',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/access',
    summary: "Re-read the actor's membership, roles and permissions for a workspace.",
    auth: 'staff',
    successStatus: 200,
    response: staffWorkspaceAccessResponseSchema,
  },
  {
    operationId: 'inviteStaff',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/invitations',
    summary: 'Invite a staff member (Owner, aal2).',
    auth: 'staff',
    successStatus: 201,
    request: inviteStaffRequestSchema,
    response: inviteStaffResponseSchema,
  },
  {
    operationId: 'revokeStaff',
    method: 'DELETE',
    path: '/api/v1/staff/workspaces/{workspaceId}/memberships/{membershipId}',
    summary: 'Revoke a membership (Owner, aal2).',
    auth: 'staff',
    successStatus: 200,
    response: revokeStaffResponseSchema,
  },
  {
    operationId: 'listServiceCredentials',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/service-credentials',
    summary: 'List website service credentials (Owner, aal2).',
    auth: 'staff',
    successStatus: 200,
    response: listServiceCredentialsResponseSchema,
  },
  {
    operationId: 'createServiceCredential',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/service-credentials',
    summary: 'Create a website service credential; the secret is returned once (Owner, aal2).',
    auth: 'staff',
    successStatus: 201,
    request: createServiceCredentialRequestSchema,
    response: createServiceCredentialResponseSchema,
  },
  {
    operationId: 'revokeServiceCredential',
    method: 'DELETE',
    path: '/api/v1/staff/workspaces/{workspaceId}/service-credentials/{credentialId}',
    summary: 'Revoke a website service credential (Owner, aal2).',
    auth: 'staff',
    successStatus: 200,
    response: revokeServiceCredentialResponseSchema,
  },

  // Staff — leads
  {
    operationId: 'listWorkspaceLeads',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/leads',
    summary: 'List leads in a workspace, with attribution.',
    auth: 'staff',
    successStatus: 200,
    query: listWorkspaceLeadsQuerySchema,
    response: listWorkspaceLeadsResponseSchema,
  },
  {
    operationId: 'getCatalogueStatus',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/catalogue',
    summary: 'Read catalogue sync state and current offer versions.',
    auth: 'staff',
    successStatus: 200,
    response: catalogueStatusResponseSchema,
  },
  {
    operationId: 'listWorkspaceJobs',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/jobs',
    summary: 'List pending and failed workspace outbox jobs.',
    auth: 'staff',
    successStatus: 200,
    response: listWorkspaceJobsResponseSchema,
  },
  {
    operationId: 'retryWorkspaceJob',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/jobs/{jobId}/retry',
    summary: 'Retry a failed workspace outbox job (integration management).',
    auth: 'staff',
    successStatus: 200,
    response: retryWorkspaceJobResponseSchema,
  },

  // Staff — order processing
  {
    operationId: 'listWorkspaceOrders',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders',
    summary: 'List orders in a workspace with filters and bounded search.',
    auth: 'staff',
    successStatus: 200,
    query: listWorkspaceOrdersQuerySchema,
    response: listWorkspaceOrdersResponseSchema,
  },
  {
    operationId: 'listOrderAssignees',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/members',
    summary: 'List the active staff members of this workspace as assignee options.',
    auth: 'staff',
    successStatus: 200,
    response: listAssignableMembersResponseSchema,
  },
  {
    operationId: 'bulkAssignOrders',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/bulk-assign',
    summary: 'Assign several orders, reporting a per-order result.',
    auth: 'staff',
    successStatus: 200,
    request: bulkAssignOrdersRequestSchema,
    response: bulkAssignOrdersResponseSchema,
  },
  {
    operationId: 'getWorkspaceOrder',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}',
    summary: 'Read one order with its snapshot, history, notes and change requests.',
    auth: 'staff',
    successStatus: 200,
    response: getWorkspaceOrderResponseSchema,
  },
  {
    operationId: 'patchWorkspaceOrder',
    method: 'PATCH',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}',
    summary:
      'Apply a status transition (dispatch/activate/cancel) with an expected record version.',
    auth: 'staff',
    successStatus: 200,
    request: patchWorkspaceOrderRequestSchema,
    response: patchWorkspaceOrderResponseSchema,
  },
  {
    operationId: 'patchOrderAssignee',
    method: 'PATCH',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/assignee',
    summary: 'Assign or unassign one order to an active workspace member.',
    auth: 'staff',
    successStatus: 200,
    request: patchOrderAssigneeRequestSchema,
    response: patchWorkspaceOrderResponseSchema,
  },
  {
    operationId: 'patchOrderArchive',
    method: 'PATCH',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/archive',
    summary: 'Archive or restore an order (a visibility action, never deletion).',
    auth: 'staff',
    successStatus: 200,
    request: patchOrderArchiveRequestSchema,
    response: patchWorkspaceOrderResponseSchema,
  },
  {
    operationId: 'listOrderNotes',
    method: 'GET',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/notes',
    summary: 'List the operational notes on an order.',
    auth: 'staff',
    successStatus: 200,
    response: listOrderNotesResponseSchema,
  },
  {
    operationId: 'createOrderNote',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/notes',
    summary: 'Add an operational note to an order.',
    auth: 'staff',
    successStatus: 201,
    request: createOrderNoteRequestSchema,
    response: listOrderNotesResponseSchema,
  },
  {
    operationId: 'createOrderReminder',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/reminders',
    summary: 'Schedule a follow-up reminder on an order.',
    auth: 'staff',
    successStatus: 201,
    request: createOrderReminderRequestSchema,
    response: createOrderReminderResponseSchema,
  },
  {
    operationId: 'deleteOrderReminder',
    method: 'DELETE',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/reminders/{reminderId}',
    summary: 'Cancel a scheduled follow-up reminder.',
    auth: 'staff',
    successStatus: 200,
    response: deleteOrderReminderResponseSchema,
  },
  {
    operationId: 'createOrderChangeRequest',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/change-requests',
    summary: 'Record a customer change request for staff approval.',
    auth: 'staff',
    successStatus: 201,
    request: createOrderChangeRequestRequestSchema,
    response: createOrderChangeRequestResponseSchema,
  },
  {
    operationId: 'approveOrderChangeRequest',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/change-requests/{changeRequestId}/approve',
    summary: 'Approve a change request; writes one audited amendment and applies it.',
    auth: 'staff',
    successStatus: 200,
    request: resolveOrderChangeRequestRequestSchema,
    response: resolveOrderChangeRequestResponseSchema,
  },
  {
    operationId: 'rejectOrderChangeRequest',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/change-requests/{changeRequestId}/reject',
    summary: 'Reject a change request without changing the order.',
    auth: 'staff',
    successStatus: 200,
    request: resolveOrderChangeRequestRequestSchema,
    response: resolveOrderChangeRequestResponseSchema,
  },
  {
    operationId: 'recordOrderPayment',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/payments',
    summary: 'Record a manual payment and update the payment state atomically.',
    auth: 'staff',
    successStatus: 201,
    request: recordOrderPaymentRequestSchema,
    response: recordOrderPaymentResponseSchema,
  },

  // Staff — partners
  {
    operationId: 'changeCommissionState',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/partners/{partnerId}/commissions',
    summary: 'Advance a commission line state (Finance/Owner).',
    auth: 'staff',
    successStatus: 200,
    request: changeCommissionStateRequestSchema,
    response: changeCommissionStateResponseSchema,
  },
  {
    operationId: 'partnerInvoice',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/partners/{partnerId}/invoices',
    summary: 'Generate or approve a partner invoice (Finance/Owner).',
    auth: 'staff',
    successStatus: 200,
    request: partnerInvoiceRequestSchema,
    response: partnerInvoiceResponseSchema,
  },

  // Staff — exports (Phase B seam)
  {
    operationId: 'createExport',
    method: 'POST',
    path: '/api/v1/staff/workspaces/{workspaceId}/exports',
    summary: 'Queue a controlled data export (Phase B; Owner or export permission).',
    auth: 'staff',
    successStatus: 202,
    request: createExportRequestSchema,
    response: createExportResponseSchema,
  },

  // Website — lead-to-order journey
  {
    operationId: 'listWebsiteOffers',
    method: 'GET',
    path: '/api/v1/website/offers',
    summary: 'List the published offers this website credential may quote.',
    auth: 'website',
    successStatus: 200,
    response: listWebsiteOffersResponseSchema,
  },
  {
    operationId: 'createLead',
    method: 'POST',
    path: '/api/v1/website/leads',
    summary: 'Create a lead draft with attribution.',
    auth: 'website',
    successStatus: 201,
    request: createLeadRequestSchema,
    response: createLeadResponseSchema,
  },
  {
    operationId: 'updateLead',
    method: 'PATCH',
    path: '/api/v1/website/leads/{leadId}',
    summary: 'Resume and update a draft.',
    auth: 'website',
    successStatus: 200,
    request: updateLeadRequestSchema,
    response: updateLeadResponseSchema,
    headers: [DRAFT_GRANT],
  },
  {
    operationId: 'createQuote',
    method: 'POST',
    path: '/api/v1/quotes',
    summary: 'Issue a server-authoritative quote.',
    auth: 'website',
    successStatus: 201,
    request: createQuoteRequestSchema,
    response: createQuoteResponseSchema,
    headers: [DRAFT_GRANT],
  },
  {
    operationId: 'submitOrder',
    method: 'POST',
    path: '/api/v1/orders',
    summary: 'Submit one final order; idempotent per scoped key.',
    auth: 'website',
    successStatus: 201,
    request: submitOrderRequestSchema,
    response: submitOrderResponseSchema,
    headers: [DRAFT_GRANT, IDEMPOTENCY_KEY],
  },
  {
    operationId: 'createUploadIntent',
    method: 'POST',
    path: '/api/v1/website/uploads/intents',
    summary: 'Authorise a direct-to-R2 document upload.',
    auth: 'website',
    successStatus: 201,
    request: createUploadIntentRequestSchema,
    response: createUploadIntentResponseSchema,
  },
  {
    operationId: 'finalizeUpload',
    method: 'POST',
    path: '/api/v1/website/uploads/{uploadId}/finalize',
    summary: 'Verify and attach an uploaded document by signature and checksum.',
    auth: 'website',
    successStatus: 200,
    request: finalizeUploadRequestSchema,
    response: finalizeUploadResponseSchema,
  },
  {
    operationId: 'createDownloadLink',
    method: 'POST',
    path: '/api/v1/website/files/{fileId}/download-link',
    summary: 'Issue a short-lived signed download URL after a permission check.',
    auth: 'website',
    successStatus: 200,
    response: createDownloadLinkResponseSchema,
  },
  {
    operationId: 'requestTrackingOtp',
    method: 'POST',
    path: '/api/v1/website/tracking/otp',
    summary: 'Request or verify an order-tracking OTP.',
    auth: 'website',
    successStatus: 200,
    request: trackingOtpRequestSchema,
    response: trackingOtpResponseSchema,
  },
  {
    operationId: 'getTracking',
    method: 'GET',
    path: '/api/v1/website/tracking',
    summary: 'Read order-tracking status with a verified customer grant.',
    auth: 'customer',
    successStatus: 200,
    response: trackingStatusResponseSchema,
    headers: [CUSTOMER_GRANT],
  },

  // Machine — signed provider webhooks
  {
    operationId: 'deliverWebhook',
    method: 'POST',
    path: '/api/v1/webhooks/sanity',
    summary: 'Durable inbox for a signed Sanity event.',
    auth: 'machine',
    successStatus: 200,
    request: webhookDeliveryRequestSchema,
    response: webhookAckResponseSchema,
    headers: [WEBHOOK_SELECTOR, PROVIDER_ACCOUNT, WEBHOOK_SIGNATURE, DELIVERY_ID],
  },
];
