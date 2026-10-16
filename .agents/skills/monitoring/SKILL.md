---
name: monitoring
description: Metrics and alerting - what to measure, SLOs, alert design, dashboards, on-call signal quality. Use when adding metrics, defining alerts or SLOs, or when alerting is noisy or blind.
---

# Monitoring

Monitoring answers two questions: "is it broken for users?" (alert) and "where?" (dashboard). Everything
else is decoration.

## Metrics to emit

1. **Per service — the four golden signals**: request rate, error rate, latency (as histogram → p50/p95/p99, never averages), saturation (CPU/memory/connections/queue depth vs capacity).
2. **Per external dependency**: same four, labeled by dependency — you need to distinguish "we're slow" from "they're slow" in one glance.
3. **Per queue/job type**: depth, age of oldest item, processing rate, failure/DLQ rate.
4. **Per business-critical flow**: a counter at each funnel step (signup started/completed, payment attempted/succeeded). Business metrics catch what infra metrics miss — a bug returning 200 with wrong behavior.
5. Metric hygiene: bounded label cardinality (no user ids as labels); counters + histograms over gauges where possible; units in the name (`_seconds`, `_bytes`).

## SLOs

Define per user-facing service: SLI (e.g. fraction of requests < 500ms and non-5xx), target (e.g. 99.5%
over 30 days), and the implied error budget. Budget burn is the master alert; it converts "how reliable
must we be" from feelings into arithmetic. Burn budget fast → stop features, fix reliability.

## Alert design rules

- Alert on **symptoms users feel** (error rate, latency, budget burn), page a human only for
  actionable-now problems. Causes (CPU high) are dashboard/ticket material unless they predict imminent user impact (disk 90%).
- Every page must have: a linked runbook in [docs/RUNBOOKS/](../../../docs/RUNBOOKS/), an owner, and a threshold with a
  reason ("p99 > 2s for 10m because checkout abandons above that").
- Two thresholds: page (act now) and ticket (act this week). Most conditions are tickets.
- Noisy alert = broken alert: any alert ignored twice gets fixed (threshold, condition) or deleted. Alert fatigue is how real incidents get missed.
- Alert on missing scheduled heartbeats or expected traffic; an idle serverless service with no requests is not automatically an incident.

## Dashboards

One overview per service: golden signals + dependencies + saturations, top-to-bottom in diagnosis order.
Built to answer "what changed?" — deploy markers on every graph.

## Verification

For changed alerting, simulate its failure locally or in authorized staging and
confirm detection and recovery. Use controlled faults with bounded impact; real
provider outages or user notifications require the appropriate authorization.
Treat numerical SLOs as proposals until confirmed against project requirements.
