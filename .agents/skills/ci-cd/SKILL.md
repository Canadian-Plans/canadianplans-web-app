---
name: ci-cd
description: Build and delivery pipelines - CI stages, quality gates, artifact handling, deployment automation, pipeline speed and reliability. Use when creating or modifying pipelines, or when CI is slow, flaky, or untrusted.
---

# CI/CD

The pipeline is the only road to production. It must be fast enough that nobody routes around it and
strict enough that green means shippable.

## Pipeline design

1. **Stage by feedback speed** — fail fast, cheap first:
   lint + typecheck + unit (≤5 min, gates everything) → integration + build artifact (≤15 min) → E2E smoke on the built artifact → deploy stages.
2. **Track the tested artifact and environment**: promote an unchanged artifact only when its configuration is compatible. Next.js public variables can be baked into builds; use environment-specific builds from the same reviewed commit when needed, and verify the resulting artifact. Never promote staging credentials into production.
3. **Determinism**: lockfiles committed and honored (frozen/ci install mode); build inputs pinned (base images by digest for prod); no network fetches of unpinned resources mid-build.
4. **Gates that block merge**: preserve the checks defined by current package scripts and CI, including applicable tests, boundary lint, builds and security checks. Report missing protection when relevant; do not silently bypass a failing gate.
5. **Config/secrets**: pipeline gets secrets from the platform's secret store, masked in logs; pipeline definitions contain references, never values.

## Speed maintenance

Cache dependencies keyed by lockfile hash; parallelize independent suites; run only affected tests on PR
where tooling allows (full suite still runs on main); track pipeline duration — over budget (e.g. 10 min
to merge-green) is a P2 to fix, because slow CI rots into skipped CI.

## Trust maintenance

- Flaky gate = broken gate: fix root cause (see [testing](../testing/SKILL.md)), never institutionalize auto-retry.
- Investigate a red main promptly; reverting shared changes must stay within the user's authorization and preserve unrelated work.
- Pipeline changes are code: reviewed, and verified by breaking something on purpose once (prove the gate actually gates).

## Deploy automation

Prepare reviewed release mechanics per [production-deployment](../production-deployment/SKILL.md)
when release work is in scope. Only the owner deploys production. Staging must use
its own DB/storage/CMS and fake email sink; PR previews use manual job invocation,
not scheduled cron. Gate migrations separately and verify code/data compatibility
before recommending rollback; see [database-design](../database-design/SKILL.md).

## Checklist for any pipeline change

- [ ] Failure of the new step produces an actionable message (what broke, where to look).
- [ ] Secrets absent from logs (grep a run to confirm).
- [ ] Verified the step catches what it should by making it fail once on purpose.
