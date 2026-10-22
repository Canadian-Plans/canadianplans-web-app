import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const { runRetention, captureException } = vi.hoisted(() => ({
  runRetention: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('./run.js', () => ({ runRetention }));
vi.mock('@canadian-plans/adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@canadian-plans/adapters')>()),
  createErrorTrackerFromEnv: () => ({ captureException }),
}));

const previousExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  runRetention.mockResolvedValue({
    dryRun: true,
    totalRuns: 1,
    retainedRunIds: ['run'],
    candidateDeletions: [],
    deleted: [],
    unreadableManifests: [],
    abandonedRunIds: [],
    pendingRunIds: [],
  });
  for (const key of [
    'B2_ARCHIVE_RETENTION_KEY_ID',
    'B2_ARCHIVE_RETENTION_APPLICATION_KEY',
    'B2_ARCHIVE_REGION',
    'B2_ARCHIVE_BUCKET',
  ])
    vi.stubEnv(key, 'test');
  vi.stubEnv('B2_ARCHIVE_ENDPOINT', 'https://archive.example.test');
  vi.stubEnv('RETENTION_DRY_RUN', '');
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  process.exitCode = previousExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('runs retention with the default dry-run and never needs the recovery private key', async () => {
  vi.stubEnv('RECOVERY_PRIVATE_KEY_PATH', '');
  await import('./cli.js');
  await vi.waitFor(() => expect(runRetention).toHaveBeenCalled());
  expect(runRetention).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
  expect(runRetention.mock.calls[0]?.[0]).not.toHaveProperty('decryptor');
  expect(captureException).not.toHaveBeenCalled();
});

it('fails before archive retention when a retention credential is missing', async () => {
  vi.stubEnv('B2_ARCHIVE_RETENTION_APPLICATION_KEY', '');
  await import('./cli.js');
  await vi.waitFor(() => expect(captureException).toHaveBeenCalledOnce());
  expect(runRetention).not.toHaveBeenCalled();
  expect(process.exitCode).toBe(1);
});

it('reports unreadable manifests as a failed job', async () => {
  runRetention.mockResolvedValueOnce({
    dryRun: true,
    totalRuns: 1,
    retainedRunIds: ['run'],
    candidateDeletions: [],
    deleted: [],
    unreadableManifests: ['run/manifest.json.enc'],
  });
  await import('./cli.js');
  await vi.waitFor(() => expect(captureException).toHaveBeenCalledOnce());
  expect(process.exitCode).toBe(1);
});
