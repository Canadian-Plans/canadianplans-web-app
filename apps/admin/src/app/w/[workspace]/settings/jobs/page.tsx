import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

import { JobsStatus } from '../../../../../components/jobs-status';
import { PageBody } from '../../../../../components/crm/page-body';

export default async function JobsSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <PageBody>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>Background jobs</h1>
          </CardTitle>
          <CardDescription>
            Pending deliveries and failures for this workspace. Uncertain deliveries require
            reconciliation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobsStatus workspaceSlug={workspace} />
        </CardContent>
      </Card>
    </PageBody>
  );
}
