CREATE TABLE "app"."offer_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"cms_document_id" text,
	"cms_revision_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_versions_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "offer_versions_workspace_product_content_hash_unique" UNIQUE("workspace_id","product_id","content_hash")
);
--> statement-breakpoint
ALTER TABLE "app"."offer_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."product_availability" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."product_availability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "products_workspace_id_product_key_unique" UNIQUE("workspace_id","product_key")
);
--> statement-breakpoint
ALTER TABLE "app"."products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."offer_versions" ADD CONSTRAINT "offer_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."offer_versions" ADD CONSTRAINT "offer_versions_workspace_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "app"."products"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_availability" ADD CONSTRAINT "product_availability_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_availability" ADD CONSTRAINT "product_availability_workspace_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "app"."products"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."products" ADD CONSTRAINT "products_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offer_versions_workspace_id_product_id_created_at_idx" ON "app"."offer_versions" USING btree ("workspace_id","product_id","created_at");--> statement-breakpoint
CREATE POLICY "offer_versions_tenant_policy" ON "app"."offer_versions" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."offer_versions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."offer_versions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "product_availability_tenant_policy" ON "app"."product_availability" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."product_availability"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."product_availability"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "products_tenant_policy" ON "app"."products" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."products"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."products"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."offer_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."product_availability" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."products" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app"."products", "app"."product_availability" TO app_runtime;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."offer_versions" TO app_runtime;