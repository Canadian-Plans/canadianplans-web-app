import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';

const { runCommand, runRetention, captureException } = vi.hoisted(() => ({
  runCommand: vi.fn(),
  runRetention: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('../backup/command.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../backup/command.js')>()),
  nodeRunCommand: runCommand,
}));
vi.mock('./run.js', () => ({ runRetention }));
vi.mock('@canadian-plans/adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@canadian-plans/adapters')>()),
  createErrorTrackerFromEnv: () => ({ captureException }),
}));

const directory = mkdtempSync(join(tmpdir(), 'cp-retention-'));
const identityPath = join(directory, 'identity');
writeFileSync(identityPath, 'TEST ONLY');
const previousExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  runCommand.mockResolvedValue({ stdout: new Uint8Array(), stderr: '', exitCode: 0 });
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
  vi.stubEnv('RECOVERY_PRIVATE_KEY_PATH', identityPath);
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

it('preflights age and preserves the default dry-run', async () => {
  await import('./cli.js');
  await vi.waitFor(() => expect(runRetention).toHaveBeenCalled());
  expect(runCommand).toHaveBeenCalledWith('age', ['--version'], undefined);
  expect(runRetention).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
  expect(captureException).not.toHaveBeenCalled();
});

it('fails before archive retention when age cannot run', async () => {
  runCommand.mockRejectedValueOnce(new Error('spawn age ENOENT'));
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

// Only this suite's disposable identity file is removed.
afterAll(() => rmSync(directory, { recursive: true, force: true }));
