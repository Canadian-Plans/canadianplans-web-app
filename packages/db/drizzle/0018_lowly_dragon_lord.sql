CREATE TABLE "app"."commission_line_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"commission_line_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_line_events_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "commission_line_events_from_state_check" CHECK ("app"."commission_line_events"."from_state" is null or "app"."commission_line_events"."from_state" in ('earned', 'carrier_paid', 'partner_paid')),
	CONSTRAINT "commission_line_events_to_state_check" CHECK ("app"."commission_line_events"."to_state" in ('earned', 'carrier_paid', 'partner_paid'))
);
--> statement-breakpoint
ALTER TABLE "app"."commission_line_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."commission_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"rule_snapshot" jsonb NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"state" text DEFAULT 'earned' NOT NULL,
	"invoice_id" uuid,
	"earned_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_lines_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "commission_lines_workspace_order_unique" UNIQUE("workspace_id","order_id"),
	CONSTRAINT "commission_lines_state_check" CHECK ("app"."commission_lines"."state" in ('earned', 'carrier_paid', 'partner_paid')),
	CONSTRAINT "commission_lines_amount_nonnegative_check" CHECK ("app"."commission_lines"."amount_minor" >= 0),
	CONSTRAINT "commission_lines_snapshot_object_check" CHECK (jsonb_typeof("app"."commission_lines"."rule_snapshot") = 'object')
);
--> statement-breakpoint
ALTER TABLE "app"."commission_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"rule_type" text NOT NULL,
	"value_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_rules_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "commission_rules_type_check" CHECK ("app"."commission_rules"."rule_type" in ('fixed', 'percentage')),
	CONSTRAINT "commission_rules_value_nonnegative_check" CHECK ("app"."commission_rules"."value_minor" >= 0),
	CONSTRAINT "commission_rules_window_check" CHECK ("app"."commission_rules"."effective_to" is null or "app"."commission_rules"."effective_to" > "app"."commission_rules"."effective_from")
);
--> statement-breakpoint
ALTER TABLE "app"."commission_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
CREATE TABLE "app"."file_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_review_events_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "file_review_events_decision_check" CHECK ("app"."file_review_events"."decision" in ('approved', 'rejected')),
	CONSTRAINT "file_review_events_note_check" CHECK ("app"."file_review_events"."note" is null or char_length("app"."file_review_events"."note") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "app"."file_review_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."file_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"object_key" text NOT NULL,
	"detected_mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_revisions_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "file_revisions_workspace_file_revision_unique" UNIQUE("workspace_id","file_id","revision"),
	CONSTRAINT "file_revisions_revision_positive_check" CHECK ("app"."file_revisions"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."file_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"bucket" text NOT NULL,
	"staging_key" text NOT NULL,
	"candidate_key" text,
	"object_key" text,
	"declared_content_type" text NOT NULL,
	"detected_mime" text,
	"declared_size_bytes" integer NOT NULL,
	"size_bytes" integer,
	"checksum_sha256" text,
	"status" text DEFAULT 'uploading' NOT NULL,
	"reject_reason" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"superseded_by_file_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"finalized_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "files_status_check" CHECK ("app"."files"."status" in ('uploading', 'verifying', 'available', 'rejected', 'deleted')),
	CONSTRAINT "files_record_type_check" CHECK ("app"."files"."record_type" in ('lead', 'order')),
	CONSTRAINT "files_content_type_check" CHECK ("app"."files"."declared_content_type" in ('application/pdf', 'image/jpeg', 'image/png')),
	CONSTRAINT "files_declared_size_check" CHECK ("app"."files"."declared_size_bytes" > 0),
	CONSTRAINT "files_size_check" CHECK ("app"."files"."size_bytes" is null or "app"."files"."size_bytes" >= 0),
	CONSTRAINT "files_revision_positive_check" CHECK ("app"."files"."revision" > 0),
	CONSTRAINT "files_available_provenance_check" CHECK ((
          "app"."files"."status" = 'available'
          and "app"."files"."object_key" is not null
          and "app"."files"."detected_mime" is not null
          and "app"."files"."checksum_sha256" is not null
          and "app"."files"."size_bytes" is not null
        ) or (
          "app"."files"."status" <> 'available'
        ))
);
--> statement-breakpoint
ALTER TABLE "app"."files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
CREATE TABLE "app"."invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"commission_line_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_lines_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "invoice_lines_workspace_commission_unique" UNIQUE("workspace_id","commission_line_id")
);
--> statement-breakpoint
ALTER TABLE "app"."invoice_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"invoice_number" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_minor" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "invoices_workspace_number_unique" UNIQUE("workspace_id","invoice_number"),
	CONSTRAINT "invoices_workspace_partner_period_unique" UNIQUE("workspace_id","partner_id","period_start","period_end"),
	CONSTRAINT "invoices_status_check" CHECK ("app"."invoices"."status" in ('draft', 'approved')),
	CONSTRAINT "invoices_period_check" CHECK ("app"."invoices"."period_end" >= "app"."invoices"."period_start"),
	CONSTRAINT "invoices_approved_state_check" CHECK (("app"."invoices"."status" = 'approved') = ("app"."invoices"."approved_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "app"."commission_line_events" ADD CONSTRAINT "commission_line_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."commission_line_events" ADD CONSTRAINT "commission_line_events_workspace_line_fk" FOREIGN KEY ("workspace_id","commission_line_id") REFERENCES "app"."commission_lines"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."commission_lines" ADD CONSTRAINT "commission_lines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."commission_lines" ADD CONSTRAINT "commission_lines_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."commission_lines" ADD CONSTRAINT "commission_lines_workspace_partner_fk" FOREIGN KEY ("workspace_id","partner_id") REFERENCES "app"."partners"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."commission_lines" ADD CONSTRAINT "commission_lines_workspace_rule_fk" FOREIGN KEY ("workspace_id","rule_id") REFERENCES "app"."commission_rules"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."commission_lines" ADD CONSTRAINT "commission_lines_workspace_invoice_fk" FOREIGN KEY ("workspace_id","invoice_id") REFERENCES "app"."invoices"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."commission_rules" ADD CONSTRAINT "commission_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_provider_events" ADD CONSTRAINT "email_provider_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_suppressions" ADD CONSTRAINT "email_suppressions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_review_events" ADD CONSTRAINT "file_review_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_review_events" ADD CONSTRAINT "file_review_events_workspace_file_fk" FOREIGN KEY ("workspace_id","file_id") REFERENCES "app"."files"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_revisions" ADD CONSTRAINT "file_revisions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_revisions" ADD CONSTRAINT "file_revisions_workspace_file_fk" FOREIGN KEY ("workspace_id","file_id") REFERENCES "app"."files"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follow_up_schedules" ADD CONSTRAINT "follow_up_schedules_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_lines" ADD CONSTRAINT "invoice_lines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_lines" ADD CONSTRAINT "invoice_lines_workspace_invoice_fk" FOREIGN KEY ("workspace_id","invoice_id") REFERENCES "app"."invoices"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_lines" ADD CONSTRAINT "invoice_lines_workspace_commission_fk" FOREIGN KEY ("workspace_id","commission_line_id") REFERENCES "app"."commission_lines"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoices" ADD CONSTRAINT "invoices_workspace_partner_fk" FOREIGN KEY ("workspace_id","partner_id") REFERENCES "app"."partners"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."marketing_consents" ADD CONSTRAINT "marketing_consents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."marketing_consents" ADD CONSTRAINT "marketing_consents_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."marketing_consents" ADD CONSTRAINT "marketing_consents_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_line_events_workspace_line_created_idx" ON "app"."commission_line_events" USING btree ("workspace_id","commission_line_id","created_at");--> statement-breakpoint
CREATE INDEX "commission_lines_workspace_partner_idx" ON "app"."commission_lines" USING btree ("workspace_id","partner_id");--> statement-breakpoint
CREATE INDEX "commission_lines_workspace_state_idx" ON "app"."commission_lines" USING btree ("workspace_id","state");--> statement-breakpoint
CREATE INDEX "commission_rules_workspace_effective_idx" ON "app"."commission_rules" USING btree ("workspace_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "email_messages_workspace_status_idx" ON "app"."email_messages" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "email_messages_workspace_contact_hash_idx" ON "app"."email_messages" USING btree ("workspace_id","contact_hash");--> statement-breakpoint
CREATE INDEX "email_provider_events_workspace_message_idx" ON "app"."email_provider_events" USING btree ("workspace_id","message_id");--> statement-breakpoint
CREATE INDEX "email_suppressions_workspace_contact_hash_idx" ON "app"."email_suppressions" USING btree ("workspace_id","contact_hash");--> statement-breakpoint
CREATE INDEX "file_review_events_workspace_file_created_idx" ON "app"."file_review_events" USING btree ("workspace_id","file_id","created_at");--> statement-breakpoint
CREATE INDEX "file_revisions_workspace_file_idx" ON "app"."file_revisions" USING btree ("workspace_id","file_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "files_staging_key_unique" ON "app"."files" USING btree ("staging_key");--> statement-breakpoint
CREATE UNIQUE INDEX "files_object_key_unique" ON "app"."files" USING btree ("object_key") WHERE "app"."files"."object_key" is not null;--> statement-breakpoint
CREATE INDEX "files_workspace_record_idx" ON "app"."files" USING btree ("workspace_id","record_type","record_id","status");--> statement-breakpoint
CREATE INDEX "files_workspace_status_expires_idx" ON "app"."files" USING btree ("workspace_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "follow_up_schedules_workspace_due_idx" ON "app"."follow_up_schedules" USING btree ("workspace_id","status","due_at");--> statement-breakpoint
CREATE INDEX "invoice_lines_workspace_invoice_idx" ON "app"."invoice_lines" USING btree ("workspace_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_workspace_partner_idx" ON "app"."invoices" USING btree ("workspace_id","partner_id");--> statement-breakpoint
CREATE INDEX "marketing_consents_workspace_contact_hash_idx" ON "app"."marketing_consents" USING btree ("workspace_id","contact_hash","captured_at");--> statement-breakpoint
CREATE POLICY "commission_line_events_tenant_policy" ON "app"."commission_line_events" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."commission_line_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."commission_line_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "commission_lines_tenant_policy" ON "app"."commission_lines" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."commission_lines"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."commission_lines"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "commission_rules_tenant_policy" ON "app"."commission_rules" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."commission_rules"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."commission_rules"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
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
CREATE POLICY "file_review_events_tenant_policy" ON "app"."file_review_events" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."file_review_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."file_review_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "file_revisions_tenant_policy" ON "app"."file_revisions" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."file_revisions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."file_revisions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "files_tenant_policy" ON "app"."files" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."files"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."files"."workspace_id" = nullif(
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
CREATE POLICY "invoice_lines_tenant_policy" ON "app"."invoice_lines" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."invoice_lines"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."invoice_lines"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "invoices_tenant_policy" ON "app"."invoices" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."invoices"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."invoices"."workspace_id" = nullif(
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
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."file_revisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."file_review_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."files" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."file_revisions" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."file_review_events" TO "app_runtime";--> statement-breakpoint
ALTER TABLE "app"."commission_rules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."commission_lines" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."commission_line_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."invoice_lines" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."commission_rules" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."commission_lines" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."commission_line_events" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."invoices" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."invoice_lines" TO "app_runtime";
