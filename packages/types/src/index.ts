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

/**
 * Scopes a storefront service credential may hold. The public website may only
 * create/resume its own drafts and request quotes/orders/uploads/tracking; it
 * can never list records or take a staff action (PLATFORM_CONTEXT.md §5).
 */
export const websiteScopeNames = tuple(
  'leads:write',
  'quotes:create',
  'orders:create',
  'uploads:customer',
  'tracking:otp',
);
export type WebsiteScopeName = (typeof websiteScopeNames)[number];

/** Distinguishes how a request authenticated, so a staff-only route can refuse a website caller. */
export const callerTypes = tuple('staff', 'website', 'machine');
export type CallerType = (typeof callerTypes)[number];

/**
 * Scopes a verified machine identity may hold. Scheduler identities in the
 * server-only registry (PLATFORM_CONTEXT.md §4b) are granted an explicit subset.
 */
export const machineScopeNames = tuple('outbox:run', 'reconcile:run', 'synthetic:check');
export type MachineScopeName = (typeof machineScopeNames)[number];
