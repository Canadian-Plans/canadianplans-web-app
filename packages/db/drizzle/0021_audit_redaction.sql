-- The runtime's column grant permits privacy redaction, never replacement of
-- recorded evidence. Keep unchanged values valid when only one side is erased.
CREATE FUNCTION "app"."restrict_audit_redaction"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $function$
BEGIN
  IF (NEW."before" IS DISTINCT FROM OLD."before" AND NEW."before" IS NOT NULL)
     OR (NEW."after" IS DISTINCT FROM OLD."after" AND NEW."after" IS NOT NULL) THEN
    RAISE EXCEPTION 'audit values may only be redacted to SQL null'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;--> statement-breakpoint
CREATE TRIGGER "audit_events_redaction_only"
BEFORE UPDATE OF "before", "after" ON "app"."audit_events"
FOR EACH ROW EXECUTE FUNCTION "app"."restrict_audit_redaction"();
