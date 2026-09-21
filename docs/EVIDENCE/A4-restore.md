# A4 backup/restore rehearsal evidence (T24)

Date: 2026-09-21

## Result

`jobs/backup`, `jobs/restore`, `jobs/retention` and `jobs/monitor` are implemented
and unit/integration-tested (90 tests across 13 files, all passing:
`pnpm --filter @canadian-plans/jobs test`). A complete local rehearsal
(`jobs/tests/backup-restore-rehearsal.test.ts`) exercises the full daily
backup → monitor → retention → restore pipeline end to end against synthetic
data, using this repository's own code (not a disposable spike), wired
exactly as production wiring will use it — the only difference is which
concrete provider adapters are injected.

**This is a local, isolated-harness rehearsal, not the production recovery
gate.** Exactly like docs/EVIDENCE/A0-recovery-spike.md before it, this
environment has no live Backblaze B2, Supabase, Sanity, or R2 credentials,
and no `age` binary, so no real provider call was made and no production
resource was read or changed. What changed since A0: the actual application
code that will run in production now exists, is tested, and its semantics —
encryption/decryption, manifest verification, upload-completeness checking,
the backup lease, retention's GFS selection and dry-run, the 26-hour monitor
threshold, and ledger checkpoint reconciliation/replay/fail-closed — are
proven against synthetic data. Provisioning the real secrets referenced by
`.github/workflows/backup*.yml` and running this same code against them is
the remaining step to close the production gate (see "Remaining production-gate
work" below, which narrows A0's list).

## Scope and safety

- Synthetic fixed data only: fake order rows, a fake PDF payload, a fake
  Sanity tarball, a fake deletion-ledger event. No customer data, no real
  document bytes.
- Ephemeral X25519 test-envelope keypairs generated per test run via
  `jobs/src/backup/encryptor.ts`'s `generateTestRecipientKeyPair`; never
  persisted. Production wiring (`jobs/src/backup/cli.ts`,
  `jobs/src/retention/cli.ts`) uses `AgeCliEncryptor`/`AgeCliDecryptor`,
  which shell out to the real, pinned `age` binary instead — the test
  envelope is explicitly documented as non-production (same rule A0 set).
- All object storage is `InMemoryArchiveBackend` (`jobs/src/backup/
  archive-store.ts`), which enforces the writer/reader/retention-admin
  capability split at runtime (`ArchiveCredentialDeniedError`) the same way
  the real B2 application-key capabilities do.
- No GitHub Actions workflow in this repository was triggered; no B2 bucket,
  Supabase project, Sanity dataset, or R2 bucket was read or changed.

## Reproducible commands

From the repository root:

```sh
pnpm --filter @canadian-plans/jobs test
pnpm --filter @canadian-plans/jobs typecheck
pnpm eslint jobs packages/adapters packages/db apps/backend --max-warnings=0
pnpm --filter @canadian-plans/db typecheck
pnpm --filter backend typecheck
pnpm --filter backend test
```

The jobs package test run produced:

```text
Test Files  13 passed (13)
     Tests  90 passed (90)
```

The rehearsal's synthetic timings (`console.info` from the happy-path test,
measured on a local development machine — not a production runner, and not a
recovery-time promise per REQ 43):

```json
{ "backupDurationMs": 11.98, "restoreDurationMs": 4.76 }
```

## Assertions exercised

| Requirement | Evidence |
| --- | --- |
| Consistent DB export + migration/Auth state, referenced-object manifest, R2 copy, Sanity export, encrypt-everything, upload-completeness verification, heartbeat only on full success | `jobs/src/backup/run.ts` (`runBackup`) and `jobs/src/backup/run.test.ts` (6 tests): a full run publishes a heartbeat only after every artifact is uploaded and its presence verified via `listObjects`; a missing or checksum-mismatched referenced R2 object throws `BackupIncompleteError` **before** any heartbeat is published; an incomplete upload (simulated dropped listing) throws `BackupUploadVerificationError`. |
| Archive writer cannot delete archives | `jobs/src/backup/archive-store.ts` types (`ArchiveWriter` has no `getObject`/`deleteObject`) plus runtime proof in `archive-store.test.ts`: a writer-scoped facade raises `ArchiveCredentialDeniedError` on `getObject`/`deleteObject`. The real `S3ArchiveWriter` class has no delete method at all — there is no code path that could call one. |
| Plaintext keys/data never enter logs | `jobs/src/backup/cli.ts`/`retention/cli.ts`/`monitor/cli.ts` log only structured JSON with run ids, counts and error codes — never payload bytes, secrets, or decrypted content. `AgeCliEncryptor`/`AgeCliDecryptor` pipe bytes through stdin/stdout only, never via argv or an env var that would appear in process listings. |
| Prevent source cleanup racing snapshot references | `packages/db/drizzle/0019_backup_leases.sql` (new `app.backup_leases` table, RLS-forced, no `app_runtime` grant, only a `SECURITY DEFINER` `app.backup_lease_active()` function — mirrors the existing `rate_limit_buckets`/`resolve_website_credential` pattern) plus `apps/backend/src/documents/service.ts`'s `BackupLeaseGate`: `DocumentService.runCleanup` withholds physical R2-delete keys while a lease is active (`service.test.ts`, 2 tests). `jobs/src/backup/lease.ts`'s `PgBackupLease` writes/clears the lease directly via `psql` with the backup runner's own privileged credential — never `app_runtime`. |
| 30 daily / 12 monthly retention, dry-run default, union of retained manifest references, retained snapshot still restorable after cleanup | `jobs/src/retention/select.ts` (pure GFS selection, 4 tests) and `jobs/src/retention/run.ts` (4 tests): a dry run reports candidate deletions without touching the archive; a real run deletes only objects outside every retained run's manifest-referenced key set; a run whose manifest cannot be decrypted/parsed is never deleted from (fail-safe); after cleanup, the retained run's manifest and artifact still decrypt and pass `verifyManifestArtifacts` exactly as a real restore would use them. |
| Independent monitor, 26-hour threshold, stopped/partial run cannot report success | `jobs/src/monitor/run.ts` (5 tests): ok well within 26h; `stale` (alert) once the latest heartbeat crosses `PHASE_A_MAX_AGE_SECONDS`; `missing` when no heartbeat exists at all (a crashed run leaves the *previous* heartbeat, which simply ages past the threshold, or no heartbeat at all on a first-ever run) — no code path can report `ok` without reading and validating a schema-checked heartbeat. |
| Restore into an isolated environment, separate decrypt/read credentials, DB/FK counts, catalogue consistency, RLS, file checksums | `jobs/src/restore/run.ts` (`runRestore`, 9 tests): takes a distinct `ArchiveReader` (list+get only) and `Decryptor` (identity-file/private-key only); `postRestoreChecks` is the caller-supplied hook for counts/checksums/catalogue/RLS probes against the isolated target, and a failing check prevents `reopened: true`. |
| Reconcile the independent ledger and checkpoint, replay intents, fail closed on missing/stale/unverifiable evidence | `jobs/src/restore/ledger.ts` (`reconcileLedger`, 8 tests): fails closed on a missing checkpoint, an unreachable ledger, a tampered signature, a stale/expired checkpoint, a key-set mismatch between the checkpoint and the actual events, an event carrying a forbidden extra field (rejected by the `.strict()` zod schema before replay), and a replay failure. Only an exact match plus a valid signature plus successful idempotent replay of every event yields `reconciled`. |
| Corrupt ciphertext, missing object/key, failed Auth recovery, unavailable ledger — none reopen | `jobs/tests/backup-restore-rehearsal.test.ts`'s negative-path test runs all four in one place against the same synthetic archive: tampering one byte of the uploaded manifest ciphertext fails at `manifest_decrypt`; omitting the artifact object fails at `artifact_fetch_and_decrypt` with `missingArtifacts: ['data.sql']`; a `verifyAuthRecovery` returning `failed` fails at `auth_recovery` even though the archive is fully verified; an unreachable ledger fails at `ledger_reconciliation`. In every case `reopened: false`. |
| Measured loss window, alert-response and restore duration; no zero-loss/fixed-time claim | `RestoreReport.measuredLossWindowMs` and `.restoreDurationMs` (`jobs/src/restore/run.ts`) are always *measured* from caller-supplied clocks, never asserted against a target; the type/doc comments and this evidence file state durations as measurements, not guarantees (REQ 43). The rehearsal test asserts the exact measured value equals `incidentDetectedAt - manifest.capturedAt`, proving the computation, not a promise about its size. |
| Deletion-ledger publish (T21) already exists and is unaffected | `apps/backend/src/deletion/{store,ledger}.ts` (pre-existing, unchanged by this task): commits a local `deletionIntents` row, then publishes through the outbox with idempotent acknowledgement tracking. This task adds only the restore-side read/reconcile/replay half that was missing. |
| Protected, pinned GitHub Actions workflow(s), isolated secrets, read/export + writer (no delete) | `.github/workflows/backup.yml` (daily + `workflow_dispatch`, `environment: backup`, only read/export source credentials and a write-only B2 archive credential — no delete-capable secret is referenced anywhere in this file), `.github/workflows/backup-retention.yml` (separate `environment: backup-retention`, delete-capable credential, `dry_run` input defaulting `true`), `.github/workflows/backup-monitor.yml` (separate `environment: backup-monitor`, list+get-only credential). |

## What this rehearsal does **not** prove (production-gate work remaining)

This narrows A0's "Remaining production-gate work" list to what is left after
this task's application code:

1. **Provision the real secrets** referenced by `.github/workflows/backup*.yml`
   (`environment: backup`, `backup-retention`, `backup-monitor` in the GitHub
   repository settings) and configure each environment's protection rules
   (the "protected" half of "protected, pinned"). Nothing in this repository
   can do this — it is a GitHub repository-settings action for the owner.
2. **Pin `supabase/setup-cli` to a verified commit SHA** in `backup.yml`
   (currently `@v1`, `version: latest`, with an inline `TODO(owner, ...)`
   comment) — this sandboxed session has no network access to resolve and
   verify a SHA, unlike the `actions/checkout`/`pnpm/action-setup`/
   `actions/setup-node` pins already carried over verbatim from the vetted
   `ci.yml`. **This TODO must be resolved before the workflow is trusted to
   run production backups.**
3. **Run `runBackup`/`runRestore`/`runRetention`/`runMonitor` against real
   provider CLIs and B2 buckets.** The two B2 buckets already exist per A0
   (`canadian-plans-backup-archive`, `canadian-plans-deletion-ledger`), but no
   credential for either is available in this session. `age`, the Supabase
   CLI, and the Sanity CLI are also not installed here (confirmed:
   `age --version` → "command not found" in this session). The CLI wiring in
   `jobs/src/backup/cli.ts` (`SupabaseCliDatabaseExporter`, `AgeCliEncryptor`,
   `S3ArchiveWriter`) is unit-tested for its command construction (`encryptor.
   test.ts`, `sources.test.ts`) but has never executed the real binaries.
4. **Real Supabase Auth restore**: TOTP/aal2 recovery, revoked-membership
   denial and a fresh cross-project login against a disposable target project
   — `runRestore`'s `verifyAuthRecovery` hook is exercised here only with a
   fake resolver (`{ status: 'ok' }` / `{ status: 'failed', detail: ... }`).
   A0 already found no disposable source/target Auth users were available;
   that has not changed in this session.
5. **A real ledger transport** (`LedgerReader` against the actual B2 deletion-
   ledger bucket, with Object Lock and version-aware listing) — `jobs/src/
   restore/cli.ts` ships with `notConfigured`, a deliberately fail-closed
   stub, and documents that a real drill needs a bespoke copy wiring the
   isolated target's actual credentials; this codebase's own import-boundary
   lint (`canadian-plans/data-boundary`, "module paths must be static")
   rules out a generic runtime-configured plugin loader, which is why the
   stub exists instead of one.
6. **Retained-document and RLS checks against a real restored database** —
   `postRestoreChecks` is exercised here only via a synthetic fake returning
   fixed counts; the real Postgres queries (order/FK counts, RLS probes,
   catalogue-sync consistency) are not implemented in this task and remain
   for the actual T24 rehearsal against a disposable Supabase target.

Until items 1–6 pass against real (disposable) infrastructure, Phase A gate
10 ("One full restore from the independent daily backup succeeds in an
isolated environment") is **not** met, and the production recovery gate
remains open — exactly as A0 concluded, now with a much smaller remaining
list because the application logic itself is built, tested, and proven
against synthetic data.

## Files

- Backup: `jobs/src/backup/{archive-store,command,encryptor,heartbeat,lease,
  manifest,run,sources,cli}.ts` and matching `*.test.ts`.
- Retention: `jobs/src/retention/{select,run,cli}.ts` and matching `*.test.ts`.
- Monitor: `jobs/src/monitor/{run,cli}.ts` and matching `*.test.ts`.
- Restore: `jobs/src/restore/{ledger,run,cli}.ts` and matching `*.test.ts`.
- Rehearsal: `jobs/tests/backup-restore-rehearsal.test.ts`.
- Backup lease migration: `packages/db/drizzle/0019_backup_leases.sql`,
  `packages/db/src/schema.ts` (`backupLeases`), `packages/db/src/index.ts`
  (`isBackupInProgress`).
- Cleanup-race guard: `apps/backend/src/documents/service.ts`
  (`BackupLeaseGate`, `runCleanup`) and `service.test.ts`.
- Workflows: `.github/workflows/backup.yml`,
  `.github/workflows/backup-retention.yml`,
  `.github/workflows/backup-monitor.yml`.
- Runbook: `docs/RUNBOOKS/restore.md` (updated with the tooling pointers and
  exact `pnpm` commands above the existing manual-command reference, which
  remains accurate for a real drill).
