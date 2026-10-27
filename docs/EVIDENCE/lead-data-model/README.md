# Lead data model evidence

Captured 27 October 2026 on the feature branch using the real backend and a
local disposable PostgreSQL database. The browser harness substitutes external
staff authentication, catalogue and bot-check providers; authorization, RLS,
intake, search, field edits, layouts, personal views and history use production code.
All records shown are synthetic.

The desktop journey creates a SIM select field as owner, grants an orders member
Manage data model, switches actor, moves the field into an Arrival section, saves
a value, checks its history, filters the list, saves a personal view and reloads it.
The test also checks that the URL contains no filter key or value and that no
browser errors occurred. Component tests cover keyboard tabs, pointer/keyboard
layout order, all twelve field creation/filter controls, deletion refusal,
permission denial, sorting and privacy of the list URL.

- [Saved per-type layout](layout.png)
- [Reloaded personal view](personal-view.png)

See [the design and verification record](../../LEAD_DATA_MODEL.md) for API,
migration, erasure, release and rollback details. Screenshots are visual evidence;
the assertions in `apps/admin/e2e/lead-data-model.spec.ts` prove the flow.
