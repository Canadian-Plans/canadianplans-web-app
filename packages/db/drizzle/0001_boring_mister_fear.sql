CREATE TYPE "app"."permission_effect" AS ENUM('allow', 'deny');--> statement-breakpoint
ALTER TABLE "app"."memberships" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."membership_permissions" ADD COLUMN "effect" "app"."permission_effect" DEFAULT 'allow' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD COLUMN "invited_email" text;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_workspace_pending_email_unique" ON "app"."memberships" USING btree ("workspace_id",lower("invited_email")) WHERE "app"."memberships"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "memberships_user_id_status_workspace_id_idx" ON "app"."memberships" USING btree ("user_id","status","workspace_id");--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_status_check" CHECK ("app"."memberships"."status" in ('pending', 'active', 'revoked'));--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_identity_state_check" CHECK ((
          "app"."memberships"."status" = 'pending'
          and "app"."memberships"."user_id" is null
          and "app"."memberships"."invited_email" is not null
        ) or (
          "app"."memberships"."status" = 'active'
          and "app"."memberships"."user_id" is not null
          and "app"."memberships"."invited_email" is null
        ) or "app"."memberships"."status" = 'revoked');--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."accept_staff_invitations"(
  p_verified_email text,
  p_request_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := nullif(pg_catalog.current_setting('app.actor_id', true), '')::uuid;
  v_accepted integer := 0;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'verified actor context is required' USING ERRCODE = '42501';
  END IF;

  IF p_request_id IS NULL OR nullif(pg_catalog.btrim(p_verified_email), '') IS NULL THEN
    RETURN 0;
  END IF;

  WITH claimed AS (
    UPDATE app.memberships AS membership
    SET
      user_id = v_actor_id,
      invited_email = NULL,
      status = 'active',
      accepted_at = pg_catalog.clock_timestamp()
    WHERE membership.membership_type = 'staff'
      AND membership.status = 'pending'
      AND pg_catalog.lower(membership.invited_email) =
        pg_catalog.lower(pg_catalog.btrim(p_verified_email))
      AND NOT EXISTS (
        SELECT 1
        FROM app.memberships AS existing
        WHERE existing.workspace_id = membership.workspace_id
          AND existing.user_id = v_actor_id
      )
    RETURNING membership.id, membership.workspace_id
  ),
  audited AS (
    INSERT INTO app.audit_events (
      id,
      workspace_id,
      actor_id,
      actor_label,
      action,
      entity,
      entity_id,
      request_id,
      after
    )
    SELECT
      pg_catalog.gen_random_uuid(),
      claimed.workspace_id,
      v_actor_id,
      'staff actor',
      'membership.accepted',
      'membership',
      claimed.id,
      p_request_id,
      pg_catalog.jsonb_build_object('status', 'active')
    FROM claimed
    RETURNING 1
  )
  SELECT pg_catalog.count(*)::integer INTO v_accepted FROM audited;

  RETURN v_accepted;
END;
$function$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."list_staff_workspaces"()
RETURNS TABLE (
  workspace_id uuid,
  workspace_slug text,
  workspace_name text,
  membership_id uuid,
  role_names text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    workspace.id,
    workspace.slug,
    workspace.name,
    membership.id,
    ARRAY(
      SELECT role.name::text
      FROM app.membership_roles AS membership_role
      JOIN app.roles AS role
        ON role.workspace_id = membership_role.workspace_id
       AND role.id = membership_role.role_id
      WHERE membership_role.workspace_id = membership.workspace_id
        AND membership_role.membership_id = membership.id
      ORDER BY role.name::text
    )
  FROM app.memberships AS membership
  JOIN app.workspaces AS workspace ON workspace.id = membership.workspace_id
  WHERE membership.membership_type = 'staff'
    AND membership.status = 'active'
    AND membership.user_id =
      nullif(pg_catalog.current_setting('app.actor_id', true), '')::uuid
  ORDER BY workspace.name, workspace.slug;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."accept_staff_invitations"(text, uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."list_staff_workspaces"() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."accept_staff_invitations"(text, uuid) TO app_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."list_staff_workspaces"() TO app_runtime;
