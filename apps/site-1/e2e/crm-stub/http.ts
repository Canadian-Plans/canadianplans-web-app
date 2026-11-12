import type { IncomingHttpHeaders } from 'node:http';
import type { z } from 'zod';

/** A refusal in the CRM's error envelope: `{ error: { code, message, requestId, details? } }`. */
export class StubError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export interface StubRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: IncomingHttpHeaders;
  /** The parsed JSON body; undefined when the request had none. */
  body: unknown;
  requestId: string;
}

export interface Reply {
  status: number;
  body: unknown;
}

/**
 * An answer checked against the contract's response schema before it is sent,
 * so the stub can never return a shape the real client would not accept.
 */
export function reply<Schema extends z.ZodType>(
  status: number,
  schema: Schema,
  body: z.input<Schema>,
): Reply {
  return { status, body: schema.parse(body) };
}

/** The request body against the contract's request schema; a mismatch is the CRM's 400. */
export function parseBody<Schema extends z.ZodType>(
  request: StubRequest,
  schema: Schema,
): z.output<Schema> {
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) throw new StubError(400, 'validation_error');
  return parsed.data;
}

export function header(request: StubRequest, name: string): string | undefined {
  const value = request.headers[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** A stable rendering of a JSON value: the same value always gives the same text. */
export function fingerprint(value: unknown): string {
  return JSON.stringify(sorted(value));
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => [key, sorted(entry)]),
  );
}
