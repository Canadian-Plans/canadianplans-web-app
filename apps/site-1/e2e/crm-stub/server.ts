import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  apiErrorResponseSchema,
  healthResponseSchema,
  listWebsitePlansQuerySchema,
  listWebsitePlansResponseSchema,
  websiteBotTokenSchema,
} from '@canadian-plans/crm-contracts';

import { SITE_KEY, STUB_PORT } from './config';
import { handleControl } from './control';
import { StubError, header, reply, type Reply, type StubRequest } from './http';
import { createLead, readLead, updateLead } from './leads';
import { state, type PlannedFailure } from './state';
import {
  createTrackedUpload,
  finalizeTrackedUpload,
  listTrackedOrders,
  requestTrackedChange,
  requestTrackingCode,
  verifyTrackingCode,
} from './tracking';
import { createUploadIntent, finalizeUpload, storeUploadBytes } from './uploads';

/**
 * A contract-checking stand-in for the Canadian Plans CRM's website API, for
 * the storefront's browser suites only. It implements the routes the
 * storefront calls, validates every request with the schemas of
 * `@canadian-plans/crm-contracts` and checks every answer against that
 * package's response schemas. State is in memory; see README.md.
 */

const WEBSITE = '/api/v1/website';
const MAX_BODY_BYTES = 12 * 1024 * 1024;

type Handler = (request: StubRequest, ...params: string[]) => Reply;

/** The website routes the storefront calls, relative to `/api/v1/website`. */
const ROUTES: readonly (readonly [string, RegExp, Handler])[] = [
  ['GET', /^\/plans$/, listPlans],
  ['POST', /^\/leads$/, createLead],
  ['GET', /^\/leads\/([^/]+)$/, readLead],
  ['PATCH', /^\/leads\/([^/]+)$/, updateLead],
  ['POST', /^\/uploads\/intents$/, createUploadIntent],
  ['POST', /^\/uploads\/([^/]+)\/finalize$/, finalizeUpload],
  ['POST', /^\/tracking\/code$/, requestTrackingCode],
  ['POST', /^\/tracking\/verify$/, verifyTrackingCode],
  ['GET', /^\/tracking\/orders$/, listTrackedOrders],
  ['POST', /^\/tracking\/orders\/([^/]+)\/changes$/, requestTrackedChange],
  ['POST', /^\/tracking\/orders\/([^/]+)\/uploads\/intents$/, createTrackedUpload],
  ['POST', /^\/tracking\/orders\/([^/]+)\/uploads\/([^/]+)\/finalize$/, finalizeTrackedUpload],
];

function listPlans(request: StubRequest): Reply {
  const query = listWebsitePlansQuerySchema.safeParse(Object.fromEntries(request.query));
  if (!query.success) throw new StubError(400, 'validation_error');
  const leadType = query.data.leadType;
  return reply(200, listWebsitePlansResponseSchema, {
    plans: state.plans.filter((plan) => leadType === undefined || plan.leadType === leadType),
    requestId: request.requestId,
  });
}

/** The site's key, as a bearer; a missing or wrong one is the CRM's 401. */
function authenticate(request: StubRequest): void {
  const match = /^Bearer (.+)$/.exec(header(request, 'authorization') ?? '');
  if (!match?.[1]) throw new StubError(401, 'missing_credential');
  const given = Buffer.from(match[1]);
  const expected = Buffer.from(SITE_KEY);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new StubError(401, 'invalid_credential');
  }
}

/**
 * The bot check in the CRM's "delegated" style: the storefront's server is
 * trusted to have screened the visitor, so a missing token and any well-formed
 * token are both accepted. The token is never sent to Cloudflare.
 */
function botAction(request: StubRequest): string | null {
  const token = header(request, 'x-turnstile-token');
  if (token === undefined) return null;
  if (!websiteBotTokenSchema.safeParse(token).success) throw new StubError(400, 'validation_error');
  // The browser fixture issues `e2e.<action>.<uuid>`, so a spec can see which proof was spent.
  return /^e2e\.([a-z-]+)\./.exec(token)?.[1] ?? null;
}

function handleApi(request: StubRequest): Reply {
  if (request.method === 'GET' && request.path === '/api/v1/health') {
    return reply(200, healthResponseSchema, { ok: true, requestId: request.requestId });
  }
  authenticate(request);
  const path = request.path.startsWith(WEBSITE) ? request.path.slice(WEBSITE.length) : undefined;
  for (const [method, pattern, handler] of ROUTES) {
    const match = path === undefined || method !== request.method ? null : pattern.exec(path);
    if (match) return handler(request, ...match.slice(1).map(decodeURIComponent));
  }
  throw new StubError(404, 'not_found');
}

function errorReply(error: unknown, requestId: string): Reply {
  if (error instanceof StubError) {
    return reply(error.status, apiErrorResponseSchema, {
      error: {
        // The contract's vocabulary decides what a code may be; an unknown one is a stub bug.
        code: apiErrorResponseSchema.shape.error.shape.code.parse(error.code),
        message: error.code,
        requestId,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }
  // A response that failed its own schema, or a bug: say where, never what was sent.
  console.error(`crm-stub: unexpected failure (${error instanceof Error ? error.name : 'error'})`);
  return reply(500, apiErrorResponseSchema, {
    error: { code: 'internal_error', message: 'internal_error', requestId },
  });
}

function plannedFailure(request: StubRequest): PlannedFailure | undefined {
  const failure = state.failures.find(
    (candidate) =>
      candidate.remaining > 0 &&
      candidate.method === request.method &&
      request.path.startsWith(candidate.pathPrefix),
  );
  if (failure) failure.remaining -= 1;
  return failure;
}

async function readBytes(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += bytes.length;
    if (size > MAX_BODY_BYTES) throw new StubError(413, 'payload_too_large');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function parseJson(bytes: Buffer): unknown {
  if (bytes.length === 0) return undefined;
  try {
    const parsed: unknown = JSON.parse(bytes.toString('utf8'));
    return parsed;
  } catch {
    return undefined;
  }
}

function send(res: ServerResponse, answer: Reply): void {
  res.writeHead(answer.status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(answer.body));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://stub.invalid');
  const bytes = await readBytes(req);
  const request: StubRequest = {
    method: req.method ?? 'GET',
    path: url.pathname,
    query: url.searchParams,
    headers: req.headers,
    body: undefined,
    requestId: randomUUID(),
  };

  // The signed PUT's target: the stub's stand-in for object storage.
  const storage = /^\/storage\/uploads\/([^/]+)$/.exec(request.path);
  if (storage?.[1] && request.method === 'PUT') {
    res.writeHead(storeUploadBytes(storage[1], bytes) ? 200 : 404).end();
    return;
  }
  request.body = parseJson(bytes);
  if (request.path.startsWith('/__stub/')) {
    send(res, handleControl(request));
    return;
  }

  const failure = plannedFailure(request);
  let answer: Reply | undefined;
  let action: string | null = null;
  if (failure?.mode.kind === 'error') {
    answer = errorReply(new StubError(failure.mode.status, failure.mode.code), request.requestId);
  } else if (failure?.mode.kind !== 'transport') {
    try {
      action = botAction(request);
      answer = handleApi(request);
    } catch (error) {
      answer = errorReply(error, request.requestId);
    }
    if (failure?.mode.kind === 'drop_response') answer = undefined;
  }
  state.requests.push({
    method: request.method,
    path: request.path,
    idempotencyKey: header(request, 'idempotency-key') ?? null,
    botAction: action,
    body: request.body ?? null,
    status: answer?.status ?? 0,
  });
  if (answer) send(res, answer);
  // A transport failure as the storefront sees one: the connection just ends.
  else req.socket.destroy();
}

const server = createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    if (res.headersSent) return;
    send(res, errorReply(error, randomUUID()));
  });
});

server.listen(STUB_PORT, '127.0.0.1', () => {
  console.info(`crm-stub: listening on http://127.0.0.1:${STUB_PORT}`);
});
