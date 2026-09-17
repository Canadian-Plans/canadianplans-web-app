CREATE TABLE "app"."outbox_job_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"alert_code" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_job_alerts_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "app"."outbox_job_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" DROP CONSTRAINT "outbox_jobs_status_check";--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "message_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "payload_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "lease_owner_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "uncertain_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD COLUMN "outcome" jsonb;--> statement-breakpoint
UPDATE "app"."outbox_jobs"
SET "status" = 'pending', "locked_at" = null, "updated_at" = now()
WHERE "status" = 'processing';--> statement-breakpoint
ALTER TABLE "app"."outbox_job_alerts" ADD CONSTRAINT "outbox_job_alerts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outbox_job_alerts" ADD CONSTRAINT "outbox_job_alerts_workspace_job_fk" FOREIGN KEY ("workspace_id","job_id") REFERENCES "app"."outbox_jobs"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_job_alerts_workspace_unresolved_idx" ON "app"."outbox_job_alerts" USING btree ("workspace_id","resolved_at","created_at");--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD CONSTRAINT "outbox_jobs_attempts_check" CHECK ("app"."outbox_jobs"."attempts" >= 0);--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD CONSTRAINT "outbox_jobs_payload_version_check" CHECK ("app"."outbox_jobs"."payload_version" > 0);--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD CONSTRAINT "outbox_jobs_lease_check" CHECK (("app"."outbox_jobs"."status" = 'processing' and "app"."outbox_jobs"."lease_owner_id" is not null and "app"."outbox_jobs"."lease_expires_at" is not null and "app"."outbox_jobs"."locked_at" is not null) or ("app"."outbox_jobs"."status" <> 'processing' and "app"."outbox_jobs"."lease_owner_id" is null and "app"."outbox_jobs"."lease_expires_at" is null));--> statement-breakpoint
ALTER TABLE "app"."outbox_jobs" ADD CONSTRAINT "outbox_jobs_status_check" CHECK ("app"."outbox_jobs"."status" in ('pending', 'processing', 'completed', 'failed', 'uncertain'));--> statement-breakpoint
CREATE POLICY "outbox_job_alerts_tenant_policy" ON "app"."outbox_job_alerts" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."outbox_job_alerts"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."outbox_job_alerts"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
ALTER TABLE "app"."outbox_job_alerts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."outbox_job_alerts" TO "app_runtime";
