import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig } from '@canadian-plans/config/playwright.base';

// No specs yet (BUILD_TASKS.md T2 adds the first placeholder routes; e2e
// journeys land with T13/T14). testDir/baseURL/webServer are added then.
export default defineConfig({
  ...basePlaywrightConfig,
  testDir: './e2e',
});
