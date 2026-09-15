import { defineConfig } from 'tsup';

/**
 * Vercel's Node.js Function builder transpiles this app's own `.ts` sources
 * but does not transpile TypeScript resolved through `node_modules` -
 * including `@canadian-plans/*` workspace packages, whose package.json
 * `exports` point directly at `.ts` source (deliberately, so tools that do
 * understand TypeScript - our own tsc/vitest, and Next.js's bundler for
 * admin/site-1 - consume it directly with no separate build step). Bundle
 * those workspace packages into this output (`noExternal`) so the deployed
 * function is fully self-contained; leave real npm dependencies external
 * since they already ship plain JS. `splitting: false` avoids a shared
 * chunk file, since Vercel's build takes only the entry file per function.
 *
 * dist/vercelHandler.d.ts (written by scripts/write-vercel-handler-dts.mjs,
 * run after this build) exists for the same reason: Vercel's separate
 * type-check pass inspects api/index.ts (the function entrypoint it
 * auto-discovers) regardless of this project's tsconfig `include`, and
 * under `strict` an untyped `.js` import is an error (TS7016) without a
 * declaration file. tsup's own `dts` option was tried first but its
 * type-bundler fails on an unrelated deprecated `baseUrl` warning-as-error
 * surfaced from elsewhere in the dependency graph; the actual shape here
 * is trivial enough that hand-writing it sidesteps that entirely.
 */
export default defineConfig({
  entry: { vercelHandler: 'src/vercelHandler.ts', 'src/server': 'src/server.ts' },
  format: 'esm',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  noExternal: [/^@canadian-plans\//],
});
