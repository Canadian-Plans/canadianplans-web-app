import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig } from '@canadian-plans/config/playwright.base';

/**
 * CQ-01 admin order journeys. Run through `pnpm --filter admin test:e2e:orders`,
 * which first builds the admin into `.next-e2e` with the browser-test session
 * seam. Two servers:
 *  - the real backend e2e harness (apps/backend/tests/e2e/harness.ts) on 4200
 *    against the disposable canadian_plans_e2e_test database, whose stub staff
 *    verifier admits one seeded owner for the e2e bearer token;
 *  - the e2e admin build on 3102.
 */
const HARNESS_PORT = 4200;
const ADMIN_PORT = 3102;
const STAFF_BEARER = process.env['E2E_STAFF_BEARER'] ?? 'e2e-staff-session-owner-aal2';
const TEST_DATABASE_URL =
  process.env['E2E_TEST_DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:5432/canadian_plans_e2e_test';
const RUNTIME_DATABASE_URL =
  process.env['E2E_DATABASE_URL'] ??
  'postgresql://app_runtime:local_ci_runtime_password@localhost:5432/canadian_plans_e2e_test';

function stringEnv(source: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

export default defineConfig({
  ...basePlaywrightConfig,
  testDir: './e2e',
  testMatch: ['orders.spec.ts'],
  workers: 1,
  use: { ...basePlaywrightConfig.use, baseURL: `http://127.0.0.1:${ADMIN_PORT}` },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'pnpm --filter backend exec tsx tests/e2e/harness.ts',
      url: `http://127.0.0.1:${HARNESS_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...stringEnv(process.env),
        TEST_MIGRATION_DATABASE_URL: TEST_DATABASE_URL,
        DATABASE_URL: RUNTIME_DATABASE_URL,
        DATABASE_SSL_MODE: 'disable',
        MIGRATION_DATABASE_SSL_MODE: 'disable',
        E2E_STAFF_BEARER: STAFF_BEARER,
        E2E_HARNESS_PORT: String(HARNESS_PORT),
        E2E_BACKEND_PORT: String(HARNESS_PORT + 1),
        ADMIN_ORIGIN: `http://127.0.0.1:${ADMIN_PORT}`,
        QUOTE_WITHDRAWAL_POLICY: 'honour_until_expiry',
        OUTBOX_ADAPTERS: 'fake',
        RATE_LIMIT_LEADS_MAX: '20000',
        RATE_LIMIT_QUOTES_MAX: '20000',
        RATE_LIMIT_ORDERS_MAX: '20000',
      },
    },
    {
      command: `pnpm exec next start --hostname 127.0.0.1 --port ${ADMIN_PORT}`,
      url: `http://127.0.0.1:${ADMIN_PORT}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...stringEnv(process.env),
        ADMIN_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${HARNESS_PORT}`,
      },
    },
  ],
});
