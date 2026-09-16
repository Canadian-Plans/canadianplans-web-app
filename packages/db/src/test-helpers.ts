import type postgres from 'postgres';

/** Synthetic CI-only password shared by every disposable-database integration test. */
export const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

// Adjacent to the migrations lock key (745284913) in migrations.ts.
const RUNTIME_PASSWORD_ADVISORY_LOCK_KEY = 745284914;

/**
 * Sets the app_runtime role's password to the shared CI-only value inside an
 * advisory-locked transaction. Vitest runs integration test files in
 * separate parallel processes against the same disposable database; without
 * this lock, two files' concurrent `ALTER ROLE` statements race and cause
 * intermittent authentication failures for a sibling file's runtime client.
 */
export async function setTestRuntimePassword(admin: postgres.Sql): Promise<void> {
  await admin.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${RUNTIME_PASSWORD_ADVISORY_LOCK_KEY})`;
    await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);
  });
}
