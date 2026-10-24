import { describe, expect, it } from 'vitest';
import { guideArticles, guideList } from '@content/guides';
import { workFromHomeSpeedGuide } from '@content/guides-internet';
import {
  internetPlansByProvince,
  internetProvinceNames,
  internetProvinces,
} from '@content/home-internet';
import { findGuide, guideFaqSchema } from './guide-content';

const isTvBundle = (id: string) => id.includes('-tv-') || id.includes('streamsaver');

describe('work-from-home speed guide', () => {
  it('is registered, listed and has a FAQ for search', () => {
    expect(findGuide(workFromHomeSpeedGuide.slug)).toBe(workFromHomeSpeedGuide);
    expect(guideArticles.filter((a) => a.slug === workFromHomeSpeedGuide.slug)).toHaveLength(1);
    expect(guideList.map((g) => g.href)).toContain(`/guides/${workFromHomeSpeedGuide.slug}`);
    expect(guideFaqSchema(workFromHomeSpeedGuide)?.mainEntity.length).toBeGreaterThanOrEqual(6);
  });

  it('keeps the plan table in step with the internet catalogue', () => {
    const table = workFromHomeSpeedGuide.blocks.find(
      (block) => block.kind === 'table' && block.id === 'our-plans',
    );
    if (table?.kind !== 'table') throw new Error('our-plans table is missing');
    for (const province of internetProvinces) {
      const row = table.rows.find((r) => r.label === internetProvinceNames[province]);
      expect(row, province).toBeDefined();
      for (const plan of internetPlansByProvince[province].filter((p) => !isTvBundle(p.id))) {
        expect(row?.values[0], plan.id).toContain(`$${plan.priceCad}`);
      }
    }
  });

  it('sends its plan button to home internet, not the eSIM page', () => {
    const cta = workFromHomeSpeedGuide.blocks.find((block) => block.kind === 'plan-cta');
    expect(cta?.kind === 'plan-cta' ? cta.href : undefined).toBe('/home-internet');
  });
});
