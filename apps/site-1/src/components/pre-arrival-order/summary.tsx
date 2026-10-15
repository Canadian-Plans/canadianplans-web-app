import { CpAsset } from '@canadian-plans/ui/canadian-plans';
import {
  preArrivalOrderCopy as copy,
  preArrivalOrderAssets as assets,
} from '@content/pre-arrival-order';
import type { ArrivalPlan } from '@content/pre-arrival';
export function PaymentNote() {
  return (
    <div className="cp-io-payment-note">
      <strong>{copy.summary.noPaymentTitle}</strong>
      <p>
        {copy.summary.noPaymentDesktopLines.map((line) => (
          <span key={line} className="cp-pa-note-line">
            {line}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
export function PreArrivalSummary({
  plan,
  expanded = false,
}: {
  plan: ArrivalPlan;
  expanded?: boolean;
}) {
  const c = copy.summary;
  return (
    <div className="cp-io-summary cp-pa-summary">
      <div className="cp-io-summary-heading">
        <h2>{c.heading}</h2>
        <a href={copy.destinations.plans}>{c.change}</a>
      </div>
      <div className="cp-io-plan">
        <p>{plan.carrier}</p>
        <h3>
          {plan.allowance} · {c.esim}
        </h3>
        <div>
          <strong>{plan.amount}</strong>
          <span>{c.period}</span>
        </div>
      </div>
      {(plan.id === 'preview-rogers-plus' ? c.rogersFeatures : plan.features).map((feature) => (
        <p className="cp-io-feature" key={feature}>
          {feature}
        </p>
      ))}
      <hr />
      <dl>
        <div>
          <dt>{c.dueLabel}</dt>
          <dd>{c.due}</dd>
        </div>
        <div>
          <dt>{c.firstBill}</dt>
          <dd>{c.starts}</dd>
        </div>
      </dl>
      {expanded ? null : <PaymentNote />}
    </div>
  );
}
export function MobilePlanSummary({
  plan,
  open,
  onToggle,
}: {
  plan: ArrivalPlan;
  open: boolean;
  onToggle: () => void;
}) {
  const c = copy.summary;
  return (
    <div className="cp-io-mobile-summary cp-pa-mobile-summary">
      <button
        type="button"
        className="cp-pa-summary-toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="pa-expanded-summary"
      >
        <span>
          <strong>
            {plan.summaryName} · {plan.allowance} {c.esim}
          </strong>
          <span>
            {plan.amount}
            {plan.period} · {c.due} {c.dueLabel.toLowerCase()}
          </span>
        </span>
        <span>
          {open ? c.hide : c.details}
          <CpAsset asset={open ? assets.up : assets.down} />
        </span>
      </button>
      {open ? (
        <div id="pa-expanded-summary">
          <hr />
          <PreArrivalSummary plan={plan} expanded />
        </div>
      ) : null}
    </div>
  );
}
export function PreArrivalRecap({ plan }: { plan: ArrivalPlan }) {
  const c = copy.summary;
  return (
    <div className="cp-io-recap cp-pa-recap">
      <h2>{c.recap}</h2>
      <dl>
        <div>
          <dt>{c.planLabel}</dt>
          <dd>
            {plan.summaryName} · {plan.allowance} {c.esim}
          </dd>
        </div>
        <div>
          <dt>{c.priceLabel}</dt>
          <dd>
            {plan.amount}
            {plan.period}
          </dd>
        </div>
        <div>
          <dt>{c.dueLabel}</dt>
          <dd>{c.due}</dd>
        </div>
        <div>
          <dt>{c.firstBill}</dt>
          <dd>{c.starts}</dd>
        </div>
      </dl>
      <hr />
      <PaymentNote />
    </div>
  );
}
