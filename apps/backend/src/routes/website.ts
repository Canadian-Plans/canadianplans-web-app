import { Router, type Request } from 'express';
import { rateLimitHit, resolveWebsiteCredential } from '@canadian-plans/db';
import {
  commercialOfferSchema,
  createLeadRequestSchema,
  createQuoteRequestSchema,
  createUploadIntentRequestSchema,
  finalizeUploadRequestSchema,
  submitOrderRequestSchema,
  trackingOtpRequestSchema,
  trackingVerifyRequestSchema,
  updateLeadRequestSchema,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import { DatabaseDraftGrantVerifier, type DraftGrantVerifier } from '../documents/grant.js';
import { createDocumentServiceFromEnv } from '../documents/factory.js';
import { toFileSummary } from '../documents/summary.js';
import type { DocumentService } from '../documents/service.js';

import { sendDomainError } from '../http/domain-errors.js';
import { isConnectionLevelError, logRequestError } from '../http/logger.js';
import { sendWebsiteError } from '../http/website-errors.js';
import { CatalogueService, providerResolverFromRegistry } from '../catalogue/service.js';
import { loadQuoteWithdrawalPolicy } from '../catalogue/policy.js';
import { DatabaseCatalogueStore, type CatalogueStore } from '../catalogue/store.js';
import { DatabaseLeadStore, type LeadStore } from '../leads/store.js';
import { parseDraftGrantToken } from '../leads/token.js';
import { createTurnstileVerifier } from '../website/turnstile.js';
import { loadMachineRegistry } from '../machines/registry.js';
import { OrderService } from '../orders/service.js';
import { DatabaseOrderStore } from '../orders/store.js';
import {
  emailRateBucket,
  loadTrackingSecret,
  normalizeEmail,
  verifyTrackingGrant,
} from '../tracking/secrets.js';
import { loadTrackingNotifier } from '../tracking/notifier.js';
import { DatabaseTrackingStore } from '../tracking/store.js';
import {
  TRACKING_OTP_EMAIL_MAX_REQUESTS,
  TRACKING_OTP_EMAIL_WINDOW_SECONDS,
  TRACKING_OTP_VERIFY_EMAIL_MAX_REQUESTS,
  TrackingService,
} from '../tracking/service.js';
import {
  requireScope,
  requireWebsiteCredential,
  websiteContext,
  type WebsiteAuthDependencies,
} from '../website/session.js';

export interface WebsiteRouteDependencies {
  auth: WebsiteAuthDependencies;
  leads: { store: LeadStore };
  quotes?: { service: Pick<CatalogueService, 'createQuote'> };
  orders?: { service: Pick<OrderService, 'submit'> };
  catalogue?: { store: Pick<CatalogueStore, 'listPublishedOffers'> };
  documents?: {
    service: Pick<DocumentService, 'createIntent' | 'finalize' | 'issueDownload'>;
    grants: DraftGrantVerifier;
  };
  tracking?: { service: TrackingService };
}

export function createDefaultWebsiteRouteDependencies(): WebsiteRouteDependencies {
  const verify = createTurnstileVerifier({
    secret: process.env.TURNSTILE_SECRET_KEY,
    hostname: process.env.TURNSTILE_HOSTNAME,
    action: 'lead-submit',
  });
  const registry = loadMachineRegistry();
  return {
    auth: {
      resolveCredential: resolveWebsiteCredential,
      rateLimit: rateLimitHit,
      botCheck: (req) => verify(req.get('x-turnstile-token')),
    },
    leads: { store: new DatabaseLeadStore() },
    quotes: {
      service: new CatalogueService(
        new DatabaseCatalogueStore(),
        providerResolverFromRegistry(registry),
        loadQuoteWithdrawalPolicy(),
      ),
    },
    orders: {
      service: new OrderService(new DatabaseOrderStore(), loadQuoteWithdrawalPolicy()),
    },
    catalogue: { store: new DatabaseCatalogueStore() },
    ...documentsDependencies(),
    tracking: {
      service: new TrackingService({
        store: new DatabaseTrackingStore(),
        notifier: loadTrackingNotifier(),
        secret: loadTrackingSecret(),
      }),
    },
  };
}

function documentsDependencies(): Pick<WebsiteRouteDependencies, 'documents'> {
  const service = createDocumentServiceFromEnv();
  if (!service) return {};
  return { documents: { service, grants: new DatabaseDraftGrantVerifier() } };
}

/** Exact T10 public path (`POST /api/v1/quotes`) with website authentication. */
export function createQuoteRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  const quoteDependencies = dependencies.quotes;
  if (!quoteDependencies) return router;
  router.post(
    '/quotes',
    requireWebsiteCredential(dependencies.auth),
    requireScope('quotes:create'),
    async (req, res) => {
      const body = createQuoteRequestSchema.safeParse(req.body);
      const grantToken = requireDraftGrant(req);
      if (!body.success) {
        sendDomainError(res, req.id, 'validation_error', 400);
        return;
      }
      if (!grantToken) {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      try {
        const ctx = websiteContext(req);
        const outcome = await quoteDependencies.service.createQuote({
          workspaceId: ctx.workspaceId,
          actorId: ctx.credentialId,
          draftId: body.data.leadId,
          productId: body.data.productId,
          grantToken,
          requestId: req.id,
        });
        if (outcome.status === 'created') {
          res.status(201).json({ quote: outcome.quote, requestId: req.id });
          return;
        }
        if (outcome.status === 'draft_invalid') {
          sendDomainError(res, req.id, 'draft_not_found', 401);
          return;
        }
        if (outcome.status === 'draft_expired') {
          sendDomainError(res, req.id, 'draft_expired', 401);
          return;
        }
        if (outcome.status === 'product_not_found') {
          sendDomainError(res, req.id, 'not_found', 404);
          return;
        }
        if (outcome.status === 'offer_unavailable') {
          sendDomainError(res, req.id, 'offer_unavailable', 409);
          return;
        }
        if (outcome.status === 'checkout_disabled') {
          sendDomainError(res, req.id, 'priced_checkout_disabled', 503);
          return;
        }
        sendDomainError(res, req.id, 'unpriced_lead_required', 503, {
          canSaveUnpricedLead: true,
        });
      } catch {
        sendDomainError(res, req.id, 'internal_error', 500);
      }
    },
  );
  return router;
}

const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

/** Exact T12 public path (`POST /api/v1/orders`) with authenticated draft authority. */
export function createOrderRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  const orderDependencies = dependencies.orders;
  if (!orderDependencies) return router;
  router.post(
    '/orders',
    requireWebsiteCredential(dependencies.auth),
    requireScope('orders:create'),
    async (req, res) => {
      const body = submitOrderRequestSchema.safeParse(req.body);
      const grantToken = requireDraftGrant(req);
      const idempotencyKey = idempotencyKeySchema.safeParse(req.get('idempotency-key'));
      if (!body.success || !idempotencyKey.success) {
        sendDomainError(res, req.id, 'validation_error', 400);
        return;
      }
      if (!grantToken) {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }

      try {
        const ctx = websiteContext(req);
        const outcome = await orderDependencies.service.submit({
          workspaceId: ctx.workspaceId,
          actorId: ctx.credentialId,
          requestId: req.id,
          grantToken,
          idempotencyKey: idempotencyKey.data,
          body: body.data,
        });
        if (outcome.status === 'created' || outcome.status === 'existing') {
          res.status(201).json({
            order: outcome.order,
            requestId: req.id,
          });
          return;
        }
        if (outcome.status === 'idempotency_conflict') {
          sendDomainError(res, req.id, 'idempotency_conflict', 409);
          return;
        }
        if (outcome.status === 'draft_invalid') {
          sendDomainError(res, req.id, 'draft_not_found', 401);
          return;
        }
        if (outcome.status === 'draft_expired') {
          sendDomainError(res, req.id, 'draft_expired', 401);
          return;
        }
        if (outcome.status === 'quote_not_found') {
          sendDomainError(res, req.id, 'quote_not_found', 404);
          return;
        }
        if (outcome.status === 'quote_expired') {
          sendDomainError(res, req.id, 'quote_expired', 409);
          return;
        }
        if (outcome.status === 'quote_withdrawn') {
          sendDomainError(res, req.id, 'quote_withdrawn', 409);
          return;
        }
        if (outcome.status === 'quote_consumed') {
          sendDomainError(res, req.id, 'quote_consumed', 409);
          return;
        }
        if (outcome.status === 'terms_version_unsupported') {
          sendDomainError(res, req.id, 'terms_version_unsupported', 409);
          return;
        }
        if (outcome.status === 'draft_already_submitted') {
          sendDomainError(res, req.id, 'draft_already_submitted', 409);
          return;
        }
        if (outcome.status === 'reference_collision') {
          // Generating a fresh non-guessable reference resolves this; it is a
          // transient save failure, not a client conflict.
          res.setHeader('retry-after', '2');
          sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true });
          return;
        }
        if (outcome.status === 'checkout_disabled') {
          sendDomainError(res, req.id, 'priced_checkout_disabled', 503);
          return;
        }
        sendDomainError(res, req.id, 'conflict', 409);
      } catch (error) {
        // Only a genuine connection/availability failure is retryable. A logic
        // bug or an unparsable snapshot must surface as a non-retryable 500
        // instead of being masked as transient, and every failure is logged
        // with only scrubbed identifiers (PLATFORM_CONTEXT.md invariant 12).
        const workspaceId = req.websiteContext?.workspaceId;
        if (isConnectionLevelError(error)) {
          logRequestError({
            requestId: req.id,
            workspaceId,
            route: '/api/v1/orders',
            code: 'persistence_unavailable',
            flag: 'retryable',
          });
          res.setHeader('retry-after', '2');
          sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true });
          return;
        }
        logRequestError({
          requestId: req.id,
          workspaceId,
          route: '/api/v1/orders',
          code: 'internal_error',
          flag: 'not_retryable',
        });
        sendDomainError(res, req.id, 'internal_error', 500);
      }
    },
  );
  return router;
}

function requireDraftGrant(req: Request): string | undefined {
  return parseDraftGrantToken(req.get('x-draft-grant'));
}

/**
 * Public storefront surface. Every route authenticates by service credential
 * only: the workspace and scopes come from the credential, so a `workspace_id`
 * in the body, or a spoofed Host/Origin, cannot change the tenant
 * (PLATFORM_CONTEXT §4b, invariant 2). The website has no human actor, so the
 * credential's own id stands in as `actorId` for its tenant writes (T11).
 */
export function createWebsiteRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  router.use(requireWebsiteCredential(dependencies.auth));

  /**
   * Public catalogue read for the storefront. It reuses the `quotes:create`
   * scope — a credential that may quote may read the public offers it can
   * quote. Only the credential's own workspace is read, and each row's content
   * is validated before exposure so an unvalidated snapshot is never returned.
   */
  router.get('/offers', requireScope('quotes:create'), async (req, res) => {
    const catalogue = dependencies.catalogue;
    if (!catalogue) {
      sendDomainError(res, req.id, 'internal_error', 500);
      return;
    }

    try {
      const ctx = websiteContext(req);
      const rows = await catalogue.store.listPublishedOffers(ctx.workspaceId, ctx.credentialId);
      const offers = rows.flatMap((row) => {
        const content = commercialOfferSchema.safeParse(row.content);
        if (!content.success) return [];
        return [
          {
            productId: row.productId,
            offerVersionId: row.offerVersionId,
            lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
            commercial: content.data,
          },
        ];
      });
      res.json({ offers, requestId: req.id });
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/leads', requireScope('leads:write'), async (req, res) => {
    const body = createLeadRequestSchema.safeParse(req.body);
    if (!body.success) {
      sendDomainError(res, req.id, 'validation_error', 400);
      return;
    }

    try {
      const ctx = websiteContext(req);
      const result = await dependencies.leads.store.createLead({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        requestId: req.id,
        contact: body.data.contact,
        form: body.data.form,
        productId: body.data.productId,
        attribution: body.data.attribution,
        consentVersion: body.data.consentVersion,
      });
      res.status(201).json({
        lead: result.lead,
        draftGrant: result.grant,
        requestId: req.id,
      });
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  router.patch('/leads/:leadId', requireScope('leads:write'), async (req, res) => {
    const leadId = z.uuid().safeParse(req.params['leadId']);
    const body = updateLeadRequestSchema.safeParse(req.body);
    if (!leadId.success || !body.success) {
      sendDomainError(res, req.id, 'validation_error', 400);
      return;
    }

    const grantToken = requireDraftGrant(req);
    if (!grantToken) {
      sendDomainError(res, req.id, 'draft_not_found', 401);
      return;
    }

    try {
      const ctx = websiteContext(req);
      const outcome = await dependencies.leads.store.updateLead({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        requestId: req.id,
        leadId: leadId.data,
        grantToken,
        contact: body.data.contact,
        form: body.data.form,
        productId: body.data.productId,
        attribution: body.data.attribution,
        consentVersion: body.data.consentVersion,
      });

      if (outcome.status === 'grant_invalid') {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      if (outcome.status === 'grant_expired') {
        sendDomainError(res, req.id, 'draft_expired', 401);
        return;
      }
      if (outcome.status === 'draft_submitted') {
        sendDomainError(res, req.id, 'draft_already_submitted', 409);
        return;
      }

      res.json({ lead: outcome.lead, requestId: req.id });
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  // ---- Customer document uploads (T17) -----------------------------------
  // The service credential proves the workspace; the draft grant proves which
  // lead the customer owns. Uploads attach to that lead (invariant 2/8).
  const documents = dependencies.documents;

  router.post('/uploads/intents', requireScope('uploads:customer'), async (req, res) => {
    if (!documents) {
      sendDomainError(res, req.id, 'feature_not_ready', 409);
      return;
    }
    const body = createUploadIntentRequestSchema.safeParse(req.body);
    const grantToken = requireDraftGrant(req);
    if (!body.success) {
      sendDomainError(res, req.id, 'validation_error', 400);
      return;
    }
    if (!grantToken) {
      sendDomainError(res, req.id, 'draft_not_found', 401);
      return;
    }
    try {
      const ctx = websiteContext(req);
      const leadId = await documents.grants.verifyLead({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        grantToken,
        now: new Date(),
      });
      // Customer uploads only ever attach to their own lead. `parentType` must be
      // 'lead' and `parentId` must match the grant's lead.
      if (!leadId || body.data.parentType !== 'lead' || body.data.parentId !== leadId) {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      const outcome = await documents.service.createIntent({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        requestId: req.id,
        recordType: 'lead',
        recordId: leadId,
        documentType: body.data.documentType,
        declaredContentType: body.data.contentType,
        declaredSizeBytes: body.data.sizeBytes,
      });
      if (outcome.status === 'created') {
        res.status(201).json({
          uploadId: outcome.uploadId,
          url: outcome.url,
          method: 'PUT',
          headers: outcome.headers,
          expiresAt: outcome.expiresAt.toISOString(),
          requestId: req.id,
        });
        return;
      }
      if (outcome.status === 'parent_not_found') {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      if (outcome.status === 'too_large') {
        sendDomainError(res, req.id, 'document_too_large', 413);
        return;
      }
      sendDomainError(res, req.id, 'checklist_mismatch', 409);
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  router.post('/uploads/:uploadId/finalize', requireScope('uploads:customer'), async (req, res) => {
    if (!documents) {
      sendDomainError(res, req.id, 'feature_not_ready', 409);
      return;
    }
    const uploadId = z.uuid().safeParse(req.params['uploadId']);
    const body = finalizeUploadRequestSchema.safeParse(req.body);
    const grantToken = requireDraftGrant(req);
    if (!uploadId.success || !body.success) {
      sendDomainError(res, req.id, 'validation_error', 400);
      return;
    }
    if (!grantToken) {
      sendDomainError(res, req.id, 'draft_not_found', 401);
      return;
    }
    try {
      const ctx = websiteContext(req);
      const leadId = await documents.grants.verifyLead({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        grantToken,
        now: new Date(),
      });
      if (!leadId) {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      const outcome = await documents.service.finalize({
        workspaceId: ctx.workspaceId,
        actorId: ctx.credentialId,
        requestId: req.id,
        fileId: uploadId.data,
        checksumSha256: body.data.checksumSha256,
        ownedLeadId: leadId,
      });
      switch (outcome.status) {
        case 'available':
          res.json({ file: toFileSummary(outcome.file), requestId: req.id });
          return;
        case 'rejected':
          sendDomainError(res, req.id, 'document_verification_failed', 422, {
            reason: outcome.reason,
          });
          return;
        case 'in_progress':
          res.setHeader('retry-after', '2');
          sendDomainError(res, req.id, 'verification_in_progress', 409, { retryable: true });
          return;
        case 'expired':
          sendDomainError(res, req.id, 'upload_expired', 410);
          return;
        case 'not_found':
          sendDomainError(res, req.id, 'upload_not_found', 404);
          return;
      }
    } catch {
      sendDomainError(res, req.id, 'internal_error', 500);
    }
  });

  router.post(
    '/files/:fileId/download-link',
    requireScope('uploads:customer'),
    async (req, res) => {
      if (!documents) {
        sendDomainError(res, req.id, 'feature_not_ready', 409);
        return;
      }
      const fileId = z.uuid().safeParse(req.params['fileId']);
      const grantToken = requireDraftGrant(req);
      if (!fileId.success) {
        sendDomainError(res, req.id, 'validation_error', 400);
        return;
      }
      if (!grantToken) {
        sendDomainError(res, req.id, 'draft_not_found', 401);
        return;
      }
      try {
        const ctx = websiteContext(req);
        const leadId = await documents.grants.verifyLead({
          workspaceId: ctx.workspaceId,
          actorId: ctx.credentialId,
          grantToken,
          now: new Date(),
        });
        if (!leadId) {
          sendDomainError(res, req.id, 'draft_not_found', 401);
          return;
        }
        const outcome = await documents.service.issueDownload({
          workspaceId: ctx.workspaceId,
          actorId: ctx.credentialId,
          fileId: fileId.data,
          ownedLeadId: leadId,
        });
        if (outcome.status === 'issued') {
          res.json({
            url: outcome.url,
            expiresAt: outcome.expiresAt.toISOString(),
            requestId: req.id,
          });
          return;
        }
        if (outcome.status === 'not_available') {
          sendDomainError(res, req.id, 'file_not_available', 409);
          return;
        }
        sendDomainError(res, req.id, 'file_not_found', 404);
      } catch {
        sendDomainError(res, req.id, 'internal_error', 500);
      }
    },
  );

  return router;
}

/** Default minimum latency for the neutral OTP response (env-overridable for tests). */
const TRACKING_OTP_MIN_LATENCY_DEFAULT_MS = 500;
const TRACKING_OTP_MIN_LATENCY_MAX_MS = 5_000;

/** Resolves the neutral-response floor. `TRACKING_OTP_MIN_LATENCY_MS` may lower it for tests. */
function trackingMinLatencyMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.TRACKING_OTP_MIN_LATENCY_MS);
  if (Number.isFinite(raw) && raw >= 0 && raw <= TRACKING_OTP_MIN_LATENCY_MAX_MS) {
    return Math.round(raw);
  }
  return TRACKING_OTP_MIN_LATENCY_DEFAULT_MS;
}

/** Waits until `floorMs` has elapsed since `startMs`, so a response is timing-independent. */
async function settleUntil(startMs: number, floorMs: number): Promise<void> {
  const remaining = startMs + floorMs - Date.now();
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

/**
 * Customer order tracking (T22, REQ 05). `POST /tracking/otp` always answers the
 * same neutral acknowledgement so a caller cannot tell whether the reference +
 * email matched an order; the code is only sent on a match. `verify` consumes
 * the code atomically and returns a 30-minute grant; `GET /tracking` requires
 * the grant and is bound to the credential's own workspace.
 */
export function createTrackingRouter(dependencies: WebsiteRouteDependencies): Router {
  const router = Router();
  const tracking = dependencies.tracking;
  if (!tracking) return router;

  router.post(
    '/tracking/otp',
    requireWebsiteCredential(dependencies.auth),
    requireScope('tracking:otp'),
    async (req, res) => {
      const startedAt = Date.now();
      const body = trackingOtpRequestSchema.safeParse(req.body);
      if (!body.success) {
        sendDomainError(res, req.id, 'validation_error', 400);
        return;
      }
      try {
        const ctx = websiteContext(req);
        if (tracking.service.configured) {
          const secret = loadTrackingSecret();
          const ipKey = req.ip ?? req.socket.remoteAddress ?? 'unknown';
          const emailLimit = secret
            ? await dependencies.auth.rateLimit({
                bucketKey: emailRateBucket(
                  secret,
                  ctx.workspaceId,
                  normalizeEmail(body.data.email),
                ),
                windowSeconds: TRACKING_OTP_EMAIL_WINDOW_SECONDS,
                maxCount: TRACKING_OTP_EMAIL_MAX_REQUESTS,
              })
            : { allowed: true, retryAfterSeconds: 0 };
          const ipLimit = await dependencies.auth.rateLimit({
            bucketKey: `tracking-otp:ip:${ctx.workspaceId}:${ipKey}`,
            windowSeconds: TRACKING_OTP_EMAIL_WINDOW_SECONDS,
            maxCount: TRACKING_OTP_EMAIL_MAX_REQUESTS * 4,
          });
          if (emailLimit.allowed && ipLimit.allowed) {
            await tracking.service.requestCode({
              workspaceId: ctx.workspaceId,
              email: body.data.email,
              orderReference: body.data.orderReference,
            });
          }
        }
      } catch {
        // Neutral response regardless of internal outcome.
      }
      // Enumeration resistance includes timing: the response is not sent until
      // the floor has elapsed, so a match does not measurably differ.
      await settleUntil(startedAt, trackingMinLatencyMs());
      res.status(200).json({ status: 'challenge_sent', requestId: req.id });
    },
  );

  router.post(
    '/tracking/verify',
    requireWebsiteCredential(dependencies.auth),
    requireScope('tracking:otp'),
    async (req, res) => {
      const body = trackingVerifyRequestSchema.safeParse(req.body);
      if (!body.success) {
        sendDomainError(res, req.id, 'validation_error', 400);
        return;
      }
      if (!tracking.service.configured) {
        sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true });
        return;
      }
      try {
        const ctx = websiteContext(req);
        const secret = loadTrackingSecret();
        const ipKey = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        // Code guessing is rate-limited by email and by IP, independent of the
        // five-attempt cap on each individual challenge.
        const emailLimit = secret
          ? await dependencies.auth.rateLimit({
              bucketKey: emailRateBucket(secret, ctx.workspaceId, normalizeEmail(body.data.email)),
              windowSeconds: TRACKING_OTP_EMAIL_WINDOW_SECONDS,
              maxCount: TRACKING_OTP_VERIFY_EMAIL_MAX_REQUESTS,
            })
          : { allowed: true, retryAfterSeconds: 0 };
        const ipLimit = await dependencies.auth.rateLimit({
          bucketKey: `tracking-verify:ip:${ctx.workspaceId}:${ipKey}`,
          windowSeconds: TRACKING_OTP_EMAIL_WINDOW_SECONDS,
          maxCount: TRACKING_OTP_VERIFY_EMAIL_MAX_REQUESTS * 4,
        });
        if (!emailLimit.allowed || !ipLimit.allowed) {
          const retryAfter = String(
            emailLimit.allowed ? ipLimit.retryAfterSeconds : emailLimit.retryAfterSeconds,
          );
          sendWebsiteError(res, req.id, 'rate_limited', 429, { 'retry-after': retryAfter });
          return;
        }
        const outcome = await tracking.service.verifyCode({
          workspaceId: ctx.workspaceId,
          email: body.data.email,
          orderReference: body.data.orderReference,
          code: body.data.code,
        });
        if (outcome.status === 'verified') {
          res.status(200).json({ status: 'verified', grant: outcome.grant, requestId: req.id });
          return;
        }
        // One generic failure for every non-verified outcome, so a guesser never
        // learns whether the challenge exists or how it ended.
        sendDomainError(res, req.id, 'tracking_challenge_invalid', 400);
      } catch {
        sendDomainError(res, req.id, 'internal_error', 500);
      }
    },
  );

  router.get(
    '/tracking',
    requireWebsiteCredential(dependencies.auth),
    requireScope('tracking:otp'),
    async (req, res) => {
      if (!tracking.service.configured) {
        sendDomainError(res, req.id, 'persistence_unavailable', 503, { retryable: true });
        return;
      }
      const secret = loadTrackingSecret();
      const token = req.get('x-customer-grant');
      if (!secret || !token) {
        sendDomainError(res, req.id, 'not_found', 401);
        return;
      }
      const ctx = websiteContext(req);
      const payload = verifyTrackingGrant(secret, token, Date.now());
      // The grant is bound to one workspace; a foreign-workspace grant is denied.
      if (!payload || payload.workspaceId !== ctx.workspaceId) {
        sendDomainError(res, req.id, 'not_found', 401);
        return;
      }
      try {
        const status = await tracking.service.status({
          workspaceId: ctx.workspaceId,
          orderId: payload.orderId,
        });
        if (!status) {
          sendDomainError(res, req.id, 'order_not_found', 404);
          return;
        }
        res.status(200).json({
          ...status,
          updatedAt: status.updatedAt.toISOString(),
          requestId: req.id,
        });
      } catch {
        sendDomainError(res, req.id, 'internal_error', 500);
      }
    },
  );

  return router;
}
