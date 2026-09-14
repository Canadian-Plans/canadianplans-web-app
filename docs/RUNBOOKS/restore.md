# Full restore and recovery rehearsal

> Status: A0 spike runbook. It records the supported provider procedures and
> the fail-closed restore contract. It does **not** show that the production
> recovery gate has passed. T21/T24 must build and exercise the final outbox,
> backup jobs, provider credentials, retention controls, and app reconciliation.

Owner and escalation contact: Takib. Only disposable synthetic identities,
documents, and objects may be used until the owner authorizes a production
rehearsal.

## Required access and material

- Supabase source and isolated target projects, their direct/session-pooler
  connection strings on port 5432, and project-owner dashboard access.
- A read-only Cloudflare R2 token scoped to each source bucket.
- A Sanity export token and a separate import token scoped to an isolated target
  project/dataset.
- Two independently controlled private Backblaze B2 buckets: the encrypted
  archive and the deletion ledger. Each has distinct writer, recovery-reader,
  and retention-administrator credentials.
- The pinned backup runner, Supabase CLI, PostgreSQL client tools, AWS CLI,
  Sanity CLI, and `age`. Record every version in the evidence bundle.
- The archive `age` recipient, its separately escrowed private key, the ledger
  checkpoint verification key, and the last independently retained signed
  checkpoint. The backup runner gets only the public recipient.

Never put a database password, provider token, private decryption key, or
checkpoint signing key in a command line, repository file, artifact name, or
object metadata. Use the runner's protected secret injection.

## Immediate incident actions

1. Disable public traffic, background jobs, email dispatch, webhooks, imports,
   and all deletion/suppression consumers. Record the incident time and the
   last known-good backup and ledger checkpoint IDs.
2. Preserve the source and provider logs. Do not delete, compact, overwrite, or
   repair any source object.
3. Restore only into isolated target projects, buckets, and datasets. Keep
   outbound email, webhooks, functions, and third-party integrations disabled.
4. Stop safely after any failed checksum, decryption, identity, ledger,
   checkpoint, count, or permission check. Do not open traffic in a degraded
   or password-only mode.

## Capture and encrypt the recovery set

Create a new empty working directory on the protected runner. The examples use
shell variables as placeholders; secrets remain in the runner secret store.

### Supabase database and Auth

Use the source project's session-pooler or direct connection on port 5432, not
the transaction pooler on 6543. The supported Supabase CLI backup sequence is:

```sh
supabase --version
pg_dump --version
psql --version

supabase db dump --db-url "$SOURCE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SOURCE_DB_URL" -f schema.sql
supabase db dump --db-url "$SOURCE_DB_URL" -f data.sql --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

This three-file workflow is the supported logical migration path for project
data, including the Auth table data and password hashes. A plain `pg_dump`, an
`app`-schema-only dump, or the default schema dump by itself is not proof that
Auth identities were preserved. Supabase-managed nightly backups cover the
database only; they do not cover R2, Sanity, B2, Edge Functions, or project
configuration.

If migration history must also be preserved:

```sh
supabase db dump --db-url "$SOURCE_DB_URL" -f history_schema.sql \
  --schema supabase_migrations
supabase db dump --db-url "$SOURCE_DB_URL" -f history_data.sql --use-copy \
  --data-only --schema supabase_migrations
```

If the project changed the managed Auth or Storage schemas, capture a reviewable
diff separately:

```sh
supabase link --project-ref "$SOURCE_PROJECT_REF"
supabase db diff --linked --schema auth,storage > managed-schema-changes.sql
```

Do not blindly apply that diff. Supabase owns these schemas; inspect it and use
only provider-supported changes.

### Cloudflare R2 source objects

R2 is a source system, not the independently retained archive or deletion
ledger. Configure an Object Read-only token scoped to the source bucket, then
record an inventory before downloading:

```sh
aws --version
aws s3api list-objects-v2 --bucket "$R2_BUCKET" \
  --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  > r2-inventory.json
aws s3 sync "s3://${R2_BUCKET}" r2-objects/ \
  --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
```

Re-list and compare keys, byte counts, ETags where applicable, and local SHA-256
hashes. An ETag is inventory evidence, not a universal content checksum.
Cloudflare's R2 token roles do not provide the required archive-writer split of
write/list without delete, so do not use an R2 Object Read & Write token as the
independent archive or ledger writer.

### Sanity documents and assets

The repository's exact CLI form is:

```sh
pnpm --filter site-1 exec sanity --version
pnpm --filter site-1 exec sanity datasets export production \
  sanity-production.tar.gz -p "$SANITY_PROJECT_ID"
```

Keep the default assets, drafts, strict asset verification, and stream mode.
Do not use `--no-assets`, `--no-drafts`, `--raw`,
`--no-strict-asset-verification`, or `--mode cursor` for a recovery archive.
The exporter can warn and skip assets that return 401, 403, or 404; treat any
such warning as an incomplete backup and fail the run.

Record the document count, asset manifest, exported file count and hashes from
the tarball. Sanity project settings, API tokens, webhooks, functions, and other
control-plane configuration are not dataset-export contents.

### Manifest and encryption

Build one canonical manifest containing, at minimum, the run ID, source IDs,
capture timestamps, tool versions, artifact names, byte counts, record/object
counts, SHA-256 hashes, and exclusions. The manifest itself is sensitive and
must be encrypted with every artifact.

The supported `age` file-encryption flow is:

```sh
age-keygen -o recovery-private-key.txt
age-keygen -y recovery-private-key.txt > recovery-recipient.txt
age -r "$RECOVERY_AGE_RECIPIENT" -o roles.sql.age roles.sql
age -r "$RECOVERY_AGE_RECIPIENT" -o schema.sql.age schema.sql
age -r "$RECOVERY_AGE_RECIPIENT" -o data.sql.age data.sql
age -r "$RECOVERY_AGE_RECIPIENT" -o r2-objects.tar.age r2-objects.tar
age -r "$RECOVERY_AGE_RECIPIENT" -o sanity-production.tar.gz.age \
  sanity-production.tar.gz
age -r "$RECOVERY_AGE_RECIPIENT" -o manifest.json.age manifest.json
```

The first two key-generation commands are an owner ceremony, not a daily job.
Immediately move the private key into owner-controlled offline escrow and
remove it from the runner. Daily jobs receive only `RECOVERY_AGE_RECIPIENT`.
T24 must pin and record the `age` version.

Upload the encrypted files with a B2 archive-writer application key scoped to
the archive bucket/prefix with only `listFiles` and `writeFiles`. It must not
have `readFiles`, `deleteFiles`, `writeKeys`, `writeBuckets`, or
`bypassGovernance`. Retention expiry uses another narrowly scoped credential.

```sh
aws s3api put-object --profile b2-archive-writer \
  --bucket "$B2_ARCHIVE_BUCKET" --key "$RUN_ID/manifest.json.age" \
  --body manifest.json.age --endpoint-url "$B2_S3_ENDPOINT"
aws s3api list-objects-v2 --profile b2-archive-writer \
  --bucket "$B2_ARCHIVE_BUCKET" --prefix "$RUN_ID/" \
  --endpoint-url "$B2_S3_ENDPOINT"
```

The writer's inability to read and delete must be proved against the real
bucket in T24. A distinct recovery-reader re-downloads every encrypted object
and performs the decryption and hash checks before the run is accepted.

## Deletion ledger boundary

The deletion ledger is not an ordinary backup folder. Use a private B2 bucket
with Object Lock enabled and a distinct prefix/account boundary. Enable and
verify Object Lock before the first ledger event; it cannot be disabled after
it is enabled.

```sh
aws s3api create-bucket --profile b2-ledger-admin \
  --bucket "$B2_LEDGER_BUCKET" --object-lock-enabled-for-bucket \
  --endpoint-url "$B2_S3_ENDPOINT"
```

Create the publisher application key in the B2 console/API, scoped to the one
bucket and `events/` prefix, with only `listFiles`, `writeFiles`, and the
minimum file-retention capability needed by the final upload implementation.
It must omit `readFiles`, `deleteFiles`, `bypassGovernance`, key management, and
bucket administration. The recovery-reader and retention administrator use
different credentials.

Every encrypted event uses a never-reused key:

```text
events/v1/<opaque-workspace-id>/<unique-operation-id>.json.age
```

An event contains only a unique operation ID, opaque workspace/subject/record
IDs, operation, occurrence time, schema version, and optional keyed contact
digest. It contains no name, email, phone number, document bytes, or raw PII.
Persist the event and its already-encrypted bytes in the transactional outbox
before upload. Retries must reuse the exact object key and encrypted bytes;
different bytes at the same key are a conflict, not an overwrite.

Upload each event in compliance mode and retain the returned version ID:

```sh
aws s3api put-object --profile b2-ledger-writer \
  --bucket "$B2_LEDGER_BUCKET" --key "$LEDGER_OBJECT_KEY" \
  --body ledger-event.json.age --object-lock-mode COMPLIANCE \
  --object-lock-retain-until-date "$LEDGER_RETAIN_UNTIL" \
  --endpoint-url "$B2_S3_ENDPOINT"
aws s3api get-object-retention --profile b2-ledger-recovery-reader \
  --bucket "$B2_LEDGER_BUCKET" --key "$LEDGER_OBJECT_KEY" \
  --endpoint-url "$B2_S3_ENDPOINT"
```

Record a signed checkpoint containing the schema version, monotonically
increasing sequence, issue/expiry times, exact event key/version set, and a
digest. Store it independently from the ledger and keep its signing key outside
both B2 writer credentials. A capability restriction alone is insufficient:
B2 `writeFiles` can create file versions (and its Native API can hide files),
so Object Lock, unique keys, version-aware listing, and checkpoint
reconciliation all remain required.

## Restore into isolated targets

### Database and Auth import

Use a fresh target and restore the supported files in one transaction:

```sh
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$TARGET_DB_URL"

psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file history_schema.sql --file history_data.sql \
  --dbname "$TARGET_DB_URL"
```

If the restore reports ownership failures, review the provider guidance before
commenting only the failing `ALTER ... OWNER TO "supabase_admin"` or obsolete
managed-role grant. Do not blanket-ignore errors. Re-enable required
publications and extensions manually, then run repository migrations.

Dumped custom login roles do not carry reusable passwords. Set a new randomly
generated password for `app_runtime` through the protected secret workflow,
update the Backend secret, and confirm the role is non-superuser,
`NOBYPASSRLS`, and cannot access tenant rows without request context. Never use
a service-role key to work around restore permissions.

### R2 and Sanity import

After decrypting and verifying the manifest, restore R2 objects only to a new
target bucket and compare its final inventory to the manifest.

```sh
aws s3 sync r2-objects/ "s3://${TARGET_R2_BUCKET}" \
  --endpoint-url "https://${TARGET_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
aws s3api list-objects-v2 --bucket "$TARGET_R2_BUCKET" \
  --endpoint-url "https://${TARGET_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  > target-r2-inventory.json
```

Import Sanity into a new target dataset with outbound webhooks/functions
disabled:

```sh
pnpm --filter site-1 exec sanity datasets import sanity-production.tar.gz \
  "$TARGET_SANITY_DATASET" -p "$TARGET_SANITY_PROJECT_ID"
```

Do not use `--allow-failing-assets`, `--skip-cross-dataset-references`, or
`--missing` to make a recovery appear successful. Use `--replace` only when an
explicit repeatable rehearsal intentionally targets an already populated
disposable dataset. Compare document, reference, and asset counts and hashes.

## Staff identity and MFA recovery

1. Compare every restored `auth.users.id` used by `app.memberships.actor_id`.
   If IDs are preserved, keep those membership actor IDs. If an identity is not
   preserved, do not silently match an unverified email: create a pending-email
   bootstrap or perform an owner-reviewed deterministic remap, then record it.
2. A target project normally has a different JWT signing secret, so old access
   and refresh tokens are invalid. Require a fresh sign-in. Never copy an old
   JWT merely to keep sessions alive.
3. Prove password-hash import using a disposable account. If it did not import,
   use the normal password-recovery route. A password reset remains `aal1`.
4. Treat TOTP factors as unavailable until a fresh target login successfully
   challenges one and the server reports `aal2`. Factor rows existing in a dump
   are not proof that the secret/challenge remains usable.
5. If no factor works, the owner uses Supabase's supported admin factor deletion
   after out-of-band identity verification. Deleting a verified factor signs
   the user out of active sessions. Require password recovery/sign-in, TOTP
   re-enrolment, a successful challenge, and a new server-verified `aal2`
   session. There is no password-only privileged bypass.
6. Re-test revoked memberships. A valid live token for a revoked member must be
   denied on the next Backend request because membership is loaded from the
   database per request.

Also follow [staff-auth-recovery.md](staff-auth-recovery.md) for factor loss.

## Ledger reconciliation and fail-closed gate

The recovery-reader must list every object version under `events/`, verify its
retention state, decrypt and authenticate each event, validate its minimal
schema, reject duplicate operation IDs with different content, and compare the
exact key/version set and digest to a fresh authenticated checkpoint. Replay
events idempotently against restored data before any traffic or job resumes.

The restore remains closed when the ledger or checkpoint is missing,
unavailable, expired, stale, malformed, undecryptable, has an invalid
signature, differs from its key/version inventory, contains forbidden raw PII,
or cannot be reconciled with the restored database. An operator cannot waive
this check. Preserve evidence and escalate to the owner.

## Reopen criteria

T21/T24 may recommend reopening only after all of these are true:

- every encrypted artifact and encrypted manifest decrypts with the separately
  recovered key and matches its hashes and counts;
- Auth identities, passwords, memberships, revocations, session invalidation,
  MFA recovery, `aal1` denial, and fresh `aal2` allowance pass with disposable
  accounts;
- R2 and Sanity inventories match without skipped objects/assets;
- real B2 archive and ledger writer restrictions and Object Lock retention have
  been exercised, including denied read/delete attempts;
- the authenticated fresh checkpoint exactly reconciles all ledger versions and
  every ledger event has been replayed idempotently;
- tenant isolation, audit continuity, email/webhook suppression, and application
  smoke tests pass on the isolated target.

Until then, the safe state is traffic off and jobs paused. A failed rehearsal
does not mutate the source; discard the isolated targets after preserving the
evidence according to the synthetic-data retention policy.

## Explicit exclusions from logical artifacts

- Supabase project settings, JWT/API keys, database passwords, custom-role
  passwords, SMTP/OAuth provider secrets, redirect allowlists, Edge Function
  code/secrets, and provider account MFA.
- Cloudflare account/bucket policy, lifecycle configuration, custom domains,
  access tokens, and any object omitted by a failed/incomplete inventory.
- Sanity tokens, project/dataset settings, roles, webhooks/functions, and assets
  skipped by the exporter.
- B2 account settings, application keys, bucket policy/retention configuration,
  and the independently escrowed decrypt/checkpoint keys.

Recreate and verify these control-plane items from the approved configuration
inventory. Never store their secrets inside the archive they protect.

## Provider references

- [Supabase backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase Auth-user migration](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects)
- [Supabase CLI database dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Cloudflare R2 CLI clients](https://developers.cloudflare.com/r2/get-started/cli/)
- [Cloudflare R2 API-token permissions](https://developers.cloudflare.com/r2/api/tokens/)
- [Sanity dataset export](https://www.sanity.io/docs/content-lake/exporting-data)
- [Sanity dataset import](https://www.sanity.io/docs/content-lake/importing-data)
- [Backblaze B2 application-key capabilities](https://www.backblaze.com/docs/cloud-storage-application-key-capabilities)
- [Backblaze B2 Object Lock](https://www.backblaze.com/docs/cloud-storage-object-lock)
- [`age` file encryption](https://github.com/FiloSottile/age)
