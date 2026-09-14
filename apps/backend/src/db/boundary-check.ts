// Proves apps/backend is allowed to import @canadian-plans/db — the same
// import from apps/admin is an ESLint error (see eslint.config.js and
// PLATFORM_CONTEXT.md §4 invariant 3).
import { workspaces } from '@canadian-plans/db';

export const dbImportBoundaryCheck: boolean = Boolean(workspaces);
