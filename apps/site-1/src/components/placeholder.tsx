import { Card, CardHeader, CardTitle, CardDescription } from '@canadian-plans/ui';
export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">Storefront preview</p>
        <CardTitle>
          <h1 className="text-3xl">{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
