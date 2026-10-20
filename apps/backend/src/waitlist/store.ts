import { auditEvents, regionWaitlist, withTenantTx, type DatabaseClient } from '@canadian-plans/db';
import type { ProvinceCode, ProductType } from '@canadian-plans/types';

export interface JoinRegionWaitlistInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  province: ProvinceCode;
  email: string;
  interest?: ProductType;
  consentVersion: string;
}

export interface RegionWaitlistStore {
  /**
   * Adds the email to the wish list for a province. Safe to repeat: the same
   * email (any letter case) for the same province is stored once.
   */
  join(input: JoinRegionWaitlistInput): Promise<void>;
}

type WaitlistDatabase = Pick<DatabaseClient, 'withTenantTx'>;

const defaultWaitlistDatabase: WaitlistDatabase = { withTenantTx };

export class DatabaseRegionWaitlistStore implements RegionWaitlistStore {
  constructor(private readonly database: WaitlistDatabase = defaultWaitlistDatabase) {}

  async join(input: JoinRegionWaitlistInput): Promise<void> {
    await this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(regionWaitlist)
          .values({
            workspaceId: input.workspaceId,
            province: input.province,
            email: input.email.trim(),
            interest: input.interest ?? null,
            consentVersion: input.consentVersion,
          })
          .onConflictDoNothing()
          .returning({ id: regionWaitlist.id });
        // A repeat adds nothing and is not audited again. The audit entry never
        // carries the email (PLATFORM_CONTEXT §4, no PII outside its own table).
        if (!row) return;
        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'website credential',
          action: 'region_waitlist.joined',
          entity: 'region_waitlist',
          entityId: row.id,
          requestId: input.requestId,
          after: {
            province: input.province,
            interest: input.interest ?? null,
            consentVersion: input.consentVersion,
          },
        });
      },
    );
  }
}
