'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@canadian-plans/ui';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { orderConfirmationCopy as copy } from '@content/order-confirmation';
type Props =
  | { kind: 'saved'; reference: string; email: string }
  | { kind: 'missing' }
  | { kind: 'preview'; onBack: () => void };
/** Shared presentation; preview can never carry a server order reference or claim a send. */
export function OrderConfirmation(props: Props) {
  if (props.kind === 'preview')
    return (
      <Card className="cp-order-preview-confirmation">
        <CardHeader>
          <CardTitle>
            <h1 id="order-preview-title" tabIndex={-1}>
              {copy.preview.heading}
            </h1>
          </CardTitle>
          <CardDescription>{copy.preview.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <CpButton onClick={props.onBack}>{copy.preview.back}</CpButton>
        </CardContent>
      </Card>
    );
  if (props.kind === 'missing')
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl">{copy.missing.heading}</h2>
          </CardTitle>
          <CardDescription>{copy.missing.description}</CardDescription>
        </CardHeader>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl">{copy.saved.heading}</h2>
        </CardTitle>
        <CardDescription>{copy.saved.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold" data-testid="order-reference">
          {props.reference}
        </p>
        <p className="mt-2 text-sm">{copy.saved.email(props.email)}</p>
      </CardContent>
    </Card>
  );
}
