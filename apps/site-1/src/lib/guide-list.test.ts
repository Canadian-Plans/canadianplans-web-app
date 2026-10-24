import { describe, expect, it } from 'vitest';
import { guideList } from '@content/guides';
import { filterGuides } from './guide-list';
describe('guide list filters', () => {
  it('keeps source order and filters combined category and search terms', () => {
    expect(filterGuides('', 'all')).toEqual(guideList);
    expect(filterGuides('  INDIA  students ', 'phones').map((guide) => guide.id)).toEqual([
      'best-sim-for-students-from-india',
    ]);
    expect(filterGuides('vancouver', 'internet').map((guide) => guide.id)).toEqual([
      'vancouver-internet',
    ]);
    expect(filterGuides('vancouver', 'phones')).toEqual([]);
  });
  it('finds device terminology in supplied metadata and handles no results', () => {
    expect(filterGuides('compatibility', 'phones').map((guide) => guide.id)).toEqual([
      'foreign-phone-compatibility-canada',
      'will-my-phone-work-in-canada',
      'student-sim',
    ]);
    expect(filterGuides('unmatched-preview-xyz', 'all')).toEqual([]);
    expect(filterGuides('', 'all', [])).toEqual([]);
  });
  it('links every card to a real page', () => {
    for (const guide of guideList)
      expect(guide.href).toMatch(
        /^\/(guides|pre-arrival-sim|compare|mobile-plans|home-internet)\//u,
      );
  });
  it('does not mutate the registry or treat markup as executable input', () => {
    const ids = guideList.map((guide) => guide.id);
    filterGuides('<script>alert(1)</script>', 'all');
    expect(guideList.map((guide) => guide.id)).toEqual(ids);
  });
});
