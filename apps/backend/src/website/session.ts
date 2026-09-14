import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type {
  RateLimitInput,
  RateLimitResult,
  WebsiteCredentialResolution,
} from '@canadian-plans/db';
import { websiteScopeNames, type WebsiteScopeName } from '@canadian-plans/types';

import { sendWebsiteError } from '../http/website-errors.js';
import { hashServiceSecret, parseCredentialSecret } from './credential.js';

export interface WebsiteContext {
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
  botCheck?: (req: Request) => boolean;
  limits?: WebsiteRateLimits;
}

const knownScopes = new Set<string>(websiteScopeNames);

function clientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
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
  const botCheck = deps.botCheck ?? (() => true);

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!botCheck(req)) {
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
        workspaceId: resolution.workspaceId,
        callerType: 'website',
        scopes: resolution.scopes.filter((scope): scope is WebsiteScopeName =>
          knownScopes.has(scope),
        ),
      };
      next();
    } catch {
      sendWebsiteError(res, req.id, 'invalid_credential', 401);
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
