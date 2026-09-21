---
name: frontend-systems
description: Frontend architecture and construction - component design, state management, data fetching, forms, accessibility, rendering performance. Use when building or structuring UI beyond a trivial change.
---

# Frontend Systems

## State — decide placement first

| State kind | Lives in |
|---|---|
| Server data (lists, entities) | Server-cache layer (query library): cached, deduped, invalidated by mutation — never copied into local state |
| Non-sensitive view state shareable by URL (filters, page) | The URL; keep personal data, secrets and sensitive search text out |
| Local widget state (open/closed, draft input) | Component state |
| Cross-cutting client state (theme, session) | One small global store — the exception, not the default |

Rule: state lives as close to usage as possible; lift only when actually shared. Duplicated server
state is the root of most UI bugs.

## Components

1. Split by responsibility: pure presentational components (props in, events out) vs containers that wire data. Presentational parts are trivially testable.
2. Every data-bearing view implements five states: loading, empty (with a useful call to action), error (with retry), partial, ideal. Build all five before polish.
3. Reuse before building; extend the design system rather than forking it. A one-off variant needs a reason in the PR.
4. Keys stable on lists; effects have complete dependency and cleanup (subscriptions, timers, aborted fetches).

## Data fetching

- Fetch at route/container level, not in leaf components; parallelize independent requests.
- Handle: slow (show progress after ~300ms), failed (typed error → user-actionable message + retry), stale (revalidate on focus/mutation), race (abort superseded requests).
- Optimistic updates only with rollback on failure.

## Forms

Client validation mirrors server rules for UX; the server remains authoritative. Preserve user input on
error — wiping a form is a defect. Disable submit while in flight; make double-submit harmless.

## Accessibility (blocking, not optional)

Semantic elements over div+onClick; every input labeled; keyboard path for every action; focus moved on
route/dialog open and restored on close; WCAG AA contrast; announce async results (aria-live) for
screen readers.

## Performance

Measure with the profiler before optimizing. Cheap defaults: code-split routes, lazy-load below-the-fold
and heavy deps, image sizing to rendered size, no layout shift (reserve space), virtualize long lists
(>~200 rows). Avoid premature memoization — it's complexity; add where profiling shows re-render cost.

## Checklist before done

Applicable loading/empty/error/partial/success states reachable; keyboard-only pass;
console clean; changed user flows verified with Playwright. Frontends call the
backend for business data, including server components; they never import the DB
package. Reuse shared contracts and UI primitives, and partition/clear cached
data on workspace or identity changes.
