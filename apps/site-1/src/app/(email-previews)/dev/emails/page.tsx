import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { emailCopy, emailFixtures, emailPreviewCopy as copy } from '@content/emails';
import { renderTransactionalEmail } from '@/emails/render';
import { EmailPreviewFrame } from '@/components/emails/preview-frame';
import { emailAssetOrigin, isEmailTemplate } from '@/emails/data';
import '../../emails.css';
export const metadata: Metadata = pageMetadata('/dev/emails', {
  title: copy.title,
  robots: { index: false, follow: false },
});
export const dynamic = 'force-dynamic';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') notFound();
  const { template } = await searchParams;
  const id = template ?? 'order-received';
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '127.0.0.1:3127';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const origin = emailAssetOrigin(`${protocol}://${host}`);
  const actionUrl = new URL('/track-order', origin).href;
  const messages = {
    'order-received': {
      template: 'order-received',
      data: { ...emailFixtures['order-received'], actionUrl },
    },
    'esim-ready': {
      template: 'esim-ready',
      data: {
        ...emailFixtures['esim-ready'],
        actionUrl: new URL('/track-order?state=esim-sent', origin).href,
      },
    },
    'install-booked': {
      template: 'install-booked',
      data: { ...emailFixtures['install-booked'], actionUrl },
    },
  } as const;
  const selected = isEmailTemplate(id) ? messages[id] : undefined;
  const [email, source] = selected
    ? await Promise.all([
        renderTransactionalEmail(selected, { assetBaseUrl: origin, previewInbox: true }),
        renderTransactionalEmail(selected, { assetBaseUrl: origin }),
      ])
    : [null, null];
  return (
    <div className="cp-design cp-email-previews">
      <main>
        <header className="cp-email-preview-controls">
          <h1>{copy.title}</h1>
          <p>{copy.notice}</p>
          <nav aria-label={copy.navigation}>
            {Object.entries(emailCopy).map(([key, item]) => (
              <a key={key} href={`?template=${key}`} aria-current={id === key ? 'page' : undefined}>
                {item.name}
              </a>
            ))}
          </nav>
        </header>
        {email && source ? (
          <>
            <EmailPreviewFrame key={selected?.template} html={email.html} />
            <details>
              <summary>{copy.html}</summary>
              <pre>{source.html}</pre>
            </details>
            <details>
              <summary>{copy.plainText}</summary>
              <pre>{source.text}</pre>
            </details>
          </>
        ) : (
          <p role="status">
            {copy.invalid} <a href="/dev/emails">{copy.back}</a>
          </p>
        )}
      </main>
    </div>
  );
}
