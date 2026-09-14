import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

export default function PartnersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Partners</h1>
        </CardTitle>
        <CardDescription>No data yet — this is a placeholder route.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Partner directory and commission lines land once the backend partner endpoints exist.
      </CardContent>
    </Card>
  );
}
