import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

export default function LeadsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads</CardTitle>
        <CardDescription>No data yet — this is a placeholder route.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Draft leads and their resume state land once the backend leads endpoints exist.
      </CardContent>
    </Card>
  );
}
