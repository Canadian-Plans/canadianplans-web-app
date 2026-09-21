---
name: requirement-analysis
description: Extract real requirements from vague requests - clarify intent, define acceptance criteria, find unstated constraints and edge cases. Use when a request is ambiguous, informal, or solution-shaped rather than problem-shaped.
---

# Requirement Analysis

Turn what was said into what is needed, explicitly and testably.

## Procedure

1. **Separate problem from solution.** Rewrite the request as: user + situation + obstacle + desired outcome. If the request names a mechanism ("add a dropdown"), recover the goal behind it and validate the mechanism against alternatives.
2. **Interrogate the boundaries** (answer each, from context where possible, else ask):
   - Who exactly uses this? (role, permission, scale: 1 user or 100k?)
   - When does it happen? (frequency, triggers, concurrency)
   - What exists today? (workaround, adjacent feature, prior attempt and why it failed)
   - What must NOT change? (compatibility, performance, other users' workflows)
   - What is out of scope? (write the non-goals — absence of non-goals is the top cause of scope creep)
3. **Surface unstated requirements** — walk this list every time: permissions/visibility, audit/history needs, error/failure behavior, empty and first-run states, data migration for existing records, i18n/timezones, mobile/small screens, rate/abuse limits, export/deletion (privacy law).
4. **Write acceptance criteria**: given/when/then, one behavior each, mechanically checkable. Include at least one negative criterion ("given no permission, then 403 and no data in response").
5. **Resolve conflicts** against the current request and PLATFORM_CONTEXT.md. Use [docs/OPEN_INPUTS.md](../../../docs/OPEN_INPUTS.md) for business decisions; explain invariant conflicts before implementing the affected action. Do not re-ask settled decisions.
6. **Done-check before handing off** — all four must hold, mechanically:
   (a) every acceptance criterion names a concrete input and an observable output; (b) every flow lists
   its unhappy paths; (c) the non-goals section is non-empty; (d) no two criteria conflict (walk each
   pair that touches the same behavior). Any failure = the spec is not done.

## Question discipline

Resolve questions from code/docs first; batch only those that remain material.
State reasonable reversible technical assumptions and continue independent work.
Silence is not approval for business choices, destructive actions or external writes.

## Anti-patterns

Transcribing the request as the spec; asking questions serially; specs with only happy paths; treating
the loudest stakeholder's phrasing as the requirement.
