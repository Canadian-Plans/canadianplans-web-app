CREATE TABLE "app"."email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"template" text NOT NULL,
	"message_class" text NOT NULL,
	"lead_id" uuid,
	"order_id" uuid,
	"contact_hash" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_id" text,
	"last_error_code" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_messages_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "email_messages_workspace_message_id_unique" UNIQUE("workspace_id","message_id"),
	CONSTRAINT "email_messages_class_check" CHECK ("app"."email_messages"."message_class" in ('transactional', 'marketing')),
	CONSTRAINT "email_messages_status_check" CHECK ("app"."email_messages"."status" in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'uncertain'))
);
--> statement-breakpoint
ALTER TABLE "app"."email_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."email_provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"message_id" uuid,
	"contact_hash" text,
	"received_at" timestamp with time zone NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_provider_events_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "email_provider_events_workspace_provider_event_unique" UNIQUE("workspace_id","provider_event_id"),
	CONSTRAINT "email_provider_events_type_check" CHECK ("app"."email_provider_events"."event_type" in ('delivered', 'bounce', 'complaint', 'reject'))
);
--> statement-breakpoint
ALTER TABLE "app"."email_provider_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."email_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contact_hash" text NOT NULL,
	"reason" text NOT NULL,
	"source_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_suppressions_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "email_suppressions_workspace_contact_reason_unique" UNIQUE("workspace_id","contact_hash","reason"),
	CONSTRAINT "email_suppressions_reason_check" CHECK ("app"."email_suppressions"."reason" in ('hard_bounce', 'complaint', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "app"."email_suppressions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."follow_up_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid,
	"order_id" uuid,
	"template" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"cancelled_reason" text,
	"cancelled_by_actor_id" uuid,
	"sent_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_up_schedules_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "follow_up_schedules_reference_check" CHECK ("app"."follow_up_schedules"."lead_id" is not null or "app"."follow_up_schedules"."order_id" is not null),
	CONSTRAINT "follow_up_schedules_status_check" CHECK ("app"."follow_up_schedules"."status" in ('scheduled', 'sent', 'cancelled', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "app"."follow_up_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."marketing_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid,
	"order_id" uuid,
	"contact_hash" text NOT NULL,
	"marketing_opt_in" boolean NOT NULL,
	"version" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_consents_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "marketing_consents_reference_check" CHECK ("app"."marketing_consents"."lead_id" is not null or "app"."marketing_consents"."order_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "app"."marketing_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_provider_events" ADD CONSTRAINT "email_provider_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_suppressions" ADD CONSTRAINT "email_suppressions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."marketing_consents" ADD CONSTRAINT "marketing_consents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."marketing_consents" ADD CONSTRAINT "marketing_consents_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."marketing_consents" ADD CONSTRAINT "marketing_consents_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_messages_workspace_status_idx" ON "app"."email_messages" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "email_messages_workspace_contact_hash_idx" ON "app"."email_messages" USING btree ("workspace_id","contact_hash");--> statement-breakpoint
CREATE INDEX "email_provider_events_workspace_message_idx" ON "app"."email_provider_events" USING btree ("workspace_id","message_id");--> statement-breakpoint
CREATE INDEX "email_suppressions_workspace_contact_hash_idx" ON "app"."email_suppressions" USING btree ("workspace_id","contact_hash");--> statement-breakpoint
CREATE INDEX "follow_up_schedules_workspace_due_idx" ON "app"."follow_up_schedules" USING btree ("workspace_id","status","due_at");--> statement-breakpoint
CREATE INDEX "marketing_consents_workspace_contact_hash_idx" ON "app"."marketing_consents" USING btree ("workspace_id","contact_hash","captured_at");--> statement-breakpoint
CREATE POLICY "email_messages_tenant_policy" ON "app"."email_messages" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."email_messages"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."email_messages"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "email_provider_events_tenant_policy" ON "app"."email_provider_events" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."email_provider_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."email_provider_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "email_suppressions_tenant_policy" ON "app"."email_suppressions" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."email_suppressions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."email_suppressions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "follow_up_schedules_tenant_policy" ON "app"."follow_up_schedules" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."follow_up_schedules"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."follow_up_schedules"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "marketing_consents_tenant_policy" ON "app"."marketing_consents" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."marketing_consents"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."marketing_consents"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);