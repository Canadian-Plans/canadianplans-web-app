// Hand-written companion to dist/vercelHandler.js (see tsup.config.ts for
// why). The shape is trivial - createApp()'s return type - so this avoids
// running tsup's own `dts` type-bundler, which fails on an unrelated
// deprecated `baseUrl` warning-as-error elsewhere in the dependency graph.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dtsPath = fileURLToPath(new URL('../dist/vercelHandler.d.ts', import.meta.url));
writeFileSync(
  dtsPath,
  "import type { Express } from 'express';\ndeclare const app: Express;\nexport default app;\n",
);
