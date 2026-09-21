---
name: security-hardening
description: Secure construction and defense-in-depth - input handling, injection prevention, secrets, headers, uploads, dependencies, SSRF. Use when writing code that touches untrusted input, when hardening a service, or during security review.
---

# Security Hardening

Assume every input is hostile and every secret will try to leak. Defense in depth: each layer assumes
the previous one failed.

## Input → output rules (where most vulns live)

| Sink | Rule |
|---|---|
| SQL | Parameterized queries only, always. String-built SQL is banned even for "safe" values. Identifiers (table/column) from user input → explicit allowlist map |
| HTML | Context-aware escaping via the framework; never concatenate input into markup. `innerHTML`-style sinks with user data require sanitization via a maintained library + a review flag |
| Shell | Don't shell out with user input. Unavoidable → argument arrays (no shell interpretation), never string interpolation |
| Paths | User input never forms paths directly: allowlist names or map ids→paths; resolve and verify the result stays under the intended root |
| URLs (SSRF) | Server-side fetches of user-supplied URLs: allowlist schemes+hosts, resolve DNS and block private/link-local ranges, no redirect-following past validation, timeout + size cap |
| Deserialization | Never deserialize untrusted data with formats that construct arbitrary objects (pickle & friends). JSON + schema validation |

Validate at the boundary: type, length, range, format, allowlist over denylist. Reject, don't sanitize,
malformed structural input.

## Standing rules

- **Secrets**: from a secret manager/env at runtime; never in code, config files in git, logs, or error messages. Follow [docs/ENV.md](../../../docs/ENV.md) for configuration names and environment boundaries; verify existing secret scanning when relevant.
- **Headers/transport** (web): TLS everywhere; HSTS; Content-Security-Policy (start restrictive); X-Content-Type-Options: nosniff; frame-ancestors set; cookies per [authentication](../authentication/SKILL.md). For cookie-authenticated mutations, verify origin and use appropriate CSRF protection; SameSite is defense in depth, not a blanket exemption.
- **Uploads**: validate type by content not extension; size cap; store outside webroot / in object storage under generated names; serve with forced content-type and download disposition; image processing in a sandboxed/isolated step (parsers are attack surface).
- **Errors**: generic to users (no stack traces, queries, versions); sanitized diagnostic codes/context in logs, never raw payloads or personal data.
- **Dependencies**: honor lockfiles and existing CI scans; justify new dependencies, inspect maintenance/security and verify affected builds/tests after upgrades.
- **Least privilege**: every credential (DB user, service account, token) scoped to what it needs — the app's DB user can't DROP; the CI token can't touch prod data.
- **Rate limiting**: per-principal limits on auth, expensive, and abuse-attractive endpoints, decided at design time.

## Verification

Attack your own change before review: try the injection, the oversized input, the other user's id, the
replay. Rank findings by exploitability and impact, with concrete evidence and a
bounded fix. Verify private R2 upload finalization uses an immutable candidate
before signature checks and permission-checked download URLs, as required by the
platform; do not add a malware service or change providers as incidental hardening.
