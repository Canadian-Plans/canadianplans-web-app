SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TYPE "app"."permission_name" ADD VALUE 'manage_data_model';--> statement-breakpoint
CREATE TABLE "app"."lead_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"type" text NOT NULL,
	"origin" text NOT NULL,
	"config" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "lead_fields_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "lead_fields_workspace_key_unique" UNIQUE("workspace_id","key"),
	CONSTRAINT "lead_fields_origin_check" CHECK ("app"."lead_fields"."origin" in ('builtin', 'custom')),
	CONSTRAINT "lead_fields_config_check" CHECK (jsonb_typeof("app"."lead_fields"."config") = 'object')
);
--> statement-breakpoint
ALTER TABLE "app"."lead_fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."lead_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_type" text NOT NULL,
	"layout" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "lead_layouts_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "lead_layouts_workspace_type_unique" UNIQUE("workspace_id","lead_type"),
	CONSTRAINT "lead_layouts_type_check" CHECK ("app"."lead_layouts"."lead_type" in ('sim', 'mobile', 'internet', 'legacy'))
);
--> statement-breakpoint
ALTER TABLE "app"."lead_layouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."lead_object_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "lead_object_settings_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "lead_object_settings_workspace_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "app"."lead_object_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."lead_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_views_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "lead_views_name_check" CHECK (char_length("app"."lead_views"."name") between 1 and 60)
);
--> statement-breakpoint
ALTER TABLE "app"."lead_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "lead_type" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "custom_values" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "field_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."lead_fields" ADD CONSTRAINT "lead_fields_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."lead_layouts" ADD CONSTRAINT "lead_layouts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."lead_object_settings" ADD CONSTRAINT "lead_object_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."lead_views" ADD CONSTRAINT "lead_views_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."lead_views" ADD CONSTRAINT "lead_views_workspace_actor_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "app"."memberships"("workspace_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_views_owner_name_unique" ON "app"."lead_views" USING btree ("workspace_id","actor_id",lower("name"));--> statement-breakpoint
CREATE INDEX "leads_workspace_type_idx" ON "app"."leads" USING btree ("workspace_id","lead_type");--> statement-breakpoint
ALTER TABLE "app"."leads" ADD CONSTRAINT "leads_type_check" CHECK ("app"."leads"."lead_type" in ('sim', 'mobile', 'internet', 'legacy'));--> statement-breakpoint
ALTER TABLE "app"."leads" ADD CONSTRAINT "leads_custom_values_check" CHECK (jsonb_typeof("app"."leads"."custom_values") = 'object');--> statement-breakpoint
CREATE POLICY "lead_fields_tenant_policy" ON "app"."lead_fields" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."lead_fields"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."lead_fields"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "lead_layouts_tenant_policy" ON "app"."lead_layouts" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."lead_layouts"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."lead_layouts"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "lead_object_settings_tenant_policy" ON "app"."lead_object_settings" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."lead_object_settings"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."lead_object_settings"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "lead_views_owner_policy" ON "app"."lead_views" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."lead_views"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid and "app"."lead_views"."actor_id" = nullif(current_setting('app.actor_id', true), '')::uuid) WITH CHECK ("app"."lead_views"."workspace_id" = nullif(current_setting('app.workspace_id', true), '')::uuid and "app"."lead_views"."actor_id" = nullif(current_setting('app.actor_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE app.lead_fields FORCE ROW LEVEL SECURITY;
ALTER TABLE app.lead_layouts FORCE ROW LEVEL SECURITY;
ALTER TABLE app.lead_object_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE app.lead_views FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON app.lead_fields TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.lead_layouts, app.lead_object_settings, app.lead_views TO app_runtime;
--> statement-breakpoint
-- No caller can reclaim a deleted key, change its meaning or delete a built-in.
CREATE FUNCTION app.guard_lead_field_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id OR OLD.key <> NEW.key OR OLD.type <> NEW.type OR OLD.origin <> NEW.origin
    OR (OLD.origin = 'builtin' AND NEW.deleted_at IS NOT NULL)
    OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
    RAISE EXCEPTION 'immutable_lead_field';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.guard_lead_field_identity() FROM PUBLIC;
CREATE TRIGGER guard_lead_field_identity BEFORE UPDATE ON app.lead_fields FOR EACH ROW EXECUTE FUNCTION app.guard_lead_field_identity();
--> statement-breakpoint
-- Old backends still write the versioned payload without a type. No customer
-- answer is rewritten. A code-only legacy type avoids inventing a classification.
CREATE FUNCTION app.infer_stored_lead_type(payload jsonb, offer_type text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
 SELECT CASE
 WHEN payload->'payload'->>'category' IN ('sim','mobile','internet') THEN payload->'payload'->>'category'
 WHEN offer_type IN ('sim','mobile','internet') THEN offer_type
 WHEN payload->'payload' ?| ARRAY['currentCountry','destination','arrivalDate'] THEN 'sim'
 ELSE 'legacy' END
$$;
REVOKE ALL ON FUNCTION app.infer_stored_lead_type(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.infer_stored_lead_type(jsonb,text) TO app_runtime;
CREATE FUNCTION app.maintain_lead_field_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE offer_type text;
BEGIN
  IF NEW.lead_type = 'legacy' THEN
    SELECT content->>'productType' INTO offer_type FROM app.offer_versions
      WHERE workspace_id = NEW.workspace_id AND id = NEW.selected_offer_version_id;
    NEW.lead_type := app.infer_stored_lead_type(NEW.payload, offer_type);
  END IF;
  IF TG_OP = 'UPDATE' THEN NEW.field_version := OLD.field_version + 1; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.maintain_lead_field_version() FROM PUBLIC;
CREATE TRIGGER maintain_lead_field_version BEFORE INSERT OR UPDATE ON app.leads FOR EACH ROW EXECUTE FUNCTION app.maintain_lead_field_version();
--> statement-breakpoint
-- This migration is for the launch-sized dataset. Fail before a large rewrite;
-- a larger installation needs a separately reviewed batched backfill release.
DO $$ BEGIN
 IF (SELECT count(*) FROM app.leads) > 100000 THEN
   RAISE EXCEPTION 'lead_backfill_requires_batched_release';
 END IF;
END $$;
UPDATE app.leads l SET lead_type = app.infer_stored_lead_type(l.payload,
 (SELECT o.content->>'productType' FROM app.offer_versions o WHERE o.workspace_id=l.workspace_id AND o.id=l.selected_offer_version_id))
 WHERE app.infer_stored_lead_type(l.payload,
 (SELECT o.content->>'productType' FROM app.offer_versions o WHERE o.workspace_id=l.workspace_id AND o.id=l.selected_offer_version_id)) <> 'legacy';
--> statement-breakpoint
-- Guard every scalar cast. Invalid historical JSON never causes a search error.
CREATE FUNCTION app.lead_safe_scalar(value jsonb, kind text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE v text; d date; t timestamptz; n numeric;
BEGIN
 IF value IS NULL OR value = 'null'::jsonb THEN RETURN NULL; END IF;
 v := value #>> '{}';
 IF kind = 'number' THEN
   IF jsonb_typeof(value) <> 'number' THEN RETURN NULL; END IF;
   n := v::numeric;
   IF abs(n) > 1000000000000 THEN RETURN NULL; END IF;
   RETURN v;
 ELSIF kind = 'boolean' THEN
   IF jsonb_typeof(value) <> 'boolean' THEN RETURN NULL; END IF;
   RETURN v;
 END IF;
 IF jsonb_typeof(value) <> 'string' OR length(btrim(v)) = 0 THEN RETURN NULL; END IF;
 IF kind = 'date' THEN
   IF v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RETURN NULL; END IF;
   d := v::date;
 ELSIF kind = 'datetime' THEN
   IF v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$' THEN RETURN NULL; END IF;
   t := v::timestamptz;
 ELSIF kind = 'text' AND length(v) > 500 THEN RETURN NULL;
 ELSIF kind = 'long_text' AND length(v) > 10000 THEN RETURN NULL;
 END IF;
 RETURN v;
EXCEPTION WHEN data_exception THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION app.lead_safe_scalar(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.lead_safe_scalar(jsonb,text) TO app_runtime;
--> statement-breakpoint
-- Narrow trigger-only erasure: private filters may refer to the customer being
-- restricted. Clear all workspace lead views without exposing another actor's
-- filters. This function accepts no caller-controlled workspace/actor argument.
CREATE FUNCTION app.clear_lead_views_on_restriction() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
 IF NEW.customer_data_restricted_at IS NOT NULL THEN
   NEW.custom_values := '{}'::jsonb;
   DELETE FROM app.lead_views WHERE workspace_id = NEW.workspace_id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.clear_lead_views_on_restriction() FROM PUBLIC;
CREATE TRIGGER clear_lead_views_on_restriction BEFORE UPDATE ON app.leads
 FOR EACH ROW WHEN (NEW.customer_data_restricted_at IS NOT NULL AND (OLD.customer_data_restricted_at IS NULL OR NEW.custom_values <> '{}'::jsonb))
 EXECUTE FUNCTION app.clear_lead_views_on_restriction();

--> statement-breakpoint
-- Snapshot of the code-owned built-ins at release; new workspaces initialize from code.
INSERT INTO app.lead_fields(workspace_id,key,type,origin,config)
SELECT w.id, f->>'key', f->>'type', 'builtin', jsonb_build_object('label',f->'label','active',f->'active','options',f->'options')
FROM app.workspaces w CROSS JOIN jsonb_array_elements('[{"key":"leadType","type":"select","label":"Lead type","options":[{"value":"sim","label":"Pre-arrival SIM","colour":"gray","hidden":false},{"value":"mobile","label":"Mobile","colour":"gray","hidden":false},{"value":"internet","label":"Internet","colour":"gray","hidden":false},{"value":"legacy","label":"Legacy lead","colour":"gray","hidden":false}],"active":true},{"key":"fullName","type":"text","label":"Full name","options":[],"active":true},{"key":"email","type":"email","label":"Email","options":[],"active":true},{"key":"phone","type":"phone","label":"Phone","options":[],"active":true},{"key":"countryCode","type":"text","label":"Country code","options":[],"active":true},{"key":"status","type":"select","label":"Status","options":[{"value":"incomplete","label":"incomplete","colour":"gray","hidden":false},{"value":"submitted","label":"submitted","colour":"gray","hidden":false}],"active":true},{"key":"createdAt","type":"datetime","label":"Created","options":[],"active":true},{"key":"updatedAt","type":"datetime","label":"Updated","options":[],"active":true},{"key":"partnerId","type":"text","label":"Partner reference","options":[],"active":true},{"key":"selectedOfferVersionId","type":"text","label":"Selected offer reference","options":[],"active":true},{"key":"consentVersion","type":"text","label":"Consent version","options":[],"active":true},{"key":"source","type":"text","label":"Source","options":[],"active":true},{"key":"utmSource","type":"text","label":"UTM source","options":[],"active":true},{"key":"utmMedium","type":"text","label":"UTM medium","options":[],"active":true},{"key":"utmCampaign","type":"text","label":"UTM campaign","options":[],"active":true},{"key":"utmTerm","type":"text","label":"UTM term","options":[],"active":true},{"key":"utmContent","type":"text","label":"UTM content","options":[],"active":true},{"key":"partnerCode","type":"text","label":"Partner code","options":[],"active":true},{"key":"landingPath","type":"long_text","label":"Landing path","options":[],"active":true},{"key":"referrerHost","type":"text","label":"Referrer host","options":[],"active":true},{"key":"partnerCodeMatched","type":"boolean","label":"Partner code matched","options":[],"active":true},{"key":"currentCountry","type":"text","label":"Current country","options":[],"active":true},{"key":"destination","type":"text","label":"Destination","options":[],"active":true},{"key":"arrivalDate","type":"date","label":"Arrival date","options":[],"active":true},{"key":"province","type":"text","label":"Province","options":[],"active":true},{"key":"dateOfBirth","type":"date","label":"Date of birth","options":[],"active":true},{"key":"address","type":"address","label":"Address","options":[],"active":true},{"key":"currentProvider","type":"text","label":"Current provider","options":[],"active":true},{"key":"preferredInstallationTime","type":"text","label":"Preferred installation time","options":[],"active":true},{"key":"lines","type":"number","label":"Lines","options":[],"active":true},{"key":"keepNumber","type":"boolean","label":"Keep number","options":[],"active":true},{"key":"simType","type":"select","label":"SIM type","options":[{"value":"esim","label":"esim","colour":"gray","hidden":false},{"value":"physical","label":"physical","colour":"gray","hidden":false}],"active":true},{"key":"category","type":"select","label":"Form category","options":[{"value":"sim","label":"sim","colour":"gray","hidden":false},{"value":"mobile","label":"mobile","colour":"gray","hidden":false},{"value":"internet","label":"internet","colour":"gray","hidden":false}],"active":true},{"key":"documents","type":"long_text","label":"Documents acknowledgement","options":[],"active":true},{"key":"creditCheck","type":"long_text","label":"Credit check consent","options":[],"active":true},{"key":"callbackRequested","type":"boolean","label":"Callback requested","options":[],"active":true}]'::jsonb) f
ON CONFLICT (workspace_id,key) DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION app.lead_valid_value(v jsonb, kind text, options jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE item jsonb; k text; s text; size integer;
BEGIN
 IF v IS NULL OR v = 'null'::jsonb THEN RETURN false; END IF;
 IF kind IN ('text','long_text','number','boolean','date','datetime','select') THEN
   IF app.lead_safe_scalar(v, kind) IS NULL THEN RETURN false; END IF;
   RETURN kind <> 'select' OR options @> jsonb_build_array(v);
 ELSIF kind = 'multi_select' THEN
   IF jsonb_typeof(v) <> 'array' OR jsonb_array_length(v) NOT BETWEEN 1 AND 50 THEN RETURN false; END IF;
   IF (SELECT count(DISTINCT x) FROM jsonb_array_elements(v) x) <> jsonb_array_length(v) THEN RETURN false; END IF;
   FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
     IF jsonb_typeof(item) <> 'string' OR NOT options @> jsonb_build_array(item) THEN RETURN false; END IF;
   END LOOP;
   RETURN true;
 ELSIF kind = 'links' THEN
   IF jsonb_typeof(v) <> 'array' OR jsonb_array_length(v) NOT BETWEEN 1 AND 10 THEN RETURN false; END IF;
   FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
     IF jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'url') IS DISTINCT FROM 'string' OR length(item->>'url') > 2048 OR item->>'url' !~ '^https?://[^[:space:]/]+' THEN RETURN false; END IF;
     IF item ? 'label' AND (jsonb_typeof(item->'label') <> 'string' OR length(btrim(item->>'label')) NOT BETWEEN 1 AND 80) THEN RETURN false; END IF;
     IF EXISTS(SELECT 1 FROM jsonb_object_keys(item) AS keys(value) WHERE keys.value NOT IN ('url','label')) THEN RETURN false; END IF;
   END LOOP;
   RETURN true;
 END IF;
 IF jsonb_typeof(v) <> 'object' THEN RETURN false; END IF;
 IF kind = 'phone' THEN
   RETURN jsonb_typeof(v->'number') = 'string' AND v->>'number' ~ '^\+?[0-9 ()-]{5,32}$'
     AND jsonb_typeof(v->'countryCode') = 'string' AND v->>'countryCode' ~ '^[A-Z]{2}$'
     AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(v) AS keys(value) WHERE keys.value NOT IN ('number','countryCode'));
 ELSIF kind = 'email' THEN
   RETURN jsonb_typeof(v->'address') = 'string' AND length(v->>'address') <= 254 AND v->>'address' ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(v) AS keys(value) WHERE keys.value <> 'address');
 ELSIF kind = 'address' THEN
   IF NOT v ?& ARRAY['street','city','postalCode'] THEN RETURN false; END IF;
   FOR k, item IN SELECT * FROM jsonb_each(v) LOOP
     size := CASE k WHEN 'street' THEN 200 WHEN 'unit' THEN 40 WHEN 'city' THEN 80 WHEN 'province' THEN 80 WHEN 'postalCode' THEN 20 WHEN 'country' THEN 2 ELSE 0 END;
     s := item #>> '{}';
     IF jsonb_typeof(item) <> 'string' OR length(btrim(s)) NOT BETWEEN 1 AND size OR (k = 'country' AND s !~ '^[A-Z]{2}$') THEN RETURN false; END IF;
   END LOOP;
   RETURN true;
 END IF;
 RETURN false;
EXCEPTION WHEN data_exception THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION app.lead_valid_value(jsonb,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.lead_valid_value(jsonb,text,jsonb) TO app_runtime;
--> statement-breakpoint
-- A newly sensitive definition must not leave personal filter values in views,
-- including views owned by other staff. Trigger scope comes only from its row.
CREATE FUNCTION app.clear_lead_views_on_sensitive_field() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
 UPDATE app.lead_views SET
   state = jsonb_set(jsonb_set(state - 'sort', '{columns}',
     coalesce((SELECT jsonb_agg(value) FROM jsonb_array_elements(state->'columns') WHERE value #>> '{}' <> NEW.key), '[]'::jsonb)), '{filters}',
     coalesce((SELECT jsonb_agg(value) FROM jsonb_array_elements(state->'filters') WHERE value->>'key' <> NEW.key), '[]'::jsonb))
     || CASE WHEN state->'sort'->>'key' <> NEW.key THEN jsonb_build_object('sort', state->'sort') ELSE '{}'::jsonb END,
   version = version + 1, updated_at = now()
 WHERE workspace_id = NEW.workspace_id AND
   (state->'columns' ? NEW.key OR state->'sort'->>'key' = NEW.key OR EXISTS (SELECT 1 FROM jsonb_array_elements(state->'filters') WHERE value->>'key' = NEW.key));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.clear_lead_views_on_sensitive_field() FROM PUBLIC;
CREATE TRIGGER clear_lead_views_on_sensitive_field AFTER UPDATE ON app.lead_fields
 FOR EACH ROW WHEN (NEW.config->'sensitive' = 'true'::jsonb AND OLD.config->'sensitive' IS DISTINCT FROM 'true'::jsonb)
 EXECUTE FUNCTION app.clear_lead_views_on_sensitive_field();
