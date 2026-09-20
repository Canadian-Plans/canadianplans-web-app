import type { LegalBlock } from '../lib/legal';

/**
 * Minimal Portable Text renderer for the versioned legal pages (T21). It renders
 * each block's plain text; legal copy in Phase A is prose, so richer marks are
 * intentionally out of scope until a fuller renderer is needed.
 */
export function LegalBody({ blocks }: { blocks: readonly LegalBlock[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, index) => (
        <p key={index}>{block.children?.map((child) => child.text ?? '').join('') || '\u00a0'}</p>
      ))}
    </div>
  );
}
