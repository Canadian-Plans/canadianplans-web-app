CREATE TABLE "app"."deletion_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"actor_id" uuid NOT NULL,
	"ledger_ack_id" text,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	CONSTRAINT "deletion_intents_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "deletion_intents_status_check" CHECK ("app"."deletion_intents"."status" in ('pending', 'acknowledged', 'failed')),
	CONSTRAINT "deletion_intents_action_check" CHECK ("app"."deletion_intents"."action" in ('delete_customer_data')),
	CONSTRAINT "deletion_intents_subject_type_check" CHECK ("app"."deletion_intents"."subject_type" = 'order')
);
--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" ADD CONSTRAINT "deletion_intents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deletion_intents_workspace_status_idx" ON "app"."deletion_intents" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE POLICY "deletion_intents_tenant_policy" ON "app"."deletion_intents" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."deletion_intents"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."deletion_intents"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);