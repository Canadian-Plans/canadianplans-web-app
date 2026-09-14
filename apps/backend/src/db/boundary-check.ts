// Proves apps/backend is allowed to import @canadian-plans/db — the same
// import from apps/admin is an ESLint error (see eslint.config.js and
// PLATFORM_CONTEXT.md §4 invariant 3). No real DB code yet; that lands in
// T4 alongside the actual schema.
import { DB_PACKAGE_PLACEHOLDER } from '@canadian-plans/db';

export const dbImportBoundaryCheck: boolean = DB_PACKAGE_PLACEHOLDER;
