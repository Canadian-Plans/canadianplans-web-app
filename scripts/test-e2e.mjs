import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// The storefront's browser suites, then its client-bundle security check. Both
// run against the CRM stub in apps/site-1/e2e/crm-stub: no database, no secret.
// Extra arguments go to Playwright in both, e.g. `pnpm run test:e2e --trace off`.
const pnpm = process.env.npm_execpath;
assert.ok(pnpm, 'Run through pnpm run test:e2e.');
for (const script of ['test:e2e', 'test:security']) {
  const result = spawnSync(
    process.execPath,
    [pnpm, '--filter', 'site-1', 'run', script, ...process.argv.slice(2)],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
