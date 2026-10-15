import type { ReactNode } from 'react';
import {
  CpBreadcrumb,
  CpCategoryBanner,
  CpCtaBand,
  CpFeatureCard,
  CpFeatureGrid,
  CpLinkPill,
  CpStepTimeline,
} from '@canadian-plans/ui/canadian-plans';
import type {
  LandingArticleBlock,
  LandingBlock,
  LandingCardsBlock,
  LandingChecklistBlock,
  LandingPageContent,
  LandingStepsBlock,
  LandingTableBlock,
} from '@content/landing/types';
import { RedesignFaqSection } from '@/components/category-redesign/faq';
import { categoryAsset } from '@/components/category-redesign/support';
import { buildLandingSchema, serializeLandingSchema } from '@/lib/landing-schema';
import { siteBaseUrl } from '@/lib/seo';

/**
 * Electric Blue landing page (15 October 2026). Same vocabulary as the home page and the
 * category template: banner hero → quick answer → facts → blocks → FAQ → related → CTA band.
 * `slots` supplies interactive blocks (plan pickers, address checks) by block id.
 */
export function LandingPage({
  content,
  slots = {},
}: {
  content: LandingPageContent;
  slots?: Readonly<Record<string, ReactNode>>;
}) {
  const schema = buildLandingSchema(siteBaseUrl(), content.breadcrumb.items, content.faq.items);
  return (
    <main id={content.mainId} tabIndex={-1} className="cp-landing" data-tone={content.tone}>
      <script
        id="landing-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeLandingSchema(schema) }}
      />
      <div className="cp-container cp-cat-page-breadcrumb">
        <CpBreadcrumb
          items={content.breadcrumb.items}
          label={content.breadcrumb.label}
          separator={content.breadcrumb.separator}
        />
      </div>
      <div className="cp-container cp-cat-page-top">
        <CpCategoryBanner
          headingLevel="h1"
          tone={content.tone}
          eyebrow={content.hero.eyebrow}
          title={content.hero.title}
          description={content.hero.description}
          action={content.hero.action}
          price={content.hero.price}
          pricePrefix={content.hero.pricePrefix}
          priceSuffix={content.hero.priceSuffix}
          media={<span className="cp-rd-banner-photo">{content.hero.photo}</span>}
        />
        <ul className="cp-landing-highlights">
          {content.hero.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <section className="cp-cat-quick" aria-labelledby="landing-quick-title">
          <div>
            <p className="cp-rd-eyebrow">{content.quick.eyebrow}</p>
            <h2 id="landing-quick-title">{content.quick.title}</h2>
            <p>{content.quick.answer}</p>
            {content.byline ? <p className="cp-landing-byline">{content.byline}</p> : null}
          </div>
        </section>
        {content.onThisPage ? (
          <nav className="cp-landing-toc" aria-label={content.onThisPage.label}>
            <strong>{content.onThisPage.label}</strong>
            <ul>
              {content.onThisPage.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {content.facts ? (
          <section className="cp-landing-facts" aria-label={content.facts.label}>
            <dl>
              {content.facts.items.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>
                    <strong>{fact.value}</strong>
                    {fact.detail ? <span>{fact.detail}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            {content.facts.note ? <p>{content.facts.note}</p> : null}
          </section>
        ) : null}
      </div>
      {content.blocks.map((block) => (
        <Block key={block.id} block={block} tone={content.tone} slots={slots} />
      ))}
      <RedesignFaqSection
        intro={content.faq.intro}
        items={content.faq.items}
        name={`${content.mainId}-faq`}
        titleId={`${content.mainId}-faq-title`}
      />
      <section
        className="cp-container cp-landing-related"
        aria-labelledby={`${content.mainId}-related-title`}
      >
        <h2 id={`${content.mainId}-related-title`} className="cp-landing-heading">
          {content.related.title}
        </h2>
        <div className="cp-landing-related-grid">
          {content.related.groups.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <CpLinkPill href={link.href}>{link.label}</CpLinkPill>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {content.related.note ? <p className="cp-landing-note">{content.related.note}</p> : null}
      </section>
      <div className="cp-container cp-cat-page-cta">
        <CpCtaBand
          tone={content.tone}
          content={content.cta}
          icon={categoryAsset(content.cta.icon)}
        />
      </div>
    </main>
  );
}

function Block({
  block,
  tone,
  slots,
}: {
  block: LandingBlock;
  tone: LandingPageContent['tone'];
  slots: Readonly<Record<string, ReactNode>>;
}) {
  switch (block.kind) {
    case 'slot':
      return <div id={`${block.id}-slot`}>{slots[block.id] ?? null}</div>;
    case 'steps':
      return <StepsBlock block={block} tone={tone} />;
    case 'cards':
      return <CardsBlock block={block} tone={tone} />;
    case 'checklist':
      return <ChecklistBlock block={block} />;
    case 'article':
      return <ArticleBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
  }
}

function SectionIntro({
  id,
  eyebrow,
  title,
  description,
  aside,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="cp-landing-intro">
      <div>
        {eyebrow ? <p className="cp-rd-eyebrow">{eyebrow}</p> : null}
        <h2 id={`${id}-title`} className="cp-landing-heading">
          {title}
        </h2>
        {description ? <p className="cp-rd-lead">{description}</p> : null}
      </div>
      {aside ? <div className="cp-landing-intro-aside">{aside}</div> : null}
    </div>
  );
}

function StepsBlock({
  block,
  tone,
}: {
  block: LandingStepsBlock;
  tone: LandingPageContent['tone'];
}) {
  return (
    <section
      id={block.id}
      className="cp-container cp-landing-section"
      aria-labelledby={`${block.id}-title`}
    >
      <SectionIntro
        id={block.id}
        eyebrow={block.eyebrow}
        title={block.title}
        aside={block.aside ? <span>{block.aside}</span> : undefined}
      />
      <CpStepTimeline
        tone={tone}
        label={block.title}
        steps={block.items}
        art={Object.fromEntries(
          block.items.flatMap((step) => (step.art ? [[step.id, categoryAsset(step.art)]] : [])),
        )}
      />
    </section>
  );
}

function CardsBlock({
  block,
  tone,
}: {
  block: LandingCardsBlock;
  tone: LandingPageContent['tone'];
}) {
  return (
    <section
      id={block.id}
      className="cp-container cp-landing-section"
      aria-labelledby={`${block.id}-title`}
    >
      <SectionIntro
        id={block.id}
        eyebrow={block.eyebrow}
        title={block.title}
        description={block.description}
      />
      <CpFeatureGrid columns={block.columns ?? 3}>
        {block.items.map((item) => (
          <CpFeatureCard
            key={item.id}
            content={item}
            icon={item.icon ? categoryAsset(item.icon) : undefined}
            tone={tone}
          />
        ))}
      </CpFeatureGrid>
    </section>
  );
}

function ChecklistBlock({ block }: { block: LandingChecklistBlock }) {
  return (
    <section
      id={block.id}
      className="cp-container cp-landing-section"
      aria-labelledby={`${block.id}-title`}
    >
      <SectionIntro
        id={block.id}
        eyebrow={block.eyebrow}
        title={block.title}
        description={block.description}
      />
      <div className="cp-landing-checklist">
        <ul className="cp-landing-checklist-list">
          {block.items.map((item) => (
            <li key={item.title}>
              <span className="cp-landing-check" aria-hidden="true">
                {block.mark}
              </span>
              <span>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="cp-landing-checklist-aside">
          <h3>{block.aside.title}</h3>
          <p>{block.aside.body}</p>
          <dl>
            {block.aside.rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function ArticleBlock({ block }: { block: LandingArticleBlock }) {
  return (
    <section
      id={block.id}
      className="cp-container cp-landing-section"
      aria-labelledby={`${block.id}-title`}
    >
      <div className="cp-landing-article">
        <article>
          <SectionIntro
            id={block.id}
            eyebrow={block.eyebrow}
            title={block.title}
            description={block.intro}
          />
          {block.sections.map((section) => (
            <div key={section.title} className="cp-landing-article-part">
              <h3>{section.title}</h3>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ))}
        </article>
        {block.facts ? (
          <aside className="cp-landing-keyfacts" aria-label={block.facts.title}>
            <h3>{block.facts.title}</h3>
            <dl>
              {block.facts.items.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            {block.facts.note ? <p>{block.facts.note}</p> : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function TableBlock({ block }: { block: LandingTableBlock }) {
  return (
    <section
      id={block.id}
      className="cp-container cp-landing-section"
      aria-labelledby={`${block.id}-title`}
    >
      <SectionIntro
        id={block.id}
        eyebrow={block.eyebrow}
        title={block.title}
        description={block.description}
      />
      <div
        className="cp-landing-table-wrap"
        role="region"
        aria-labelledby={`${block.id}-title`}
        tabIndex={0}
      >
        <table className="cp-landing-table">
          <caption className="sr-only">{block.caption}</caption>
          <thead>
            <tr>
              {block.columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  data-highlight={block.highlight === index || undefined}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.label}-${block.columns[index + 1] ?? index}`}
                    data-highlight={block.highlight === index + 1 || undefined}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.note ? <p className="cp-landing-note">{block.note}</p> : null}
    </section>
  );
}
