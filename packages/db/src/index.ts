/**
 * @canadian-plans/db — imported ONLY by apps/backend.
 *
 * No real schema, migrations, or Drizzle wiring yet — that lands with the
 * database foundation task (BUILD_TASKS.md T4). This placeholder exists so
 * apps/backend can prove, today, that it is allowed to import this package
 * while every other app is denied by the ESLint import-boundary rule in
 * eslint.config.js.
 */
export const DB_PACKAGE_PLACEHOLDER = true as const;
