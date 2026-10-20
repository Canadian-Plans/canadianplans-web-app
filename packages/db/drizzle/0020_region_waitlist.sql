CREATE TABLE "app"."region_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"province" text NOT NULL,
	"email" text NOT NULL,
	"interest" text,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "region_waitlist_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "region_waitlist_province_check" CHECK ("app"."region_waitlist"."province" in ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
	CONSTRAINT "region_waitlist_interest_check" CHECK ("app"."region_waitlist"."interest" is null or "app"."region_waitlist"."interest" in ('sim', 'mobile', 'internet'))
);
--> statement-breakpoint
ALTER TABLE "app"."region_waitlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."region_waitlist" ADD CONSTRAINT "region_waitlist_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "region_waitlist_workspace_province_email_unique" ON "app"."region_waitlist" USING btree ("workspace_id","province",lower("email"));--> statement-breakpoint
CREATE INDEX "region_waitlist_workspace_province_idx" ON "app"."region_waitlist" USING btree ("workspace_id","province");--> statement-breakpoint
CREATE POLICY "region_waitlist_tenant_policy" ON "app"."region_waitlist" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."region_waitlist"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."region_waitlist"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."region_waitlist" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."region_waitlist" TO "app_runtime";
