import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

export default function DocumentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>No data yet — this is a placeholder route.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Verified document review lands once the backend documents endpoints exist.
      </CardContent>
    </Card>
  );
}
