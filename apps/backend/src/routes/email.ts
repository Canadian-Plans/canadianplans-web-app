import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import {
  requireStaffSession,
  SupabaseStaffSessionVerifier,
  type StaffSessionVerifier,
} from '../auth/session.js';
import { DatabaseEmailStore, type EmailStore } from '../email/store.js';
import { hashContact, normalizeEmail, requireContactHashSecret } from '../email/hash.js';
import { createAuthorize } from '../staff/authorization.js';
import { DatabaseStaffStore, type StaffStore } from '../staff/store.js';
import { FakeSuppressionLedgerPublisher } from '@canadian-plans/adapters';

export interface EmailRouteDependencies {
  store: EmailStore;
  sessionVerifier: StaffSessionVerifier;
  /**
   * Read lazily (only when a request actually needs it), not at app
   * construction — so a deployment/test that never exercises an email route
   * is never forced to configure this secret up front.
   */
  contactHashSecret: () => string;
  /** The consent-version string recorded for an unsubscribe (CASL). */
  unsubscribeConsentVersion: string;
  /** Shared secret gating the provider event webhook (see BLOCKERS: real SES/SNS signature verification is pending OPEN_INPUTS #23). */
  webhookSharedSecret: string | undefined;
  /** Read-only visibility into delivery status is `workspace.read`, not a privileged financial action. */
  authorizeDeliveryView: (actorId: string, workspaceId: string) => Promise<boolean>;
}

/**
 * `SES_...` env vars are read only here; nothing above the route layer
 * touches them. Missing config fails closed rather than defaulting.
 */
export function createDefaultEmailRouteDependencies(
  staffStore: Pick<StaffStore, 'loadStaffAccess'> = new DatabaseStaffStore(),
): EmailRouteDependencies {
  return {
    store: new DatabaseEmailStore(new FakeSuppressionLedgerPublisher()),
    sessionVerifier: new SupabaseStaffSessionVerifier(),
    contactHashSecret: () => requireContactHashSecret(),
    unsubscribeConsentVersion: process.env.MARKETING_CONSENT_VERSION ?? '1',
    webhookSharedSecret: process.env.EMAIL_WEBHOOK_SHARED_SECRET,
    authorizeDeliveryView: async (actorId, workspaceId) => {
      const authorize = createAuthorize({ accessStore: staffStore, assuranceLevel: 'aal1' });
      const decision = await authorize({ actorId, workspaceId, action: 'workspace.read' });
      return decision.allowed;
    },
  };
}

/**
 * Builds an unsubscribe token that identifies a workspace + contact + lead
 * without a login/session, and without embedding the raw email address. The
 * signature binds all three fields so a token cannot be replayed against a
 * different workspace or lead.
 */
export function buildUnsubscribeToken(
  secret: string,
  input: { workspaceId: string; contactHash: string; leadId?: string },
): string {
  const payload = `${input.workspaceId}.${input.contactHash}.${input.leadId ?? ''}`;
  const signature = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  return Buffer.from(`${payload}.${signature}`, 'utf8').toString('base64url');
}

function verifyUnsubscribeToken(
  secret: string,
  token: string,
): { workspaceId: string; contactHash: string; leadId?: string } | undefined {
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return undefined;
  }
  const parts = decoded.split('.');
  if (parts.length !== 4) return undefined;
  const workspaceId = parts[0];
  const contactHash = parts[1];
  const leadId = parts[2];
  const signature = parts[3];
  if (
    workspaceId === undefined ||
    contactHash === undefined ||
    leadId === undefined ||
    signature === undefined
  ) {
    return undefined;
  }
  const payload = `${workspaceId}.${contactHash}.${leadId}`;
  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return undefined;
  }
  return { workspaceId, contactHash, leadId: leadId || undefined };
}

const providerEventSchema = z
  .object({
    providerEventId: z.string().min(1).max(200),
    eventType: z.enum(['delivered', 'bounce', 'complaint', 'reject']),
    workspaceId: z.uuid(),
    messageId: z.uuid().optional(),
    toAddress: z.string().email().optional(),
    receivedAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * Email routes: a public no-login unsubscribe endpoint, a verified provider
 * event inbox, and a staff-only delivery-status view.
 *
 * NOTE (BLOCKERS): SES/SNS delivery notifications should be verified via the
 * provider's supported transport (signed SNS message or SES event
 * destination with a registered secret) once OPEN_INPUTS #23 is resolved.
 * Today this checks a shared-secret header only — sufficient for the fake
 * adapter and CI, not sufficient for a live SES integration.
 */
export function createEmailRouter(dependencies: EmailRouteDependencies): Router {
  const router = Router();

  router.get('/unsubscribe', async (req: Request, res: Response) => {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    if (!token) {
      res.status(400).json({ error: 'missing_token' });
      return;
    }
    const parsed = verifyUnsubscribeToken(dependencies.contactHashSecret(), token);
    if (!parsed) {
      res.status(400).json({ error: 'invalid_token' });
      return;
    }
    await dependencies.store.recordUnsubscribe({
      workspaceId: parsed.workspaceId,
      contactHash: parsed.contactHash,
      leadId: parsed.leadId,
      version: dependencies.unsubscribeConsentVersion,
      now: new Date(),
    });
    res.status(200).json({ status: 'unsubscribed' });
  });

  router.post('/webhook/events', async (req: Request, res: Response) => {
    const providedSecret = req.get('x-email-webhook-secret');
    if (!dependencies.webhookSharedSecret || providedSecret !== dependencies.webhookSharedSecret) {
      res.status(401).json({ error: 'invalid_webhook_signature' });
      return;
    }
    const parsed = providerEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_event' });
      return;
    }
    const contactHash = parsed.data.toAddress
      ? hashContact(normalizeEmail(parsed.data.toAddress), dependencies.contactHashSecret())
      : undefined;
    const outcome = await dependencies.store.applyProviderEvent({
      workspaceId: parsed.data.workspaceId,
      actorId: 'system:email_webhook',
      providerEventId: parsed.data.providerEventId,
      eventType: parsed.data.eventType,
      messageId: parsed.data.messageId,
      contactHash,
      receivedAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : new Date(),
    });
    res.status(200).json({ status: outcome });
  });

  router.use('/staff', requireStaffSession(dependencies.sessionVerifier));
  router.get('/staff/workspaces/:workspaceId/delivery', async (req, res) => {
    const workspaceId = z.uuid().safeParse(req.params['workspaceId']);
    const actor = req.staffSession;
    if (!workspaceId.success || !actor) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    const authorized = await dependencies.authorizeDeliveryView(actor.actorId, workspaceId.data);
    if (!authorized) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    const [rows, summary] = await Promise.all([
      dependencies.store.listDelivery(workspaceId.data, actor.actorId),
      dependencies.store.deliverySummary(workspaceId.data, actor.actorId),
    ]);
    // sent/delivered/failed/uncertain are surfaced as distinct counters, never
    // collapsed into a single "ok/error" status (T18 admin requirement).
    res.status(200).json({ messages: rows, summary });
  });

  return router;
}
