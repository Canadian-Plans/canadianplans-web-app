CREATE TABLE "app"."draft_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_grants_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "app"."draft_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"status" text NOT NULL,
	"full_name" text,
	"email" text,
	"phone" text,
	"country_code" text,
	"selected_offer_version_id" uuid,
	"payload" jsonb,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "leads_status_check" CHECK ("app"."leads"."status" in ('incomplete', 'submitted'))
);
--> statement-breakpoint
ALTER TABLE "app"."leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."draft_grants" ADD CONSTRAINT "draft_grants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."draft_grants" ADD CONSTRAINT "draft_grants_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD CONSTRAINT "leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD CONSTRAINT "leads_workspace_offer_version_fk" FOREIGN KEY ("workspace_id","selected_offer_version_id") REFERENCES "app"."offer_versions"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "draft_grants_workspace_id_lead_id_idx" ON "app"."draft_grants" USING btree ("workspace_id","lead_id");--> statement-breakpoint
CREATE INDEX "leads_workspace_id_status_idx" ON "app"."leads" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "leads_workspace_id_updated_at_idx" ON "app"."leads" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE POLICY "draft_grants_tenant_policy" ON "app"."draft_grants" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."draft_grants"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."draft_grants"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "leads_tenant_policy" ON "app"."leads" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."leads"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."leads"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."draft_grants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."leads" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app"."leads", "app"."draft_grants" TO app_runtime;--> statement-breakpoint
-- The website flow has no human Supabase actor. Its tenant writes (leads,
-- draft_grants) need *some* non-null app.actor_id to satisfy every tenant
-- policy's fail-closed predicate, so the service credential's own id — the
-- one verified identity that exists at this point — now comes back from this
-- pre-tenant lookup and is used as that actor id.
DROP FUNCTION "app"."resolve_website_credential"(text);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."resolve_website_credential"(
  p_secret_hash text
)
RETURNS TABLE (
  id uuid,
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
    credential.id,
    credential.workspace_id,
    credential.scopes,
    credential.revoked_at IS NOT NULL
  FROM app.service_credentials AS credential
  WHERE credential.secret_hash = p_secret_hash
  LIMIT 1;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."resolve_website_credential"(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."resolve_website_credential"(text) TO app_runtime;
