---
name: authorization
description: Control what identities may do - permission models, roles, policies, multi-tenancy isolation, object-level access checks. Use for any change to who can see or do what.
---

# Authorization

Authentication says who you are; authorization decides what you may do. Most real breaches here are
missing object-level checks, not fancy policy flaws.

## Design procedure

1. **Choose the simplest sufficient model**: start with roles (RBAC: role → permission set). Add attributes/relationships (ABAC/ReBAC: "owner of", "member of team") only when rules genuinely depend on them. Never build a policy engine for three roles.
2. **Centralize the decision**: one function/module answers `can(actor, action, resource)`. Call sites never re-implement logic ("if user.role == 'admin'" scattered around is how drift and holes happen).
3. **Deny by default**: no rule matching = denied. New endpoints/resources are denied until a rule is written.
4. **Two checks, always distinguish them**:
   - Route/action level: may this actor use this capability at all?
   - **Object level**: may this actor act on THIS resource instance? (the IDOR check — verify ownership/tenant on every fetch-by-id, not just the list query)
5. **Multi-tenancy**: resolve workspace access from verified identity and current memberships or the server-owned credential registry. A client workspace selector is untrusted until authorized. Enforce both backend checks and Postgres RLS using transaction-local `app.workspace_id`; tenant tables use `workspace_id` and composite tenant foreign keys. Preserve the narrow bootstrap exceptions in PLATFORM_CONTEXT.md §4b.
6. **Server-side only**: UI hiding is UX, not security. Every check exists on the server regardless of what the client shows.

## Rules

- Check permissions at time of use on every request; do not let caching skip current membership, revocation or required MFA checks.
- Unauthorized reads of hidden resources return the same as nonexistent (404) to avoid existence leaks; unauthorized actions on known-visible resources return 403.
- Privilege changes (role grants, admin actions) are audited: actor, action, target, timestamp, old→new.
- Escalation paths need step-up auth (re-confirm identity) for destructive/administrative actions.
- Background jobs and internal APIs carry an actor too — "system" is an actor with defined permissions, not a bypass.

## Verification checklist

- [ ] For each new endpoint: tested as anonymous, as wrong user, as right user, as cross-tenant user (expect 401/403-or-404/200/404).
- [ ] Object-level check present on every by-id read AND write AND delete.
- [ ] Grep shows no inline role logic outside the central module.
- [ ] Audit log entries appear for privilege changes.
