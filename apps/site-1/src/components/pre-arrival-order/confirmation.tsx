import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { preArrivalOrderCopy as copy } from '@content/pre-arrival-order';
import type { ArrivalPlan } from '@content/pre-arrival';
import { formatArrivalDate, type PreArrivalValues } from '@/lib/pre-arrival-order';
export function PreArrivalConfirmation({
  values,
  plan,
  onBack,
}: {
  values: PreArrivalValues;
  plan: ArrivalPlan;
  onBack: () => void;
}) {
  const c = copy.confirmation;
  const rows = [
    `${plan.summaryName} · ${plan.allowance}`,
    copy.summary.esim,
    `${values.city} · ${formatArrivalDate(values.arrivalDate)}`,
    `${plan.amount}${plan.period}`,
    copy.summary.due,
  ];
  return (
    <main id="pa-main" tabIndex={-1}>
      <section className="cp-pa-success">
        <div className="cp-pa-success-mark" aria-hidden="true">
          {copy.check}
        </div>
        <h1 id="pa-heading" tabIndex={-1}>
          {c.thanks(values.firstName)}
          <br />
          {c.title}
        </h1>
        <div className="cp-pa-preview-description">
          <strong>{c.status}</strong>
          <p>{c.description}</p>
        </div>
        <div className="cp-pa-success-actions">
          <CpButton asChild scale="large">
            <a href={copy.destinations.contact}>{c.advisor}</a>
          </CpButton>
          <CpButton tone="outline" scale="large" onClick={onBack}>
            {c.back}
          </CpButton>
        </div>
      </section>
      <section className="cp-container cp-pa-confirmation-body">
        <div className="cp-pa-timeline">
          <h2>{c.nextTitle}</h2>
          <ol>
            {c.timeline.map((item, i) => (
              <li key={item.label}>
                <div className="cp-pa-timeline-marker" data-stage={i}>
                  <span>{item.number}</span>
                </div>
                <div>
                  <p className="cp-pa-timeline-label">{item.label}</p>
                  <h3>{item.title}</h3>
                  <p>
                    {'desktopLines' in item
                      ? item.desktopLines.map((line) => (
                          <span className="cp-pa-timeline-detail" key={line}>
                            {line}{' '}
                          </span>
                        ))
                      : item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <aside>
          <div className="cp-pa-confirmation-summary">
            <h2>{c.order}</h2>
            <dl>
              {c.labels.map((label, i) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{rows[i]}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="cp-pa-before">
            <h2>{c.beforeTitle}</h2>
            {c.before.map((line) => (
              <p key={line.text}>
                {'mobileLines' in line ? (
                  <>
                    <span className="cp-pa-before-desktop">{line.text}</span>
                    <span className="cp-pa-before-mobile">
                      {line.mobileLines.map((text) => (
                        <span key={text}>{text} </span>
                      ))}
                    </span>
                  </>
                ) : 'desktopLines' in line ? (
                  line.desktopLines.map((text) => (
                    <span className="cp-pa-before-desktop-line" key={text}>
                      {text}{' '}
                    </span>
                  ))
                ) : (
                  line.text
                )}
              </p>
            ))}
          </div>
        </aside>
      </section>
      <section className="cp-container cp-pa-cross-wrap">
        <div className="cp-pa-cross">
          <div>
            <p className="cp-io-eyebrow">{c.cross.eyebrow}</p>
            <h2>{c.cross.title}</h2>
            <p>{c.cross.description}</p>
          </div>
          <CpButton asChild tone="sun" scale="large">
            <a href={copy.destinations.internet}>{c.cross.button}</a>
          </CpButton>
        </div>
      </section>
    </main>
  );
}
