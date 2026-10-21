import { afterEach, expect, it, vi } from 'vitest';

const { send, captureException } = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue(undefined),
  captureException: vi.fn(),
}));

vi.mock('@canadian-plans/adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@canadian-plans/adapters')>()),
  createOwnerAlertChannelFromEnv: () => ({ send }),
  createErrorTrackerFromEnv: () => ({ captureException }),
}));

const previousExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = previousExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('alerts the owner and exits unsuccessfully when monitor configuration fails', async () => {
  vi.stubEnv('B2_ARCHIVE_READER_KEY_ID', '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await import('./cli.js');
  await vi.waitFor(() =>
    expect(send).toHaveBeenCalledWith({
      kind: 'backup_stale',
      detail: 'monitor_failed',
      occurredAt: expect.any(String),
    }),
  );
  expect(captureException).toHaveBeenCalledOnce();
  expect(process.exitCode).toBe(1);
});
