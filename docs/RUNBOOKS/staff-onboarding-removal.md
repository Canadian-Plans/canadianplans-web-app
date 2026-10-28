# Staff onboarding and removal

Owner and escalation contact: Takib. Covers creating and removing staff
membership/role access. Loss of a password or MFA factor for an existing
staff member is [staff-auth-recovery.md](staff-auth-recovery.md); do not
duplicate that procedure here — it is cross-linked at the end.

## Required access

- A staff session with the `staff.invite` / `staff.remove` permission
  (Owner role holds both; every Owner/Finance privileged action additionally
  requires a session that completed MFA this login, `aal2`).
- No Supabase dashboard access is required for a normal onboarding or
  removal — both are backend-verified actions from the admin app. Dashboard
  Auth-user access is only needed for the all-factors-lost path in
  [staff-auth-recovery.md](staff-auth-recovery.md).

## How staff identity works here

There is no privileged Supabase service-role key in application code
(`docs/ENV.md`, "Supabase"). A staff invitation creates a **pending backend
membership row** keyed on a normalized email; the recipient completes the
public Supabase Auth signup/confirmation flow themselves, and their **first
verified backend request** atomically binds that pending membership to their
real Auth user id (`docs/API.md`, `GET /api/v1/staff/workspaces/{id}/access`
et al.). Nothing in this flow requires Supabase project-owner access.

## Onboard a new staff member

1. In admin, open the workspace and use **Invite staff** (or
   `POST /api/v1/staff/workspaces/{workspaceId}/invitations` directly with
   `{ email, roles[] }`). This requires `staff.invite` and a verified `aal2`
   session (Owner role).
2. The response is `201 { membershipId, status: "pending" }`. The membership
   exists but grants nothing until the recipient's first verified login.
   `409 membership_conflict` means a membership already exists for that email
   in this workspace (pending, active, or revoked) — check the members list
   before retrying with a different role set.
3. Tell the recipient to use **Accept staff invitation** on the admin
   `/login` page with the exact invited email. Supabase Auth (custom SMTP,
   see [staff-auth-recovery.md](staff-auth-recovery.md) prevention section)
   sends the confirmation email; the recipient sets their own password.
4. The recipient signs in. Their first verified `GET /api/v1/staff/workspaces`
   binds the pending membership to their Auth user id and the membership
   becomes active.
5. Have the new member enroll a primary TOTP factor immediately (`/mfa/enroll`)
   and, if they hold Owner or Finance role, a backup TOTP factor on a second
   device before they attempt any privileged (`aal2`) action.
6. Assign the least-privilege role that lets them do their job: `orders`,
   `partners`, `finance`, `content`, or `viewer` (see the permission matrix in
   `docs/API.md`). Grant `owner` sparingly — it is every T5 action.

## Remove a staff member

1. In admin, open **Members** for the workspace and use **Revoke** on the
   member's row (or `DELETE /api/v1/staff/workspaces/{workspaceId}/memberships/{membershipId}`).
   This requires `staff.remove` and a verified `aal2` session.
2. The membership `status` is set to `revoked` and the change is audited
   (old/new status). Self-removal is explicitly refused (`400`) so an Owner
   can never lock themselves out by accident.
3. **No session invalidation step is needed.** Every protected backend
   request re-reads the membership row fresh — an already-issued Supabase
   access token for a revoked member is denied on its very next request. The
   Auth user itself still exists in Supabase (sign-in still succeeds); it is
   the workspace membership, not the Auth account, that is revoked. Delete or
   disable the underlying Supabase Auth user separately only if the person is
   leaving the organization entirely, not just this workspace.
4. If the member also holds a service credential they created for testing
   (`integration.manage`), revoke it too via
   `DELETE /api/v1/staff/workspaces/{workspaceId}/service-credentials/{credentialId}`
   — membership revocation does not implicitly revoke credentials they issued.

## Verify

- Onboarding: the new member appears in **Members** with `active` status and
  the assigned roles; they can load the workspace dashboard; an `aal2` action
  (e.g. viewing Finance data) is denied until they complete MFA enrollment
  and challenge.
- Removal: `GET /workspaces/{id}/members` no longer lists them as active; a
  request made with their still-unexpired access token now returns
  `membership_revoked` on any staff endpoint.

## Safe stopping point

After step 2 of either flow (the backend write completes), the system is in
a consistent state — a pending invitation that is never accepted simply never
activates, and a revoked membership stays revoked. It is always safe to pause
between steps.

## Escalation

Escalate to the owner (Takib) for: any request to grant `owner` role, any
removal of the last remaining Owner-role member, or any request to bypass the
invitation email flow (there is no bypass — do not create a database row by
hand). For lost credentials/MFA on an existing account, use
[staff-auth-recovery.md](staff-auth-recovery.md) instead of this runbook.

## Lead data model permission

An owner with verified MFA opens Settings → Data model → Leads → Settings and
grants **Manage data model** to the intended staff member. The backend stores the
existing per-member `allow`/`deny` override for `manage_data_model`; it checks the
current membership and MFA on every model request. Revoking it immediately blocks
future model calls. This permission does not grant access to personal details or
permission to edit lead values. Owners have model access by default unless denied.
