import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

export default function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Settings</h1>
        </CardTitle>
        <CardDescription>No data yet — this is a placeholder route.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Workspace and staff settings land once the backend settings endpoints exist.
      </CardContent>
    </Card>
  );
}
