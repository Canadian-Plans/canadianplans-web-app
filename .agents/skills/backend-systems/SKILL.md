---
name: backend-systems
description: Server-side construction patterns - service structure, business logic placement, background jobs, queues, transactions, external integrations, idempotency. Use when implementing or structuring backend functionality.
---

# Backend Systems

## Structure

1. Layer by responsibility, dependencies pointing inward: transport (HTTP/queue handlers: parse, authn/authz, validate, call domain, shape response — zero business logic) → domain (pure business rules, no I/O types) → infrastructure (DB/API clients behind interfaces the domain defines).
2. One module per domain concept; cross-module access through its public interface only.
3. Validation at the boundary once, thoroughly; the domain then trusts its inputs (types make invalid states unrepresentable where the language allows).

## Transactions

- One transaction = one invariant-preserving unit. Keep them short; never hold a transaction across an external call (HTTP/queue/email).
- Cross-system consistency: DB commit + event publish uses the outbox pattern (write event to an outbox table in the same transaction; a relay publishes). Never "commit then hope the publish works".
- Check-then-act under concurrency needs a lock, a unique constraint, or an atomic compare-and-swap — pick per case, prefer constraints.

## Background jobs & queues

- Enqueue when the work is: slower than the request budget, retryable, or spiky. The request path does the minimum to promise the work, not the work.
- Every consumer is idempotent (a redelivered message must be harmless): dedupe by message id or natural key.
- Retries with exponential backoff + jitter, capped attempts, then dead-letter queue — which is monitored (an unmonitored DLQ is a data-loss device).
- Jobs are resumable and bounded; a job that can run twice concurrently must be safe or locked.
- Use the existing transactional outbox and bounded scheduler in the long-lived Railway backend, with authenticated manual job routes for recovery. Do not add a second scheduler or queue service merely because this skill mentions queues.

## External integrations

- Wrap every third party behind your own interface (swap-ability, testability).
- Per call: explicit timeout (connect + read), retry only idempotent operations, circuit-break on sustained failure, and a defined degraded behavior ("payments down → queue order as pending-payment").
- Webhooks you receive: verify signature, respond fast (enqueue, then process), dedupe by event id, tolerate out-of-order delivery.
- Never trust external data shapes: validate like user input.

## Checklist before done

- [ ] Happy path + every failure path of every external call handled.
- [ ] Idempotency wherever a retry can reach.
- [ ] No business logic in handlers; no I/O in domain.
- [ ] Sanitized telemetry follows [logging](../logging/SKILL.md) when instrumentation changes; verify transaction, retry and authorization failure cases against the affected task's acceptance criteria.
