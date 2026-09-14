import type {
  MembershipStatus,
  PermissionEffect,
  StaffPermissionName,
  StaffRoleName,
} from '@canadian-plans/types';

import type { AssuranceLevel } from '../auth/session.js';

const tuple = <const Values extends readonly string[]>(...values: Values): Values => values;

const actionNames = tuple(
  'workspace.read',
  'staff.invite',
  'staff.remove',
  'staff.roles.manage',
  'document.download',
  'financial.read',
  'export.bulk',
  'record.delete',
  'invoice.approve',
  'integration.manage',
);

export type StaffAction = (typeof actionNames)[number];

const actions = (...values: StaffAction[]): ReadonlySet<StaffAction> => new Set(values);

const roleActions = {
  owner: actions(...actionNames),
  orders: actions('workspace.read'),
  partners: actions('workspace.read'),
  finance: actions('workspace.read', 'financial.read', 'invoice.approve'),
  content: actions('workspace.read'),
  viewer: actions('workspace.read'),
} satisfies Record<StaffRoleName, ReadonlySet<StaffAction>>;

const permissionActions = {
  document_download: 'document.download',
  financial_data: 'financial.read',
  bulk_export: 'export.bulk',
  deletion: 'record.delete',
  invoice_approval: 'invoice.approve',
  integration_management: 'integration.manage',
} satisfies Record<StaffPermissionName, StaffAction>;

const privilegedActions = new Set<StaffAction>([
  'staff.invite',
  'staff.remove',
  'staff.roles.manage',
  'document.download',
  'financial.read',
  'export.bulk',
  'record.delete',
  'invoice.approve',
  'integration.manage',
]);

export interface IndividualPermission {
  name: StaffPermissionName;
  effect: PermissionEffect;
}

export interface StaffAccessSnapshot {
  membershipId: string;
  status: MembershipStatus;
  roles: readonly StaffRoleName[];
  permissions: readonly IndividualPermission[];
}

export interface StaffAccessStore {
  loadStaffAccess(actorId: string, workspaceId: string): Promise<StaffAccessSnapshot | undefined>;
}

export type AuthorizationAllowReason = 'role_allowed' | 'individual_allowed';

export type AuthorizationDenyReason =
  | 'membership_missing'
  | 'membership_pending'
  | 'membership_revoked'
  | 'permission_denied'
  | 'mfa_required';

export type AuthorizationReason = AuthorizationAllowReason | AuthorizationDenyReason;

export type AuthorizationDecision =
  | { allowed: true; reason: AuthorizationAllowReason; access: StaffAccessSnapshot }
  | { allowed: false; reason: AuthorizationDenyReason };

export interface AuthorizeInput {
  actorId: string;
  workspaceId: string;
  action: StaffAction;
}

export function createAuthorize(options: {
  accessStore: StaffAccessStore;
  assuranceLevel: AssuranceLevel;
}) {
  return async function authorize(input: AuthorizeInput): Promise<AuthorizationDecision> {
    const access = await options.accessStore.loadStaffAccess(input.actorId, input.workspaceId);
    if (!access) return { allowed: false, reason: 'membership_missing' };
    if (access.status === 'pending') return { allowed: false, reason: 'membership_pending' };
    if (access.status === 'revoked') return { allowed: false, reason: 'membership_revoked' };

    const matchingOverrides = access.permissions.filter(
      (permission) => permissionActions[permission.name] === input.action,
    );
    if (matchingOverrides.some((permission) => permission.effect === 'deny')) {
      return { allowed: false, reason: 'permission_denied' };
    }

    const individualAllowed = matchingOverrides.some((permission) => permission.effect === 'allow');
    const roleAllowed = access.roles.some((role) => roleActions[role].has(input.action));
    if (!individualAllowed && !roleAllowed) {
      return { allowed: false, reason: 'permission_denied' };
    }

    const mfaRole = access.roles.some((role) => role === 'owner' || role === 'finance');
    if (mfaRole && privilegedActions.has(input.action) && options.assuranceLevel !== 'aal2') {
      return { allowed: false, reason: 'mfa_required' };
    }

    return {
      allowed: true,
      reason: individualAllowed ? 'individual_allowed' : 'role_allowed',
      access,
    };
  };
}
