import {
  CpAsset,
  CpBlockHeading,
  CpFeatureCard,
  CpFeatureGrid,
  CpStepTimeline,
} from '@canadian-plans/ui/canadian-plans';
import {
  redesignAssets,
  type RedesignAssetKey,
  type RedesignCategory,
} from '@content/home-redesign';

export const categoryAsset = (key: RedesignAssetKey) => <CpAsset asset={redesignAssets[key]} />;

/**
 * A category's supporting blocks (steps, who it's for, cards). Shared by the homepage
 * explorer (headings under an h3 banner) and the category page template (h2 sections).
 */
export function CategorySupport({
  category,
  headingLevel = 'h3',
}: {
  category: RedesignCategory;
  headingLevel?: 'h2' | 'h3';
}) {
  const steps = 'steps' in category ? category.steps : undefined;
  const who = 'who' in category ? category.who : undefined;
  const cards = category.cards;
  const aside = 'aside' in cards ? cards.aside : undefined;
  return (
    <>
      {steps ? (
        <div className="cp-rd-block" id={`${category.key}-steps`}>
          <CpBlockHeading title={steps.title} aside={steps.aside} headingLevel={headingLevel} />
          <CpStepTimeline
            tone={category.tone}
            label={steps.title}
            steps={steps.items}
            art={Object.fromEntries(steps.items.map((s) => [s.id, categoryAsset(s.art)]))}
          />
        </div>
      ) : null}
      {who ? (
        <div className="cp-rd-block">
          <CpBlockHeading title={who.title} headingLevel={headingLevel} />
          <CpFeatureGrid columns={3}>
            {who.items.map((item) => (
              <CpFeatureCard
                key={item.id}
                content={item}
                icon={categoryAsset(item.icon)}
                tone={category.tone}
              />
            ))}
          </CpFeatureGrid>
        </div>
      ) : null}
      <div className="cp-rd-block">
        <CpBlockHeading
          title={cards.title}
          headingLevel={headingLevel}
          aside={
            aside ? (
              <a className="cp-rd-link" href={aside.href}>
                {aside.label}
              </a>
            ) : undefined
          }
        />
        <CpFeatureGrid columns={cards.columns}>
          {cards.items.map((item) => (
            <CpFeatureCard
              key={item.id}
              content={item}
              icon={categoryAsset(item.icon)}
              tone={category.tone}
            />
          ))}
        </CpFeatureGrid>
      </div>
    </>
  );
}
