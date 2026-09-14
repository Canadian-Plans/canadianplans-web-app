# A0 recovery spike evidence

Date: 2026-09-14

## Result

The disposable local spike passed its nine focused tests. It demonstrated the
intended encrypted-artifact, separate-ledger, key-recovery, idempotency,
checkpoint, staff-recovery, and fail-closed semantics without using customer
data.

**The production recovery gate has not passed.** The provider-connected
database from T5 contains only synthetic workspace data, but this environment
did not have an isolated second Supabase Auth target, disposable mail inbox,
R2 credentials, Sanity credentials, B2 account/buckets, or `age`/provider CLI
credentials. Real provider export/import, TOTP recovery, Object Lock, writer
capability, retention, outbox, and end-to-end reconciliation evidence remains
T21/T24 work.

## Scope and safety

- Synthetic fixed opaque workspace, subject, record, and operation IDs only.
- Synthetic database text, document bytes, and Sanity bytes only.
- Ephemeral X25519 recovery keys and an in-memory checkpoint key generated for
  each run; neither was persisted.
- In-memory archive and ledger stores were distinct objects with distinct
  credentials. This proves application semantics, not provider enforcement.
- No production project, account, bucket, dataset, user, email address, or
  object was read or changed by this spike.

## Reproducible commands

From the repository root:

```sh
node --test scripts/recovery-spike.test.mjs
pnpm run test:recovery-spike
pnpm run test:tooling
pnpm run lint
pnpm run typecheck
```

The focused test run produced:

```text
tests 9
suites 0
pass 9
fail 0
cancelled 0
skipped 0
todo 0
```

The synthetic scenario produced:

```json
{
  "artifactCount": 3,
  "eventCount": 1,
  "idempotentRetry": true,
  "manifestEncryptedAndVerified": true,
  "recoveryKeyWorked": true,
  "storesSeparated": true,
  "allowReopen": true
}
```

## Assertions exercised

| Requirement                            | Evidence                                                                                                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encrypted database/R2/Sanity artifacts | Three distinct synthetic payloads were authenticated-encrypted, accompanied by an encrypted aggregate manifest, recovered, and hash/count checked.                                                                           |
| Encryption-key recovery                | The escrow-copy private key decrypted the artifacts; a different key and tampered ciphertext were rejected.                                                                                                                  |
| Separate deletion ledger               | Archive and ledger used separate stores and credentials; the archive contained no `events/` objects.                                                                                                                         |
| Ledger writer restrictions             | Writer could create/list but read and delete raised `credential_denied`.                                                                                                                                                     |
| Minimal ledger schema                  | An event containing a raw `email` field was rejected before publication.                                                                                                                                                     |
| Idempotent events                      | Retrying the exact persisted encrypted bytes at the unique operation key was accepted without a second event; different bytes at that key were rejected.                                                                     |
| Checkpoint reconciliation              | HMAC-authenticated, fresh checkpoint with an exact event-key set decrypted and reconciled successfully.                                                                                                                      |
| Missing ledger fail closed             | Missing event or unavailable ledger returned only `restore_fail_closed`; reopening was not allowed.                                                                                                                          |
| Stale/tampered checkpoint fail closed  | An expired checkpoint and a post-signature modification both returned `restore_fail_closed`.                                                                                                                                 |
| Staff/MFA recovery                     | The decision model requires pending-email bootstrap/remap when identity is not preserved, session invalidation, factor removal/re-enrolment, and a fresh verified `aal2`; it never grants privileged access during recovery. |

The spike implementation is [scripts/recovery-spike.mjs](../../scripts/recovery-spike.mjs)
and its tests are
[scripts/recovery-spike.test.mjs](../../scripts/recovery-spike.test.mjs).
The envelope uses Node's X25519, HKDF-SHA-256 and AES-256-GCM solely as a
dependency-free disposable test mechanism. Production backup jobs must use a
pinned, supported `age` release and the separately controlled key ceremony in
the runbook; this harness must not become production cryptography.

## Provider feasibility findings

### Supabase Auth and database

Official Supabase guidance supports logical project migration with three CLI
dumps (`--role-only`, schema, then `--data-only --use-copy`) and a transactional
`psql` restore. The Auth migration guidance says all Auth-schema tables,
including users and password hashes, can be migrated. A default/application
schema dump alone is not identity proof. Dumped custom login roles need new
passwords after restore.

The target normally uses a different JWT signing secret, which invalidates old
tokens and requires fresh login. This is desirable for recovery. Existing Auth
user IDs must be reconciled with membership actor IDs; if an ID is not
preserved, use an owner-reviewed remap or pending-email bootstrap, never silent
matching of an unverified email.

No cross-project Auth import, password login, TOTP challenge, factor recovery,
or session-invalidation test was executed in A0 because no disposable source
and target Auth users/inbox were available. T21/T24 must exercise those paths
and prove that privileged actions deny `aal1` and allow only a fresh
server-verified `aal2`.

### Cloudflare R2

Official R2 documentation supports AWS CLI/rclone access with a bucket-scoped
token. R2's available token permissions are Object Read only and Object Read &
Write; they do not express the required archive-writer combination of write/list
without delete. Therefore R2 remains the source object store, while encrypted
archives go to a provider with granular write/delete capabilities. No live R2
inventory or restore was executed.

### Sanity

The locally installed CLI identified itself as `@sanity/cli/6.7.2` and exposed
the documented `datasets export`/`datasets import` commands. Export help warns
that 401/403/404 assets are excluded, even though an archive can still be
created. Recovery automation must parse warnings and verify manifest counts;
it must not use asset/draft/strict-verification exclusion flags. The CLI was not
authenticated, so no live dataset was exported or imported.

### Backblaze B2 ledger and archive

B2 documents granular `listFiles`, `writeFiles`, `readFiles`, and `deleteFiles`
capabilities plus bucket/prefix restriction and Object Lock. This can represent
separate writer and recovery-reader credentials more closely than R2. However,
`writeFiles` also permits new file versions and Native-API hiding, so capability
selection alone is not append-only proof. Unique operation keys, compliance
Object Lock, version-aware listing, and an independently authenticated fresh
checkpoint are all required.

No B2 account or credentials were available. Real denied read/delete probes,
Object Lock retention, version listing, archive/ledger separation, and recovery
key access must be proved in T21/T24.

## Exact exclusions and required bootstrap changes

Logical database/Auth artifacts do not carry target JWT/API keys, project
settings, database/custom-role passwords, SMTP/OAuth secrets, redirect
allowlists, Edge Function code/secrets, or provider-account MFA. R2/Sanity/B2
control-plane policies and tokens are also excluded. Sanity assets can be
omitted on access errors unless automation treats the warning as failure.

Required recovery/bootstrap actions are:

1. rotate the restricted `app_runtime` password and update only the Backend
   secret;
2. recreate provider settings/secrets from the separately protected inventory;
3. require fresh staff login because target signing material changes;
4. preserve and verify Auth UUID-to-membership mappings, or use the controlled
   pending-email/remap path;
5. treat every restored TOTP factor as unusable until a fresh challenge reaches
   `aal2`; otherwise owner-delete the lost factor, invalidate sessions, and
   require re-enrolment;
6. keep traffic and jobs disabled until the fresh authenticated deletion-ledger
   checkpoint reconciles exactly and all revocation/isolation tests pass.

## Commands and sources recorded

The exact operator commands, required permissions, exclusions, stop points,
identity/MFA decisions, and reconciliation sequence are recorded in
[docs/RUNBOOKS/restore.md](../RUNBOOKS/restore.md). It links the current official
Supabase, Cloudflare, Sanity, Backblaze, and `age` sources.

## Remaining production-gate work

- Provision protected, pinned backup automation and separate provider secrets.
- Run an actual Supabase source-to-isolated-target Auth/database restore with
  disposable password and TOTP accounts, including lost-factor recovery.
- Export/restore real synthetic R2 and Sanity objects and prove exact
  checksums/counts with no skipped assets.
- Provision separate B2 archive/ledger credentials; prove writer cannot
  read/delete, retention administration is separate, and Object Lock works.
- Implement and test the durable outbox, publish acknowledgement, checkpoint
  creation, version-aware ledger reconciliation, and fail-closed app startup.
- Perform the full T24 rehearsal and retain logs/manifests/screenshots according
  to the evidence policy.

Until those steps pass, this evidence is an A0 feasibility result only and the
production recovery gate remains open.
