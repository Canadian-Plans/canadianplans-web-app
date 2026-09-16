ALTER TABLE "app"."orders" ADD COLUMN "consent" jsonb;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_consent_object_check" CHECK ("app"."orders"."consent" is null or jsonb_typeof("app"."orders"."consent") = 'object');--> statement-breakpoint
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
     OR NEW.payload IS DISTINCT FROM OLD.payload
     OR NEW.consent IS DISTINCT FROM OLD.consent
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'submitted order identity, payload, and commercial snapshot are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;