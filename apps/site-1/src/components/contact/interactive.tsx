'use client';

import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@canadian-plans/ui';
import { CpButton, type CpButtonTone } from '@canadian-plans/ui/canadian-plans';
import { contactCopy, contactTopics, type ContactPreviewKind } from '@content/contact';
import {
  contactMessageMailto,
  validateContactMessage,
  type ContactMessageInput,
  type ContactMessageErrors,
} from '@/lib/contact-preview';

const PreviewContext = createContext<((kind: ContactPreviewKind) => void) | null>(null);
function useContactPreview() {
  const preview = useContext(PreviewContext);
  if (!preview) throw new Error('Contact preview provider missing');
  return preview;
}
export function ContactPreviewProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<ContactPreviewKind | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  function preview(next: ContactPreviewKind) {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setKind(next);
  }
  return (
    <PreviewContext value={preview}>
      {children}
      <Dialog
        open={kind !== null}
        onOpenChange={(open) => {
          if (!open) setKind(null);
        }}
      >
        <DialogContent
          className="cp-design cp-contact-preview"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle>{contactCopy.preview.title}</DialogTitle>
          <DialogDescription>
            {kind ? contactCopy.preview.descriptions[kind] : null}
          </DialogDescription>
          <DialogClose asChild>
            <CpButton>{contactCopy.preview.close}</CpButton>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </PreviewContext>
  );
}
export function ContactOptionAction({
  id,
  label,
  tone,
}: {
  id: 'whatsapp' | 'call' | 'email';
  label: string;
  tone: CpButtonTone;
}) {
  const preview = useContactPreview();
  if (id === 'call' || id === 'email') {
    return (
      <CpButton asChild tone={tone}>
        <a href={id === 'call' ? contactCopy.callHref : `mailto:${contactCopy.emailAddress}`}>
          {label}
        </a>
      </CpButton>
    );
  }
  return (
    <CpButton tone={tone} onClick={() => preview(id)}>
      {label}
    </CpButton>
  );
}
export function ContactDirections() {
  return (
    <a
      className="cp-contact-directions"
      href={contactCopy.office.directionsHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      {contactCopy.office.directions}
    </a>
  );
}

// REL-33 interim (owner decision 22 Oct 2026): the real lookup lives at /track,
// so this panel links there instead of running a stub form.
export function ContactTrackingForm() {
  return (
    <section
      id="track-order"
      className="cp-contact-tracking cp-contact-panel"
      aria-labelledby="contact-track-title"
    >
      <h2 id="contact-track-title">{contactCopy.track.title}</h2>
      <p className="cp-contact-track-description">{contactCopy.track.description}</p>
      <CpButton asChild scale="large">
        <a href={contactCopy.track.href}>{contactCopy.track.submit}</a>
      </CpButton>
      <p className="cp-contact-track-help">{contactCopy.track.help}</p>
    </section>
  );
}

export function ContactMessageAndHelp() {
  const [values, setValues] = useState<ContactMessageInput>({
    name: '',
    email: '',
    phone: '',
    topic: '',
    message: '',
  });
  const [errors, setErrors] = useState<ContactMessageErrors>({});
  const [feedback, setFeedback] = useState('');
  const form = useRef<HTMLFormElement>(null);
  function update(field: keyof ContactMessageInput, value: string) {
    setValues((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
    setFeedback('');
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateContactMessage(values);
    setErrors(nextErrors);
    setFeedback('');
    const first = Object.keys(nextErrors)[0];
    if (first) {
      form.current?.querySelector<HTMLElement>(`#contact-${first}`)?.focus();
      return;
    }
    // REL-33 interim: hand the message to the visitor's email app.
    window.location.assign(contactMessageMailto(values));
    setFeedback(contactCopy.message.result);
  }
  return (
    <>
      <form
        ref={form}
        id="message-us"
        className="cp-contact-message cp-contact-panel"
        method="post"
        noValidate
        onSubmit={submit}
        aria-labelledby="contact-message-title"
      >
        <h2 id="contact-message-title">{contactCopy.message.title}</h2>
        <fieldset className="cp-contact-message-fields">
          <div className="cp-contact-field-row">
            <FormField id="contact-name" label={contactCopy.message.name.label} error={errors.name}>
              <Input
                className="cp-contact-input"
                name="name"
                value={values.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder={contactCopy.message.name.placeholder}
                required
                maxLength={200}
                autoComplete="name"
              />
            </FormField>
            <FormField
              id="contact-email"
              label={contactCopy.message.email.label}
              error={errors.email}
            >
              <Input
                className="cp-contact-input"
                name="email"
                type="email"
                value={values.email}
                onChange={(event) => update('email', event.target.value)}
                placeholder={contactCopy.message.email.placeholder}
                required
                maxLength={254}
                autoComplete="email"
              />
            </FormField>
          </div>
          <div className="cp-contact-field-row">
            <div className="cp-contact-phone-field">
              <FormField
                id="contact-phone"
                label={contactCopy.message.phone.label}
                hint={contactCopy.message.phone.hint}
                error={errors.phone}
              >
                <Input
                  className="cp-contact-input"
                  name="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  placeholder={contactCopy.message.phone.placeholder}
                  maxLength={40}
                  autoComplete="tel"
                />
              </FormField>
              <span className="cp-contact-phone-optional">
                {contactCopy.message.phone.optional}
              </span>
            </div>
            <Select
              name="topic"
              required
              value={values.topic}
              onValueChange={(value) => update('topic', value)}
            >
              <FormField
                id="contact-topic"
                label={contactCopy.message.topic.label}
                error={errors.topic}
              >
                <SelectTrigger className="cp-contact-input cp-contact-topic">
                  <SelectValue placeholder={contactCopy.message.topic.placeholder} />
                  <span aria-hidden="true">{contactCopy.message.topic.indicator}</span>
                </SelectTrigger>
              </FormField>
              <SelectContent className="cp-design cp-contact-topic-menu">
                {contactTopics.map((topic) => (
                  <SelectItem key={topic.value} value={topic.value}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormField
            id="contact-message"
            label={contactCopy.message.message.label}
            error={errors.message}
          >
            <Textarea
              className="cp-contact-input cp-contact-textarea"
              name="message"
              value={values.message}
              onChange={(event) => update('message', event.target.value)}
              placeholder={contactCopy.message.message.placeholder}
              required
              maxLength={4000}
            />
          </FormField>
        </fieldset>
        <CpButton type="submit" scale="large">
          {contactCopy.message.submit}
        </CpButton>
        <p role="status" className={feedback ? 'cp-contact-feedback' : 'sr-only'}>
          {feedback}
        </p>
      </form>
      <aside
        id="quick-help"
        className="cp-contact-help cp-contact-panel"
        aria-labelledby="contact-help-title"
      >
        <h2 id="contact-help-title">{contactCopy.quickHelp.title}</h2>
        {contactCopy.quickHelp.links.map((link) =>
          'href' in link ? (
            <a className="cp-contact-help-link" key={link.label} href={link.href}>
              {link.label}
              <span aria-hidden="true">{contactCopy.quickHelp.arrow}</span>
            </a>
          ) : (
            <button
              className="cp-contact-help-link"
              key={link.label}
              type="button"
              onClick={() => {
                update('topic', link.topic);
                document.getElementById('message-us')?.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
                });
                document.getElementById('contact-message')?.focus({ preventScroll: true });
              }}
            >
              {link.label}
              <span aria-hidden="true">{contactCopy.quickHelp.arrow}</span>
            </button>
          ),
        )}
      </aside>
    </>
  );
}
