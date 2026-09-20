import type { AnalyticsSink, EmailAdapter } from '@canadian-plans/adapters';
import { z } from 'zod';

export const outboxJobTypes = [
  'order_acknowledgement_email',
  'analytics_order_submitted',
  'analytics_lead_saved',
  'deletion_ledger_publish',
] as const;
export type OutboxJobType = (typeof outboxJobTypes)[number];

export interface ClaimedJob {
  id: string;
  workspaceId: string;
  jobType: string;
  messageId: string;
  payloadVersion: number;
  payload: unknown;
  /** Attempt number after the atomic claim increment. */
  attempts: number;
  leaseOwnerId: string;
}

export type JobOutcome =
  | { status: 'completed'; providerId: string; detail?: Record<string, unknown> }
  | { status: 'retry'; errorCode: string; availableAt: Date }
  | { status: 'failed'; errorCode: string }
  | { status: 'uncertain'; errorCode: string };

export interface OutboxStore {
  claim(input: {
    workspaceId: string;
    actorId: string;
    leaseOwnerId: string;
    limit: number;
    leaseExpiresAt: Date;
    now: Date;
    maxAttempts: number;
  }): Promise<ClaimedJob[]>;
  recordOutcome(input: {
    workspaceId: string;
    actorId: string;
    jobId: string;
    leaseOwnerId: string;
    outcome: JobOutcome;
    now: Date;
  }): Promise<'recorded' | 'lease_lost'>;
}

export type JobHandlerResult =
  | { status: 'completed'; providerId: string; detail?: Record<string, unknown> }
  | { status: 'uncertain'; errorCode: string };
/**
 * Handlers receive an abort signal for the runner's per-handler timeout. It is
 * optional so existing handlers stay valid; providers that accept an
 * `AbortSignal` should forward it so a timed-out call is actually cancelled.
 */
export type JobHandler = (job: ClaimedJob, signal?: AbortSignal) => Promise<JobHandlerResult>;
export type JobHandlerRegistry = ReadonlyMap<string, JobHandler>;

export class JobHandlerError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'JobHandlerError';
  }
}

/** Raised internally when the runner's per-handler timeout fires. */
class HandlerTimeoutError extends Error {
  constructor() {
    super('handler_timeout');
    this.name = 'HandlerTimeoutError';
  }
}

/**
 * A registry whose every registered handler fails permanently with one code.
 * Used when no provider adapter is configured (for example a production
 * deployment without real email/analytics credentials): the job is recorded as
 * failed so it is visible in admin instead of silently invoking a fake.
 */
export function createFailingJobHandlerRegistry(errorCode: string): JobHandlerRegistry {
  const safe = safeErrorCode(errorCode, 'provider_not_configured');
  const handlers: [string, JobHandler][] = outboxJobTypes.map((jobType) => [
    jobType,
    async () => {
      throw new JobHandlerError(safe, false);
    },
  ]);
  return new Map(handlers);
}

const acknowledgementPayloadSchema = z
  .object({ orderId: z.uuid(), reference: z.string().min(1).max(32) })
  .strict();
const orderSubmittedPayloadSchema = z.object({ orderId: z.uuid() }).strict();
const leadSavedPayloadSchema = z.object({ leadId: z.uuid() }).strict();

function safeErrorCode(value: string, fallback: string): string {
  return /^[a-z0-9_]{1,64}$/.test(value) ? value : fallback;
}

/**
 * The complete handler registry (T15 + T20). Conversions are the two analytics
 * events plus the acknowledgement email. Commissions are intentionally not an
 * outbox handler — they are internal activation writes.
 */
export function createJobHandlerRegistry(dependencies: {
  email: EmailAdapter;
  analytics: AnalyticsSink;
}): JobHandlerRegistry {
  return new Map<string, JobHandler>([
    [
      'order_acknowledgement_email',
      async (job) => {
        if (job.payloadVersion !== 1)
          throw new JobHandlerError('unsupported_payload_version', false);
        const parsed = acknowledgementPayloadSchema.safeParse(job.payload);
        if (!parsed.success) throw new JobHandlerError('invalid_job_payload', false);
        const result = await dependencies.email.send({
          workspaceId: job.workspaceId,
          messageId: job.messageId,
          template: 'order_acknowledgement',
          orderId: parsed.data.orderId,
          reference: parsed.data.reference,
        });
        return result.status === 'delivered'
          ? { status: 'completed', providerId: result.providerId }
          : {
              status: 'uncertain',
              errorCode: safeErrorCode(result.errorCode, 'provider_uncertain'),
            };
      },
    ],
    [
      'analytics_order_submitted',
      async (job) => {
        if (job.payloadVersion !== 1)
          throw new JobHandlerError('unsupported_payload_version', false);
        const parsed = orderSubmittedPayloadSchema.safeParse(job.payload);
        if (!parsed.success) throw new JobHandlerError('invalid_job_payload', false);
        const result = await dependencies.analytics.capture({
          workspaceId: job.workspaceId,
          eventId: job.messageId,
          name: 'order_submitted',
          subjectId: parsed.data.orderId,
        });
        return result.status === 'delivered'
          ? { status: 'completed', providerId: result.providerId }
          : {
              status: 'uncertain',
              errorCode: safeErrorCode(result.errorCode, 'provider_uncertain'),
            };
      },
    ],
    [
      'analytics_lead_saved',
      async (job) => {
        if (job.payloadVersion !== 1)
          throw new JobHandlerError('unsupported_payload_version', false);
        const parsed = leadSavedPayloadSchema.safeParse(job.payload);
        if (!parsed.success) throw new JobHandlerError('invalid_job_payload', false);
        const result = await dependencies.analytics.capture({
          workspaceId: job.workspaceId,
          eventId: job.messageId,
          name: 'lead_saved',
          subjectId: parsed.data.leadId,
        });
        return result.status === 'delivered'
          ? { status: 'completed', providerId: result.providerId }
          : {
              status: 'uncertain',
              errorCode: safeErrorCode(result.errorCode, 'provider_uncertain'),
            };
      },
    ],
  ]);
}

export interface OutboxRunSummary {
  workspaces: number;
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
  uncertain: number;
  leaseLost: number;
}

export interface OutboxRunnerOptions {
  store: OutboxStore;
  handlers: JobHandlerRegistry;
  batchSize?: number;
  maxAttempts?: number;
  leaseMs?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  /** Per-handler abort timeout in milliseconds; `0` disables the bound. */
  handlerTimeoutMs?: number;
  /** Wall-clock budget after which no further batches are claimed; `0` disables. */
  runDeadlineMs?: number;
  now?: () => Date;
  random?: () => number;
  leaseId?: () => string;
}

/** Pure delay policy: capped exponential backoff with 0.5–1.5x full jitter. */
export function retryDelayMs(
  attempt: number,
  random: () => number,
  baseMs = 5_000,
  capMs = 15 * 60_000,
): number {
  const exponential = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.max(1, Math.round(exponential * (0.5 + random())));
}

export class OutboxRunner {
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly leaseMs: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly handlerTimeoutMs: number;
  private readonly runDeadlineMs: number;
  private readonly now: () => Date;
  private readonly random: () => number;
  private readonly leaseId: () => string;

  constructor(private readonly options: OutboxRunnerOptions) {
    this.batchSize = options.batchSize ?? 20;
    this.maxAttempts = options.maxAttempts ?? 8;
    this.leaseMs = options.leaseMs ?? 60_000;
    this.baseBackoffMs = options.baseBackoffMs ?? 5_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 15 * 60_000;
    this.handlerTimeoutMs = options.handlerTimeoutMs ?? 30_000;
    this.runDeadlineMs = options.runDeadlineMs ?? 120_000;
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
    this.leaseId = options.leaseId ?? (() => crypto.randomUUID());
    if (this.batchSize < 1 || this.batchSize > 100) throw new Error('batchSize must be 1..100');
    if (this.maxAttempts < 1 || this.maxAttempts > 100)
      throw new Error('maxAttempts must be 1..100');
  }

  async run(input: {
    authorizedWorkspaceIds: readonly string[];
    actorId: string;
  }): Promise<OutboxRunSummary> {
    const workspaceIds = [...new Set(input.authorizedWorkspaceIds)];
    const summary: OutboxRunSummary = {
      workspaces: workspaceIds.length,
      claimed: 0,
      completed: 0,
      retried: 0,
      failed: 0,
      uncertain: 0,
      leaseLost: 0,
    };

    const deadline =
      this.runDeadlineMs > 0 ? this.now().getTime() + this.runDeadlineMs : Number.POSITIVE_INFINITY;

    for (const workspaceId of workspaceIds) {
      // Once the run deadline passes, stop claiming new batches. Jobs already
      // claimed under a lease are still handled and recorded.
      if (this.now().getTime() >= deadline) break;
      const claimedAt = this.now();
      const jobs = await this.options.store.claim({
        workspaceId,
        actorId: input.actorId,
        leaseOwnerId: this.leaseId(),
        limit: this.batchSize,
        leaseExpiresAt: new Date(claimedAt.getTime() + this.leaseMs),
        now: claimedAt,
        maxAttempts: this.maxAttempts,
      });
      summary.claimed += jobs.length;

      for (const job of jobs) {
        const outcome = await this.handle(job);
        const recorded = await this.options.store.recordOutcome({
          workspaceId,
          actorId: input.actorId,
          jobId: job.id,
          leaseOwnerId: job.leaseOwnerId,
          outcome,
          now: this.now(),
        });
        if (recorded === 'lease_lost') {
          summary.leaseLost += 1;
        } else {
          summary[outcome.status === 'retry' ? 'retried' : outcome.status] += 1;
        }
      }
    }
    return summary;
  }

  private async handle(job: ClaimedJob): Promise<JobOutcome> {
    const handler = this.options.handlers.get(job.jobType);
    if (!handler) return { status: 'failed', errorCode: 'handler_not_registered' };
    const controller = new AbortController();
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new HandlerTimeoutError()), {
        once: true,
      });
    });
    const timer =
      this.handlerTimeoutMs > 0
        ? setTimeout(() => controller.abort(), this.handlerTimeoutMs)
        : undefined;
    try {
      const result = await Promise.race([handler(job, controller.signal), aborted]);
      return result;
    } catch (error) {
      // A timeout means the provider may already have acted, so the safe
      // outcome is uncertain (manual reconciliation), never a silent retry.
      if (error instanceof HandlerTimeoutError) {
        return { status: 'uncertain', errorCode: 'handler_timeout' };
      }
      const known = error instanceof JobHandlerError;
      const errorCode = known ? safeErrorCode(error.code, 'handler_error') : 'provider_error';
      if ((known && !error.retryable) || job.attempts >= this.maxAttempts) {
        return { status: 'failed', errorCode };
      }
      return {
        status: 'retry',
        errorCode,
        availableAt: new Date(
          this.now().getTime() +
            retryDelayMs(job.attempts, this.random, this.baseBackoffMs, this.maxBackoffMs),
        ),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
