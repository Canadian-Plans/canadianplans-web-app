---
name: refactoring
description: Behavior-preserving code restructuring - the move catalog, safety protocol, strangler migrations, when to stop. Use when improving structure, reducing complexity, or preparing code for an upcoming change.
---

# Refactoring

Small steps, always green, behavior identical. Anything else is a rewrite wearing a refactor's clothes.

## Safety protocol (non-negotiable order)

1. Identify observable behavior and existing test coverage before moving code. Add characterization tests for uncovered behavior at meaningful risk, including permissions and failure paths. Record suspected bugs separately rather than silently changing behavior. Documentation-only restructuring needs consistency and link checks, not application tests.
2. One mechanical move at a time (catalog below); run affected checks. Commit only when the user's workflow authorizes it, and include only the intended changes.
3. Tests stay green the entire time. Red → the last step was wrong or the step was too big; revert it, halve it. Never "it'll be green again by Friday".
4. Behavior-change discovered as needed mid-refactor → stop, finish/park the refactor, do the behavior change as its own reviewed change.

## Move catalog (compose big changes from these)

Rename (mechanical, tool-assisted) · Extract function/module (name a chunk, cut at a seam) · Inline
(remove indirection that stopped paying rent) · Move (code to where its data/callers live) · Change
signature via parallel change: add new form → migrate callers one by one → delete old form (works for
functions, APIs, schemas alike) · Replace conditional chains with polymorphism/lookup when the same
switch appears ≥3 places · Encapsulate raw data (primitive obsession → type with invariants).

## Strangler pattern (for large replacements)

New implementation grows beside the old behind the same interface; callers migrate incrementally (by
route, by tenant, by percentage); both run with comparison logging where stakes are high; old code dies
only at verified zero callers (search + runtime stats, not memory). Rewrite-from-scratch of a working
system is a separate scope decision; do not turn a bounded refactor into an unsolicited rewrite.

## Prioritizing what to refactor

Refactor where (change frequency × pain) is highest — hotspots you touch weekly, not the ugly-but-frozen
corner. Tie refactors to an enabled outcome. The codebase being
"inconsistent with your taste" is not a reason.

## When to stop

Scope fence reached · the enabling goal is achieved · steps stop being mechanical (you're now designing
— go write an ADR) · diminishing returns (the next move improves nothing measurable). Perfect uniformity
is not a goal; enabled change is.
