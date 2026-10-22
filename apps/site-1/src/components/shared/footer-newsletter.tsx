'use client';

import { useId, useState, useTransition } from 'react';
import type { FooterNewsletterContent } from '@content/components';
import { isValidNewsletterEmail } from '@/lib/newsletter-preview';
import { newsletterPreviewAction } from './newsletter-action';

/** Footer email sign-up. Preview only until an email provider is chosen. */
export function FooterNewsletter({ content }: { content: FooterNewsletterContent }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'done'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const statusId = useId();
  return (
    <div className="cp-footer-newsletter">
      <p className="cp-footer-heading">{content.title}</p>
      <p className="cp-footer-newsletter-body">{content.body}</p>
      <form
        className="cp-footer-newsletter-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!isValidNewsletterEmail(email)) {
            setMessage({ tone: 'error', text: content.invalid });
            return;
          }
          startTransition(async () => {
            try {
              const result = await newsletterPreviewAction(email);
              setMessage(
                result.status === 'preview'
                  ? { tone: 'done', text: content.preview }
                  : { tone: 'error', text: content.invalid },
              );
            } catch {
              setMessage({ tone: 'error', text: content.failed });
            }
          });
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {content.label}
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder={content.placeholder}
          value={email}
          aria-invalid={message?.tone === 'error' || undefined}
          aria-describedby={statusId}
          onChange={(event) => {
            setEmail(event.target.value);
            setMessage(null);
          }}
        />
        <button type="submit" disabled={pending}>
          {content.action}
        </button>
      </form>
      <p
        id={statusId}
        className="cp-footer-newsletter-status"
        role="status"
        data-tone={message?.tone}
      >
        {message?.text}
      </p>
    </div>
  );
}
