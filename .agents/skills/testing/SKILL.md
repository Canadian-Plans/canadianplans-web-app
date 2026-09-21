---
name: testing
description: Test strategy and construction - what to test at which level, writing effective tests, fixtures, mocking policy, flaky test elimination, coverage judgment. Use when writing tests, designing test strategy, or fixing test suites.
---

# Testing

Tests exist to let you change code without fear. Optimize for that, not for coverage numbers.

## Strategy — what goes where

| Level | Use for | Budget |
|---|---|---|
| Unit | Business logic, branching, calculations, parsing — pure logic isolated from I/O | Most tests; milliseconds each |
| Integration | Each real boundary: queries against a real DB, API handlers through the real stack, queue consumers | One per boundary behavior; the backbone of confidence |
| End-to-end | Changed user flows and critical journeys, including relevant negative cases | Playwright; keep focused and deterministic |
| Contract | Where two deployables meet — pin the schema both sides agree on | Per external contract |

Push each test to the lowest level that can catch its failure. A bug catchable by a unit test caught
only in E2E costs 100x to localize.

## Writing rules

1. Test behavior through public interfaces, not internals. A refactor with unchanged behavior must not break tests — if it would, the test is coupled to implementation.
2. One behavior per test; the name states it ("rejects_expired_coupon"). Arrange-Act-Assert with the assert focused: assert the outcome, not 14 incidental fields.
3. **Mock policy**: mock only what you don't own or can't afford (third-party APIs, clock, randomness, payments). Don't mock your own database in integration tests — testing against a mock of your own code verifies the mock. Inject clock and randomness everywhere they appear.
4. Fixtures: builders with sensible defaults (`makeOrder({status: 'paid'})`), minimal explicit deviation per test. Shared mutable fixtures across tests are a flakiness factory.
5. For code bugs, add a meaningful regression test where practical and demonstrate it catches the original defect. Documentation corrections use document validation instead.
6. Verify new assertions can detect incorrect behavior using the original bug or a safe, isolated fault where useful. Do not alter shared application code merely to manufacture a red run.

## Edge cases

Select cases relevant to changed behavior: empty/invalid/boundary input, missing
identity, denied permission, cross-workspace access, expiry, retries, duplicates,
concurrent writes and provider failure. Prioritize platform invariants; use a
second synthetic workspace and the restricted runtime role for DB isolation tests.

## Flakiness elimination (root causes, in frequency order)

Real time/timeouts (inject clock; wait-for-condition not sleep) → test interdependence via shared state
(isolate: fresh data per test, no execution-order assumptions) → real network (fake it) → concurrency
races (synchronize on events, not delays). Quarantine-with-ticket is acceptable for ≤ days;
retry-until-green is never.

## Coverage judgment

Read coverage to find untested BRANCHES that matter (error paths, permission denials), not to chase a
number. 100% coverage with assertion-free tests is zero coverage.
