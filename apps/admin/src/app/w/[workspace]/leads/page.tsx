import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

import { LeadsList } from '../../../../components/leads-list';
import { PageBody } from '../../../../components/crm/page-body';

export default async function LeadsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <PageBody>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>Leads</h1>
          </CardTitle>
          <CardDescription>
            Draft plan applications captured from the website, with their attribution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadsList workspaceSlug={workspace} />
        </CardContent>
      </Card>
    </PageBody>
  );
}
