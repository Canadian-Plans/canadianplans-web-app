CREATE TABLE "app"."file_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_review_events_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "file_review_events_decision_check" CHECK ("app"."file_review_events"."decision" in ('approved', 'rejected')),
	CONSTRAINT "file_review_events_note_check" CHECK ("app"."file_review_events"."note" is null or char_length("app"."file_review_events"."note") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "app"."file_review_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."file_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"object_key" text NOT NULL,
	"detected_mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_revisions_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "file_revisions_workspace_file_revision_unique" UNIQUE("workspace_id","file_id","revision"),
	CONSTRAINT "file_revisions_revision_positive_check" CHECK ("app"."file_revisions"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."file_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"bucket" text NOT NULL,
	"staging_key" text NOT NULL,
	"candidate_key" text,
	"object_key" text,
	"declared_content_type" text NOT NULL,
	"detected_mime" text,
	"declared_size_bytes" integer NOT NULL,
	"size_bytes" integer,
	"checksum_sha256" text,
	"status" text DEFAULT 'uploading' NOT NULL,
	"reject_reason" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"superseded_by_file_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"finalized_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "files_status_check" CHECK ("app"."files"."status" in ('uploading', 'verifying', 'available', 'rejected', 'deleted')),
	CONSTRAINT "files_record_type_check" CHECK ("app"."files"."record_type" in ('lead', 'order')),
	CONSTRAINT "files_content_type_check" CHECK ("app"."files"."declared_content_type" in ('application/pdf', 'image/jpeg', 'image/png')),
	CONSTRAINT "files_declared_size_check" CHECK ("app"."files"."declared_size_bytes" > 0),
	CONSTRAINT "files_size_check" CHECK ("app"."files"."size_bytes" is null or "app"."files"."size_bytes" >= 0),
	CONSTRAINT "files_revision_positive_check" CHECK ("app"."files"."revision" > 0),
	CONSTRAINT "files_available_provenance_check" CHECK ((
          "app"."files"."status" = 'available'
          and "app"."files"."object_key" is not null
          and "app"."files"."detected_mime" is not null
          and "app"."files"."checksum_sha256" is not null
          and "app"."files"."size_bytes" is not null
        ) or (
          "app"."files"."status" <> 'available'
        ))
);
--> statement-breakpoint
ALTER TABLE "app"."files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."file_review_events" ADD CONSTRAINT "file_review_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_review_events" ADD CONSTRAINT "file_review_events_workspace_file_fk" FOREIGN KEY ("workspace_id","file_id") REFERENCES "app"."files"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_revisions" ADD CONSTRAINT "file_revisions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_revisions" ADD CONSTRAINT "file_revisions_workspace_file_fk" FOREIGN KEY ("workspace_id","file_id") REFERENCES "app"."files"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "app"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_review_events_workspace_file_created_idx" ON "app"."file_review_events" USING btree ("workspace_id","file_id","created_at");--> statement-breakpoint
CREATE INDEX "file_revisions_workspace_file_idx" ON "app"."file_revisions" USING btree ("workspace_id","file_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "files_staging_key_unique" ON "app"."files" USING btree ("staging_key");--> statement-breakpoint
CREATE UNIQUE INDEX "files_object_key_unique" ON "app"."files" USING btree ("object_key") WHERE "app"."files"."object_key" is not null;--> statement-breakpoint
CREATE INDEX "files_workspace_record_idx" ON "app"."files" USING btree ("workspace_id","record_type","record_id","status");--> statement-breakpoint
CREATE INDEX "files_workspace_status_expires_idx" ON "app"."files" USING btree ("workspace_id","status","expires_at");--> statement-breakpoint
CREATE POLICY "file_review_events_tenant_policy" ON "app"."file_review_events" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."file_review_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."file_review_events"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "file_revisions_tenant_policy" ON "app"."file_revisions" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."file_revisions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."file_revisions"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
CREATE POLICY "files_tenant_policy" ON "app"."files" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("app"."files"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null) WITH CHECK ("app"."files"."workspace_id" = nullif(
      (select current_setting('app.workspace_id', true)),
      ''
    )::uuid and nullif(
      (select current_setting('app.actor_id', true)),
      ''
    )::uuid is not null);--> statement-breakpoint
-- T17: document metadata, immutable revision provenance, and staff review log.
-- As with 0011/0012/0015, the generated diff does not emit FORCE ROW LEVEL
-- SECURITY or the app_runtime grants, so they are added explicitly. `files` is
-- mutated in place (status lifecycle, attach, tombstone) so it needs UPDATE;
-- `file_revisions` and `file_review_events` are append-only (SELECT/INSERT).
ALTER TABLE "app"."files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."file_revisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."file_review_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "app"."files" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."file_revisions" TO "app_runtime";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "app"."file_review_events" TO "app_runtime";
