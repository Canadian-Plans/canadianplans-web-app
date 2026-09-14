import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

import { ServiceCredentialsManager } from '../../../../components/service-credentials-manager';
import { StaffInviteForm } from '../../../../components/staff-invite-form';

export default async function SettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Settings</h1>
        </CardTitle>
        <CardDescription>
          Workspace access is enforced by the backend on every request.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-10">
        <StaffInviteForm workspaceSlug={workspace} />
        <ServiceCredentialsManager workspaceSlug={workspace} />
      </CardContent>
    </Card>
  );
}
