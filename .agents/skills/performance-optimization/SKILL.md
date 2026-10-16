---
name: performance-optimization
description: Make code and systems faster or cheaper - profiling method, query optimization, caching decisions, load testing. Use when something is slow or expensive, or when validating performance before launch.
---

# Performance Optimization

Iron law: measure → change one thing → measure again. Any step skipped invalidates the work.

## Procedure

1. **Define the target**: metric + condition and an existing budget if available. If no numerical target exists, measure the reported symptom, state a bounded technical objective and proceed; obtain owner input only for unresolved business tradeoffs.
2. **Measure the baseline** under realistic conditions (prod-like data volume — dev-size data hides everything). Record how you measured; you'll repeat it exactly. Take >=5 runs, use the median; discard the first (cold) run unless cold-start IS the complaint.
3. **Profile — never skip to fixing.** Find where time actually goes: application profiler/flame graph, DB slow query log + EXPLAIN ANALYZE, traces for cross-service time. The bottleneck is one thing; find it before touching anything.
4. **Apply the cheapest sufficient fix** — yield-ordered menu:
   - N+1 queries → batch/join/eager-load (check every list endpoint).
   - Missing/wrong index → add per [database-design](../database-design/SKILL.md) (verify with EXPLAIN after).
   - Doing needless work → overfetching columns/rows, computing per-request what's constant, serializing unused data, chatty sequential calls that could parallelize or batch.
   - Work in the wrong place → move off the request path to a job/queue if the user doesn't need it synchronously.
   - **Caching — only now**, never first (it hides bugs and adds staleness): define scope (request-local → app memory → shared cache, in that order), TTL, and the invalidation trigger BEFORE adding it. A cache without a stated invalidation story is a future incident.
   - Algorithmic (right complexity for real N) and concurrency/hardware — last.
5. **Re-measure identically.** Improvement claimed = before/after table shown. Regressed or flat → revert, re-profile.
6. **Stop at target**; log further ideas and stop. **Guard the win**: perf assertion in CI or an alert on the metric.

## No profiler available? Bisect by measurement

Don't stall and don't guess: wrap coarse timers around the two halves of the suspect path (entry
timestamp, midpoint, exit); the slow half wins; recurse into it until the hot region is <20 lines.
For DB time: use representative synthetic data and inspect query plans. EXPLAIN
ANALYZE executes the statement: use a disposable/local database for writes or
side effects, and prefer plain EXPLAIN for initial production inspection.
For downstream HTTP: per-call timing from middleware/logs. Timing code is
temporary — remove it in the final diff, keep the numbers in the PR.

## Load testing (before launches / capacity questions)

Model realistic traffic shape (mix, think-time, payloads), ramp to find the knee (where latency departs
linearity), identify the saturating resource at the knee — that's your first bottleneck and your
capacity number. Test the failure mode past the knee: degrade or collapse?

## Traps

Optimizing without profile (most effort lands on non-bottlenecks); averages hiding tail pain (use
percentiles); dev-data benchmarks; caching as first resort; bundling five optimizations (can't attribute
or revert); optimizations that trade away platform correctness or tenant isolation.
