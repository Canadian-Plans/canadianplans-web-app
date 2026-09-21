---
name: logging
description: Design or review structured log events, levels, correlation and redaction. Use when changing emitted logs; use monitoring for metrics/alerts and observability for tracing across components.
---

# Logging

Logs are for the engineer debugging at 2am with no memory of this code. Every log line should help
answer "what happened to request/job X?"

## What to log (and not)

| Always | Never |
|---|---|
| State transitions of business objects (order paid, job failed) with ids | Secrets, tokens, passwords, full PII (see redaction) |
| Each handled error once, with a sanitized code, safe stack and operation context | Raw exception messages, request bodies or provider responses that may contain secrets/PII; repeated logs at every layer |
| External call failures + latency when above threshold | Success spam in hot loops (that's a metric, not a log) |
| Auth events: login success/failure, permission denial, privilege change (actor, never credential) | User content bodies (log ids + sizes) |
| Job/queue lifecycle: started, finished (+duration), retried (+attempt), dead-lettered | "Got here" debug prints left behind |

## Level discipline

- `ERROR`: something failed that shouldn't; a human may need to act. Every ERROR should be alert-worthy in aggregate — if it's routine, it's mislabeled.
- `WARN`: degraded-but-handled (retry succeeded, fallback used, deprecated path hit).
- `INFO`: business-meaningful events at low volume (state transitions, startup config summary).
- `DEBUG`: development detail, off in prod by default, toggleable at runtime for diagnosis.

## Shape

Structured (JSON) with: timestamp (UTC ISO-8601), level, message (static, human-readable — variability
goes in fields, so lines are groupable), service, and the correlation fields: `request_id`/`trace_id`,
plus relevant entity ids (`user_id`, `order_id`). Correlation id is generated at the edge, propagated
through every call, thread, and job (attach to enqueued messages).

## Redaction

Allowlist safe fields centrally in serializers/middleware and redact nested errors,
headers and URLs. No PII, credentials, tokens, cookies or document contents in logs.
Hashing an email or IP does not automatically make it safe; prefer approved opaque
internal correlation IDs. Test with synthetic sensitive values and inspect captured
output, including failure paths, without copying real personal data into reports.

## Review test

Pick a failure this code can have. Can you, from logs alone, determine: which request/job, what
operation, what input class, what failed, and what happened to the user? If any answer is no, the
logging is incomplete.
