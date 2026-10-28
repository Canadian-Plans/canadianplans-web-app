import { and, eq } from 'drizzle-orm';
import {
  memberships,
  membershipPermissions,
  membershipRoles,
  permissions,
  roles,
} from '@canadian-plans/db';
import {
  auditLeadChange,
  defaultLeadDatabase,
  LeadModelError,
  lockLeadModel,
  type LeadContext,
  type LeadDatabase,
} from './model.js';

/** The existing per-member permission tables remain the sole authorization source. */
export class DatabaseDataModelPermissions {
  constructor(private readonly database: LeadDatabase = defaultLeadDatabase) {}
  list(context: LeadContext) {
    return this.database.withTenantTx(context, async (tx) => {
      const members = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.workspaceId, context.workspaceId),
            eq(memberships.membershipType, 'staff'),
          ),
        )
        .limit(200);
      const overrides = await tx
        .select({
          membershipId: membershipPermissions.membershipId,
          effect: membershipPermissions.effect,
        })
        .from(membershipPermissions)
        .innerJoin(
          permissions,
          and(
            eq(permissions.workspaceId, membershipPermissions.workspaceId),
            eq(permissions.id, membershipPermissions.permissionId),
          ),
        )
        .where(
          and(
            eq(permissions.workspaceId, context.workspaceId),
            eq(permissions.name, 'manage_data_model'),
          ),
        );
      const owners = await tx
        .select({ membershipId: membershipRoles.membershipId })
        .from(membershipRoles)
        .innerJoin(
          roles,
          and(
            eq(roles.workspaceId, membershipRoles.workspaceId),
            eq(roles.id, membershipRoles.roleId),
          ),
        )
        .where(and(eq(roles.workspaceId, context.workspaceId), eq(roles.name, 'owner')));
      return members.map((member) => ({
        id: member.id,
        label: member.invitedEmail ?? member.userId ?? 'Pending member',
        allowed:
          overrides.find((o) => o.membershipId === member.id)?.effect === 'deny'
            ? false
            : overrides.some((o) => o.membershipId === member.id && o.effect === 'allow') ||
              owners.some((o) => o.membershipId === member.id),
      }));
    });
  }
  grant(context: LeadContext, membershipId: string, allowed: boolean): Promise<void> {
    return this.database.withTenantTx(context, async (tx) => {
      await lockLeadModel(tx, context.workspaceId);
      const [member] = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.workspaceId, context.workspaceId),
            eq(memberships.id, membershipId),
            eq(memberships.membershipType, 'staff'),
          ),
        );
      if (!member || member.status === 'revoked') throw new LeadModelError('not_found');
      await tx
        .insert(permissions)
        .values({ workspaceId: context.workspaceId, name: 'manage_data_model' })
        .onConflictDoNothing();
      const [permission] = await tx
        .select()
        .from(permissions)
        .where(
          and(
            eq(permissions.workspaceId, context.workspaceId),
            eq(permissions.name, 'manage_data_model'),
          ),
        );
      if (!permission) throw new Error('data_model_permission_missing');
      const effect = allowed ? 'allow' : 'deny';
      await tx
        .insert(membershipPermissions)
        .values({
          workspaceId: context.workspaceId,
          membershipId,
          permissionId: permission.id,
          effect,
        })
        .onConflictDoUpdate({
          target: [
            membershipPermissions.workspaceId,
            membershipPermissions.membershipId,
            membershipPermissions.permissionId,
          ],
          set: { effect },
        });
      await auditLeadChange(
        tx,
        context,
        allowed ? 'membership.data_model_granted' : 'membership.data_model_revoked',
        membershipId,
        ['manage_data_model'],
        'membership',
      );
    });
  }
}
