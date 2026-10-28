-- Migration 0029 deleted every personal lead view in a workspace whenever any
-- lead became restricted. The daily abandoned-draft prune restricts leads with
-- the same column, so staff views were wiped routinely. Restriction now only
-- clears the lead's custom answers. The audited customer-deletion workflow calls
-- app.scrub_lead_view_filters instead, which removes free-text filter values
-- (the only place a customer's data can be typed into a view) from every view in
-- that workspace while keeping the views, their columns, sort and other filters.
DROP TRIGGER IF EXISTS clear_lead_views_on_restriction ON app.leads;
DROP FUNCTION IF EXISTS app.clear_lead_views_on_restriction();
--> statement-breakpoint
CREATE FUNCTION app.clear_lead_custom_values_on_restriction() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 IF NEW.customer_data_restricted_at IS NOT NULL THEN NEW.custom_values := '{}'::jsonb; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.clear_lead_custom_values_on_restriction() FROM PUBLIC;
CREATE TRIGGER clear_lead_custom_values_on_restriction BEFORE UPDATE ON app.leads
 FOR EACH ROW WHEN (NEW.customer_data_restricted_at IS NOT NULL AND NEW.custom_values <> '{}'::jsonb)
 EXECUTE FUNCTION app.clear_lead_custom_values_on_restriction();
--> statement-breakpoint
-- Called only by the customer-deletion workflow under tenant context. The
-- workspace argument must match the transaction's context (0023 pattern). Views
-- belong to other actors, so this runs as the definer; it never returns a filter.
CREATE FUNCTION app.scrub_lead_view_filters(w uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE changed integer;
BEGIN
 IF w IS DISTINCT FROM nullif(current_setting('app.workspace_id', true), '')::uuid
    OR nullif(current_setting('app.actor_id', true), '')::uuid IS NULL THEN
   RAISE EXCEPTION 'scrub_context_missing' USING ERRCODE = 'insufficient_privilege';
 END IF;
 UPDATE app.lead_views v
 SET state = s.state, version = v.version + 1, updated_at = now()
 FROM (
   SELECT x.id, jsonb_set(x.state, '{filters}', coalesce((
     SELECT jsonb_agg(f.value) FROM jsonb_array_elements(x.state->'filters') f
     WHERE NOT (jsonb_typeof(f.value->'value') = 'string'
       AND coalesce((SELECT lf.type FROM app.lead_fields lf
                     WHERE lf.workspace_id = x.workspace_id AND lf.key = f.value->>'key'), 'text')
           IN ('text', 'long_text', 'phone', 'email', 'address', 'links'))
   ), '[]'::jsonb)) AS state
   FROM app.lead_views x WHERE x.workspace_id = w
 ) s
 WHERE v.id = s.id AND v.workspace_id = w AND v.state <> s.state;
 GET DIAGNOSTICS changed = ROW_COUNT;
 RETURN changed;
END $$;
REVOKE ALL ON FUNCTION app.scrub_lead_view_filters(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.scrub_lead_view_filters(uuid) TO app_runtime;
