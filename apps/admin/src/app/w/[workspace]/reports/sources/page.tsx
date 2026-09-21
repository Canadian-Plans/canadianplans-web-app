import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

import { SourceReport } from '../../../../../components/source-report';

export default async function SourcesReportPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Sources</h1>
        </CardTitle>
        <CardDescription>
          Leads and orders grouped by UTM source, medium and campaign, and by partner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SourceReport workspaceSlug={workspace} />
      </CardContent>
    </Card>
  );
}
