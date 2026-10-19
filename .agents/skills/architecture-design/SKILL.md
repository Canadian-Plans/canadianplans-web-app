---
name: architecture-design
description: Design system structure - components, boundaries, data flow, contracts, failure handling, and the ADR documenting it. Use when creating new systems, restructuring existing ones, or evaluating structural options.
---

# Architecture Design

Produce a structure that survives contact with change, load, and failure.

## Procedure

1. **Constraints before boxes.** Write down: expected load (now and 10x), latency budget, consistency needs, team size/skills, deadline, budget. A design without numbers is a mood board.
2. **Model the domain**: entities, invariants, and which invariants must hold transactionally vs eventually. Transactional boundaries dictate service boundaries — never split an aggregate that must be consistent across a network hop.
3. **Draw the data flow** for the top 3 use cases: where data enters, transforms, rests, exits. Every arrow gets: sync/async? what happens when the target is down? what happens when it's slow?
4. **Choose boundaries** within [PLATFORM_CONTEXT.md](../../../PLATFORM_CONTEXT.md)'s existing app and package ownership. Keep backend domains modular; justify additional network boundaries with their operational cost and benefit.
5. **Define contracts** at each boundary: schema, versioning rule, error semantics, idempotency, ownership. Contracts are the architecture; boxes are decoration.
6. **Design the failure story** per dependency: timeout value, retry policy (with backoff + jitter, only for idempotent ops), circuit-break or degrade, what the user sees. "It won't fail" is not a story.
7. **Plan the evolution**: how does this get to 10x load (name the first bottleneck) and how does the next likely feature fit without restructuring?
8. **Stress the design** before committing — run these attacks: dependency down for 1 hour? traffic ×10 for one day? this table ×100? a second team needs to change module X? requirement Y reverses?
9. **Record material architecture decisions** in [docs/ADR/](../../../docs/ADR/), following an existing ADR's format. Include context, alternatives, the decision and consequences. Routine implementation choices need no separate ADR.

## Review

Check contracts, failure handling and platform invariants. Resolve technical details within the authorized scope; raise unresolved business decisions or invariant conflicts with the owner while continuing independent work.

## Anti-patterns

Architecture by resume (tech chosen for interest); distributed monolith (network boundaries, shared DB);
designing for 1000x; boxes without contracts; no failure story; skipping "extend what exists".
