import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig } from '@canadian-plans/config/playwright.base';
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
  webServer: {
    command: 'pnpm exec next start --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
