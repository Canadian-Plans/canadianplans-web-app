import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const pnpm = process.env.npm_execpath;
assert.ok(pnpm, 'Run through pnpm run test:e2e.');
// Compile only a synthetic public key. The browser fixture replaces the external
// provider; no verification request is sent to Cloudflare by this test workflow.
const env = { ...process.env, NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'e2e-public-site-key' };
for (const args of [
  ['exec', 'next', 'build'],
  ['exec', 'playwright', 'test', ...process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, [pnpm, ...args], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
