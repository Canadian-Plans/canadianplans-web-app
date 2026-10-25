import { z } from 'zod';
import type { EmailAdapter } from '@canadian-plans/adapters';
import {
  JobHandlerError,
  type EmailDeliveryRecorder,
  type EmailEligibilityChecker,
  type JobHandler,
} from '@canadian-plans/jobs';
import { codeBindingHash, emailBindingHash, hashesEqual, normalizeEmail } from './secrets.js';
import { openTrackingCode } from './cipher.js';
import { DatabaseTrackingStore } from './store.js';
import { hashContact, requireContactHashSecret } from '../email/hash.js';

/** Payload version 2: an email-scoped challenge (no order). */
const payloadSchema = z
  .object({
    challengeId: z.uuid(),
    toAddress: z.email(),
    contactHash: z.string().regex(/^[a-f0-9]{64}$/),
    sealedCode: z.string().max(100),
    expiresAt: z.iso.datetime(),
  })
  .strict();
/** What a finished job keeps: identifiers only (version 1 also kept its order id). */
const scrubbedPayloadSchema = z
  .object({ orderId: z.uuid().optional(), challengeId: z.uuid() })
  .strict();

/** Challenge validity and deliverability are rechecked immediately before an outbox send. */
export function createTrackingOtpHandler(options: {
  email: EmailAdapter;
  eligibility: EmailEligibilityChecker;
  delivery?: EmailDeliveryRecorder;
  store?: Pick<DatabaseTrackingStore, 'pendingDelivery'>;
  secret: string | undefined;
  contactHashSecret?: () => string;
  now?: () => Date;
}): JobHandler {
  const store = options.store ?? new DatabaseTrackingStore();
  return async (job) => {
    const skip = () => ({
      status: 'completed' as const,
      providerId: 'skipped:tracking_challenge_inactive',
    });
    // Version 1 codes were bound to one order and can no longer verify after
    // email-only tracking, so a job queued before the release sends nothing.
    if (job.payloadVersion === 1) return skip();
    if (job.payloadVersion !== 2) throw new JobHandlerError('unsupported_payload_version', false);
    // A finished job keeps only its identifiers; a staff retry of it has no
    // code left to send, and the customer requests a new one instead.
    if (scrubbedPayloadSchema.safeParse(job.payload).success) return skip();
    const parsed = payloadSchema.safeParse(job.payload);
    const actor = z.uuid().safeParse(job.actorId);
    if (!parsed.success || !actor.success) throw new JobHandlerError('invalid_job_payload', false);
    const payload = parsed.data;
    const now = options.now?.() ?? new Date();
    if (new Date(payload.expiresAt).getTime() <= now.getTime()) return skip();
    const secret = options.secret;
    if (!secret) throw new JobHandlerError('tracking_not_configured', false);
    const email = normalizeEmail(payload.toAddress);
    const current = await store.pendingDelivery({
      workspaceId: job.workspaceId,
      actorId: actor.data,
      challengeId: payload.challengeId,
      normalizedEmail: email,
      now,
    });
    // The queued address must be the one the challenge was issued for.
    if (
      !current ||
      !hashesEqual(current.emailHash, emailBindingHash(secret, job.workspaceId, email))
    )
      return skip();
    const contactHash = hashContact(
      email,
      (options.contactHashSecret ?? requireContactHashSecret)(),
    );
    if (!hashesEqual(contactHash, payload.contactHash)) return skip();
    const code = openTrackingCode(
      secret,
      { workspaceId: job.workspaceId, challengeId: payload.challengeId },
      payload.sealedCode,
    );
    if (
      !code ||
      !hashesEqual(current.codeHash, codeBindingHash(secret, job.workspaceId, email, code))
    )
      return skip();
    const eligible = await options.eligibility.checkTransactional({
      workspaceId: job.workspaceId,
      actorId: actor.data,
      contactHash,
    });
    if (!eligible.eligible) return { status: 'completed', providerId: 'skipped:suppressed' };
    await options.delivery?.prepare({
      workspaceId: job.workspaceId,
      actorId: actor.data,
      messageId: job.messageId,
      contactHash,
      template: 'tracking_otp',
      messageClass: 'transactional',
    });
    const result = await options.email.send({
      workspaceId: job.workspaceId,
      messageId: job.messageId,
      template: 'tracking_otp',
      toAddress: email,
      variables: { code },
    });
    await options.delivery?.recordResult({
      workspaceId: job.workspaceId,
      actorId: actor.data,
      messageId: job.messageId,
      result,
    });
    if (result.status === 'delivered')
      return { status: 'completed', providerId: result.providerId };
    return {
      status: 'uncertain',
      errorCode: /^[a-z0-9_]{1,64}$/.test(result.errorCode)
        ? result.errorCode
        : 'provider_uncertain',
    };
  };
}
