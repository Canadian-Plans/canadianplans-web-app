import { closeDatabase } from '@canadian-plans/db';

import { createApp } from './app.js';
import { isConnectionLevelError, logRequestError } from './http/logger.js';
import {
  createBackendScheduler,
  createDefaultSchedulerDependencies,
  SchedulerConfigurationError,
  type Scheduler,
} from './scheduler.js';
import { createShutdownHandler, registerShutdownHandlers } from './shutdown.js';

const port = Number(process.env['PORT'] ?? 4000);

const server = createApp().listen(port, () => {
  console.info(`backend listening on http://localhost:${port}`);
});

/**
 * The scheduler is opt-in (`ENABLE_SCHEDULER=1`) and the HTTP routes must keep
 * serving even if it is misconfigured, so a configuration error is logged
 * through the PII-safe path and the process continues without it.
 */
function startScheduler(): Scheduler | undefined {
  if (process.env['ENABLE_SCHEDULER'] !== '1') return undefined;
  try {
    return createBackendScheduler(createDefaultSchedulerDependencies());
  } catch (error) {
    logRequestError({
      requestId: 'scheduler',
      route: 'scheduler',
      code: error instanceof SchedulerConfigurationError ? error.code : 'scheduler_start_failed',
      flag: isConnectionLevelError(error) ? 'retryable' : 'not_retryable',
    });
    return undefined;
  }
}

const scheduler = startScheduler();
scheduler?.start();

const shutdown = createShutdownHandler({
  server,
  scheduler,
  closeDatabase,
  exit: (code) => process.exit(code),
});
registerShutdownHandlers(shutdown);
