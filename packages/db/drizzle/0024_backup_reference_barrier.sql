-- Keep document reference metadata stable from database dump through R2 copy.
-- This is the same gate used by backup acquisition and physical object cleanup.
-- Call before row locks and hold it through the local erasure transaction.
CREATE FUNCTION app.customer_cleanup_backup_barrier(w uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE blocked_until timestamptz;
BEGIN
 IF w IS NULL OR w IS DISTINCT FROM nullif(pg_catalog.current_setting('app.workspace_id',true),'')::uuid
    OR nullif(pg_catalog.current_setting('app.actor_id',true),'')::uuid IS NULL THEN
  RAISE EXCEPTION 'cleanup_context_missing' USING ERRCODE='insufficient_privilege';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(745284915);
 SELECT max(expires_at) INTO blocked_until FROM app.backup_leases
  WHERE expires_at>pg_catalog.clock_timestamp();
 IF blocked_until IS NOT NULL THEN RETURN blocked_until + interval '1 second'; END IF;
 RETURN NULL;
END;
$f$;
REVOKE ALL ON FUNCTION app.customer_cleanup_backup_barrier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.customer_cleanup_backup_barrier(uuid) TO app_runtime;
