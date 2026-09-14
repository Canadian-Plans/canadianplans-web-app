import {
  apiErrorResponseSchema,
  healthResponseSchema,
  inviteStaffResponseSchema,
  revokeStaffResponseSchema,
  staffWorkspaceAccessResponseSchema,
  staffWorkspacesResponseSchema,
  type HealthResponse,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type RevokeStaffResponse,
  type StaffAuthErrorCode,
  type StaffWorkspaceAccessResponse,
  type StaffWorkspacesResponse,
} from '@canadian-plans/contracts';

const API_BASE_URL =
  process.env['NEXT_PUBLIC_API_BASE_URL'] ?? process.env['API_BASE_URL'] ?? 'http://localhost:4000';

export class BackendError extends Error {
  constructor(
    readonly code: StaffAuthErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = 'BackendError';
  }
}

async function staffRequest(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...init?.headers,
      authorization: `Bearer ${accessToken}`,
    },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = apiErrorResponseSchema.safeParse(body);
    throw new BackendError(
      error.success ? error.data.error.code : 'internal_error',
      response.status,
    );
  }
  return body;
}

/** Public liveness check; staff data calls below always carry a bearer session. */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/health`);

  if (!res.ok) {
    throw new Error(`backend health check failed with status ${res.status}`);
  }

  return healthResponseSchema.parse(await res.json());
}

export async function getStaffWorkspaces(accessToken: string): Promise<StaffWorkspacesResponse> {
  return staffWorkspacesResponseSchema.parse(
    await staffRequest('/api/v1/staff/workspaces', accessToken),
  );
}

export async function getStaffWorkspaceAccess(
  accessToken: string,
  workspaceId: string,
): Promise<StaffWorkspaceAccessResponse> {
  return staffWorkspaceAccessResponseSchema.parse(
    await staffRequest(`/api/v1/staff/workspaces/${workspaceId}/access`, accessToken),
  );
}

export async function inviteStaff(
  accessToken: string,
  workspaceId: string,
  input: InviteStaffRequest,
): Promise<InviteStaffResponse> {
  return inviteStaffResponseSchema.parse(
    await staffRequest(`/api/v1/staff/workspaces/${workspaceId}/invitations`, accessToken, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
}

export async function revokeStaff(
  accessToken: string,
  workspaceId: string,
  membershipId: string,
): Promise<RevokeStaffResponse> {
  return revokeStaffResponseSchema.parse(
    await staffRequest(
      `/api/v1/staff/workspaces/${workspaceId}/memberships/${membershipId}`,
      accessToken,
      { method: 'DELETE' },
    ),
  );
}
