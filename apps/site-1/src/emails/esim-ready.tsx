import { emailCopy } from '@content/emails';
import type { EsimReadyData, EmailResources } from './data';
import { EmailFrame } from './components';
const copy = emailCopy['esim-ready'];
export function EsimReadyEmail(props: EsimReadyData & EmailResources) {
  return (
    <EmailFrame
      {...props}
      subject={copy.subject}
      preheader={copy.preheader(props.number)}
      title={copy.title(props.customerName)}
      intro={copy.intro(props.number)}
      caption={copy.caption}
      stepsTitle={copy.stepsTitle}
      steps={copy.steps}
      actionLabel={copy.action}
      rows={copy.labels.map((label, index) => ({
        label,
        value: [props.number, props.plan, props.starts][index] ?? '',
      }))}
      help={copy.help}
    />
  );
}
