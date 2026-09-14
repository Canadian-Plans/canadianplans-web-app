# TASK_TEMPLATE.md

Every task given to an AI agent uses this template
(IMPLEMENTATION_PLAN.md §18). `BUILD_TASKS.md` is the local task source;
update external trackers only when explicitly authorized.

| Field          | Content                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| REQ IDs        | Which requirements this task implements or touches                                |
| App / package  | One app or package; cross-cutting tasks are split                                 |
| Contract       | Input/output schemas or API changes, referencing `@canadian-plans/contracts`      |
| Schema         | Migration files added; RLS policy changes listed explicitly                       |
| Negative tests | The failure cases that must be proven, not only the happy path                    |
| Evidence       | What the agent must show (test output, screenshot, log) before the task is closed |
| Rollback       | Forward-fix or rollback steps                                                     |

## Rules every agent must follow

- One bounded task at a time; state assumptions before coding; ask when a
  business rule is missing rather than inventing it.
- Strict types, no `any`, no unchecked casts. Don't duplicate a type/schema a
  shared package owns.
- Only `apps/backend` touches the database or imports `@canadian-plans/db`;
  frontends call the API. Never a Supabase service-role client in
  application code; never production credentials in previews; never log
  documents or tokens.
- Generated SQL, RLS policies, and authorisation logic are reviewed by the
  owner before production.
- New UI uses shadcn components from `@canadian-plans/ui`; new dependencies
  are justified and pinned.
- Update docs (ADRs, API docs, schema history, env descriptions, runbooks)
  in the same task when behaviour changes.
- Discover available provider tools rather than assuming named connectors
  are installed. Use non-production resources and fake email by default;
  sandbox sends require a controlled verified recipient. Production writes
  and external messages require explicit owner authorization.

## Filled example — this task (T1)

| Field          | Content                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ IDs        | REQ 40 (scaffold)                                                                                                                            |
| App / package  | Repo-wide: `apps/backend`, `apps/admin`, `packages/*`, `jobs/`, CI                                                                           |
| Contract       | `healthResponseSchema` in `@canadian-plans/contracts` — `GET /api/v1/health`                                                                 |
| Schema         | None — no real database schema yet (explicit constraint for this task)                                                                       |
| Negative tests | Unknown route → 404; wrong method → 404; forged `x-request-id` header is ignored; `@canadian-plans/db` import from `apps/admin` fails lint   |
| Evidence       | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` output; boundary-lint failure demo — all recorded in `docs/EVIDENCE/T1-scaffold.md` |
| Rollback       | Revert the scaffold commit(s); nothing external was created or deployed                                                                      |
