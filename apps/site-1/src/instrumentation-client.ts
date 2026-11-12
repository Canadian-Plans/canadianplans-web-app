/**
 * Runs in the browser before the app's own code (Next.js file convention).
 *
 * zod compiles object schemas with `new Function` when it can. The storefront's
 * Content-Security-Policy forbids eval, so zod's probe for it fails safely, but
 * the browser still records a CSP violation on every page that validates a form
 * (order, track, the preview forms). `jitless` tells zod not to probe at all.
 *
 * This sets the same object `z.config({ jitless: true })` writes to, without
 * importing zod here: an import would put the library in every page's bundle.
 * `instrumentation-client.test.ts` fails if a zod upgrade stops reading it.
 */
const zodGlobal = globalThis as { __zod_globalConfig?: { jitless?: boolean } };
(zodGlobal.__zod_globalConfig ??= {}).jitless = true;

export {};
