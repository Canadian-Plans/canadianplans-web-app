---
name: observability
description: Make systems debuggable in production - distributed tracing, correlation across services, instrumentation strategy, debugging unknown-unknowns from telemetry. Use when wiring tracing, investigating cross-service behavior, or designing instrumentation for a new component.
---

# Observability

Monitoring tells you THAT it's broken (known failure modes); observability lets you ask NEW questions of
a running system without shipping new code. You are building the ability to debug problems you haven't
imagined yet.

## The three signals, stitched

- **Logs** ([logging](../logging/SKILL.md)): discrete events with context.
- **Metrics** ([monitoring](../monitoring/SKILL.md)): cheap aggregates for detection and trends.
- **Traces**: the causal chain of one request across services/queues — where the time went and what called what.

Stitching rule: one correlation scheme end-to-end. `trace_id` generated at the edge, propagated via
standard headers (W3C traceparent) through every service, background job (carried in the message), and
into every log line and error report. A signal you can't join to the others loses most of its value.

## Instrumentation procedure (new component/path)

1. Use the platform's standard instrumentation (OpenTelemetry or house equivalent) — auto-instrument HTTP/DB/queue clients first; hand-add only what auto misses.
2. Add spans around: each external call, each queue produce/consume, each significant internal phase (parse, compute, persist). Span names low-cardinality; details go in attributes.
3. Attach approved opaque workspace/entity/correlation IDs; keep PII, raw URLs, SQL values and tokens out of span attributes. Hashing personal data is not automatic permission to record it.
4. Record sanitized errors on spans at the handling site, mirroring log policy; check auto-instrumentation for accidental request or query capture.
5. Choose sampling supported by the configured collector and budget. Head sampling cannot guarantee retention of every eventual error or slow trace; use tail sampling where available or retain independent sanitized error events, and document limits.

## Debugging from telemetry (the payoff loop)

1. Start from the symptom metric/alert → time window.
2. Pull exemplar traces from the window: where did latency/error concentrate? (which span)
3. Jump from span → logs via trace_id for the detail.
4. Compare against a healthy baseline window: what changed? (deploy markers, dependency latency, payload sizes)
5. If the question can't be answered, the FIX includes adding the missing instrumentation — observability debt is paid at the next incident.

## Definition of observable (gate for new services)

- [ ] One request can be followed edge→DB→response, including through queues, by one id.
- [ ] Applicable signals and alerts follow [monitoring](../monitoring/SKILL.md); reuse existing instrumentation instead of adding a new telemetry stack by default.
- [ ] Errors carry trace context; logs carry trace_id.
- [ ] You have demonstrated answering "why was request X slow?" in staging using only telemetry.
