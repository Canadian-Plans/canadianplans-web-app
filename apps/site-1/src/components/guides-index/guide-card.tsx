import { CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import { guidesIndexAssets, guidesIndexCopy, type GuideListEntry } from '@content/guides';

export function GuideIndexCard({
  guide,
  featured = false,
}: {
  guide: GuideListEntry;
  featured?: boolean;
}) {
  return (
    <a
      href={guide.href}
      className={featured ? 'cp-guides-featured' : 'cp-guides-card'}
      data-guide-id={guide.id}
    >
      <CpImageSlot
        icon={featured ? guidesIndexAssets.featured : guidesIndexAssets.imageLight}
        label={guidesIndexCopy.imageLabel}
        caption={guide.caption}
        tone={featured ? 'on-blue' : 'light'}
        className={featured ? 'cp-guides-featured-image' : 'cp-guides-card-image'}
      />
      <div className="cp-guides-card-copy">
        <p className="cp-guides-card-category">
          {featured ? guidesIndexCopy.featuredPrefix : null}
          {guide.category}
        </p>
        <h2>{guide.title}</h2>
        {featured ? <p className="cp-guides-featured-description">{guide.description}</p> : null}
        <p className="cp-guides-card-detail">{guide.detail}</p>
      </div>
    </a>
  );
}
