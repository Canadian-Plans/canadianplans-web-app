import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@canadian-plans/ui';

export default function OrdersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1>Orders</h1>
        </CardTitle>
        <CardDescription>No data yet — this is a placeholder route.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Order list and detail views land once the backend orders endpoints exist.
      </CardContent>
    </Card>
  );
}
