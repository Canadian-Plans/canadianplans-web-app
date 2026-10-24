import { guidesIndexCopy, type GuideListEntry } from '@content/guides';
import { GuideCover } from '@/components/guides/cover';

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
      <GuideCover
        guideId={guide.id}
        featured={featured}
        caption={guide.caption}
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
