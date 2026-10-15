import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { CpButton } from './elements';

/**
 * Electric Blue redesign primitives (14 October 2026).
 * Source: Claude Design canvas "Canadian Plans — Homepage Redesign".
 * Generic and content-free: every label arrives through props from the app's /content.
 */

/** Category accent used across banners, steps, cards and CTA bands. */
export type CpCategoryTone = 'amber' | 'mint' | 'blue' | 'navy';

export interface CpLinkContent {
  readonly label: string;
  readonly href: string;
}

/* ---------- Category banner ---------- */

export interface CpCategoryBannerProps {
  tone: CpCategoryTone;
  eyebrow: string;
  title: string;
  /** Optional supporting line under the title (category page heroes). */
  description?: string;
  /** Already formatted, e.g. "$35". Commercial values stay backend-authoritative. */
  price?: string;
  pricePrefix?: string;
  priceSuffix?: string;
  action: CpLinkContent;
  /** Image or CpImageSlot for the right-hand panel. */
  media?: ReactNode;
  /** h1 when the banner is a category page hero. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function CpCategoryBanner({
  tone,
  eyebrow,
  title,
  description,
  price,
  pricePrefix,
  priceSuffix,
  action,
  media,
  headingLevel = 'h3',
  className,
}: CpCategoryBannerProps) {
  const Heading = headingLevel;
  return (
    <div className={cn('cp-cat-banner', className)} data-tone={tone}>
      <div className="cp-cat-banner-copy">
        <span className="cp-cat-banner-eyebrow">{eyebrow}</span>
        <Heading className="cp-cat-banner-title">{title}</Heading>
        {description ? <p className="cp-cat-banner-description">{description}</p> : null}
        <div className="cp-cat-banner-actions">
          <CpButton asChild tone={bannerButtonTone[tone]}>
            <a href={action.href}>{action.label}</a>
          </CpButton>
          {price ? (
            <span className="cp-cat-banner-price">
              {pricePrefix} <strong>{price}</strong>
              {priceSuffix}
            </span>
          ) : null}
        </div>
      </div>
      {media ? <div className="cp-cat-banner-media">{media}</div> : null}
    </div>
  );
}

const bannerButtonTone = {
  amber: 'ink',
  mint: 'mint',
  blue: 'white',
  navy: 'mint',
} as const;

/* ---------- Feature row (illustration + text) ---------- */

export interface CpFeatureRowProps {
  art: ReactNode;
  title: string;
  body: string;
  /** Optional category accent for the eyebrow and button. */
  tone?: CpCategoryTone;
  eyebrow?: string;
  action?: CpLinkContent;
  /** Already formatted, e.g. "$35". Commercial values stay backend-authoritative. */
  price?: string;
  pricePrefix?: string;
  priceSuffix?: string;
  reverse?: boolean;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

export function CpFeatureRow({
  art,
  title,
  body,
  tone,
  eyebrow,
  action,
  price,
  pricePrefix,
  priceSuffix,
  reverse = false,
  headingLevel = 'h3',
  className,
}: CpFeatureRowProps) {
  const Heading = headingLevel;
  return (
    <div className={cn('cp-feature-row', className)} data-reverse={reverse} data-tone={tone}>
      <div className="cp-feature-row-art">{art}</div>
      <div className="cp-feature-row-copy">
        {eyebrow ? <span className="cp-feature-row-eyebrow">{eyebrow}</span> : null}
        <Heading className="cp-feature-row-title">{title}</Heading>
        <p className="cp-feature-row-body">{body}</p>
        {action || price ? (
          <div className="cp-feature-row-actions">
            {action ? (
              <CpButton asChild tone={featureButtonTone[tone ?? 'blue']}>
                <a href={action.href}>{action.label}</a>
              </CpButton>
            ) : null}
            {price ? (
              <span className="cp-feature-row-price">
                {pricePrefix} <strong>{price}</strong>
                {priceSuffix}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Buttons on a white feature row (banner tones assume a coloured panel). */
const featureButtonTone = {
  amber: 'ink',
  mint: 'primary',
  blue: 'primary',
  navy: 'mint',
} as const;

/* ---------- Block heading ---------- */

export function CpBlockHeading({
  title,
  aside,
  headingLevel = 'h3',
}: {
  title: string;
  aside?: ReactNode;
  headingLevel?: 'h2' | 'h3' | 'h4';
}) {
  const Heading = headingLevel;
  return (
    <div className="cp-block-heading">
      <Heading className="cp-block-heading-title">{title}</Heading>
      {aside ? <div className="cp-block-heading-aside">{aside}</div> : null}
    </div>
  );
}

/* ---------- Step timeline ---------- */

export interface CpStepContent {
  readonly id: string;
  /** "1", "2" or a done mark supplied by content. */
  readonly marker: string;
  readonly title: string;
  readonly body: string;
  /** Small chip, e.g. "Same day". */
  readonly meta?: string;
  /** Final/complete step uses the mint accent. */
  readonly done?: boolean;
}

export function CpStepTimeline({
  tone,
  steps,
  art,
  label,
}: {
  tone: CpCategoryTone;
  steps: readonly CpStepContent[];
  /** Optional illustration per step id. */
  art?: Readonly<Record<string, ReactNode>>;
  label: string;
}) {
  return (
    <ol className="cp-steps" data-tone={tone} aria-label={label}>
      {steps.map((step) => (
        <li key={step.id} className="cp-step" data-done={step.done ?? false}>
          <div className="cp-step-top">
            <span className="cp-step-marker" aria-hidden="true">
              {step.marker}
            </span>
            {step.meta ? <span className="cp-step-meta">{step.meta}</span> : null}
          </div>
          {art?.[step.id] ? <div className="cp-step-art">{art[step.id]}</div> : null}
          <strong className="cp-step-title">{step.title}</strong>
          <span className="cp-step-body">{step.body}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Feature cards ---------- */

export interface CpFeatureCardContent {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly chip?: string;
}

export function CpFeatureCard({
  content,
  icon,
  tone,
}: {
  content: CpFeatureCardContent;
  icon?: ReactNode;
  tone?: CpCategoryTone;
}) {
  return (
    <div className="cp-feature-card" data-tone={tone}>
      {icon || content.chip ? (
        <div className="cp-feature-card-top">
          {icon ? <div className="cp-feature-card-icon">{icon}</div> : <span />}
          {content.chip ? <span className="cp-feature-card-chip">{content.chip}</span> : null}
        </div>
      ) : null}
      <strong className="cp-feature-card-title">{content.title}</strong>
      <span className="cp-feature-card-body">{content.body}</span>
    </div>
  );
}

export function CpFeatureGrid({ columns = 3, children }: { columns?: 2 | 3; children: ReactNode }) {
  return (
    <div className="cp-feature-grid" data-columns={columns}>
      {children}
    </div>
  );
}

/* ---------- Category CTA band ---------- */

export interface CpCtaBandContent {
  readonly title: string;
  readonly subtitle: string;
  readonly primary: CpLinkContent;
  readonly secondary?: CpLinkContent;
}

export function CpCtaBand({
  tone,
  content,
  icon,
}: {
  tone: CpCategoryTone;
  content: CpCtaBandContent;
  icon?: ReactNode;
}) {
  return (
    <div className="cp-cta-band" data-tone={tone}>
      <span className="cp-cta-band-glow" aria-hidden="true" />
      <div className="cp-cta-band-lead">
        {icon ? (
          <span className="cp-cta-band-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="cp-cta-band-copy">
          <strong className="cp-cta-band-title">{content.title}</strong>
          <span className="cp-cta-band-subtitle">{content.subtitle}</span>
        </div>
      </div>
      <div className="cp-cta-band-actions">
        <CpButton asChild tone={ctaButtonTone[tone]} scale="large">
          <a href={content.primary.href}>{content.primary.label}</a>
        </CpButton>
        {content.secondary ? (
          <a className="cp-cta-band-link" href={content.secondary.href}>
            {content.secondary.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}

const ctaButtonTone = {
  amber: 'amber',
  mint: 'mint',
  blue: 'primary',
  navy: 'mint',
} as const;
