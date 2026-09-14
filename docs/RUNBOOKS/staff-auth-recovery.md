# Staff Auth and MFA recovery

This runbook covers password or authenticator loss for admin staff. It does not
create an application bypass: Owner and Finance privileged requests remain
denied until the backend verifies the current Supabase session at `aal2`.

## Prevention and normal recovery

1. Configure Supabase Auth custom SMTP and allow the admin `/login` and
   `/recovery?mode=update` redirect URLs before onboarding real staff.
2. Every Owner and Finance user enrolls a primary TOTP factor and, after
   reaching `aal2`, visits `/mfa/enroll` again to add a backup TOTP factor on a
   separate device or securely stored authenticator vault.
3. A lost password uses `/recovery`. Responses stay identical whether or not
   the account exists. Setting a new password does not satisfy MFA.
4. A lost primary authenticator uses `/mfa/challenge` with the backup factor.

## All factors lost

This is an owner-directed offline recovery, never a backend endpoint.

1. Stop and verify the staff member through the established out-of-band owner
   process. Do not accept an email-only request or a password reset as proof.
2. Record the recovery request and approval without credentials or TOTP data.
3. In the Supabase project dashboard, inspect the Auth user and factor IDs. Use
   the provider's supported administrative factor deletion to remove only the
   lost verified factors. This provider administration is performed manually;
   no privileged Auth key is placed in application code.
4. Deleting a verified factor signs out active sessions. Confirm the old
   session can no longer refresh, then have the user sign in and enroll a new
   primary and backup TOTP factor.
5. Confirm a password-only `aal1` session is still denied a privileged backend
   action, complete the TOTP challenge, then confirm the same action succeeds
   at `aal2`.
6. Audit the recovery completion and rotate the password if compromise is
   suspected.

If the owner loses every application TOTP factor, recovery requires access to
the separately protected Supabase project administration account. Keep its own
backup factor and recovery material separate from the Canadian Plans admin
factors. If that provider account is also unrecoverable, escalate through the
provider support/recovery process; do not weaken backend authorization.
