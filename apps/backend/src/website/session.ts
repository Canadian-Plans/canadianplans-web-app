import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type {
  RateLimitInput,
  RateLimitResult,
  WebsiteCredentialResolution,
} from '@canadian-plans/db';
import { websiteScopeNames, type WebsiteScopeName } from '@canadian-plans/types';

import { sendWebsiteError } from '../http/website-errors.js';
import { sendDomainError } from '../http/domain-errors.js';
import { hashServiceSecret, parseCredentialSecret } from './credential.js';

export interface WebsiteContext {
  /** The credential's own row id — used as `actorId` for its tenant writes (no human actor exists). */
  credentialId: string;
  workspaceId: string;
  callerType: 'website';
  scopes: readonly WebsiteScopeName[];
}

export interface WebsiteRateLimits {
  ipWindowSeconds: number;
  ipMaxCount: number;
  credentialWindowSeconds: number;
  credentialMaxCount: number;
}

export const DEFAULT_WEBSITE_RATE_LIMITS: WebsiteRateLimits = {
  ipWindowSeconds: 60,
  ipMaxCount: 120,
  credentialWindowSeconds: 60,
  credentialMaxCount: 300,
};

export interface WebsiteAuthDependencies {
  resolveCredential(secretHash: string): Promise<WebsiteCredentialResolution | undefined>;
  rateLimit(input: RateLimitInput): Promise<RateLimitResult>;
  /** Edge/bot admission check run before any database work. Returns true to allow. */
  botCheck: (req: Request) => boolean | Promise<boolean>;
  limits?: WebsiteRateLimits;
}

const knownScopes = new Set<string>(websiteScopeNames);

function clientIp(req: Request): string {
  // Express trusts no proxy by default. Do not let arbitrary forwarded headers
  // select a fresh limiter bucket; deployment-specific proxy trust is explicit.
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function context(req: Request): WebsiteContext {
  const value = req.websiteContext;
  if (!value) throw new Error('website credential middleware did not run');
  return value;
}

/**
 * Authenticates a storefront request purely by its service credential. The
 * workspace, caller type and scopes come from the credential — never from the
 * body, Host, Origin or CORS (PLATFORM_CONTEXT §4b, invariant 2). Size and
 * edge/bot admission run before any database work; a durable, bounded per-IP
 * and per-credential rate limiter gates database work without a global counter.
 */
export function requireWebsiteCredential(deps: WebsiteAuthDependencies): RequestHandler {
  const limits = deps.limits ?? DEFAULT_WEBSITE_RATE_LIMITS;
  const botCheck = deps.botCheck;

  return async (req: Request, res: Response, next: NextFunction) => {
    let admitted = false;
    try {
      admitted = await botCheck(req);
    } catch {
      // Provider failures deny admission before any database work.
    }
    if (!admitted) {
      sendWebsiteError(res, req.id, 'caller_forbidden', 403);
      return;
    }

    const secret = parseCredentialSecret(req.get('authorization'));
    if (!secret) {
      sendWebsiteError(res, req.id, 'missing_credential', 401);
      return;
    }

    try {
      const ipLimit = await deps.rateLimit({
        bucketKey: `ip:${clientIp(req)}`,
        windowSeconds: limits.ipWindowSeconds,
        maxCount: limits.ipMaxCount,
      });
      if (!ipLimit.allowed) {
        sendWebsiteError(res, req.id, 'rate_limited', 429, {
          'retry-after': String(ipLimit.retryAfterSeconds),
        });
        return;
      }

      const secretHash = hashServiceSecret(secret);
      const resolution = await deps.resolveCredential(secretHash);
      if (!resolution) {
        sendWebsiteError(res, req.id, 'invalid_credential', 401);
        return;
      }
      if (resolution.revoked) {
        sendWebsiteError(res, req.id, 'credential_revoked', 401);
        return;
      }

      const credentialLimit = await deps.rateLimit({
        bucketKey: `cred:${secretHash}`,
        windowSeconds: limits.credentialWindowSeconds,
        maxCount: limits.credentialMaxCount,
      });
      if (!credentialLimit.allowed) {
        sendWebsiteError(res, req.id, 'rate_limited', 429, {
          'retry-after': String(credentialLimit.retryAfterSeconds),
        });
        return;
      }

      req.websiteContext = {
        credentialId: resolution.credentialId,
        workspaceId: resolution.workspaceId,
        callerType: 'website',
        scopes: resolution.scopes.filter((scope): scope is WebsiteScopeName =>
          knownScopes.has(scope),
        ),
      };
      next();
    } catch {
      res.setHeader('retry-after', '2');
      sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true });
    }
  };
}

/** A tighter, per-endpoint budget layered on top of the global IP/credential limits. */
export interface EndpointRateLimit {
  windowSeconds: number;
  maxCount: number;
}

/**
 * Per-endpoint rate limits for the abuse-sensitive public write surface
 * (REQ 37: "rate limits ... on public endpoints"). These are intentionally far
 * tighter than the coarse per-credential ceiling in {@link requireWebsiteCredential}
 * so a flood of one endpoint (e.g. order submissions) is capped without starving
 * the others. Values sized for the Phase A 100-orders/day target with generous
 * headroom for legitimate bursts. Override per deployment via the env reader below.
 */
export const DEFAULT_ENDPOINT_RATE_LIMITS = {
  leads: { windowSeconds: 60, maxCount: 30 },
  quotes: { windowSeconds: 60, maxCount: 30 },
  orders: { windowSeconds: 60, maxCount: 10 },
  tracking: { windowSeconds: 60, maxCount: 20 },
} as const satisfies Record<string, EndpointRateLimit>;

export type EndpointRateLimitName = keyof typeof DEFAULT_ENDPOINT_RATE_LIMITS;

function positiveIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Resolves the per-endpoint budgets, letting a deployment tune each one via
 * `RATE_LIMIT_<ENDPOINT>_MAX` / `RATE_LIMIT_<ENDPOINT>_WINDOW` (e.g.
 * `RATE_LIMIT_ORDERS_MAX`). Invalid or absent values fall back to the defaults.
 */
export function loadEndpointRateLimits(
  env: NodeJS.ProcessEnv = process.env,
): Record<EndpointRateLimitName, EndpointRateLimit> {
  const resolve = (name: EndpointRateLimitName): EndpointRateLimit => {
    const upper = name.toUpperCase();
    const fallback = DEFAULT_ENDPOINT_RATE_LIMITS[name];
    return {
      maxCount: positiveIntEnv(env[`RATE_LIMIT_${upper}_MAX`], fallback.maxCount),
      windowSeconds: positiveIntEnv(env[`RATE_LIMIT_${upper}_WINDOW`], fallback.windowSeconds),
    };
  };
  return {
    leads: resolve('leads'),
    quotes: resolve('quotes'),
    orders: resolve('orders'),
    tracking: resolve('tracking'),
  };
}

/**
 * Gates a single route with a tighter budget keyed by (endpoint, workspace, IP).
 * The website credential middleware must have run first so the workspace is
 * trusted (never caller-supplied). A failure of the durable limiter denies the
 * request rather than silently allowing an unbounded flood.
 */
export function requireEndpointRateLimit(
  deps: Pick<WebsiteAuthDependencies, 'rateLimit'>,
  endpoint: EndpointRateLimitName,
  limit: EndpointRateLimit,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ctx = req.websiteContext;
    if (!ctx) {
      // Defence in depth: the credential guard must precede this middleware.
      sendWebsiteError(res, req.id, 'missing_credential', 401);
      return;
    }
    try {
      const outcome = await deps.rateLimit({
        bucketKey: `endpoint:${endpoint}:ws:${ctx.workspaceId}:ip:${clientIp(req)}`,
        windowSeconds: limit.windowSeconds,
        maxCount: limit.maxCount,
      });
      if (!outcome.allowed) {
        sendWebsiteError(res, req.id, 'rate_limited', 429, {
          'retry-after': String(outcome.retryAfterSeconds),
        });
        return;
      }
      next();
    } catch {
      res.setHeader('retry-after', '2');
      sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true });
    }
  };
}

/** Per-route scope guard. The website middleware must have run first. */
export function requireScope(scope: WebsiteScopeName): RequestHandler {
  return (req, res, next) => {
    if (!context(req).scopes.includes(scope)) {
      sendWebsiteError(res, req.id, 'scope_denied', 403);
      return;
    }
    next();
  };
}

export { context as websiteContext };
