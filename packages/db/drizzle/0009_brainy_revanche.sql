ALTER TABLE "app"."offer_versions" DROP CONSTRAINT "offer_versions_workspace_product_fk";
--> statement-breakpoint
ALTER TABLE "app"."leads" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."leads" ADD CONSTRAINT "leads_workspace_partner_fk" FOREIGN KEY ("workspace_id","partner_id") REFERENCES "app"."partners"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."offer_versions" ADD CONSTRAINT "offer_versions_workspace_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "app"."products"("workspace_id","id") ON DELETE no action ON UPDATE no action;