DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
		CREATE ROLE app_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
	END IF;
END
$$;
--> statement-breakpoint
ALTER ROLE app_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
--> statement-breakpoint
CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."membership_type" AS ENUM('staff', 'partner');--> statement-breakpoint
CREATE TYPE "app"."permission_name" AS ENUM('document_download', 'financial_data', 'bulk_export', 'deletion', 'invoice_approval', 'integration_management');--> statement-breakpoint
CREATE TYPE "app"."role_name" AS ENUM('owner', 'orders', 'partners', 'finance', 'content', 'viewer');--> statement-breakpoint
CREATE TABLE "app"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "app"."audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."membership_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_permissions_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "membership_permissions_workspace_membership_permission_unique" UNIQUE("workspace_id","membership_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "app"."membership_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."membership_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_roles_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "membership_roles_workspace_membership_role_unique" UNIQUE("workspace_id","membership_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "app"."membership_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_type" "app"."membership_type" NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "memberships_workspace_id_user_id_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "app"."memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" "app"."permission_name" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "permissions_workspace_id_name_unique" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
ALTER TABLE "app"."permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" "app"."role_name" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "roles_workspace_id_name_unique" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
ALTER TABLE "app"."roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."service_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"secret_hash" text NOT NULL,
	"scopes" text[] DEFAULT array[]::text[] NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_credentials_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "app"."service_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_permissions" ADD CONSTRAINT "membership_permissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_permissions" ADD CONSTRAINT "membership_permissions_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "app"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_permissions" ADD CONSTRAINT "membership_permissions_workspace_permission_fk" FOREIGN KEY ("workspace_id","permission_id") REFERENCES "app"."permissions"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_roles" ADD CONSTRAINT "membership_roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_roles" ADD CONSTRAINT "membership_roles_workspace_membership_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "app"."memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."membership_roles" ADD CONSTRAINT "membership_roles_workspace_role_fk" FOREIGN KEY ("workspace_id","role_id") REFERENCES "app"."roles"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."permissions" ADD CONSTRAINT "permissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."roles" ADD CONSTRAINT "roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."service_credentials" ADD CONSTRAINT "service_credentials_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_workspace_id_created_at_idx" ON "app"."audit_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_workspace_id_entity_idx" ON "app"."audit_events" USING btree ("workspace_id","entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_workspace_id_request_id_idx" ON "app"."audit_events" USING btree ("workspace_id","request_id");--> statement-breakpoint
CREATE INDEX "membership_permissions_workspace_id_permission_id_idx" ON "app"."membership_permissions" USING btree ("workspace_id","permission_id");--> statement-breakpoint
CREATE INDEX "membership_roles_workspace_id_role_id_idx" ON "app"."membership_roles" USING btree ("workspace_id","role_id");--> statement-breakpoint
CREATE INDEX "memberships_workspace_id_status_idx" ON "app"."memberships" USING btree ("workspace_id","status","user_id");--> statement-breakpoint
CREATE INDEX "service_credentials_workspace_id_revoked_at_idx" ON "app"."service_credentials" USING btree ("workspace_id","revoked_at");--> statement-breakpoint
CREATE POLICY "audit_events_tenant_policy" ON "app"."audit_events" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."audit_events"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null) WITH CHECK ("app"."audit_events"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null);--> statement-breakpoint
CREATE POLICY "membership_permissions_tenant_policy" ON "app"."membership_permissions" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."membership_permissions"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null) WITH CHECK ("app"."membership_permissions"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null);--> statement-breakpoint
CREATE POLICY "membership_roles_tenant_policy" ON "app"."membership_roles" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."membership_roles"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null) WITH CHECK ("app"."membership_roles"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null);--> statement-breakpoint
CREATE POLICY "memberships_tenant_policy" ON "app"."memberships" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."memberships"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null) WITH CHECK ("app"."memberships"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null);--> statement-breakpoint
CREATE POLICY "permissions_tenant_policy" ON "app"."permissions" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."permissions"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null) WITH CHECK ("app"."permissions"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null);--> statement-breakpoint
CREATE POLICY "roles_tenant_policy" ON "app"."roles" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."roles"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null) WITH CHECK ("app"."roles"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null);--> statement-breakpoint
CREATE POLICY "service_credentials_tenant_policy" ON "app"."service_credentials" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."service_credentials"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null) WITH CHECK ("app"."service_credentials"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid
    and nullif(current_setting('app.actor_id', true), '')::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."roles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."membership_roles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."permissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."membership_permissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."service_credentials" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."audit_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON SCHEMA "app" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "app" FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA "app" TO app_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
	"app"."memberships",
	"app"."roles",
	"app"."membership_roles",
	"app"."permissions",
	"app"."membership_permissions",
	"app"."service_credentials"
TO app_runtime;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."audit_events" TO app_runtime;
