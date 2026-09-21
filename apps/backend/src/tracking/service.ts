import type { TrackingNotifier } from './notifier.js';
import {
  codeBindingHash,
  emailBindingHash,
  generateOtpCode,
  normalizeEmail,
  signTrackingGrant,
} from './secrets.js';
import type { ConsumeOutcome, TrackingStatusView, TrackingStore } from './store.js';
import { MAX_TRACKING_ATTEMPTS } from './store.js';

/** The challenge lifetime (10 minutes) and per-email request bound. */
export const TRACKING_OTP_TTL_MS = 10 * 60 * 1_000;
export const TRACKING_OTP_EMAIL_WINDOW_SECONDS = 10 * 60;
export const TRACKING_OTP_EMAIL_MAX_REQUESTS = MAX_TRACKING_ATTEMPTS;
/** Per-email bound on code verifications (separate from code requests). */
export const TRACKING_OTP_VERIFY_EMAIL_MAX_REQUESTS = MAX_TRACKING_ATTEMPTS * 2;

export type TrackingVerifyOutcome =
  | { status: 'verified'; grant: { token: string; expiresAt: string } }
  | { status: Exclude<ConsumeOutcome, 'verified'> };

export interface TrackingServiceDependencies {
  readonly store: TrackingStore;
  readonly notifier: TrackingNotifier;
  /** Absent means tracking is unavailable; request is neutral, verify/status fail closed. */
  readonly secret: string | undefined;
  readonly now?: () => Date;
}

export class TrackingService {
  constructor(private readonly dependencies: TrackingServiceDependencies) {}

  get configured(): boolean {
    return this.dependencies.secret !== undefined;
  }

  private now(): Date {
    return this.dependencies.now?.() ?? new Date();
  }

  /**
   * Sends a code only when the reference and email match an order in the
   * workspace. Always resolves without revealing whether a match occurred.
   */
  async requestCode(input: {
    workspaceId: string;
    email: string;
    orderReference: string;
  }): Promise<void> {
    const secret = this.dependencies.secret;
    if (!secret) return;

    const normalizedEmail = normalizeEmail(input.email);
    const match = await this.dependencies.store.matchOrder({
      workspaceId: input.workspaceId,
      reference: input.orderReference,
      normalizedEmail,
    });
    if (!match) return;

    // A resend invalidates any still-pending challenge for this binding.
    const emailHash = emailBindingHash(secret, input.workspaceId, match.orderId, normalizedEmail);
    await this.dependencies.store.invalidatePending({
      workspaceId: input.workspaceId,
      orderId: match.orderId,
      emailHash,
    });

    const code = generateOtpCode();
    const now = this.now();
    await this.dependencies.store.createChallenge({
      workspaceId: input.workspaceId,
      orderId: match.orderId,
      emailHash,
      codeHash: codeBindingHash(secret, input.workspaceId, match.orderId, normalizedEmail, code),
      expiresAt: new Date(now.getTime() + TRACKING_OTP_TTL_MS),
    });
    await this.dependencies.notifier.send({
      workspaceId: input.workspaceId,
      email: normalizedEmail,
      reference: input.orderReference,
      code,
    });
  }

  async verifyCode(input: {
    workspaceId: string;
    email: string;
    orderReference: string;
    code: string;
  }): Promise<TrackingVerifyOutcome> {
    const secret = this.dependencies.secret;
    if (!secret) return { status: 'not_found' };

    const normalizedEmail = normalizeEmail(input.email);
    const match = await this.dependencies.store.matchOrder({
      workspaceId: input.workspaceId,
      reference: input.orderReference,
      normalizedEmail,
    });
    if (!match) return { status: 'not_found' };

    const emailHash = emailBindingHash(secret, input.workspaceId, match.orderId, normalizedEmail);
    const outcome = await this.dependencies.store.consume({
      workspaceId: input.workspaceId,
      orderId: match.orderId,
      emailHash,
      candidateCodeHash: codeBindingHash(
        secret,
        input.workspaceId,
        match.orderId,
        normalizedEmail,
        input.code,
      ),
      now: this.now(),
    });
    if (outcome !== 'verified') return { status: outcome };

    const grant = signTrackingGrant(
      secret,
      { workspaceId: input.workspaceId, orderId: match.orderId, emailHash },
      this.now().getTime(),
    );
    return { status: 'verified', grant };
  }

  /** Order status for a verified grant; never internal notes or staff names. */
  status(input: { workspaceId: string; orderId: string }): Promise<TrackingStatusView | undefined> {
    return this.dependencies.store.status(input);
  }
}
