/**
 * @canadian-plans/types — shared domain TypeScript types.
 *
 * No domain types are defined yet: Phase A's real shapes (workspace, offer,
 * quote, order, etc.) land with A1/A2. This placeholder proves the package
 * resolves and type-checks before any app depends on it.
 */
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };
