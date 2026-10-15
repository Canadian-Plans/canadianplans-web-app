import { CpButton, CpFaqAccordion, type FaqItemContent } from '@canadian-plans/ui/canadian-plans';
import type { RedesignFaqIntro } from '@content/category-redesign';


/** FAQ section: intro + grey help card beside the accordion. Homepage and category pages. */
export function RedesignFaqSection({
  intro,
  items,
  name,
  defaultOpenId,
  titleId = 'faq-title',
}: {
  intro: RedesignFaqIntro;
  items: readonly FaqItemContent[];
  name: string;
  defaultOpenId?: string;
  titleId?: string;
}) {
  return (
    <section id="faq" className="cp-rd-section cp-container" aria-labelledby={titleId}>
      <div className="cp-rd-faq">
        <div className="cp-rd-faq-intro">
          <p className="cp-rd-eyebrow cp-rd-eyebrow-mint">{intro.eyebrow}</p>
          <h2 id={titleId} className="cp-rd-heading">
            {intro.title}
          </h2>
          <p className="cp-rd-lead">{intro.description}</p>
          <div className="cp-rd-faq-help">
            <strong>{intro.helpTitle}</strong>
            <span>{intro.helpBody}</span>
            <CpButton asChild>
              <a href={intro.helpAction.href}>{intro.helpAction.label}</a>
            </CpButton>
          </div>
        </div>
        <CpFaqAccordion
          items={items}
          name={name}
          defaultOpenId={defaultOpenId ?? items[0]?.id}
          symbols={intro.symbols}
        />
      </div>
    </section>
  );
}
