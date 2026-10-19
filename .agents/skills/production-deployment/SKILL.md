---
name: production-deployment
description: Ship to production safely - release strategies, feature flags, migration sequencing, verification, rollback. Use when deploying, releasing, planning a rollout, or preparing rollback procedures.
---

# Production Deployment

In Canadian Plans, only the owner deploys production. Use this skill to prepare
release evidence, staging verification and executable owner runbooks. It does not
authorize production deployment, promotion, flag changes or rollback by the agent.

A deploy is a hypothesis ("this artifact is safe"); roll it out as an experiment you can abort.

## Release procedure

1. **Pre-flight**: verify the affected release gates in [docs/BUILD_TASKS.md](../../../docs/BUILD_TASKS.md), artifact identity and environment configuration. Plan migration order per [database-design](../database-design/SKILL.md); prove code rollback remains compatible with the migrated schema and newly written data. Document owner execution steps in [docs/RUNBOOKS/](../../../docs/RUNBOOKS/).
2. **Stage the exposure**: deploy → health checks green → smoke test critical flows → progressive traffic (canary % or rolling batches) → watch the golden signals + the feature's own metrics at each step → full traffic.
3. **Watch window**: stay on the graphs for the risk-appropriate window (minutes for routine, longer for risky). Deploy markers on dashboards. **No risky deploys when no one will be watching** (end of day/week) unless the rollback is automatic.
4. **Verify like a user**: hit the real feature in prod, not just /health. 200-on-healthcheck with a broken checkout is a failed deploy.
5. **Abort policy**: define error/latency/business thresholds and a compatible recovery action before release. If rollback would corrupt or misread new data, use the reviewed containment or forward-repair plan instead. The owner performs production actions.

## Feature flags (decouple deploy from release)

Risky/user-visible changes ship dark behind a flag: deploy code off → enable internally → % rollout →
100% → **remove the flag** (flags have a deletion ticket at birth; expired flags are debt with two
untested code paths). Flag kill-switch is the cheapest rollback that exists — prefer it to redeploys.

## Rollback readiness (the actual safety net)

- A tested rollback procedure for the owner, preferably one command where supported; document prerequisites and any incompatible data changes.
- Data rollback story stated per release: schema is backward-compatible (expand phase), so code rollback is always safe; data WRITTEN by the new version remains readable by the old (or the flag stays available until that's true).
- After any rollback: incident note (what signal fired, what was rolled back) even if brief — silent rollbacks hide systemic problems.

## Cadence rules

Small and frequent beats big and rare — deploy risk scales superlinearly with diff size. One change-set
per deploy where possible: five features in one deploy = one alert with five suspects.
