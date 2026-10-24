import Image from 'next/image';
import { CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import { guideCovers } from '@content/guide-covers';
import { guideAssets, guideCopy, guidesIndexAssets } from '@content/guides';
import './cover.css';

export function GuideCover({
  guideId,
  caption,
  className,
  featured = false,
}: {
  guideId: string;
  caption: string;
  className: string;
  featured?: boolean;
}) {
  const cover = guideCovers[guideId];
  if (!cover) {
    return (
      <CpImageSlot
        className={className}
        icon={featured ? guidesIndexAssets.featured : guideAssets.imageLight}
        label={guideCopy.imageLabel}
        caption={caption}
        tone={featured ? 'on-blue' : 'light'}
      />
    );
  }
  return (
    <div className={`cp-guide-cover ${className}`}>
      <Image
        src={cover.src}
        alt={cover.alt}
        width={1672}
        height={941}
        sizes="(min-width: 1024px) 50vw, 100vw"
        loading={featured || className === 'cp-guide-header-image' ? 'eager' : 'lazy'}
      />
    </div>
  );
}
