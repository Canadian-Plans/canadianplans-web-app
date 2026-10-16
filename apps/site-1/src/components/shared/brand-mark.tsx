/**
 * Canadian Plans logo from the final homepage design (16 October 2026): a blue rounded
 * mark with a signal glyph and the "canadianplans" wordmark. The parent link carries the
 * accessible name, so both parts are hidden from assistive technology.
 */
export function BrandMark() {
  return (
    <>
      <span className="cp-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false">
          <path d="M4 16a11 11 0 0 1 16 0M7.5 19a6 6 0 0 1 9 0" />
          <circle cx="12" cy="8" r="2.2" />
        </svg>
      </span>
      <span className="cp-brand-word" aria-hidden="true">
        canadian<span>plans</span>
      </span>
    </>
  );
}
