CREATE TABLE "app"."saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"object" text NOT NULL,
	"name" text NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_views_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "saved_views_object_check" CHECK ("app"."saved_views"."object" in ('orders')),
	CONSTRAINT "saved_views_name_check" CHECK (char_length("app"."saved_views"."name") between 1 and 60)
);
--> statement-breakpoint
ALTER TABLE "app"."saved_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."saved_views" ADD CONSTRAINT "saved_views_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."saved_views" ADD CONSTRAINT "saved_views_workspace_actor_membership_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "app"."memberships"("workspace_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_views_owner_name_unique" ON "app"."saved_views" USING btree ("workspace_id","actor_id","object",lower("name"));--> statement-breakpoint
CREATE INDEX "saved_views_owner_object_idx" ON "app"."saved_views" USING btree ("workspace_id","actor_id","object");--> statement-breakpoint
CREATE POLICY "saved_views_owner_policy" ON "app"."saved_views" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."saved_views"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and "app"."saved_views"."actor_id" = nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid) WITH CHECK ("app"."saved_views"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and "app"."saved_views"."actor_id" = nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid);--> statement-breakpoint
ALTER TABLE "app"."saved_views" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app"."saved_views" TO "app_runtime";
