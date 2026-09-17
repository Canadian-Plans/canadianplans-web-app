CREATE TABLE "app"."dispatch_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"courier" text NOT NULL,
	"tracking_reference" text,
	"dispatched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispatch_records_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "app"."dispatch_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"order_id" uuid,
	"response_reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "idempotency_keys_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "idempotency_keys_workspace_scope_key_unique" UNIQUE("workspace_id","scope","key_hash"),
	CONSTRAINT "idempotency_keys_status_check" CHECK ("app"."idempotency_keys"."status" in ('pending', 'completed')),
	CONSTRAINT "idempotency_keys_completion_check" CHECK (("app"."idempotency_keys"."status" = 'pending' and "app"."idempotency_keys"."order_id" is null and "app"."idempotency_keys"."response_reference" is null and "app"."idempotency_keys"."completed_at" is null) or ("app"."idempotency_keys"."status" = 'completed' and "app"."idempotency_keys"."order_id" is not null and "app"."idempotency_keys"."response_reference" is not null and "app"."idempotency_keys"."completed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."order_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"patch" jsonb NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_amendments_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "app"."order_amendments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."order_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_change_requests_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "order_change_requests_status_check" CHECK ("app"."order_change_requests"."status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "app"."order_change_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"order_version" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_status_history_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "order_status_history_from_status_check" CHECK ("app"."order_status_history"."from_status" is null or "app"."order_status_history"."from_status" in ('submitted', 'in_progress', 'awaiting_customer', 'ready_for_delivery', 'dispatched', 'activated', 'cancelled')),
	CONSTRAINT "order_status_history_to_status_check" CHECK ("app"."order_status_history"."to_status" in ('submitted', 'in_progress', 'awaiting_customer', 'ready_for_delivery', 'dispatched', 'activated', 'cancelled')),
	CONSTRAINT "order_status_history_version_positive_check" CHECK ("app"."order_status_history"."order_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."order_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" text NOT NULL,
	"payment_state" text NOT NULL,
	"delivery_state" text NOT NULL,
	"archived_at" timestamp with time zone,
	"assignee_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"payload" jsonb NOT NULL,
	"partner_id" uuid,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "orders_workspace_reference_unique" UNIQUE("workspace_id","reference"),
	CONSTRAINT "orders_workspace_lead_unique" UNIQUE("workspace_id","lead_id"),
	CONSTRAINT "orders_status_check" CHECK ("app"."orders"."status" in ('submitted', 'in_progress', 'awaiting_customer', 'ready_for_delivery', 'dispatched', 'activated', 'cancelled')),
	CONSTRAINT "orders_payment_state_check" CHECK ("app"."orders"."payment_state" in ('not_required', 'pending', 'paid')),
	CONSTRAINT "orders_delivery_state_check" CHECK ("app"."orders"."delivery_state" in ('none', 'dispatched')),
	CONSTRAINT "orders_version_positive_check" CHECK ("app"."orders"."version" > 0),
	CONSTRAINT "orders_snapshot_object_check" CHECK (jsonb_typeof("app"."orders"."snapshot") = 'object'),
	CONSTRAINT "orders_payload_object_check" CHECK (jsonb_typeof("app"."orders"."payload") = 'object')
);
--> statement-breakpoint
ALTER TABLE "app"."orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."outbox_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"job_type" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_jobs_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "outbox_jobs_workspace_type_dedupe_unique" UNIQUE("workspace_id","job_type","dedupe_key"),
	CONSTRAINT "outbox_jobs_status_check" CHECK ("app"."outbox_jobs"."status" in ('pending', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"method" text,
	"payment_reference" text,
	"amount_minor" integer,
	"currency" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "payment_records_from_state_check" CHECK ("app"."payment_records"."from_state" in ('not_required', 'pending', 'paid')),
	CONSTRAINT "payment_records_to_state_check" CHECK ("app"."payment_records"."to_state" in ('not_required', 'pending', 'paid')),
	CONSTRAINT "payment_records_amount_check" CHECK ("app"."payment_records"."amount_minor" is null or "app"."payment_records"."amount_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."payment_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD COLUMN "consumed_by_order_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD COLUMN "consumed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."dispatch_records" ADD CONSTRAINT "dispatch_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."dispatch_records" ADD CONSTRAINT "dispatch_records_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_amendments" ADD CONSTRAINT "order_amendments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_amendments" ADD CONSTRAINT "order_amendments_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_change_requests" ADD CONSTRAINT "order_change_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_change_requests" ADD CONSTRAINT "order_change_requests_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_status_history" ADD CONSTRAINT "order_status_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_status_history" ADD CONSTRAINT "order_status_history_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_workspace_assignee_fk" FOREIGN KEY ("workspace_id","assignee_id") REFERENCES "app"."memberships"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_workspace_partner_fk" FOREIGN KEY ("workspace_id","partner_id") REFERENCES "app"."partners"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD CONSTRAINT "outbox_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_records" ADD CONSTRAINT "payment_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_records" ADD CONSTRAINT "payment_records_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispatch_records_workspace_order_idx" ON "app"."dispatch_records" USING btree ("workspace_id","order_id");--> statement-breakpoint
CREATE INDEX "idempotency_keys_workspace_order_idx" ON "app"."idempotency_keys" USING btree ("workspace_id","order_id");--> statement-breakpoint
CREATE INDEX "order_amendments_workspace_order_created_idx" ON "app"."order_amendments" USING btree ("workspace_id","order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_change_requests_workspace_order_status_idx" ON "app"."order_change_requests" USING btree ("workspace_id","order_id","status");--> statement-breakpoint
CREATE INDEX "order_status_history_workspace_order_created_idx" ON "app"."order_status_history" USING btree ("workspace_id","order_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_workspace_status_submitted_idx" ON "app"."orders" USING btree ("workspace_id","status","submitted_at");--> statement-breakpoint
CREATE INDEX "orders_workspace_assignee_idx" ON "app"."orders" USING btree ("workspace_id","assignee_id");--> statement-breakpoint
CREATE INDEX "orders_workspace_partner_idx" ON "app"."orders" USING btree ("workspace_id","partner_id");--> statement-breakpoint
CREATE INDEX "outbox_jobs_workspace_status_available_idx" ON "app"."outbox_jobs" USING btree ("workspace_id","status","available_at");--> statement-breakpoint
CREATE INDEX "payment_records_workspace_order_recorded_idx" ON "app"."payment_records" USING btree ("workspace_id","order_id","recorded_at");--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD CONSTRAINT "quotes_workspace_consumed_order_fk" FOREIGN KEY ("workspace_id","consumed_by_order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD CONSTRAINT "quotes_workspace_consumed_order_unique" UNIQUE("workspace_id","consumed_by_order_id");--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD CONSTRAINT "quotes_consumption_pair_check" CHECK (("app"."quotes"."consumed_by_order_id" is null) = ("app"."quotes"."consumed_at" is null));--> statement-breakpoint
CREATE POLICY "dispatch_records_tenant_policy" ON "app"."dispatch_records" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."dispatch_records"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."dispatch_records"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "idempotency_keys_tenant_policy" ON "app"."idempotency_keys" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."idempotency_keys"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."idempotency_keys"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "order_amendments_tenant_policy" ON "app"."order_amendments" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."order_amendments"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."order_amendments"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "order_change_requests_tenant_policy" ON "app"."order_change_requests" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."order_change_requests"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."order_change_requests"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "order_status_history_tenant_policy" ON "app"."order_status_history" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."order_status_history"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."order_status_history"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "orders_tenant_policy" ON "app"."orders" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."orders"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."orders"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "outbox_jobs_tenant_policy" ON "app"."outbox_jobs" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."outbox_jobs"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."outbox_jobs"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "payment_records_tenant_policy" ON "app"."payment_records" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."payment_records"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."payment_records"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);
--> statement-breakpoint
ALTER TABLE "app"."dispatch_records" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."idempotency_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."order_amendments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."order_change_requests" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."order_status_history" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."orders" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."payment_records" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."dispatch_records" TO "app_runtime";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."idempotency_keys" TO "app_runtime";
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."order_amendments" TO "app_runtime";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."order_change_requests" TO "app_runtime";
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."order_status_history" TO "app_runtime";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."orders" TO "app_runtime";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."outbox_jobs" TO "app_runtime";
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."payment_records" TO "app_runtime";
--> statement-breakpoint
CREATE FUNCTION "app"."prevent_order_submission_mutation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $function$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.reference IS DISTINCT FROM OLD.reference
     OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.payload IS DISTINCT FROM OLD.payload
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'submitted order identity, payload, and commercial snapshot are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
CREATE TRIGGER "orders_submission_immutable"
BEFORE UPDATE ON "app"."orders"
FOR EACH ROW EXECUTE FUNCTION "app"."prevent_order_submission_mutation"();
--> statement-breakpoint
CREATE FUNCTION "app"."protect_idempotency_outcome"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $function$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.scope IS DISTINCT FROM OLD.scope
     OR NEW.key_hash IS DISTINCT FROM OLD.key_hash
     OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
     OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.status = 'completed' AND NEW IS DISTINCT FROM OLD) THEN
    RAISE EXCEPTION 'idempotency identity and completed outcome are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
CREATE TRIGGER "idempotency_outcome_immutable"
BEFORE UPDATE ON "app"."idempotency_keys"
FOR EACH ROW EXECUTE FUNCTION "app"."protect_idempotency_outcome"();
