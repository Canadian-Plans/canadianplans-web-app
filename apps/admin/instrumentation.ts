import { randomUUID } from 'node:crypto';

/**
 * Next.js server-side error hook (REQ 40). Runs for an error thrown in a
 * server component, route handler, or server action — the cases a client
 * error boundary (`src/app/global-error.tsx`) cannot see. Never logs the
 * request URL/headers/body; only a fresh request id and the route.
 */
export async function onRequestError(
  error: unknown,
  request: { path?: string },
): Promise<void> {
  const { captureException } = await import('./src/lib/error-tracking.js');
  captureException(error, {
    requestId: randomUUID(),
    route: request.path,
  });
}
