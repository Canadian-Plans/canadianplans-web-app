import express, { type Express } from 'express';
import { requestId } from './requestId.js';
import { getHealth } from './routes/health.js';

/**
 * Builds the Express app without starting a listener — reused by the local
 * dev server (src/server.ts), the Vercel function entry (api/index.ts), and
 * tests. No DB code lives here: the backend is the only allowed importer of
 * @canadian-plans/db (see src/db/boundary-check.ts), but there is nothing to
 * query yet.
 */
export function createApp(): Express {
  const app = express();

  app.use(requestId);
  app.get('/api/v1/health', getHealth);

  return app;
}
