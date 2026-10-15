import type { InternetPlan } from '@content/home-internet';
import { internetOrderCopy as copy, internetOrderSummaryFor } from '@content/internet-order';
export function InternetOrderSummary({
  plan,
  recap = false,
}: {
  plan: InternetPlan;
  recap?: boolean;
}) {
  const summary = internetOrderSummaryFor(plan);
  return (
    <section
      className={recap ? 'cp-io-recap' : 'cp-io-summary'}
      aria-label={recap ? copy.summary.recap : copy.summary.heading}
    >
      {recap ? (
        <>
          <h2>{copy.summary.recap}</h2>
          <dl>
            <div>
              <dt>{copy.summary.plan}</dt>
              <dd>{summary.compactTitle}</dd>
            </div>
            <div>
              <dt>{copy.summary.monthly}</dt>
              <dd>{summary.monthlyValue}</dd>
            </div>
            <div>
              <dt>{copy.summary.due}</dt>
              <dd>{copy.summary.dueValue}</dd>
            </div>
            <div>
              <dt>{copy.summary.firstBill}</dt>
              <dd>{copy.summary.firstBillValue}</dd>
            </div>
          </dl>
          <p className="cp-io-footnote">{copy.summary.footnote}</p>
          <hr />
        </>
      ) : (
        <>
          <div className="cp-io-summary-heading">
            <h2>{copy.summary.heading}</h2>
            <a href={copy.destinations.plans}>{copy.summary.change}</a>
          </div>
          <div className="cp-io-plan">
            <p>{copy.summary.category}</p>
            <h3>
              {plan.allowance} {plan.unit}
            </h3>
            <div>
              <strong>{plan.amount}</strong>
              <span>{copy.summary.unit}</span>
            </div>
          </div>
          {copy.summary.features.map((feature) => (
            <p key={feature} className="cp-io-feature">
              {feature}
            </p>
          ))}
          <p className="cp-io-footnote">{copy.summary.footnote}</p>
          <hr />
          <dl>
            <div>
              <dt>{copy.summary.due}</dt>
              <dd>{copy.summary.dueValue}</dd>
            </div>
            <div>
              <dt>{copy.summary.firstBill}</dt>
              <dd>{copy.summary.firstBillValue}</dd>
            </div>
          </dl>
        </>
      )}
      <div className="cp-io-payment-note">
        <strong>{copy.summary.noPayment}</strong>
        <p>
          {copy.summary.noPaymentDesktopLines.map((line) => (
            <span className="cp-io-note-line" key={line}>
              {line}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
