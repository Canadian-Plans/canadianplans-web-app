import { closeDatabase } from '@canadian-plans/db';

import { createApp } from './app.js';
import { createShutdownHandler, registerShutdownHandlers } from './shutdown.js';

const port = Number(process.env['PORT'] ?? 4000);

const server = createApp().listen(port, () => {
  console.info(`backend listening on http://localhost:${port}`);
});

const shutdown = createShutdownHandler({
  server,
  closeDatabase,
  exit: (code) => process.exit(code),
});
registerShutdownHandlers(shutdown);
