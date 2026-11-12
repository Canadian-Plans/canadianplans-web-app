/** The icon file used by the header, footer, emails and favicons (owner's logo, 22 October 2026). */
export const BRAND_ICON_SRC = '/brand/canadian-plans-icon.png';
/**
 * The same artwork at 108 px (the 36 px mark at 3x) for the header and footer: under 2 kB
 * instead of the 55 kB full-size file, which every page was downloading at high priority.
 */
const BRAND_MARK_SRC = '/brand/canadian-plans-icon-108.png';

/**
 * Canadian Plans logo (owner's artwork, 22 October 2026): the blue signal icon beside the
 * "Canadian Plans" wordmark on two lines. The parent link carries the accessible name, so
 * both parts are hidden from assistive technology.
 */
export function BrandMark() {
  return (
    <>
      <span className="cp-brand-mark" aria-hidden="true">
        <img src={BRAND_MARK_SRC} alt="" width={108} height={108} decoding="async" />
      </span>
      <span className="cp-brand-word" aria-hidden="true">
        Canadian
        <span>Plans</span>
      </span>
    </>
  );
}
