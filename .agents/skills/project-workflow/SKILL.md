---
name: project-workflow
description: Guide Canadian Plans implementation, review, debugging, refactoring, and documentation with focused scope and proportionate verification. Load for project work, not merely to list available skills.
license: MIT
---

# Project workflow

Adapted from the owner's supplied `karpathy-guidelines` (MIT). PLATFORM_CONTEXT.md
remains the source of architecture and rules. Follow AGENTS.md's startup reading
rules once per session. Skill discovery and announcements live in AGENTS.md;
select specialist skills from their descriptions and load their bodies only when
needed. Cross-links are task-dependent references, not a mandatory reading chain.

## Establish scope

- Inspect the working tree and relevant implementation. Preserve existing changes
  and do not attribute them to yourself.
- Briefly state the target app/package, material assumptions, relevant invariants
  and observable acceptance criteria. Use a short plan for multistep work; avoid
  planning ceremony for a small edit or informational answer.
- Ask only when missing information blocks correct progress, particularly a
  business decision or ambiguous destructive action. Make reasonable, reversible
  technical choices within the authorized task. Do not ask again for existing
  authorization.
- Consult the business input register for missing rules. TEST placeholders must
  not enable real publishing, dispatch, activation or payout. Preserve the
  platform's Phase A/Phase B boundaries.
- Keep one bounded task in focus. Incorporate user steering and finish necessary
  supporting work without expanding into unrelated improvements.

## Diagnose and change deliberately

- For bugs, reproduce the problem or obtain the smallest useful evidence. Explain
  the supported cause before presenting a fix as definitive. Label unconfirmed
  causes as hypotheses; investigation and temporary instrumentation are allowed.
- Fix the cause rather than hiding the symptom. Add meaningful regression checks
  where practical, including relevant failure cases.
- Search for existing helpers, schemas, types and UI primitives before adding
  new ones. Respect package ownership and import boundaries. A DB row type is not
  an API response. Keep strict typing rather than bypassing checks with casts.
- Choose the simplest design that satisfies actual requirements. Avoid speculative
  features, configuration and abstractions. A larger focused fix is preferable
  to a tiny patch that leaves the cause intact.
- Match local style. Remove unused code introduced by this change without unrelated
  cleanup. Justify and pin necessary new dependencies.
- Update affected documentation with behavior changes; do not create an ADR or
  duplicate status document for every minor edit.

## Spend computation and context where they help

- Use targeted searches and bounded reads, excluding generated output. Batch
  independent inspections where supported; keep dependent edits and checks in
  order. Reuse findings instead of rediscovering the repository each turn.
- Read deeper documentation when the task touches it. Do not reread all planning
  documents, install extra tooling or research settled architecture by default.
  Verify external facts when freshness or uncertainty matters.
- Avoid redundant requests, unbounded queries and N+1 access. Keep DB operations
  within the authorized backend/tooling boundary. Prefer bounded query shapes
  over fetching everything and filtering in the browser.
- Cache only with clear freshness, invalidation and tenant/user isolation. Never
  cache away required per-request authorization checks. Do not rely on process
  memory surviving Vercel requests or move request-specific work to startup
  indiscriminately. Add memoization only for a concrete benefit.
- Preserve required outbox delivery, retries and cron cadence. Do not replace
  them with polling, push or a new service merely as an optimization.
- Keep progress updates concise. For handoffs, capture the objective, decisions,
  changes, verification and next step; avoid a new log file for trivial work.
  Saving tokens must not omit necessary evidence or safeguards.

## Verify the outcome

- Define success before implementation. Use current README, package scripts and
  CI configuration for exact commands.
- For code, run applicable type checks, boundary lint, meaningful tests and
  affected builds. Include failure cases for new behavior and use Playwright for
  changed user flows. Follow task-specific acceptance checks.
- Run full local CI when the task or project gate requires it, or broad impact
  warrants it. After fixes, rerun checks they invalidate; do not repeat successful
  expensive checks without a reason.
- For documentation-only changes, check formatting, links and consistency; for
  skills, validate frontmatter too. Do not add synthetic application tests or
  rebuild unrelated apps solely because prose changed.
- If a check cannot run, give the exact blocker and remaining verification.
  Continue independent work. Never claim an unrun check passed or weaken checks
  just to obtain a green result.

Finish with what changed and why, verification results, and material assumptions
or blockers. For bug fixes, include the cause. Keep evidence concise and specific
enough to distinguish tested behavior from inference.
