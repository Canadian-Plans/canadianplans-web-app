import { emailCopy } from '@content/emails';
import type { InstallBookedData, EmailResources } from './data';
import { EmailFrame } from './components';
const copy = emailCopy['install-booked'];
export function InstallBookedEmail(props: InstallBookedData & EmailResources) {
  return (
    <EmailFrame
      {...props}
      subject={copy.subject(props.shortDate)}
      preheader={copy.preheader(props.window)}
      title={copy.title}
      intro={copy.intro(props.date, props.window, props.address)}
      caption={copy.caption}
      stepsTitle={copy.stepsTitle}
      steps={copy.steps}
      actionLabel={copy.action}
      rows={copy.labels.map((label, index) => ({
        label,
        value:
          [props.orderReference, props.plan, props.monthlyPrice, props.installPrice][index] ?? '',
      }))}
      help={copy.help}
    />
  );
}
