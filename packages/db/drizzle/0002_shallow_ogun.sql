ALTER POLICY "audit_events_tenant_policy" ON "app"."audit_events" TO app_runtime USING ("app"."audit_events"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null) WITH CHECK ("app"."audit_events"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null);--> statement-breakpoint
ALTER POLICY "membership_permissions_tenant_policy" ON "app"."membership_permissions" TO app_runtime USING ("app"."membership_permissions"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null) WITH CHECK ("app"."membership_permissions"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null);--> statement-breakpoint
ALTER POLICY "membership_roles_tenant_policy" ON "app"."membership_roles" TO app_runtime USING ("app"."membership_roles"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null) WITH CHECK ("app"."membership_roles"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null);--> statement-breakpoint
ALTER POLICY "memberships_tenant_policy" ON "app"."memberships" TO app_runtime USING ("app"."memberships"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null) WITH CHECK ("app"."memberships"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null);--> statement-breakpoint
ALTER POLICY "permissions_tenant_policy" ON "app"."permissions" TO app_runtime USING ("app"."permissions"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null) WITH CHECK ("app"."permissions"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null);--> statement-breakpoint
ALTER POLICY "roles_tenant_policy" ON "app"."roles" TO app_runtime USING ("app"."roles"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null) WITH CHECK ("app"."roles"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null);--> statement-breakpoint
ALTER POLICY "service_credentials_tenant_policy" ON "app"."service_credentials" TO app_runtime USING ("app"."service_credentials"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null) WITH CHECK ("app"."service_credentials"."workspace_id" = (
      select nullif(current_setting('app.workspace_id', true), '')::uuid
    ) and (
      select nullif(current_setting('app.actor_id', true), '')::uuid
    ) is not null);