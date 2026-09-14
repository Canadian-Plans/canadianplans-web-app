import { z } from 'zod';

import { membershipStatuses, staffPermissionNames, staffRoleNames } from '@canadian-plans/types';

import { websiteAuthErrorCodeSchema } from './website-auth';

export const staffRoleNameSchema = z.enum(staffRoleNames);
export const staffPermissionNameSchema = z.enum(staffPermissionNames);
export const membershipStatusSchema = z.enum(membershipStatuses);

export const staffAuthErrorCodeSchema = z.enum([
  'invalid_request',
  'missing_session',
  'invalid_session',
  'workspace_not_found',
  'membership_missing',
  'membership_pending',
  'membership_revoked',
  'permission_denied',
  'mfa_required',
  'membership_not_found',
  'membership_conflict',
  'internal_error',
]);

export type StaffAuthErrorCode = z.infer<typeof staffAuthErrorCodeSchema>;

/**
 * Every `/api/v1` error code: staff, website credential, and machine identity.
 * One envelope validates all callers so the admin client and storefront share
 * a single error shape.
 */
export const authErrorCodeSchema = z.enum([
  ...staffAuthErrorCodeSchema.options,
  ...websiteAuthErrorCodeSchema.options,
]);

export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: authErrorCodeSchema,
    message: z.string(),
    requestId: z.uuid(),
  }),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export const staffWorkspaceSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  membershipId: z.uuid(),
  roles: z.array(staffRoleNameSchema),
});

export type StaffWorkspace = z.infer<typeof staffWorkspaceSchema>;

export const staffWorkspacesResponseSchema = z.object({
  workspaces: z.array(staffWorkspaceSchema),
  requestId: z.uuid(),
});

export type StaffWorkspacesResponse = z.infer<typeof staffWorkspacesResponseSchema>;

export const staffWorkspaceAccessResponseSchema = z.object({
  workspace: staffWorkspaceSchema,
  permissions: z.array(staffPermissionNameSchema),
  requestId: z.uuid(),
});

export type StaffWorkspaceAccessResponse = z.infer<typeof staffWorkspaceAccessResponseSchema>;

export const inviteStaffRequestSchema = z.object({
  email: z.email().max(254),
  roles: z.array(staffRoleNameSchema).min(1).max(staffRoleNames.length),
});

export type InviteStaffRequest = z.infer<typeof inviteStaffRequestSchema>;

export const inviteStaffResponseSchema = z.object({
  membershipId: z.uuid(),
  status: z.literal('pending'),
  requestId: z.uuid(),
});

export type InviteStaffResponse = z.infer<typeof inviteStaffResponseSchema>;

export const revokeStaffResponseSchema = z.object({
  membershipId: z.uuid(),
  status: z.literal('revoked'),
  requestId: z.uuid(),
});

export type RevokeStaffResponse = z.infer<typeof revokeStaffResponseSchema>;
