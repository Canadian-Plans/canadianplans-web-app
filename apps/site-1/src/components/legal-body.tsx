import type { LegalBlock } from '../lib/legal';

function textOf(block: LegalBlock): string {
  return block.children?.map((child) => child.text ?? '').join('') || '\u00a0';
}

/**
 * Minimal Portable Text renderer for the versioned legal pages (T21). It renders
 * headings, paragraphs and bullet lists as plain text; richer marks are
 * intentionally out of scope until a fuller renderer is needed.
 */
export function LegalBody({ blocks }: { blocks: readonly LegalBlock[] }) {
  const nodes: React.ReactNode[] = [];
  let list: LegalBlock[] = [];
  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    nodes.push(
      <ul key={`list-${nodes.length}`} className="list-disc space-y-1 pl-6">
        {items.map((item, index) => (
          <li key={index}>{textOf(item)}</li>
        ))}
      </ul>,
    );
  };
  blocks.forEach((block, index) => {
    if (block.listItem === 'bullet') {
      list.push(block);
      return;
    }
    flushList();
    nodes.push(
      block.style === 'h2' ? (
        <h2 key={index} className="pt-4 text-lg font-semibold">
          {textOf(block)}
        </h2>
      ) : (
        <p key={index}>{textOf(block)}</p>
      ),
    );
  });
  flushList();
  return <div className="space-y-3 text-sm leading-relaxed">{nodes}</div>;
}
