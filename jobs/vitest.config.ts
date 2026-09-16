import { defineConfig } from 'vitest/config';
import { baseTestConfig } from '@canadian-plans/config/vitest.base';

export default defineConfig({
  test: {
    ...baseTestConfig,
    name: 'jobs',
    environment: 'node',
  },
});
