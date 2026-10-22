import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

import { CustomerDataDeletion } from '../../../../../components/customer-data-deletion';

export default async function CustomerDataSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Customer data deletion</h1>
        </CardTitle>
        <CardDescription>
          Owner or Finance with verified multi-factor access. Find a requester&apos;s records and
          delete each one you have verified.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CustomerDataDeletion workspaceSlug={workspace} />
      </CardContent>
    </Card>
  );
}
