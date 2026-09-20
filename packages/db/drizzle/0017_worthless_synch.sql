CREATE TABLE "app"."tracking_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"email_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "tracking_challenges_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "tracking_challenges_status_check" CHECK ("app"."tracking_challenges"."status" in ('pending', 'consumed')),
	CONSTRAINT "tracking_challenges_attempts_check" CHECK ("app"."tracking_challenges"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."tracking_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."tracking_challenges" ADD CONSTRAINT "tracking_challenges_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tracking_challenges" ADD CONSTRAINT "tracking_challenges_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracking_challenges_workspace_order_status_idx" ON "app"."tracking_challenges" USING btree ("workspace_id","order_id","status");--> statement-breakpoint
CREATE INDEX "tracking_challenges_workspace_email_idx" ON "app"."tracking_challenges" USING btree ("workspace_id","email_hash");--> statement-breakpoint
CREATE POLICY "tracking_challenges_tenant_policy" ON "app"."tracking_challenges" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."tracking_challenges"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."tracking_challenges"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);