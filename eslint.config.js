import { baseConfig, dbBoundaryConfig, reactConfig } from './packages/config/eslint.js';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.tsbuildinfo',
    ],
  },
  ...baseConfig,
  reactConfig,
  // Default: nobody may import @canadian-plans/db.
  dbBoundaryConfig(['**/*.{ts,tsx}'], { allow: false }),
  // Allowlist: the backend, the db package's own source, cron job handlers,
  // and offline migration/backup/restore tooling (added in later tasks).
  dbBoundaryConfig(
    [
      'apps/backend/**/*.{ts,tsx}',
      'packages/db/**/*.{ts,tsx}',
      'jobs/**/*.{ts,tsx}',
      'scripts/**/*.{ts,tsx}',
    ],
    { allow: true },
  ),
];
