ALTER TABLE "app"."email_provider_events" DROP CONSTRAINT "email_provider_events_workspace_provider_event_unique";--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD COLUMN "provider_account" text;--> statement-breakpoint
ALTER TABLE "app"."email_provider_events" ADD COLUMN "provider" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."email_provider_events" ADD COLUMN "provider_account" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_provider_id_unique" UNIQUE("workspace_id","provider","provider_account","provider_id");--> statement-breakpoint
ALTER TABLE "app"."email_provider_events" ADD CONSTRAINT "email_provider_events_workspace_provider_event_unique" UNIQUE("workspace_id","provider","provider_account","provider_event_id");--> statement-breakpoint
ALTER TABLE "app"."email_messages" ADD CONSTRAINT "email_messages_provider_pair_check" CHECK (("app"."email_messages"."provider" is null) = ("app"."email_messages"."provider_account" is null));