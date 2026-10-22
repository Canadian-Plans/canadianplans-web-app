CREATE TABLE "app"."deleted_email_messages" (
	"workspace_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"provider" text,
	"provider_account" text,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deleted_email_messages_workspace_message_unique" UNIQUE("workspace_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "app"."deleted_email_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."deletion_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"deletion_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deletion_objects_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "deletion_objects_workspace_intent_key_unique" UNIQUE("workspace_id","deletion_id","bucket","object_key")
);
--> statement-breakpoint
ALTER TABLE "app"."deletion_objects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."document_cleanup_leases" (
	"object_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lease_owner_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."document_cleanup_leases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" DROP CONSTRAINT "deletion_intents_subject_type_check";--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" ADD COLUMN "related_lead_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" ADD COLUMN "local_cleaned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE app.marketing_consents DROP CONSTRAINT marketing_consents_reference_check;
ALTER TABLE app.marketing_consents ADD CONSTRAINT marketing_consents_reference_check CHECK (lead_id IS NOT NULL OR order_id IS NOT NULL OR (marketing_opt_in = false AND version = 'retained-opt-out'));
--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "customer_data_restricted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD COLUMN "customer_data_restricted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD COLUMN "customer_data_deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."region_waitlist" ADD COLUMN "customer_data_restricted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."deleted_email_messages" ADD CONSTRAINT "deleted_email_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."deletion_objects" ADD CONSTRAINT "deletion_objects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."deletion_objects" ADD CONSTRAINT "deletion_objects_workspace_intent_fk" FOREIGN KEY ("workspace_id","deletion_id") REFERENCES "app"."deletion_intents"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_cleanup_leases" ADD CONSTRAINT "document_cleanup_leases_object_id_deletion_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "app"."deletion_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deleted_email_messages_provider_idx" ON "app"."deleted_email_messages" USING btree ("workspace_id","provider","provider_account","provider_id");--> statement-breakpoint
CREATE INDEX "deletion_objects_pending_idx" ON "app"."deletion_objects" USING btree ("workspace_id","completed_at","available_at");--> statement-breakpoint
CREATE INDEX "document_cleanup_leases_expires_idx" ON "app"."document_cleanup_leases" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "deletion_intents_workspace_subject_idx" ON "app"."deletion_intents" USING btree ("workspace_id","subject_type","subject_id");--> statement-breakpoint
ALTER TABLE "app"."deletion_intents" ADD CONSTRAINT "deletion_intents_subject_type_check" CHECK ("app"."deletion_intents"."subject_type" in ('order', 'lead', 'region_waitlist'));--> statement-breakpoint
CREATE POLICY "deleted_email_messages_tenant_policy" ON "app"."deleted_email_messages" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."deleted_email_messages"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."deleted_email_messages"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "deletion_objects_tenant_policy" ON "app"."deletion_objects" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."deletion_objects"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."deletion_objects"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE app.deletion_objects FORCE ROW LEVEL SECURITY;
ALTER TABLE app.deleted_email_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE app.document_cleanup_leases FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON app.deletion_objects TO app_runtime;
GRANT UPDATE (completed_at) ON app.deletion_objects TO app_runtime;
GRANT SELECT, INSERT ON app.deleted_email_messages TO app_runtime;
GRANT UPDATE (provider_id) ON app.deleted_email_messages TO app_runtime;
REVOKE ALL ON app.document_cleanup_leases FROM app_runtime;
GRANT DELETE ON app.files, app.draft_grants, app.email_messages, app.email_provider_events,
  app.marketing_consents, app.follow_up_schedules, app.tracking_challenges, app.dispatch_records,
  app.region_waitlist TO app_runtime;
GRANT UPDATE (reason) ON app.order_status_history TO app_runtime;
GRANT UPDATE (method, payment_reference) ON app.payment_records TO app_runtime;
GRANT UPDATE (customer_data_restricted_at) ON app.region_waitlist TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION app.guard_deletion_object() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'completed_at') IS DISTINCT FROM (to_jsonb(OLD)-'completed_at')
   OR NEW.completed_at IS NULL OR OLD.completed_at IS NOT NULL THEN
   RAISE EXCEPTION 'deletion_object_identity_and_progress_immutable' USING ERRCODE='check_violation';
  END IF;
 ELSE
  IF NEW.completed_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM app.deletion_intents d WHERE d.workspace_id=NEW.workspace_id AND d.id=NEW.deletion_id AND d.status='acknowledged' AND d.ledger_ack_id IS NOT NULL AND d.completed_at IS NULL) THEN
   RAISE EXCEPTION 'cleanup_not_eligible' USING ERRCODE='check_violation';
  END IF;
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER deletion_object_progress BEFORE INSERT OR UPDATE ON app.deletion_objects FOR EACH ROW EXECUTE FUNCTION app.guard_deletion_object();
--> statement-breakpoint
CREATE FUNCTION app.has_acknowledged_customer_deletion(w uuid, o uuid, l uuid, r uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $f$
 SELECT EXISTS (SELECT 1 FROM app.deletion_intents d WHERE d.workspace_id = w
   AND d.status = 'acknowledged' AND d.ledger_ack_id IS NOT NULL AND
   ((d.subject_type = 'order' AND d.subject_id = o) OR d.related_lead_id = l
    OR (d.subject_type = 'lead' AND d.subject_id = l)
    OR (d.subject_type = 'region_waitlist' AND d.subject_id = r)));
$f$;
REVOKE ALL ON FUNCTION app.has_acknowledged_customer_deletion(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.has_acknowledged_customer_deletion(uuid,uuid,uuid,uuid) TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION app.guard_customer_erasure() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $f$
DECLARE d jsonb; w uuid; o uuid; l uuid; r uuid;
BEGIN
 d := to_jsonb(OLD); w := (d->>'workspace_id')::uuid;
 o := (d->>'order_id')::uuid; l := (d->>'lead_id')::uuid;
 IF TG_TABLE_NAME = 'files' THEN
   IF d->>'record_type' = 'order' THEN o := (d->>'record_id')::uuid; ELSE l := (d->>'record_id')::uuid; END IF;
 ELSIF TG_TABLE_NAME = 'region_waitlist' THEN r := (d->>'id')::uuid;
 ELSIF TG_TABLE_NAME = 'email_provider_events' THEN
   SELECT e.order_id, e.lead_id INTO o,l FROM app.email_messages e WHERE e.workspace_id=w AND e.message_id=(d->>'message_id')::uuid;
 END IF;
 IF NOT app.has_acknowledged_customer_deletion(w,o,l,r) THEN
   RAISE EXCEPTION 'customer_erasure_requires_acknowledgement' USING ERRCODE='check_violation';
 END IF;
 RETURN OLD;
END;
$f$;
CREATE TRIGGER files_customer_erasure BEFORE DELETE ON app.files FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER grants_customer_erasure BEFORE DELETE ON app.draft_grants FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER email_customer_erasure BEFORE DELETE ON app.email_messages FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER email_events_customer_erasure BEFORE DELETE ON app.email_provider_events FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER consent_customer_erasure BEFORE DELETE ON app.marketing_consents FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER followup_customer_erasure BEFORE DELETE ON app.follow_up_schedules FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER tracking_customer_erasure BEFORE DELETE ON app.tracking_challenges FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER dispatch_customer_erasure BEFORE DELETE ON app.dispatch_records FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
CREATE TRIGGER waitlist_customer_erasure BEFORE DELETE ON app.region_waitlist FOR EACH ROW EXECUTE FUNCTION app.guard_customer_erasure();
--> statement-breakpoint
CREATE FUNCTION app.guard_customer_redaction() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
BEGIN
 IF TG_TABLE_NAME='order_status_history' THEN
   IF (to_jsonb(NEW)-'reason') IS DISTINCT FROM (to_jsonb(OLD)-'reason') OR NEW.reason IS NOT NULL
      OR NOT app.has_acknowledged_customer_deletion(OLD.workspace_id,OLD.order_id,NULL,NULL) THEN
     RAISE EXCEPTION 'only_acknowledged_reason_erasure_allowed' USING ERRCODE='check_violation';
   END IF;
 ELSE
   IF (to_jsonb(NEW)-'method'-'payment_reference') IS DISTINCT FROM (to_jsonb(OLD)-'method'-'payment_reference')
      OR NEW.method IS NOT NULL OR NEW.payment_reference IS NOT NULL
      OR NOT app.has_acknowledged_customer_deletion(OLD.workspace_id,OLD.order_id,NULL,NULL) THEN
     RAISE EXCEPTION 'only_acknowledged_payment_reference_erasure_allowed' USING ERRCODE='check_violation';
   END IF;
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER history_customer_redaction BEFORE UPDATE ON app.order_status_history FOR EACH ROW EXECUTE FUNCTION app.guard_customer_redaction();
CREATE TRIGGER payments_customer_redaction BEFORE UPDATE ON app.payment_records FOR EACH ROW EXECUTE FUNCTION app.guard_customer_redaction();
--> statement-breakpoint
CREATE FUNCTION app.guard_restricted_lead() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
BEGIN
 IF OLD.customer_data_restricted_at IS NOT NULL THEN
   IF NEW.customer_data_restricted_at IS DISTINCT FROM OLD.customer_data_restricted_at
     OR (NEW.full_name IS DISTINCT FROM OLD.full_name AND NEW.full_name IS NOT NULL)
     OR (NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS NOT NULL)
     OR (NEW.phone IS DISTINCT FROM OLD.phone AND NEW.phone IS NOT NULL)
     OR (NEW.country_code IS DISTINCT FROM OLD.country_code AND NEW.country_code IS NOT NULL)
     OR (NEW.payload IS DISTINCT FROM OLD.payload AND NEW.payload IS NOT NULL)
     OR (NEW.attribution IS DISTINCT FROM OLD.attribution AND NEW.attribution IS DISTINCT FROM '{}'::jsonb)
     OR (NEW.partner_id IS DISTINCT FROM OLD.partner_id AND NEW.partner_id IS NOT NULL)
     OR (NEW.selected_offer_version_id IS DISTINCT FROM OLD.selected_offer_version_id AND NEW.selected_offer_version_id IS NOT NULL) THEN
     RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation';
   END IF;
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER leads_customer_restriction BEFORE UPDATE ON app.leads FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_lead();
--> statement-breakpoint
CREATE FUNCTION app.guard_restricted_waitlist() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
BEGIN
 IF OLD.customer_data_restricted_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN
   RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation';
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER waitlist_customer_restriction BEFORE UPDATE ON app.region_waitlist FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_waitlist();
--> statement-breakpoint
CREATE FUNCTION app.guard_restricted_order() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
BEGIN
 IF OLD.customer_data_restricted_at IS NOT NULL AND NEW.customer_data_restricted_at IS DISTINCT FROM OLD.customer_data_restricted_at THEN
   RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation';
 END IF;
 IF (NEW.payload IS DISTINCT FROM OLD.payload OR NEW.consent IS DISTINCT FROM OLD.consent)
   AND NOT app.has_acknowledged_customer_deletion(OLD.workspace_id,OLD.id,OLD.lead_id,NULL) THEN
   RAISE EXCEPTION 'customer_erasure_requires_acknowledgement' USING ERRCODE='check_violation';
 END IF;
 IF NEW.customer_data_deleted_at IS DISTINCT FROM OLD.customer_data_deleted_at THEN
   IF NEW.customer_data_deleted_at IS NULL OR OLD.customer_data_deleted_at IS NOT NULL
      OR NOT EXISTS (SELECT 1 FROM app.deletion_intents d WHERE d.workspace_id=OLD.workspace_id AND d.subject_type='order' AND d.subject_id=OLD.id AND d.completed_at IS NOT NULL) THEN
     RAISE EXCEPTION 'customer_cleanup_not_complete' USING ERRCODE='check_violation';
   END IF;
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER orders_customer_restriction BEFORE UPDATE ON app.orders FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_order();
--> statement-breakpoint
CREATE FUNCTION app.customer_parent_restricted(w uuid,o uuid,l uuid) RETURNS boolean
LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
DECLARE linked uuid; restricted timestamptz;
BEGIN
 IF o IS NOT NULL THEN
   SELECT lead_id INTO linked FROM app.orders WHERE workspace_id=w AND id=o;
   IF l IS NULL THEN l:=linked; END IF;
 END IF;
 IF l IS NOT NULL THEN
   SELECT customer_data_restricted_at INTO restricted FROM app.leads WHERE workspace_id=w AND id=l;
   IF restricted IS NOT NULL THEN RETURN true; END IF;
 END IF;
 IF o IS NOT NULL THEN
   SELECT customer_data_restricted_at INTO restricted FROM app.orders WHERE workspace_id=w AND id=o;
   IF restricted IS NOT NULL THEN RETURN true; END IF;
 END IF;
 RETURN false;
END;
$f$;
REVOKE ALL ON FUNCTION app.customer_parent_restricted(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.customer_parent_restricted(uuid,uuid,uuid) TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION app.guard_restricted_file() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
DECLARE o uuid; l uuid;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.record_type IS DISTINCT FROM OLD.record_type OR NEW.record_id IS DISTINCT FROM OLD.record_id) THEN
   RAISE EXCEPTION 'file_identity_immutable' USING ERRCODE='check_violation';
 END IF;
 IF NEW.record_type='order' THEN o:=NEW.record_id; ELSE l:=NEW.record_id; END IF;
 IF TG_OP='INSERT' THEN
   IF o IS NOT NULL THEN PERFORM id FROM app.orders WHERE workspace_id=NEW.workspace_id AND id=o FOR SHARE;
   ELSE PERFORM id FROM app.leads WHERE workspace_id=NEW.workspace_id AND id=l FOR SHARE; END IF;
 END IF;
 IF app.customer_parent_restricted(NEW.workspace_id,o,l) THEN
   IF TG_OP='INSERT' OR NEW.status<>'deleted' THEN RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation'; END IF;
   IF NEW.record_type IS DISTINCT FROM OLD.record_type OR NEW.record_id IS DISTINCT FROM OLD.record_id
      OR NEW.staging_key IS DISTINCT FROM OLD.staging_key OR NEW.candidate_key IS DISTINCT FROM OLD.candidate_key
      OR NEW.object_key IS DISTINCT FROM OLD.object_key OR NEW.bucket IS DISTINCT FROM OLD.bucket THEN
     RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation';
   END IF;
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER files_customer_restriction BEFORE INSERT OR UPDATE ON app.files FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_file();
--> statement-breakpoint
CREATE FUNCTION app.guard_restricted_child() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
DECLARE d jsonb; o uuid; l uuid; f app.files%ROWTYPE;
BEGIN
 d:=to_jsonb(NEW); o:=(d->>'order_id')::uuid; l:=(d->>'lead_id')::uuid;
 IF TG_TABLE_NAME IN ('file_revisions','file_review_events') THEN
   SELECT * INTO f FROM app.files WHERE workspace_id=NEW.workspace_id AND id=NEW.file_id FOR SHARE;
   IF f.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation'; END IF;
   IF f.record_type='order' THEN o:=f.record_id; ELSE l:=f.record_id; END IF;
 ELSE
   IF l IS NOT NULL THEN PERFORM id FROM app.leads WHERE workspace_id=NEW.workspace_id AND id=l FOR SHARE; END IF;
   IF o IS NOT NULL THEN PERFORM id FROM app.orders WHERE workspace_id=NEW.workspace_id AND id=o FOR SHARE; END IF;
 END IF;
 IF app.customer_parent_restricted(NEW.workspace_id,o,l) THEN RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation'; END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER notes_customer_restriction BEFORE INSERT ON app.order_notes FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER amendments_customer_restriction BEFORE INSERT ON app.order_amendments FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER changes_customer_restriction BEFORE INSERT ON app.order_change_requests FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER reminders_customer_restriction BEFORE INSERT ON app.order_reminders FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER revisions_customer_restriction BEFORE INSERT ON app.file_revisions FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER reviews_customer_restriction BEFORE INSERT ON app.file_review_events FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER messages_customer_restriction BEFORE INSERT ON app.email_messages FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER consents_customer_restriction BEFORE INSERT ON app.marketing_consents FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER followups_customer_restriction BEFORE INSERT ON app.follow_up_schedules FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
CREATE TRIGGER challenges_customer_restriction BEFORE INSERT ON app.tracking_challenges FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
--> statement-breakpoint
CREATE FUNCTION app.guard_restricted_job() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
DECLARE o uuid; l uuid;
BEGIN
 IF NEW.job_type IN ('deletion_ledger_publish','customer_data_cleanup','deletion_object_cleanup','suppression_ledger_publish') THEN RETURN NEW; END IF;
 IF NEW.payload->>'orderId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN o:=(NEW.payload->>'orderId')::uuid; END IF;
 IF NEW.payload->>'leadId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN l:=(NEW.payload->>'leadId')::uuid; END IF;
 IF l IS NOT NULL THEN PERFORM id FROM app.leads WHERE workspace_id=NEW.workspace_id AND id=l FOR SHARE; END IF;
 IF o IS NOT NULL THEN PERFORM id FROM app.orders WHERE workspace_id=NEW.workspace_id AND id=o FOR SHARE; END IF;
 IF app.customer_parent_restricted(NEW.workspace_id,o,l) THEN RAISE EXCEPTION 'customer_data_restricted' USING ERRCODE='check_violation'; END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER jobs_customer_restriction BEFORE INSERT ON app.outbox_jobs FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_job();
--> statement-breakpoint
CREATE FUNCTION app.guard_deletion_intent() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $f$
BEGIN
 IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.subject_type IS DISTINCT FROM OLD.subject_type
  OR NEW.subject_id IS DISTINCT FROM OLD.subject_id OR NEW.action IS DISTINCT FROM OLD.action
  OR NEW.actor_id IS DISTINCT FROM OLD.actor_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
  OR NEW.reason IS DISTINCT FROM OLD.reason OR (OLD.related_lead_id IS NOT NULL AND NEW.related_lead_id IS DISTINCT FROM OLD.related_lead_id)
  OR (OLD.ledger_ack_id IS NOT NULL AND (NEW.ledger_ack_id IS DISTINCT FROM OLD.ledger_ack_id OR NEW.status<>'acknowledged'))
  OR (OLD.local_cleaned_at IS NOT NULL AND NEW.local_cleaned_at IS DISTINCT FROM OLD.local_cleaned_at)
  OR (OLD.completed_at IS NOT NULL AND NEW.completed_at IS DISTINCT FROM OLD.completed_at) THEN
  RAISE EXCEPTION 'deletion_identity_and_progress_immutable' USING ERRCODE='check_violation';
 END IF;
 IF NEW.local_cleaned_at IS NOT NULL AND (NEW.status<>'acknowledged' OR NEW.ledger_ack_id IS NULL) THEN
  RAISE EXCEPTION 'customer_erasure_requires_acknowledgement' USING ERRCODE='check_violation';
 END IF;
 IF NEW.completed_at IS NOT NULL AND (NEW.local_cleaned_at IS NULL OR EXISTS(SELECT 1 FROM app.deletion_objects x WHERE x.workspace_id=NEW.workspace_id AND x.deletion_id=NEW.id AND x.completed_at IS NULL)) THEN
  RAISE EXCEPTION 'customer_cleanup_not_complete' USING ERRCODE='check_violation';
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER deletion_intent_progress BEFORE UPDATE ON app.deletion_intents FOR EACH ROW EXECUTE FUNCTION app.guard_deletion_intent();
--> statement-breakpoint
CREATE FUNCTION app.try_document_cleanup_lease(w uuid, object_id uuid, owner_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE blocked_until timestamptz; eligible_at timestamptz; acquired uuid;
BEGIN
 IF w IS DISTINCT FROM nullif(pg_catalog.current_setting('app.workspace_id',true),'')::uuid
    OR nullif(pg_catalog.current_setting('app.actor_id',true),'')::uuid IS NULL THEN
  RAISE EXCEPTION 'cleanup_context_missing' USING ERRCODE='insufficient_privilege';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(745284915);
 SELECT x.available_at INTO eligible_at FROM app.deletion_objects x JOIN app.deletion_intents d ON d.workspace_id=x.workspace_id AND d.id=x.deletion_id
  WHERE x.workspace_id=w AND x.id=object_id AND x.completed_at IS NULL AND d.status='acknowledged' AND d.ledger_ack_id IS NOT NULL AND d.local_cleaned_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'cleanup_not_eligible' USING ERRCODE='check_violation'; END IF;
 IF eligible_at>pg_catalog.clock_timestamp() THEN RETURN eligible_at; END IF;
 SELECT max(expires_at) INTO blocked_until FROM app.backup_leases WHERE expires_at>pg_catalog.clock_timestamp();
 IF blocked_until IS NOT NULL THEN RETURN blocked_until + interval '1 second'; END IF;
 INSERT INTO app.document_cleanup_leases AS leases(object_id,workspace_id,lease_owner_id,expires_at)
 VALUES(object_id,w,owner_id,pg_catalog.clock_timestamp()+interval '45 seconds')
 ON CONFLICT ON CONSTRAINT document_cleanup_leases_pkey DO UPDATE SET lease_owner_id=EXCLUDED.lease_owner_id,expires_at=EXCLUDED.expires_at
  WHERE leases.workspace_id=w AND leases.expires_at<=pg_catalog.clock_timestamp()
 RETURNING leases.object_id INTO acquired;
 IF acquired IS NULL THEN SELECT expires_at+interval '1 second' INTO blocked_until FROM app.document_cleanup_leases WHERE document_cleanup_leases.object_id=try_document_cleanup_lease.object_id; RETURN blocked_until; END IF;
 RETURN NULL;
END;
$f$;
REVOKE ALL ON FUNCTION app.try_document_cleanup_lease(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.try_document_cleanup_lease(uuid,uuid,uuid) TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION app.release_document_cleanup_lease(w uuid, object_id uuid, owner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF w IS DISTINCT FROM nullif(pg_catalog.current_setting('app.workspace_id',true),'')::uuid OR nullif(pg_catalog.current_setting('app.actor_id',true),'')::uuid IS NULL THEN
  RAISE EXCEPTION 'cleanup_context_missing' USING ERRCODE='insufficient_privilege';
 END IF;
 DELETE FROM app.document_cleanup_leases x WHERE x.workspace_id=w AND x.object_id=release_document_cleanup_lease.object_id AND x.lease_owner_id=owner_id;
END;
$f$;
REVOKE ALL ON FUNCTION app.release_document_cleanup_lease(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.release_document_cleanup_lease(uuid,uuid,uuid) TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION app.document_cleanup_lease_owned(w uuid, object_id uuid, owner_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $f$
 SELECT w=nullif(pg_catalog.current_setting('app.workspace_id',true),'')::uuid
  AND nullif(pg_catalog.current_setting('app.actor_id',true),'')::uuid IS NOT NULL
  AND EXISTS(SELECT 1 FROM app.document_cleanup_leases x WHERE x.workspace_id=w AND x.object_id=document_cleanup_lease_owned.object_id AND x.lease_owner_id=owner_id AND x.expires_at>pg_catalog.clock_timestamp());
$f$;
REVOKE ALL ON FUNCTION app.document_cleanup_lease_owned(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.document_cleanup_lease_owned(uuid,uuid,uuid) TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION app.guard_backup_cleanup_overlap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(745284915);
 IF EXISTS(SELECT 1 FROM app.document_cleanup_leases WHERE expires_at>pg_catalog.clock_timestamp()) THEN
  RAISE EXCEPTION 'document_cleanup_active' USING ERRCODE='lock_not_available';
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER backup_cleanup_overlap BEFORE INSERT OR UPDATE ON app.backup_leases FOR EACH ROW EXECUTE FUNCTION app.guard_backup_cleanup_overlap();
--> statement-breakpoint
-- Older installations may contain partially erased intents. Restrict their
-- surviving copies immediately and enqueue the same durable cleanup stage.
UPDATE app.deletion_intents d SET related_lead_id=o.lead_id FROM app.orders o
 WHERE d.workspace_id=o.workspace_id AND d.subject_type='order' AND d.subject_id=o.id AND d.related_lead_id IS NULL;
UPDATE app.orders o SET customer_data_restricted_at=d.created_at FROM app.deletion_intents d
 WHERE o.workspace_id=d.workspace_id AND d.subject_type='order' AND d.subject_id=o.id AND o.customer_data_restricted_at IS NULL;
UPDATE app.leads l SET customer_data_restricted_at=d.created_at FROM app.deletion_intents d
 WHERE l.workspace_id=d.workspace_id AND l.id=d.related_lead_id AND l.customer_data_restricted_at IS NULL;
UPDATE app.draft_grants g SET revoked_at=now() WHERE revoked_at IS NULL AND EXISTS(SELECT 1 FROM app.leads l WHERE l.workspace_id=g.workspace_id AND l.id=g.lead_id AND l.customer_data_restricted_at IS NOT NULL);
UPDATE app.files f SET status='deleted',deleted_at=coalesce(f.deleted_at,now()) WHERE EXISTS(SELECT 1 FROM app.deletion_intents d WHERE d.workspace_id=f.workspace_id AND ((f.record_type='order' AND d.subject_type='order' AND d.subject_id=f.record_id) OR (f.record_type='lead' AND d.related_lead_id=f.record_id)));
UPDATE app.tracking_challenges c SET status='consumed',consumed_at=now() WHERE status='pending' AND EXISTS(SELECT 1 FROM app.orders o WHERE o.workspace_id=c.workspace_id AND o.id=c.order_id AND o.customer_data_restricted_at IS NOT NULL);
UPDATE app.follow_up_schedules f SET status='cancelled',cancelled_reason='customer_deletion',updated_at=now() WHERE status='scheduled' AND (EXISTS(SELECT 1 FROM app.leads l WHERE l.workspace_id=f.workspace_id AND l.id=f.lead_id AND l.customer_data_restricted_at IS NOT NULL) OR EXISTS(SELECT 1 FROM app.orders o WHERE o.workspace_id=f.workspace_id AND o.id=f.order_id AND o.customer_data_restricted_at IS NOT NULL));
INSERT INTO app.outbox_jobs(workspace_id,job_type,dedupe_key,payload)
 SELECT workspace_id,'customer_data_cleanup',id::text,jsonb_build_object('deletionId',id) FROM app.deletion_intents WHERE status='acknowledged' AND ledger_ack_id IS NOT NULL
 ON CONFLICT(workspace_id,job_type,dedupe_key) DO NOTHING;
