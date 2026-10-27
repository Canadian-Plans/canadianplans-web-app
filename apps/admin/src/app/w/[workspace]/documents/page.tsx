import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';
import { PageBody } from '../../../../components/crm/page-body';

export default function DocumentsPage() {
  return (
    <PageBody>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>Documents</h1>
          </CardTitle>
          <CardDescription>No data yet — this is a placeholder route.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Verified document review lands once the backend documents endpoints exist.
        </CardContent>
      </Card>
    </PageBody>
  );
}
