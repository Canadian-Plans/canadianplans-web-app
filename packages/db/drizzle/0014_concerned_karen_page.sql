-- G22: the verified machine actor that ingested each catalogue webhook is now
-- persisted so a later drain attributes sync writes to a stable registry
-- identity instead of the event id or a random UUID.
--
-- The column is added nullable, backfilled deterministically for any legacy
-- row, then enforced NOT NULL, so this migration is safe on a populated
-- database. The pre-change code used the event id as the actor, so `id` is the
-- faithful, deterministic legacy value (never a new synthetic actor).
ALTER TABLE "app"."catalogue_sync_events" ADD COLUMN "actor_id" uuid;--> statement-breakpoint
UPDATE "app"."catalogue_sync_events" SET "actor_id" = "id" WHERE "actor_id" IS NULL;--> statement-breakpoint
ALTER TABLE "app"."catalogue_sync_events" ALTER COLUMN "actor_id" SET NOT NULL;
