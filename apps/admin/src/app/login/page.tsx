import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@canadian-plans/ui';

export default function LoginPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-svh items-center justify-center p-6 outline-none"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Staff sign in</CardTitle>
          <CardDescription>No auth is wired up yet — this is a placeholder route.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" aria-disabled="true">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled
                placeholder="you@canadianplans.ca"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" disabled />
            </div>
            <Button type="submit" disabled className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
