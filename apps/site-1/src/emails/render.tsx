import { render, toPlainText } from 'react-email';
import { emailCopy, emailPreviewCopy } from '@content/emails';
import { parseEmailMessage, type EmailResources } from './data';
import { OrderReceivedEmail } from './order-received';
import { EsimReadyEmail } from './esim-ready';
import { InstallBookedEmail } from './install-booked';
/** Pure renderer. Delivery remains a separate backend outbox responsibility. */
export async function renderTransactionalEmail(input: unknown, resources: EmailResources) {
  const message = parseEmailMessage(input);
  const templates = {
    'order-received': () =>
      message.template === 'order-received'
        ? {
            subject: emailCopy['order-received'].subject(message.data.orderReference),
            preheader: emailCopy['order-received'].preheader,
            element: <OrderReceivedEmail {...message.data} {...resources} />,
          }
        : null,
    'esim-ready': () =>
      message.template === 'esim-ready'
        ? {
            subject: emailCopy['esim-ready'].subject,
            preheader: emailCopy['esim-ready'].preheader(message.data.number),
            element: <EsimReadyEmail {...message.data} {...resources} />,
          }
        : null,
    'install-booked': () =>
      message.template === 'install-booked'
        ? {
            subject: emailCopy['install-booked'].subject(message.data.shortDate),
            preheader: emailCopy['install-booked'].preheader(message.data.window),
            element: <InstallBookedEmail {...message.data} {...resources} />,
          }
        : null,
  };
  const email = templates[message.template]();
  if (!email) throw new Error(emailPreviewCopy.invalidData);
  const html = await render(email.element);
  return { subject: email.subject, preheader: email.preheader, html, text: toPlainText(html) };
}
