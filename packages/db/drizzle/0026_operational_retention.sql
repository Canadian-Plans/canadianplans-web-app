-- REL-19: bounded pruning of operational rows, owner-approved windows (22 Oct 2026,
-- docs/OPEN_INPUTS.md). The runtime role gets EXECUTE on this one function and no
-- DELETE grant on the tables. Orders, leads, audit events, commission tables and
-- idempotency keys are never touched. Each table loses at most 1000 rows per call.
--
-- tracking_challenges and email_provider_events carry guard_customer_erasure,
-- which refuses deletes unless a customer deletion was acknowledged. Age-based
-- operational pruning is not a customer erasure, so the guard lets a delete
-- through only while app.operational_prune is on AND the current role is not
-- app_runtime. The flag is set only inside prune_operational_rows, a SECURITY
-- DEFINER function, so its triggers run as the function owner. The runtime
-- role setting the flag itself still gets refused. The rest of the guard is
-- unchanged from migration 0023.
CREATE OR REPLACE FUNCTION app.guard_customer_erasure() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, app AS $f$
DECLARE d jsonb; w uuid; o uuid; l uuid; r uuid;
BEGIN
 IF pg_catalog.current_setting('app.operational_prune', true) = 'on' AND current_user <> 'app_runtime' THEN
   RETURN OLD;
 END IF;
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
$f$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.prune_operational_rows(p_workspace_id uuid, p_now timestamptz)
RETURNS TABLE(table_name text, deleted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
	n integer;
BEGIN
	-- Only the workspace of the caller's own tenant transaction.
	IF p_workspace_id IS DISTINCT FROM nullif(pg_catalog.current_setting('app.workspace_id', true), '')::uuid THEN
		RAISE EXCEPTION 'workspace_context_mismatch' USING ERRCODE = 'insufficient_privilege';
	END IF;
	-- Transaction-local; see guard_customer_erasure above. Switched off again below.
	PERFORM pg_catalog.set_config('app.operational_prune', 'on', true);

	-- Completed jobs after 30 days (their alerts go with them by cascade).
	DELETE FROM app.outbox_jobs j WHERE j.ctid IN (
		SELECT x.ctid FROM app.outbox_jobs x
		WHERE x.workspace_id = p_workspace_id AND x.status = 'completed'
			AND coalesce(x.completed_at, x.updated_at) < p_now - interval '30 days'
		LIMIT 1000);
	GET DIAGNOSTICS n = ROW_COUNT;
	table_name := 'outbox_jobs'; deleted := n; RETURN NEXT;

	-- Resolved alerts after 30 days.
	DELETE FROM app.outbox_job_alerts a WHERE a.ctid IN (
		SELECT x.ctid FROM app.outbox_job_alerts x
		WHERE x.workspace_id = p_workspace_id AND x.resolved_at < p_now - interval '30 days'
		LIMIT 1000);
	GET DIAGNOSTICS n = ROW_COUNT;
	table_name := 'outbox_job_alerts'; deleted := n; RETURN NEXT;

	-- Used or expired tracking codes after 7 days.
	DELETE FROM app.tracking_challenges c WHERE c.ctid IN (
		SELECT x.ctid FROM app.tracking_challenges x
		WHERE x.workspace_id = p_workspace_id
			AND (x.expires_at < p_now - interval '7 days'
				OR (x.status = 'consumed' AND x.consumed_at < p_now - interval '7 days'))
		LIMIT 1000);
	GET DIAGNOSTICS n = ROW_COUNT;
	table_name := 'tracking_challenges'; deleted := n; RETURN NEXT;

	-- Quotes never used for an order, 90 days after they expired.
	DELETE FROM app.quotes q WHERE q.ctid IN (
		SELECT x.ctid FROM app.quotes x
		WHERE x.workspace_id = p_workspace_id AND x.consumed_at IS NULL
			AND x.expires_at < p_now - interval '90 days'
		LIMIT 1000);
	GET DIAGNOSTICS n = ROW_COUNT;
	table_name := 'quotes'; deleted := n; RETURN NEXT;

	-- Finished CMS webhook events after 90 days.
	DELETE FROM app.catalogue_sync_events e WHERE e.ctid IN (
		SELECT x.ctid FROM app.catalogue_sync_events x
		WHERE x.workspace_id = p_workspace_id AND x.status IN ('completed', 'ignored')
			AND coalesce(x.processed_at, x.updated_at) < p_now - interval '90 days'
		LIMIT 1000);
	GET DIAGNOSTICS n = ROW_COUNT;
	table_name := 'catalogue_sync_events'; deleted := n; RETURN NEXT;

	-- Applied email provider events after 180 days.
	DELETE FROM app.email_provider_events p WHERE p.ctid IN (
		SELECT x.ctid FROM app.email_provider_events x
		WHERE x.workspace_id = p_workspace_id AND x.applied_at < p_now - interval '180 days'
		LIMIT 1000);
	GET DIAGNOSTICS n = ROW_COUNT;
	table_name := 'email_provider_events'; deleted := n; RETURN NEXT;

	PERFORM pg_catalog.set_config('app.operational_prune', 'off', true);
END;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION app.prune_operational_rows(uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.prune_operational_rows(uuid, timestamptz) TO app_runtime;
