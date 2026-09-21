CREATE TABLE "app"."backup_leases" (
	"run_id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."backup_leases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "backup_leases_expires_at_idx" ON "app"."backup_leases" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "app"."backup_leases" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "app"."backup_leases" FROM app_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."backup_lease_active"()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM app.backup_leases WHERE expires_at > pg_catalog.clock_timestamp()
  );
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."backup_lease_active"() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."backup_lease_active"() TO app_runtime;