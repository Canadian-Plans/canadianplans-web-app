---
name: project-planning
description: Plan milestones, dependencies, risks and verifiable tasks for substantial work or explicit planning/estimate requests. Routine edits need only a brief plan, not a separate planning exercise.
---

# Project Planning

Convert a goal into a sequence of small, verifiable, correctly-ordered tasks.

## Procedure

1. **Restate the goal** in one sentence including the success signal ("Users can X, measured by Y").
2. **Inventory knowns/unknowns.** For each unknown, classify: (a) resolvable by reading code/docs — resolve now; (b) resolvable by a spike — schedule the spike FIRST; (c) needs a human decision — ask now, batched.
3. **Decompose** into verifiable vertical slices; put prerequisite schema or contract work first only where needed. Follow dependencies in [docs/BUILD_TASKS.md](../../../docs/BUILD_TASKS.md), not numerical task order. Use [docs/TASK_TEMPLATE.md](../../../docs/TASK_TEMPLATE.md) for recorded build tasks.
4. **Sequence** by dependency and risk. Identify the critical path; retain required Phase A work even when it is not on that path. Move the launch date rather than silently cutting scope.
5. **Track material risks**: uncertain business inputs, external access, migrations, security boundaries and integration dependencies. Give each a mitigation or a bounded investigation task.
6. **Estimate only when useful or requested**: use observed comparable work, state assumptions and give a range. Separate active implementation effort from waiting for access or owner decisions; avoid unsupported precision and fixed multipliers.
7. **Define done** with observable acceptance criteria, evidence and the platform's definition of done.
8. **Output** a plan scaled to the task: goal, ordered tasks with verification, material risks and unresolved inputs. Distinguish required scope from explicitly optional enhancements.

## Rules

- A plan whose first task isn't startable within 5 minutes is not a plan; refine task 1 until it is.
- Never plan more than ~2 weeks of detail; beyond that, milestones only — detail rots.
- Re-plan when reality diverges >30% from estimate or a risk fires; don't ride a dead plan.

## Anti-patterns

Big-design-everything up front; tasks named "implement backend" (not verifiable); hiding a research
project inside a feature estimate; plans without a cut-line.
