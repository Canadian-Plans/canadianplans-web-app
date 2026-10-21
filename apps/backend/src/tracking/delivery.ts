import { z } from 'zod';
import type { EmailAdapter } from '@canadian-plans/adapters';
import {
  JobHandlerError,
  type EmailDeliveryRecorder,
  type EmailEligibilityChecker,
  type JobHandler,
} from '@canadian-plans/jobs';
import { codeBindingHash, hashesEqual } from './secrets.js';
import { openTrackingCode } from './cipher.js';
import { DatabaseTrackingStore } from './store.js';
import { hashContact, requireContactHashSecret } from '../email/hash.js';

const payloadSchema = z
  .object({
    orderId: z.uuid(),
    challengeId: z.uuid(),
    reference: z.string().min(1).max(32),
    toAddress: z.email(),
    contactHash: z.string().regex(/^[a-f0-9]{64}$/),
    sealedCode: z.string().max(100),
    expiresAt: z.iso.datetime(),
  })
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
    if (job.payloadVersion !== 1) throw new JobHandlerError('unsupported_payload_version', false);
    const parsed = payloadSchema.safeParse(job.payload);
    const actor = z.uuid().safeParse(job.actorId);
    if (!parsed.success || !actor.success) throw new JobHandlerError('invalid_job_payload', false);
    const payload = parsed.data;
    const skip = () => ({
      status: 'completed' as const,
      providerId: 'skipped:tracking_challenge_inactive',
    });
    const now = options.now?.() ?? new Date();
    if (new Date(payload.expiresAt).getTime() <= now.getTime()) return skip();
    const secret = options.secret;
    if (!secret) throw new JobHandlerError('tracking_not_configured', false);
    const current = await store.pendingDelivery({
      workspaceId: job.workspaceId,
      actorId: actor.data,
      orderId: payload.orderId,
      challengeId: payload.challengeId,
      now,
    });
    if (!current || current.email !== payload.toAddress || current.reference !== payload.reference)
      return skip();
    const contactHash = hashContact(
      current.email,
      (options.contactHashSecret ?? requireContactHashSecret)(),
    );
    if (!hashesEqual(contactHash, payload.contactHash)) return skip();
    const code = openTrackingCode(
      secret,
      { workspaceId: job.workspaceId, orderId: payload.orderId, challengeId: payload.challengeId },
      payload.sealedCode,
    );
    if (
      !code ||
      !hashesEqual(
        current.codeHash,
        codeBindingHash(secret, job.workspaceId, payload.orderId, current.email, code),
      )
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
      orderId: payload.orderId,
      template: 'tracking_otp',
      messageClass: 'transactional',
    });
    const result = await options.email.send({
      workspaceId: job.workspaceId,
      messageId: job.messageId,
      template: 'tracking_otp',
      toAddress: current.email,
      orderId: payload.orderId,
      reference: current.reference,
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
