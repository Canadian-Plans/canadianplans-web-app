import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig } from '@canadian-plans/config/playwright.base';

/**
 * T13 end-to-end configuration.
 *
 * Two servers are started:
 *  - the e2e harness (`apps/backend/tests/e2e/harness.ts`), which runs the real
 *    backend app against a disposable Postgres with a stub published-catalogue
 *    provider and an admitting bot check (a live Sanity project and a real
 *    Cloudflare Turnstile token are not available to CI);
 *  - the built site-1 server, pointed at the harness with a seeded service
 *    credential.
 *
 * Required local/CI setup (documented in apps/site-1/README.md):
 *   createdb canadian_plans_e2e_test   # disposable; the harness migrates it
 * The e2e database is deliberately separate from the unit/integration test
 * database, because the harness truncates its tenant tables on start. Override
 * with `E2E_TEST_DATABASE_URL` / `E2E_DATABASE_URL` if needed.
 */
const HARNESS_PORT = 4100;
const BACKEND_URL = `http://127.0.0.1:${HARNESS_PORT}`;
const SERVICE_CREDENTIAL =
  process.env['E2E_SERVICE_CREDENTIAL'] ?? 'cplsk_e2e_order_journey_secret_0001';
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
  workers: 1,
  use: { ...basePlaywrightConfig.use, baseURL: 'http://127.0.0.1:3101' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter backend exec tsx tests/e2e/harness.ts',
      url: `${BACKEND_URL}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...stringEnv(process.env),
        TEST_MIGRATION_DATABASE_URL: TEST_DATABASE_URL,
        DATABASE_URL: RUNTIME_DATABASE_URL,
        DATABASE_SSL_MODE: 'disable',
        MIGRATION_DATABASE_SSL_MODE: 'disable',
        E2E_SERVICE_CREDENTIAL: SERVICE_CREDENTIAL,
        E2E_HARNESS_PORT: String(HARNESS_PORT),
        E2E_BACKEND_PORT: String(HARNESS_PORT + 1),
        QUOTE_WITHDRAWAL_POLICY: 'honour_until_expiry',
        OUTBOX_ADAPTERS: 'fake',
      },
    },
    {
      command: 'pnpm exec next start --hostname 127.0.0.1 --port 3101',
      url: 'http://127.0.0.1:3101',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...stringEnv(process.env),
        SITE_1_BACKEND_URL: BACKEND_URL,
        SITE_1_SERVICE_CREDENTIAL: SERVICE_CREDENTIAL,
      },
    },
  ],
});
