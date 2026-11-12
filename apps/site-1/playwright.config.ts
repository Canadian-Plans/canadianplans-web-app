import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig } from '@canadian-plans/config/playwright.base';

import { SITE_KEY, SITE_PORT, SITE_URL, STUB_URL } from './e2e/crm-stub/config';

/**
 * The storefront's browser suites.
 *
 * Two servers are started, neither needing a database or a secret:
 *  - the CRM stub (`e2e/crm-stub`), which stands in for the Canadian Plans
 *    CRM's website API and checks every request and its own answers against
 *    `@canadian-plans/crm-contracts`;
 *  - the built storefront (`next start`), pointed at the stub with a synthetic
 *    site key.
 *
 * One worker: the stub holds one in-memory state, reset before every test.
 */
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
  use: { ...basePlaywrightConfig.use, baseURL: SITE_URL },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx e2e/crm-stub/server.ts',
      url: `${STUB_URL}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...stringEnv(process.env), E2E_SITE_KEY: SITE_KEY },
    },
    {
      command: `pnpm exec next start --hostname 127.0.0.1 --port ${SITE_PORT}`,
      url: SITE_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      // Surface a server crash after startup directly in the run's output.
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...stringEnv(process.env),
        SITE_1_BACKEND_URL: STUB_URL,
        SITE_1_SERVICE_CREDENTIAL: SITE_KEY,
      },
    },
  ],
});
