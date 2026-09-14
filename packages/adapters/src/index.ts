/**
 * @canadian-plans/adapters — server-only Sanity/R2/email/delivery/payment/
 * analytics provider adapters and their in-memory fakes for tests.
 *
 * No provider is wired yet. Each future adapter gets its own explicit export
 * (e.g. `@canadian-plans/adapters/email`) so provider SDKs never enter a
 * browser bundle by accident.
 */
export const ADAPTERS_PACKAGE_PLACEHOLDER = true as const;
