import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@canadian-plans/ui';

export function Placeholder({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  /** Where the visitor can go from here, so the page is never a dead end. */
  links?: readonly { label: string; href: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        {links ? null : <p className="text-sm text-muted-foreground">Storefront preview</p>}
        <CardTitle>
          <h1 className="text-3xl">{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {links ? (
        <CardContent>
          <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {links.map((link) => (
              <li key={link.href}>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={link.href}>{link.label}</a>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
