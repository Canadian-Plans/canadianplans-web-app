-- T14: order notes and reminders (IMPLEMENTATION_PLAN §4 "Operations: notes,
-- assignments, reminders, audit events"; REQ 20). Both are tenant-owned child
-- records of an order with a composite (workspace_id, order_id) foreign key.
-- The generated diff does not emit FORCE ROW LEVEL SECURITY or role grants, so
-- they are added explicitly, matching 0011/0012; without the grants the
-- restricted runtime role cannot reach the new tables at all. Notes are
-- append-only; reminders are removable so a scheduled follow-up can be
-- cancelled.
CREATE TABLE "app"."order_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_notes_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "order_notes_body_check" CHECK (char_length("app"."order_notes"."body") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "app"."order_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."order_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_reminders_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "order_reminders_note_check" CHECK ("app"."order_reminders"."note" is null or char_length("app"."order_reminders"."note") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "app"."order_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."order_notes" ADD CONSTRAINT "order_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_notes" ADD CONSTRAINT "order_notes_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_reminders" ADD CONSTRAINT "order_reminders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_reminders" ADD CONSTRAINT "order_reminders_workspace_order_fk" FOREIGN KEY ("workspace_id","order_id") REFERENCES "app"."orders"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_notes_workspace_order_created_idx" ON "app"."order_notes" USING btree ("workspace_id","order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_reminders_workspace_order_remind_idx" ON "app"."order_reminders" USING btree ("workspace_id","order_id","remind_at");--> statement-breakpoint
CREATE INDEX "order_reminders_workspace_remind_at_idx" ON "app"."order_reminders" USING btree ("workspace_id","remind_at");--> statement-breakpoint
CREATE POLICY "order_notes_tenant_policy" ON "app"."order_notes" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."order_notes"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."order_notes"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "order_reminders_tenant_policy" ON "app"."order_reminders" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."order_reminders"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."order_reminders"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."order_notes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."order_reminders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."order_notes" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE "app"."order_reminders" TO "app_runtime";