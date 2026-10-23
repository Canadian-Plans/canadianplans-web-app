-- REL-19: bounded pruning of operational rows, owner-approved windows (22 Oct 2026,
-- docs/OPEN_INPUTS.md). The runtime role gets EXECUTE on this one function and no
-- DELETE grant on the tables. Orders, leads, audit events, commission tables and
-- idempotency keys are never touched. Each table loses at most 1000 rows per call.
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
END;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION app.prune_operational_rows(uuid, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.prune_operational_rows(uuid, timestamptz) TO app_runtime;
