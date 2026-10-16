import { describe, expect, it } from 'vitest';
import { mobileCopy } from '@content/mobile-plans';
import { rogersVsFidoLanding } from '@content/landing/rogers-vs-fido';
import { rogersLanding } from '@content/landing/rogers';
import type { LandingTableBlock } from '@content/landing/types';

const table = (blocks: typeof rogersLanding.blocks, id: string) =>
  blocks.find((block): block is LandingTableBlock => block.kind === 'table' && block.id === id);

const brandValue = (label: string, brand: string) => {
  const row = mobileCopy.comparison.rows.find((item) => item.label === label);
  const index = mobileCopy.comparison.brands.findIndex((name) => name === brand);
  return index < 0 ? undefined : row?.values[index];
};

describe('landing comparison tables', () => {
  it('keeps each brand value under its own column', () => {
    for (const [blocks, id] of [
      [rogersVsFidoLanding.blocks, 'compare'],
      [rogersVsFidoLanding.blocks, 'three-brands'],
      [rogersLanding.blocks, 'compare'],
    ] as const) {
      const block = table(blocks, id);
      expect(block, id).toBeDefined();
      const row = block?.rows.find((item) => item.label === 'How you pay');
      block?.columns.slice(1).forEach((brand, index) => {
        expect(row?.values[index], `${id} ${brand}`).toBe(brandValue('How you pay', brand));
      });
    }
  });
});
