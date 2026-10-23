import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

/**
 * CQ-01: builds the admin into `.next-e2e` with the browser-test session seam
 * and the harness backend URL compiled in, then runs the order journeys
 * against the real backend harness. The normal `.next` build is left alone.
 */
const pnpm = process.env.npm_execpath;
assert.ok(pnpm, 'Run through pnpm run test:e2e:orders.');
const env = {
  ...process.env,
  ADMIN_DIST_DIR: '.next-e2e',
  NEXT_PUBLIC_E2E_STAFF_BEARER: process.env.E2E_STAFF_BEARER ?? 'e2e-staff-session-owner-aal2',
  NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:4200',
};
delete env.NEXT_PUBLIC_SUPABASE_URL;
delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
for (const args of [
  ['exec', 'next', 'build'],
  ['exec', 'playwright', 'test', '-c', 'playwright.orders.config.ts', ...process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, [pnpm, ...args], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
