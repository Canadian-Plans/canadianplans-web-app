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
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."deletion_intents" TO "app_runtime";--> statement-breakpoint
-- T21 customer-data deletion (REQ 24) also restricts/removes pre-existing
-- personal copies. audit_events stays append-only: the runtime role may only
-- null the personal before/after values, never any other column (actor label,
-- action, timestamps), which the RLS suite asserts is denied.
GRANT UPDATE ("before", "after") ON TABLE "app"."audit_events" TO "app_runtime";--> statement-breakpoint
GRANT DELETE ON TABLE "app"."order_notes" TO "app_runtime";--> statement-breakpoint
GRANT DELETE ON TABLE "app"."order_amendments" TO "app_runtime";--> statement-breakpoint
GRANT DELETE ON TABLE "app"."order_change_requests" TO "app_runtime";--> statement-breakpoint
-- Submitted orders stay immutable (REQ 14, invariant 5), except that a deletion
-- may erase the personal `payload`/`consent`: they may only be emptied, never
-- rewritten. See the T21 report and REQ 24.
CREATE OR REPLACE FUNCTION "app"."prevent_order_submission_mutation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $function$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.reference IS DISTINCT FROM OLD.reference
     OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'submitted order identity, payload, and commercial snapshot are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.payload IS DISTINCT FROM OLD.payload AND NEW.payload IS DISTINCT FROM '{}'::jsonb)
     OR (NEW.consent IS DISTINCT FROM OLD.consent AND NEW.consent IS NOT NULL) THEN
    RAISE EXCEPTION 'submitted order identity, payload, and commercial snapshot are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;