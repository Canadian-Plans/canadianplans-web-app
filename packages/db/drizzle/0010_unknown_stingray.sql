CREATE TABLE "app"."catalogue_sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"selector" text NOT NULL,
	"provider_account" text NOT NULL,
	"delivery_id" text NOT NULL,
	"document_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"cms_revision_id" text,
	"occurred_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalogue_sync_events_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "catalogue_sync_events_delivery_unique" UNIQUE("workspace_id","provider_account","delivery_id"),
	CONSTRAINT "catalogue_sync_events_status_check" CHECK ("app"."catalogue_sync_events"."status" in ('pending', 'processing', 'completed', 'failed', 'ignored'))
);
--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."catalogue_sync_leases" (
	"workspace_id" uuid NOT NULL,
	"product_key" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalogue_sync_leases_workspace_id_product_key_pk" PRIMARY KEY("workspace_id","product_key")
);
--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_leases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."catalogue_sync_state" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"offer_version_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"charges" jsonb NOT NULL,
	"total_amount_minor" integer NOT NULL,
	"amount_payable_today_minor" integer NOT NULL,
	"payment_required" boolean NOT NULL,
	"document_checklist" text[] NOT NULL,
	"terms_version" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "quotes_currency_check" CHECK ("app"."quotes"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "quotes_charges_array_check" CHECK (jsonb_typeof("app"."quotes"."charges") = 'array'),
	CONSTRAINT "quotes_total_nonnegative_check" CHECK ("app"."quotes"."total_amount_minor" >= 0),
	CONSTRAINT "quotes_payable_today_nonnegative_check" CHECK ("app"."quotes"."amount_payable_today_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."product_availability" ADD COLUMN "current_offer_version_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."product_availability" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_events" ADD CONSTRAINT "catalogue_sync_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_leases" ADD CONSTRAINT "catalogue_sync_leases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_state" ADD CONSTRAINT "catalogue_sync_state_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD CONSTRAINT "quotes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."offer_versions" ADD CONSTRAINT "offer_versions_workspace_product_id_unique" UNIQUE("workspace_id","product_id","id");--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD CONSTRAINT "quotes_workspace_draft_fk" FOREIGN KEY ("workspace_id","draft_id") REFERENCES "app"."leads"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD CONSTRAINT "quotes_workspace_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "app"."products"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."quotes" ADD CONSTRAINT "quotes_workspace_product_offer_version_fk" FOREIGN KEY ("workspace_id","product_id","offer_version_id") REFERENCES "app"."offer_versions"("workspace_id","product_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalogue_sync_events_workspace_status_created_idx" ON "app"."catalogue_sync_events" USING btree ("workspace_id","status","created_at");--> statement-breakpoint
CREATE INDEX "catalogue_sync_leases_workspace_expires_idx" ON "app"."catalogue_sync_leases" USING btree ("workspace_id","expires_at");--> statement-breakpoint
CREATE INDEX "quotes_workspace_draft_created_idx" ON "app"."quotes" USING btree ("workspace_id","draft_id","created_at");--> statement-breakpoint
CREATE INDEX "quotes_workspace_product_expires_idx" ON "app"."quotes" USING btree ("workspace_id","product_id","expires_at");--> statement-breakpoint
ALTER TABLE "app"."product_availability" ADD CONSTRAINT "product_availability_workspace_current_version_fk" FOREIGN KEY ("workspace_id","product_id","current_offer_version_id") REFERENCES "app"."offer_versions"("workspace_id","product_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "catalogue_sync_events_tenant_policy" ON "app"."catalogue_sync_events" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."catalogue_sync_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."catalogue_sync_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "catalogue_sync_leases_tenant_policy" ON "app"."catalogue_sync_leases" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."catalogue_sync_leases"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."catalogue_sync_leases"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "catalogue_sync_state_tenant_policy" ON "app"."catalogue_sync_state" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."catalogue_sync_state"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."catalogue_sync_state"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "quotes_tenant_policy" ON "app"."quotes" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."quotes"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."quotes"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_leases" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_state" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."quotes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."catalogue_sync_events" TO app_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app"."catalogue_sync_leases" TO app_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."catalogue_sync_state", "app"."quotes" TO app_runtime;
