import { defineConfig } from 'vitest/config';
import { baseTestConfig } from '@canadian-plans/config/vitest.base';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  test: { ...baseTestConfig, name: 'site-1', environment: 'node', include: ['src/**/*.test.ts'] },
});
