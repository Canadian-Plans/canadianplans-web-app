---
name: authentication
description: Verify identity - login flows, sessions, tokens, password handling, MFA, OAuth/OIDC, account recovery. Use for any change to how users prove who they are.
---

# Authentication

Never invent crypto or session mechanics. Use the platform/framework's vetted primitives; this skill is
about wiring them correctly.

## Core decisions

1. **Use the selected provider**: Canadian Plans uses Supabase Auth. Reuse its supported password, MFA and recovery primitives; do not add custom cryptography or a second identity system.
2. **Session mechanism**: preserve the project's documented Supabase session flow. Verify identity server-side and test actual expiry, refresh and revocation behavior; deleting a browser token does not prove an issued access token is invalid. Owner/Finance privileged actions require verified session `aal2`.
3. **Cookies**: `HttpOnly; Secure; SameSite=Lax` (or Strict); session id regenerated on login and privilege change (fixation defense).

## Rules table

| Topic                  | Rule                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passwords              | Hash with argon2id or bcrypt (cost tuned ~100ms). Never encrypt, never log, never in URLs. Max-length generous (≥64), no composition rules beyond min length 8+, check against breached-password list |
| Login responses        | Uniform error ("invalid credentials") and uniform timing for unknown-user vs wrong-password — no account enumeration. Same for password reset ("if that account exists, we sent an email")            |
| Brute force            | Rate limit per account AND per IP; lockout/backoff with monitoring; CAPTCHA as last resort                                                                                                            |
| Reset flows            | Single-use, expiring (≤1h), random token (256-bit), stored hashed; sessions invalidated on password change; notify the account email on change                                                        |
| MFA                    | TOTP baseline; recovery codes generated once, stored hashed; rate-limit code attempts; re-prompt (step-up) for dangerous actions                                                                      |
| OAuth/OIDC (as client) | Authorization Code + PKCE only. Validate `state` (CSRF) and `nonce`; verify token signature, issuer, audience, expiry; never accept tokens from the URL fragment                                      |
| Service-to-service     | Short-lived credentials from the platform (workload identity) over long-lived shared secrets; rotate anything static                                                                                  |
| Logout                 | Destroy server session / revoke refresh token — not just delete the cookie                                                                                                                            |

## Verification checklist

- [ ] Logout/password-change behavior and any remaining access-token validity window are tested and documented; sensitive operations enforce the project's session-revocation requirements.
- [ ] Auth failures return uniform errors; no user-existence oracle anywhere (login, reset, signup).
- [ ] Tokens/session ids never in URLs, logs, or error messages.
- [ ] Auth endpoints are rate-limited; telemetry uses approved opaque actor/correlation IDs and sanitized event codes. Raw IPs, credentials and personal data stay out of logs; see [logging](../logging/SKILL.md) when changing telemetry.
- [ ] The "forgot everything" path (lost password + lost MFA) has a defined, abuse-resistant recovery process.
