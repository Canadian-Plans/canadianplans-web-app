import type {
  OrderChangeRequestPatch,
  TrackingOrderDetail,
  TrackingOrderSummary,
} from '@canadian-plans/contracts';

import { sealTrackingCode } from './cipher.js';
import { hashContact, requireContactHashSecret } from '../email/hash.js';
import {
  codeBindingHash,
  emailBindingHash,
  generateOtpCode,
  normalizeEmail,
  signTrackingGrant,
  verifyTrackingGrant,
  type TrackingGrantIdentity,
} from './secrets.js';
import type { ConsumeOutcome, CustomerChangeOutcome, TrackingStore } from './store.js';
import { MAX_TRACKING_ATTEMPTS } from './store.js';

/** The challenge lifetime (10 minutes) and per-email request bound. */
export const TRACKING_OTP_TTL_MS = 10 * 60 * 1_000;
export const TRACKING_OTP_EMAIL_WINDOW_SECONDS = 10 * 60;
export const TRACKING_OTP_EMAIL_MAX_REQUESTS = MAX_TRACKING_ATTEMPTS;
/** Per-email bound on code verifications (separate from code requests). */
export const TRACKING_OTP_VERIFY_EMAIL_MAX_REQUESTS = MAX_TRACKING_ATTEMPTS * 2;
/** Per-email bound on customer writes (change requests, answers, uploads) per window. */
export const TRACKING_WRITE_EMAIL_MAX_REQUESTS = 30;

export type TrackingVerifyOutcome =
  | { status: 'verified'; grant: { token: string; expiresAt: string } }
  | { status: Exclude<ConsumeOutcome, 'verified'> };

export interface TrackingServiceDependencies {
  readonly store: TrackingStore;
  readonly contactHashSecret?: () => string;
  /** Absent means tracking is unavailable; request is neutral, verify/reads fail closed. */
  readonly secret: string | undefined;
  readonly now?: () => Date;
}

/**
 * Email-only customer tracking (REQ 05). A code covers every order of one email
 * on one website; the grant it yields is bound to that workspace and email, and
 * every read or write re-resolves orders by reference **and** email.
 */
export class TrackingService {
  constructor(private readonly dependencies: TrackingServiceDependencies) {}

  get configured(): boolean {
    return this.dependencies.secret !== undefined;
  }

  private now(): Date {
    return this.dependencies.now?.() ?? new Date();
  }

  /**
   * Sends a code only when the email has an active order in the workspace.
   * Always resolves without revealing whether a match occurred.
   */
  async requestCode(input: { workspaceId: string; email: string }): Promise<void> {
    const secret = this.dependencies.secret;
    if (!secret) return;

    const normalizedEmail = normalizeEmail(input.email);
    const known = await this.dependencies.store.hasActiveOrders({
      workspaceId: input.workspaceId,
      normalizedEmail,
    });
    if (!known) return;

    const code = generateOtpCode();
    const now = this.now();
    const challengeId = crypto.randomUUID();
    await this.dependencies.store.createChallengeAndQueue({
      workspaceId: input.workspaceId,
      challengeId,
      normalizedEmail,
      emailHash: emailBindingHash(secret, input.workspaceId, normalizedEmail),
      codeHash: codeBindingHash(secret, input.workspaceId, normalizedEmail, code),
      expiresAt: new Date(now.getTime() + TRACKING_OTP_TTL_MS),
      now,
      sealedCode: sealTrackingCode(secret, { workspaceId: input.workspaceId, challengeId }, code),
      contactHash: hashContact(
        normalizedEmail,
        (this.dependencies.contactHashSecret ?? requireContactHashSecret)(),
      ),
    });
  }

  async verifyCode(input: {
    workspaceId: string;
    email: string;
    code: string;
  }): Promise<TrackingVerifyOutcome> {
    const secret = this.dependencies.secret;
    if (!secret) return { status: 'not_found' };

    const normalizedEmail = normalizeEmail(input.email);
    const outcome = await this.dependencies.store.consume({
      workspaceId: input.workspaceId,
      normalizedEmail,
      emailHash: emailBindingHash(secret, input.workspaceId, normalizedEmail),
      candidateCodeHash: codeBindingHash(secret, input.workspaceId, normalizedEmail, input.code),
      now: this.now(),
    });
    if (outcome !== 'verified') return { status: outcome };

    const grant = signTrackingGrant(
      secret,
      { workspaceId: input.workspaceId, normalizedEmail },
      this.now().getTime(),
    );
    return { status: 'verified', grant };
  }

  /**
   * The identity a grant proves, or `undefined` when it is missing, invalid,
   * expired or issued for another workspace (website).
   */
  identify(token: string | undefined, workspaceId: string): TrackingGrantIdentity | undefined {
    const secret = this.dependencies.secret;
    if (!secret || !token) return undefined;
    const identity = verifyTrackingGrant(secret, token, this.now().getTime());
    return identity?.workspaceId === workspaceId ? identity : undefined;
  }

  listOrders(identity: TrackingGrantIdentity): Promise<TrackingOrderSummary[]> {
    return this.dependencies.store.listOrders(identity);
  }

  order(
    identity: TrackingGrantIdentity,
    reference: string,
  ): Promise<TrackingOrderDetail | undefined> {
    return this.dependencies.store.orderDetail({ ...identity, reference });
  }

  /** The internal id of one of this email's orders, for the upload pipeline. */
  orderId(identity: TrackingGrantIdentity, reference: string): Promise<string | undefined> {
    return this.dependencies.store.orderId({ ...identity, reference });
  }

  requestChange(
    identity: TrackingGrantIdentity,
    input: {
      actorId: string;
      requestId: string;
      reference: string;
      patch: OrderChangeRequestPatch;
      note?: string;
      infoRequestId?: string;
    },
  ): Promise<CustomerChangeOutcome> {
    return this.dependencies.store.createCustomerChange({
      workspaceId: identity.workspaceId,
      normalizedEmail: identity.normalizedEmail,
      ...input,
      now: this.now(),
    });
  }
}
