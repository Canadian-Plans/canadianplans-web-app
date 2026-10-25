-- Email-only customer tracking (25 Oct 2026). A tracking code now covers every
-- order of one email on one website, so new challenges carry no order_id; rows
-- created before this migration keep theirs and simply stop verifying.
-- order_info_requests holds staff requests for missing customer details; the
-- customer's answer is a pending change request staff approve (REQ 14/21).
CREATE TABLE "app"."order_info_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"fields" jsonb NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"change_request_id" uuid,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_info_requests_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "order_info_requests_status_check" CHECK ("app"."order_info_requests"."status" in ('pending', 'answered', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "app"."order_info_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."tracking_challenges" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."order_info_requests" ADD CONSTRAINT "order_info_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_info_requests" ADD CONSTRAINT "order_info_requests_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_info_requests" ADD CONSTRAINT "order_info_requests_workspace_change_request_fk" FOREIGN KEY ("workspace_id","change_request_id") REFERENCES "app"."order_change_requests"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_info_requests_workspace_order_status_idx" ON "app"."order_info_requests" USING btree ("workspace_id","order_id","status");--> statement-breakpoint
CREATE POLICY "order_info_requests_tenant_policy" ON "app"."order_info_requests" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."order_info_requests"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."order_info_requests"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);
--> statement-breakpoint
ALTER TABLE "app"."order_info_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."order_info_requests" TO "app_runtime";--> statement-breakpoint
-- Customer deletion removes an order's info requests with its other children.
GRANT DELETE ON TABLE "app"."order_info_requests" TO "app_runtime";--> statement-breakpoint
CREATE TRIGGER info_requests_customer_restriction BEFORE INSERT ON "app"."order_info_requests" FOR EACH ROW EXECUTE FUNCTION app.guard_restricted_child();
