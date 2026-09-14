import express, { type ErrorRequestHandler, type Express, type RequestHandler } from 'express';
import { sendStaffAuthError } from './http/staff-errors.js';
import { requestId } from './requestId.js';
import { getHealth } from './routes/health.js';
import {
  createDefaultStaffRouteDependencies,
  createStaffRouter,
  type StaffRouteDependencies,
} from './routes/staff.js';
import {
  createDefaultWebsiteRouteDependencies,
  createWebsiteRouter,
  type WebsiteRouteDependencies,
} from './routes/website.js';

export interface CreateAppOptions {
  staff?: StaffRouteDependencies;
  website?: WebsiteRouteDependencies;
}

function adminCors(): RequestHandler {
  const allowedOrigin = process.env.ADMIN_ORIGIN ?? 'http://localhost:3000';
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin === allowedOrigin) {
      res.setHeader('access-control-allow-origin', allowedOrigin);
      res.setHeader('vary', 'Origin');
      res.setHeader('access-control-allow-headers', 'authorization, content-type');
      res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(origin === allowedOrigin ? 204 : 403);
      return;
    }
    next();
  };
}

const invalidBodyError: ErrorRequestHandler = (_error, req, res, _next) => {
  if (res.headersSent) return;
  sendStaffAuthError(res, req.id, 'invalid_request', 400);
};

/**
 * Builds the Express app without starting a listener — reused by the local
 * dev server (src/server.ts), the Vercel function entry (api/index.ts), and
 * tests. Protected staff routes are mounted as one router so session
 * verification cannot be omitted from an individual handler.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(requestId);
  app.use(adminCors());
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/v1/health', getHealth);
  app.use(
    '/api/v1/staff',
    createStaffRouter(options.staff ?? createDefaultStaffRouteDependencies()),
  );
  // Public storefront surface. Server-to-server, so CORS does not apply and is
  // never treated as authentication; the service credential is the only proof.
  app.use(
    '/api/v1/website',
    createWebsiteRouter(options.website ?? createDefaultWebsiteRouteDependencies()),
  );
  app.use(invalidBodyError);

  return app;
}
