import { FakeAnalyticsAdapter, FakeEmailAdapter } from '@canadian-plans/adapters';
import {
  createFailingJobHandlerRegistry,
  createJobHandlerRegistry,
  type JobHandlerRegistry,
} from '@canadian-plans/jobs';

/**
 * The explicit opt-in for the in-memory provider fakes. There is deliberately
 * no implicit fallback: an unset value means no provider is configured, so the
 * outbox fails closed instead of silently delivering through a test double.
 */
export const FAKE_OUTBOX_ADAPTERS_VALUE = 'fake';

/**
 * Builds the outbox handler registry for the current deployment.
 *
 * The fakes are constructed only when `OUTBOX_ADAPTERS=fake` is set explicitly
 * *and* the process is not production. A production deployment (or any
 * deployment without the explicit opt-in) gets a registry whose handlers fail
 * permanently with `provider_not_configured`, so the failure is recorded on the
 * job and surfaces in admin rather than being delivered by a fake.
 */
export function createOutboxJobHandlers(env: NodeJS.ProcessEnv = process.env): JobHandlerRegistry {
  const explicitlyFake = env.OUTBOX_ADAPTERS === FAKE_OUTBOX_ADAPTERS_VALUE;
  if (explicitlyFake && env.NODE_ENV !== 'production') {
    return createJobHandlerRegistry({
      email: new FakeEmailAdapter(),
      analytics: new FakeAnalyticsAdapter(),
    });
  }
  return createFailingJobHandlerRegistry('provider_not_configured');
}
