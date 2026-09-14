import {
  BackendError,
  createBackendClient,
  type CreateServiceCredentialRequest,
  type CreateServiceCredentialResponse,
  type HealthResponse,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type ListServiceCredentialsResponse,
  type RevokeServiceCredentialResponse,
  type RevokeStaffResponse,
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
