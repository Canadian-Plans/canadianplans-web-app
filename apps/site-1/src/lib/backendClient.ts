import 'server-only';
import { randomUUID } from 'node:crypto';
import { healthResponseSchema } from '@canadian-plans/contracts';
import { getBackendConfig } from '../backend.config';

type BackendRequestOptions = Pick<RequestInit, 'method' | 'body' | 'signal'>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Internal server transport. Replace with the contracts typed client when available.
 * Callers supply a fixed API path, never a destination URL from a browser.
 */
export async function backendFetch(path: string, options: BackendRequestOptions = {}) {
  const config = getBackendConfig();
  const url = new URL(path, config.backendUrl);
  if (
    !path.startsWith('/api/v1/') ||
    path.includes('\\') ||
    url.origin !== config.backendUrl ||
    !url.pathname.startsWith('/api/v1/') ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error('Invalid backend API path.');
  }
  const requestId = randomUUID();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.serviceCredential}`,
      'x-request-id': requestId,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
    redirect: 'error',
    signal: options.signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Do not include provider response bodies, URLs or credentials in errors.
    const responseRequestId = response.headers.get('x-request-id');
    const backendRequestId =
      responseRequestId && UUID_PATTERN.test(responseRequestId) ? responseRequestId : 'unavailable';
    throw new Error(`Backend request failed (${response.status}; requestId=${backendRequestId}).`);
  }
  return response;
}

export async function getBackendHealth() {
  const response = await backendFetch('/api/v1/health');
  const body: unknown = await response.json();
  return healthResponseSchema.parse(body);
}
