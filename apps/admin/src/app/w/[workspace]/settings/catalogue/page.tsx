import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

import { CatalogueStatus } from '../../../../../components/catalogue-status';

export default async function CatalogueSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Catalogue sync</h1>
        </CardTitle>
        <CardDescription>
          Read-only state from the backend. Catalogue changes are made in Sanity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CatalogueStatus workspaceSlug={workspace} />
      </CardContent>
    </Card>
  );
}
