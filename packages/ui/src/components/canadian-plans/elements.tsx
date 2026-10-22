import type { ComponentProps, ReactNode } from 'react';
import Image from 'next/image';
import { Button, type ButtonProps } from '../button';
import { Badge } from '../badge';
import { Card } from '../card';
import { cn } from '../../lib/utils';

export interface FigmaAsset {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly nodeId: string;
}

/** Preserve the exported SVG's intrinsic dimensions; never inline its paths. */
export function CpAsset({ asset, alt = '' }: { asset: FigmaAsset; alt?: string }) {
  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={alt}
      data-figma-asset={asset.nodeId}
      className="cp-asset"
      unoptimized={asset.src.endsWith('.svg')}
    />
  );
}

export type CpButtonTone =
  | 'primary'
  | 'ink'
  | 'sun'
  | 'amber'
  | 'mint'
  | 'navy'
  | 'white'
  | 'outline'
  | 'outline-brand'
  | 'outline-inverse'
  | 'ghost';

export interface CpButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  tone?: CpButtonTone;
  scale?: 'medium' | 'large' | 'icon';
}

export function CpButton({
  tone = 'primary',
  scale = 'medium',
  className,
  type = 'button',
  ...props
}: CpButtonProps) {
  return (
    <Button
      {...props}
      type={props.asChild ? undefined : type}
      variant="ghost"
      data-tone={tone}
      data-scale={scale}
      className={cn('cp-button', className)}
    />
  );
}

export interface CpChipProps extends Omit<ButtonProps, 'variant' | 'size'> {
  selected?: boolean;
}

export function CpChip({ selected = false, className, ...props }: CpChipProps) {
  return (
    <Button
      {...props}
      type="button"
      variant="ghost"
      aria-pressed={selected}
      data-selected={selected}
      className={cn('cp-chip', className)}
    />
  );
}

export function CpBadge({
  tone = 'blush',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: 'blush' | 'sun' | 'sky' | 'ink' | 'mint' | 'amber' }) {
  return <Badge {...props} data-tone={tone} className={cn('cp-badge', className)} />;
}

export function CpLinkPill({ className, children, ...props }: ComponentProps<'a'>) {
  return (
    <CpButton asChild tone="outline-brand" className={cn('cp-link-pill', className)}>
      <a {...props}>{children}</a>
    </CpButton>
  );
}

/** A display model, not a quote or an order payload. Commercial values arrive formatted. */
export interface PlanCardContent {
  readonly id: string;
  readonly carrier: string;
  readonly allowance: string;
  readonly unit?: string;
  readonly amount: string;
  readonly period: string;
  readonly finePrint: string;
  readonly features: readonly string[];
  readonly buttonLabel: string;
  readonly selectedLabel: string;
  readonly badge?: string;
  readonly originalPrice?: string;
  readonly goodFor?: string;
  readonly payType?: string;
}

export interface CpPlanCardProps {
  content: PlanCardContent;
  featured?: boolean;
  selected?: boolean;
  variant?: 'default' | 'pre-arrival' | 'internet' | 'mobile';
  onSelect?: () => void;
  /** When set, the button is a link, e.g. straight to the plan in the order form. */
  href?: string;
}

export function CpPlanCard({
  content,
  featured = false,
  selected = false,
  variant = 'default',
  onSelect,
  href,
}: CpPlanCardProps) {
  return (
    <Card
      className="cp-plan-card"
      data-featured={featured}
      data-selected={selected}
      data-variant={variant}
      data-plan={content.id}
    >
      <div className="cp-plan-card-top">
        {content.payType ? (
          <div className="cp-plan-carrier">
            <p className="cp-plan-eyebrow">{content.carrier}</p>
            <span className="cp-plan-pay-type">{content.payType}</span>
          </div>
        ) : content.carrier ? (
          <p className="cp-plan-eyebrow">{content.carrier}</p>
        ) : null}
        {content.badge ? <CpBadge>{content.badge}</CpBadge> : null}
      </div>
      <h3 className="cp-plan-allowance">
        {content.allowance}
        {content.unit ? <span className="cp-plan-unit">{content.unit}</span> : null}
      </h3>
      <p className="cp-plan-price">
        <strong>{content.amount}</strong>
        <span>{content.period}</span>
      </p>
      <p className="cp-plan-fine-print">
        {content.originalPrice ? (
          <>
            <s>{content.originalPrice}</s>{' '}
          </>
        ) : null}
        {content.finePrint}
      </p>
      {content.goodFor ? (
        <p className="cp-plan-good-for">{content.goodFor}</p>
      ) : (
        <div className="cp-plan-divider" />
      )}
      {content.features.length ? (
        <ul className="cp-plan-features">
          {content.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      ) : null}
      {href ? (
        <CpButton
          asChild
          tone={featured ? 'primary' : 'outline'}
          scale="large"
          className="cp-plan-select"
        >
          <a href={href}>{content.buttonLabel}</a>
        </CpButton>
      ) : (
        <CpButton
          tone={(variant !== 'pre-arrival' && featured) || selected ? 'primary' : 'outline'}
          scale="large"
          aria-pressed={selected}
          aria-label={
            variant === 'pre-arrival'
              ? `${selected ? content.selectedLabel : content.buttonLabel}: ${content.carrier}, ${content.allowance}`
              : undefined
          }
          onClick={onSelect}
          className="cp-plan-select"
        >
          {selected ? content.selectedLabel : content.buttonLabel}
        </CpButton>
      )}
    </Card>
  );
}

export interface SectionHeadingContent {
  readonly eyebrow?: string;
  readonly title: readonly string[];
  readonly description?: string;
}

export function CpSectionHeading({
  content,
  level = 'h2',
  className,
}: {
  content: SectionHeadingContent;
  level?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const Heading = level;
  return (
    <div className={cn('cp-section-heading', className)}>
      {content.eyebrow ? <p className="cp-section-eyebrow">{content.eyebrow}</p> : null}
      <Heading>
        {content.title.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </Heading>
      {content.description ? <p className="cp-section-description">{content.description}</p> : null}
    </div>
  );
}

export interface FaqItemContent {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

/** Native disclosure semantics keep this component server-renderable and keyboard-operable. */
export function CpFaqAccordion({
  items,
  name,
  defaultOpenId,
  defaultOpenIds,
  symbols,
}: {
  items: readonly FaqItemContent[];
  name: string;
  defaultOpenId?: string;
  defaultOpenIds?: readonly string[];
  symbols: { readonly expand: string; readonly collapse: string };
}) {
  return (
    <div className="cp-faq-accordion">
      {items.map((item) => (
        <details
          key={item.id}
          className="cp-faq-item"
          name={defaultOpenIds && defaultOpenIds.length > 1 ? undefined : name || undefined}
          open={defaultOpenIds ? defaultOpenIds.includes(item.id) : item.id === defaultOpenId}
        >
          <summary>
            <span className="cp-faq-question">{item.question}</span>
            <span className="cp-faq-toggle" aria-hidden="true">
              <span className="cp-faq-expand">{symbols.expand}</span>
              <span className="cp-faq-collapse">{symbols.collapse}</span>
            </span>
          </summary>
          <p className="cp-faq-answer">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export interface TestimonialContent {
  readonly id: string;
  readonly stars: string;
  readonly ratingLabel: string;
  readonly quote: string;
  readonly name: string;
  readonly detail: string;
  readonly avatar: FigmaAsset;
  readonly initial?: string;
  readonly avatarTone?: 'sky' | 'mint' | 'pink';
}

/** Testimonial presentation; the existing order-summary ReviewCard stays unchanged. */
export function CpReviewCard({ content }: { content: TestimonialContent }) {
  return (
    <Card className="cp-review-card">
      <p className="cp-review-stars" aria-label={content.ratingLabel}>
        {content.stars}
      </p>
      <blockquote>{content.quote}</blockquote>
      <div className="cp-review-person">
        {content.avatarTone ? (
          <span className="cp-review-photo-avatar" data-tone={content.avatarTone}>
            <CpAsset asset={content.avatar} />
          </span>
        ) : content.initial ? (
          <span className="cp-review-avatar">
            <CpAsset asset={content.avatar} />
            <span aria-hidden="true">{content.initial}</span>
          </span>
        ) : (
          <CpAsset asset={content.avatar} />
        )}
        <div>
          <p className="cp-review-name">{content.name}</p>
          <p className="cp-review-detail">{content.detail}</p>
        </div>
      </div>
    </Card>
  );
}

export function CpPriceCircle({
  label,
  amount,
  suffix,
}: {
  label: string;
  amount: string;
  suffix: string;
}) {
  return (
    <div className="cp-price-circle-stage">
      <div className="cp-price-circle">
        <p>{label}</p>
        <strong>{amount}</strong>
        <p>{suffix}</p>
      </div>
    </div>
  );
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export function CpBreadcrumb({
  items,
  label,
  separator,
}: {
  items: readonly BreadcrumbItem[];
  label: string;
  separator: string;
}) {
  return (
    <nav className="cp-breadcrumb" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {index > 0 ? <span aria-hidden="true">{separator}</span> : null}
            {index === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <a href={item.href}>{item.label}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CpImageSlot({
  tone = 'light',
  icon,
  label,
  caption,
  className,
}: {
  tone?: 'light' | 'on-blue';
  icon: FigmaAsset;
  label: string;
  caption: string;
  className?: string;
}) {
  return (
    <div className={cn('cp-image-slot', className)} data-tone={tone}>
      <CpAsset asset={icon} />
      <p className="cp-image-label">{label}</p>
      <p className="cp-image-caption">{caption}</p>
    </div>
  );
}

export function CpComponentGroup({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <section className="cp-component-group cp-container" id={id} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="cp-lab-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}
