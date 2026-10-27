import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(new URL('../drizzle/0028_saved_views.sql', import.meta.url));

describe('admin CRM saved views migration', () => {
  it('limits every row to its workspace and to the staff member who owns it', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain('CREATE POLICY "saved_views_owner_policy"');
    expect(sql).toContain(`"app"."saved_views"."actor_id" = nullif(`);
    expect(sql).toContain('ALTER TABLE "app"."saved_views" FORCE ROW LEVEL SECURITY');
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app"."saved_views" TO "app_runtime"',
    );
  });

  it('ties a view to a membership of the same workspace', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain(
      'FOREIGN KEY ("workspace_id","actor_id") REFERENCES "app"."memberships"("workspace_id","user_id") ON DELETE cascade',
    );
  });
});
