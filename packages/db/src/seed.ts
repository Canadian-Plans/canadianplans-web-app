import postgres from 'postgres';

import { staffPermissionNames, staffRoleNames } from '@canadian-plans/types';

export const STAFF_SEED_IDS = {
  ownerActor: '20000000-0000-4000-8000-000000000100',
  siteActor: '20000000-0000-4000-8000-000000000101',
  demoActor: '20000000-0000-4000-8000-000000000102',
  siteWorkspace: '10000000-0000-4000-8000-000000000101',
  demoWorkspace: '10000000-0000-4000-8000-000000000102',
  siteOwnerMembership: '30000000-0000-4000-8000-000000000101',
  demoOwnerMembership: '30000000-0000-4000-8000-000000000102',
  siteStaffMembership: '30000000-0000-4000-8000-000000000103',
  demoStaffMembership: '30000000-0000-4000-8000-000000000104',
};

export interface SeedDatabaseOptions {
  connectionString: string;
  ssl?: 'require' | false;
}

/** Idempotent synthetic development seed. It never creates Supabase Auth users. */
export async function seedDatabase(options: SeedDatabaseOptions): Promise<void> {
  const client = postgres(options.connectionString, {
    max: 1,
    prepare: false,
    ssl: options.ssl ?? 'require',
  });

  try {
    await client.begin(async (tx) => {
      await tx`
        insert into app.workspaces (id, slug, name)
        values
          (${STAFF_SEED_IDS.siteWorkspace}, 'site-1', 'Northern Arrival Mobile'),
          (${STAFF_SEED_IDS.demoWorkspace}, 'demo-2', 'Maple Demo Sandbox')
        on conflict (id) do update
        set slug = excluded.slug, name = excluded.name
      `;

      for (const workspaceId of [STAFF_SEED_IDS.siteWorkspace, STAFF_SEED_IDS.demoWorkspace]) {
        for (const name of staffRoleNames) {
          await tx`
            insert into app.roles (workspace_id, name)
            values (${workspaceId}, ${name})
            on conflict (workspace_id, name) do nothing
          `;
        }
        for (const name of staffPermissionNames) {
          await tx`
            insert into app.permissions (workspace_id, name)
            values (${workspaceId}, ${name})
            on conflict (workspace_id, name) do nothing
          `;
        }
      }

      await tx`
        insert into app.memberships (
          id, workspace_id, user_id, membership_type, status, accepted_at
        )
        values
          (${STAFF_SEED_IDS.siteOwnerMembership}, ${STAFF_SEED_IDS.siteWorkspace}, ${STAFF_SEED_IDS.ownerActor}, 'staff', 'active', now()),
          (${STAFF_SEED_IDS.demoOwnerMembership}, ${STAFF_SEED_IDS.demoWorkspace}, ${STAFF_SEED_IDS.ownerActor}, 'staff', 'active', now()),
          (${STAFF_SEED_IDS.siteStaffMembership}, ${STAFF_SEED_IDS.siteWorkspace}, ${STAFF_SEED_IDS.siteActor}, 'staff', 'active', now()),
          (${STAFF_SEED_IDS.demoStaffMembership}, ${STAFF_SEED_IDS.demoWorkspace}, ${STAFF_SEED_IDS.demoActor}, 'staff', 'active', now())
        on conflict (id) do nothing
      `;

      const assignments = [
        {
          workspaceId: STAFF_SEED_IDS.siteWorkspace,
          membershipId: STAFF_SEED_IDS.siteOwnerMembership,
          role: 'owner',
        },
        {
          workspaceId: STAFF_SEED_IDS.demoWorkspace,
          membershipId: STAFF_SEED_IDS.demoOwnerMembership,
          role: 'owner',
        },
        {
          workspaceId: STAFF_SEED_IDS.siteWorkspace,
          membershipId: STAFF_SEED_IDS.siteStaffMembership,
          role: 'orders',
        },
        {
          workspaceId: STAFF_SEED_IDS.demoWorkspace,
          membershipId: STAFF_SEED_IDS.demoStaffMembership,
          role: 'viewer',
        },
      ];
      for (const { workspaceId, membershipId, role } of assignments) {
        await tx`
          insert into app.membership_roles (workspace_id, membership_id, role_id)
          select ${workspaceId}, ${membershipId}, role_row.id
          from app.roles as role_row
          where role_row.workspace_id = ${workspaceId}
            and role_row.name = ${role}
          on conflict (workspace_id, membership_id, role_id) do nothing
        `;
      }
    });
  } finally {
    await client.end();
  }
}

function migrationSsl(): 'require' | false {
  const mode = process.env.MIGRATION_DATABASE_SSL_MODE ?? 'require';
  if (mode === 'require') return 'require';
  if (mode === 'disable') return false;
  throw new Error('MIGRATION_DATABASE_SSL_MODE must be either "require" or "disable"');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The synthetic staff seed is disabled in production.');
  }
  const connectionString = process.env.MIGRATION_DATABASE_URL;
  if (!connectionString) throw new Error('MIGRATION_DATABASE_URL is required');
  await seedDatabase({ connectionString, ssl: migrationSsl() });
  console.info('Seeded isolated site-1 and demo-2 staff workspaces.');
}
