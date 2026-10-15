import { emailCopy } from '@content/emails';
import type { OrderReceivedData, EmailResources } from './data';
import { EmailFrame } from './components';
const copy = emailCopy['order-received'];
export function OrderReceivedEmail(props: OrderReceivedData & EmailResources) {
  return (
    <EmailFrame
      {...props}
      subject={copy.subject(props.orderReference)}
      preheader={copy.preheader}
      title={copy.title(props.customerName)}
      intro={copy.intro}
      caption={copy.caption}
      stepsTitle={copy.stepsTitle}
      steps={copy.steps}
      actionLabel={copy.action}
      rows={copy.labels.map((label, index) => ({
        label,
        value: [props.orderReference, props.plan, props.monthlyPrice, props.paidToday][index] ?? '',
      }))}
      help={copy.help}
    />
  );
}
