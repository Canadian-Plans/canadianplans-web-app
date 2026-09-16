CREATE TABLE "app"."partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"referral_code" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "partners_status_check" CHECK ("app"."partners"."status" in ('pending', 'approved', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "app"."partners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."partners" ADD CONSTRAINT "partners_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partners_workspace_id_referral_code_unique" ON "app"."partners" USING btree ("workspace_id",lower("referral_code"));--> statement-breakpoint
CREATE INDEX "partners_workspace_id_status_idx" ON "app"."partners" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE POLICY "partners_tenant_policy" ON "app"."partners" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."partners"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."partners"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."partners" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app"."partners" TO app_runtime;