import {
  BackendError,
  createBackendClient,
  type BulkAssignOrdersRequest,
  type BulkAssignOrdersResponse,
  type CreateOrderChangeRequestRequest,
  type CreateOrderChangeRequestResponse,
  type CreateOrderNoteRequest,
  type CreateOrderReminderRequest,
  type CreateOrderReminderResponse,
  type CreateServiceCredentialRequest,
  type CreateServiceCredentialResponse,
  type CatalogueStatusResponse,
  type ChangeCommissionStateRequest,
  type ChangeCommissionStateResponse,
  type DeleteOrderReminderResponse,
  type ListPartnersResponse,
  type PartnerDetailResponse,
  type GetWorkspaceOrderResponse,
  type HealthResponse,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type ListAssignableMembersResponse,
  type ListOrderNotesResponse,
  type ListServiceCredentialsResponse,
  type ListWorkspaceLeadsQuery,
  type ListWorkspaceLeadsResponse,
  type ListWorkspaceJobsResponse,
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
  type RetryWorkspaceJobResponse,
  type RevokeServiceCredentialResponse,
  type RevokeStaffResponse,
  type SourceReportQuery,
  type SourceReportResponse,
  type StaffWorkspaceAccessResponse,
  type StaffWorkspacesResponse,
} from '@canadian-plans/contracts';

const API_BASE_URL =
  process.env['NEXT_PUBLIC_API_BASE_URL'] ?? process.env['API_BASE_URL'] ?? 'http://localhost:4000';

/**
 * Admin's staff-facing calls. Every request goes through the one typed client
 * in `@canadian-plans/contracts` (createBackendClient), so admin and the
 * storefronts share request/response types, response validation and transport
 * hardening. The staff Supabase access token is the client's bearer credential.
 */
export { BackendError };

function client(accessToken: string) {
  return createBackendClient({ baseUrl: API_BASE_URL, credential: accessToken });
}

/** Public liveness check; no session required. */
export async function getHealth(): Promise<HealthResponse> {
  return createBackendClient({ baseUrl: API_BASE_URL, credential: '' }).health();
}

export async function getStaffWorkspaces(accessToken: string): Promise<StaffWorkspacesResponse> {
  return client(accessToken).staff.listWorkspaces();
}

export async function getStaffWorkspaceAccess(
  accessToken: string,
  workspaceId: string,
): Promise<StaffWorkspaceAccessResponse> {
  return client(accessToken).staff.workspaceAccess(workspaceId);
}

export async function inviteStaff(
  accessToken: string,
  workspaceId: string,
  input: InviteStaffRequest,
): Promise<InviteStaffResponse> {
  return client(accessToken).staff.invite(workspaceId, input);
}

export async function revokeStaff(
  accessToken: string,
  workspaceId: string,
  membershipId: string,
): Promise<RevokeStaffResponse> {
  return client(accessToken).staff.revokeMembership(workspaceId, membershipId);
}

export async function listServiceCredentials(
  accessToken: string,
  workspaceId: string,
): Promise<ListServiceCredentialsResponse> {
  return client(accessToken).staff.listServiceCredentials(workspaceId);
}

export async function createServiceCredential(
  accessToken: string,
  workspaceId: string,
  input: CreateServiceCredentialRequest,
): Promise<CreateServiceCredentialResponse> {
  return client(accessToken).staff.createServiceCredential(workspaceId, input);
}

export async function revokeServiceCredential(
  accessToken: string,
  workspaceId: string,
  credentialId: string,
): Promise<RevokeServiceCredentialResponse> {
  return client(accessToken).staff.revokeServiceCredential(workspaceId, credentialId);
}

export async function getStaffLeads(
  accessToken: string,
  workspaceId: string,
  query?: ListWorkspaceLeadsQuery,
): Promise<ListWorkspaceLeadsResponse> {
  return client(accessToken).staff.listLeads(workspaceId, query);
}

export async function getCatalogueStatus(
  accessToken: string,
  workspaceId: string,
): Promise<CatalogueStatusResponse> {
  return client(accessToken).staff.catalogue(workspaceId);
}

export async function getSourceReport(
  accessToken: string,
  workspaceId: string,
  query?: SourceReportQuery,
): Promise<SourceReportResponse> {
  return client(accessToken).staff.getSourceReport(workspaceId, query);
}

export async function listWorkspaceJobs(
  accessToken: string,
  workspaceId: string,
): Promise<ListWorkspaceJobsResponse> {
  return client(accessToken).staff.listJobs(workspaceId);
}

export async function retryWorkspaceJob(
  accessToken: string,
  workspaceId: string,
  jobId: string,
): Promise<RetryWorkspaceJobResponse> {
  return client(accessToken).staff.retryJob(workspaceId, jobId);
}

// ---- Order processing (T14). Every write is a backend endpoint; the admin
// holds no transition, payment or amendment logic of its own. ----

export async function listWorkspaceOrders(
  accessToken: string,
  workspaceId: string,
  query?: ListWorkspaceOrdersQuery,
): Promise<ListWorkspaceOrdersResponse> {
  return client(accessToken).staff.listOrders(workspaceId, query);
}

export async function listOrderAssignees(
  accessToken: string,
  workspaceId: string,
): Promise<ListAssignableMembersResponse> {
  return client(accessToken).staff.listOrderAssignees(workspaceId);
}

export async function getWorkspaceOrder(
  accessToken: string,
  workspaceId: string,
  orderId: string,
): Promise<GetWorkspaceOrderResponse> {
  return client(accessToken).staff.getOrder(workspaceId, orderId);
}

export async function patchWorkspaceOrder(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  body: PatchWorkspaceOrderRequest,
): Promise<PatchWorkspaceOrderResponse> {
  return client(accessToken).staff.patchOrder(workspaceId, orderId, body);
}

export async function patchOrderAssignee(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  body: PatchOrderAssigneeRequest,
): Promise<PatchWorkspaceOrderResponse> {
  return client(accessToken).staff.patchOrderAssignee(workspaceId, orderId, body);
}

export async function patchOrderArchive(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  body: PatchOrderArchiveRequest,
): Promise<PatchWorkspaceOrderResponse> {
  return client(accessToken).staff.patchOrderArchive(workspaceId, orderId, body);
}

export async function bulkAssignOrders(
  accessToken: string,
  workspaceId: string,
  body: BulkAssignOrdersRequest,
): Promise<BulkAssignOrdersResponse> {
  return client(accessToken).staff.bulkAssignOrders(workspaceId, body);
}

export async function listOrderNotes(
  accessToken: string,
  workspaceId: string,
  orderId: string,
): Promise<ListOrderNotesResponse> {
  return client(accessToken).staff.listOrderNotes(workspaceId, orderId);
}

export async function createOrderNote(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  body: CreateOrderNoteRequest,
): Promise<ListOrderNotesResponse> {
  return client(accessToken).staff.createOrderNote(workspaceId, orderId, body);
}

export async function createOrderReminder(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  body: CreateOrderReminderRequest,
): Promise<CreateOrderReminderResponse> {
  return client(accessToken).staff.createOrderReminder(workspaceId, orderId, body);
}

export async function deleteOrderReminder(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  reminderId: string,
): Promise<DeleteOrderReminderResponse> {
  return client(accessToken).staff.deleteOrderReminder(workspaceId, orderId, reminderId);
}

export async function createOrderChangeRequest(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  body: CreateOrderChangeRequestRequest,
): Promise<CreateOrderChangeRequestResponse> {
  return client(accessToken).staff.createOrderChangeRequest(workspaceId, orderId, body);
}

export async function resolveOrderChangeRequest(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  changeRequestId: string,
  decision: 'approve' | 'reject',
  body: ResolveOrderChangeRequestRequest,
): Promise<ResolveOrderChangeRequestResponse> {
  const staff = client(accessToken).staff;
  return decision === 'approve'
    ? staff.approveOrderChangeRequest(workspaceId, orderId, changeRequestId, body)
    : staff.rejectOrderChangeRequest(workspaceId, orderId, changeRequestId, body);
}

export async function recordOrderPayment(
  accessToken: string,
  workspaceId: string,
  orderId: string,
  body: RecordOrderPaymentRequest,
): Promise<RecordOrderPaymentResponse> {
  return client(accessToken).staff.recordOrderPayment(workspaceId, orderId, body);
}

// ---- Partners and commissions (T19). Directory and payout actions go through
// the backend; the admin holds no commission rules of its own. ----

export async function listPartners(
  accessToken: string,
  workspaceId: string,
): Promise<ListPartnersResponse> {
  return client(accessToken).staff.listPartners(workspaceId);
}

export async function getPartner(
  accessToken: string,
  workspaceId: string,
  partnerId: string,
): Promise<PartnerDetailResponse> {
  return client(accessToken).staff.getPartner(workspaceId, partnerId);
}

export async function changeCommissionState(
  accessToken: string,
  workspaceId: string,
  partnerId: string,
  body: ChangeCommissionStateRequest,
): Promise<ChangeCommissionStateResponse> {
  return client(accessToken).staff.changeCommissionState(workspaceId, partnerId, body);
}
