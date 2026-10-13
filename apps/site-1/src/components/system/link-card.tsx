import { CpAsset, type FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import { systemCopy } from '@content/system';
export function SystemLinkCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: FigmaAsset;
}) {
  return (
    <a className="cp-system-link-card" href={href}>
      <span className="cp-system-icon-tile">
        <CpAsset asset={icon} />
      </span>
      <span className="cp-system-link-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="cp-system-arrow" aria-hidden="true">
        {systemCopy.arrow}
      </span>
    </a>
  );
}
