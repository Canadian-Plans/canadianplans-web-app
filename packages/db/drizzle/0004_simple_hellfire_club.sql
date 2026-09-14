CREATE TABLE "app"."rate_limit_buckets" (
	"bucket_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_buckets_bucket_key_window_start_pk" PRIMARY KEY("bucket_key","window_start")
);
--> statement-breakpoint
ALTER TABLE "app"."rate_limit_buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "app"."rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "app"."service_credentials" ADD CONSTRAINT "service_credentials_secret_hash_unique" UNIQUE("secret_hash");--> statement-breakpoint
ALTER TABLE "app"."rate_limit_buckets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "app"."rate_limit_buckets" FROM app_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."resolve_website_credential"(
  p_secret_hash text
)
RETURNS TABLE (
  workspace_id uuid,
  scopes text[],
  revoked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    credential.workspace_id,
    credential.scopes,
    credential.revoked_at IS NOT NULL
  FROM app.service_credentials AS credential
  WHERE credential.secret_hash = p_secret_hash
  LIMIT 1;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."rate_limit_hit"(
  p_bucket_key text,
  p_window_seconds integer,
  p_max_count integer
)
RETURNS TABLE (
  allowed boolean,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_count integer;
BEGIN
  IF p_window_seconds <= 0
     OR p_max_count <= 0
     OR nullif(pg_catalog.btrim(p_bucket_key), '') IS NULL THEN
    RAISE EXCEPTION 'invalid rate limit parameters' USING ERRCODE = '22023';
  END IF;

  -- Fail fast on a contended single-key row rather than holding a serverless
  -- connection open; different keys touch different rows, so there is no
  -- global hot counter to serialize on.
  SET LOCAL lock_timeout = '75ms';

  v_window_start := pg_catalog.to_timestamp(
    pg_catalog.floor(
      pg_catalog.extract(epoch FROM v_now) / p_window_seconds
    ) * p_window_seconds
  );
  v_window_end := v_window_start + pg_catalog.make_interval(secs => p_window_seconds);

  -- Opportunistic, bounded expiry cleanup; never a full-table sweep.
  DELETE FROM app.rate_limit_buckets AS bucket
  WHERE bucket.ctid IN (
    SELECT expired.ctid
    FROM app.rate_limit_buckets AS expired
    WHERE expired.expires_at < v_now
    LIMIT 50
  );

  INSERT INTO app.rate_limit_buckets AS bucket (
    bucket_key, window_start, request_count, expires_at
  )
  VALUES (p_bucket_key, v_window_start, 1, v_window_end)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET request_count = bucket.request_count + 1
  RETURNING bucket.request_count INTO v_count;

  RETURN QUERY
  SELECT
    v_count <= p_max_count,
    CASE
      WHEN v_count <= p_max_count THEN 0
      ELSE pg_catalog.greatest(
        1,
        pg_catalog.ceil(pg_catalog.extract(epoch FROM (v_window_end - v_now)))::integer
      )
    END;
END;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."resolve_website_credential"(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."rate_limit_hit"(text, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."resolve_website_credential"(text) TO app_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."rate_limit_hit"(text, integer, integer) TO app_runtime;