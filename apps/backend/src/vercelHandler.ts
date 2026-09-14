import { createApp } from './app.js';

/**
 * Built (not run directly) by tsup into a single self-contained
 * `dist/vercelHandler.js` with every `@canadian-plans/*` workspace package
 * inlined — see `api/index.ts` and `tsup.config.ts` for why.
 */
export default createApp();
