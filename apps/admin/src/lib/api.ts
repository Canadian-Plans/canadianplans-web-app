import { healthResponseSchema, type HealthResponse } from '@canadian-plans/contracts';

const API_BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:4000';

/**
 * Placeholder typed client. Real staff-authenticated requests (attaching the
 * Supabase session) land with T5; this proves the wiring — admin calls the
 * backend over HTTP and validates the response against the shared contract
 * from @canadian-plans/contracts. Admin never opens a database connection
 * or imports @canadian-plans/db (PLATFORM_CONTEXT.md §4 invariant 3).
 */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/health`);

  if (!res.ok) {
    throw new Error(`backend health check failed with status ${res.status}`);
  }

  return healthResponseSchema.parse(await res.json());
}
