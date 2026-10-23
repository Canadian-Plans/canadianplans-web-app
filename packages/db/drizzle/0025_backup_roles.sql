-- SEC-14: least-privilege database roles for the backup workflow (invariant 13).
-- Both roles are created without a password. The owner sets each password out of
-- band (never in a migration), so neither can log in until then.
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backup_lease_writer') THEN
		CREATE ROLE backup_lease_writer LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
	END IF;
END
$$;--> statement-breakpoint
-- The lease table holds no tenant data (a run id and an expiry), so a permissive
-- policy for this one role is acceptable under invariant 2. Its insert trigger
-- (guard_backup_cleanup_overlap) is SECURITY DEFINER and needs no further grant.
GRANT USAGE ON SCHEMA app TO backup_lease_writer;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app.backup_leases TO backup_lease_writer;--> statement-breakpoint
CREATE POLICY backup_leases_writer_policy ON app.backup_leases AS PERMISSIVE FOR ALL TO backup_lease_writer USING (true) WITH CHECK (true);--> statement-breakpoint
-- The reader must dump every schema in full. pg_read_all_data alone does not
-- bypass row-level security, and every app table forces it, so the role also
-- needs BYPASSRLS; it gets no write privilege anywhere. A hosted platform may not
-- let the migration role grant either one: then this warns instead of failing
-- the migration, and an administrator completes the role (docs/RUNBOOKS/restore.md).
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backup_reader') THEN
		BEGIN
			CREATE ROLE backup_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION BYPASSRLS;
		EXCEPTION WHEN insufficient_privilege THEN
			RAISE WARNING 'backup_reader was created without BYPASSRLS; an administrator must add it';
			CREATE ROLE backup_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS;
		END;
	END IF;
	BEGIN
		GRANT pg_read_all_data TO backup_reader;
	EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
		RAISE WARNING 'pg_read_all_data was not granted to backup_reader; an administrator must grant it';
	END;
END
$$;
