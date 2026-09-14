/**
 * @canadian-plans/types — shared domain TypeScript types.
 *
 * No domain types are defined yet: Phase A's real shapes (workspace, offer,
 * quote, order, etc.) land with A1/A2. This placeholder proves the package
 * resolves and type-checks before any app depends on it.
 */
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

const tuple = <const Values extends readonly string[]>(...values: Values): Values => values;

export const staffRoleNames = tuple('owner', 'orders', 'partners', 'finance', 'content', 'viewer');
export type StaffRoleName = (typeof staffRoleNames)[number];

export const staffPermissionNames = tuple(
  'document_download',
  'financial_data',
  'bulk_export',
  'deletion',
  'invoice_approval',
  'integration_management',
);
export type StaffPermissionName = (typeof staffPermissionNames)[number];

export const permissionEffects = tuple('allow', 'deny');
export type PermissionEffect = (typeof permissionEffects)[number];

export const membershipStatuses = tuple('pending', 'active', 'revoked');
export type MembershipStatus = (typeof membershipStatuses)[number];
