// Vercel's Node.js runtime accepts a plain (req, res) => void handler, and an
// Express app already has that shape — no adapter package needed. vercel.json
// rewrites every path to this one function.
//
// This file only re-exports the built handler rather than creating the app
// itself: Vercel's Node.js Function builder transpiles this file but does
// not transpile TypeScript resolved through `node_modules` (including
// `@canadian-plans/*` workspace packages, whose `exports` point at `.ts`
// source for tools that do understand TypeScript directly — our own
// tsc/vitest, and Next.js's bundler for admin/site-1). `pnpm run build`
// (tsup, see tsup.config.ts) bundles every workspace import into
// `../dist/vercelHandler.js` before Vercel processes this directory, so all
// this file needs is a plain relative import Vercel's function tracer can
// include as-is.
export { default } from '../dist/vercelHandler.js';
