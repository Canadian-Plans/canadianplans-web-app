import { describe, expect, it } from 'vitest';
import { buildLandingSchema, serializeLandingSchema } from './landing-schema';

const crumbs = [{ label: 'Home', href: '/' }, { label: 'Students' }];

describe('buildLandingSchema', () => {
  it('lists approved answers and skips pending ones', () => {
    const schema = buildLandingSchema('https://example.test', crumbs, [
      { id: 'a', question: 'When do I order?', answer: '1 to 3 weeks before.' },
      { id: 'b', question: 'Student discount?', answer: 'Ask an advisor.', pending: true },
    ]);
    const faq = schema['@graph'].find((node) => node['@type'] === 'FAQPage');
    expect(faq && 'mainEntity' in faq ? faq.mainEntity.map((q) => q.name) : []).toEqual([
      'When do I order?',
    ]);
  });

  it('omits FAQPage when nothing is approved and links only crumbs with an href', () => {
    const schema = buildLandingSchema('https://example.test', crumbs, [
      { id: 'b', question: 'Q', answer: 'A', pending: true },
    ]);
    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['BreadcrumbList']);
    const list = schema['@graph'][0];
    expect(list && 'itemListElement' in list ? list.itemListElement : []).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.test/' },
      { '@type': 'ListItem', position: 2, name: 'Students' },
    ]);
  });

  it('escapes script terminators', () => {
    const schema = buildLandingSchema('https://example.test', [{ label: '</script>' }], []);
    expect(serializeLandingSchema(schema)).not.toContain('</script>');
  });
});
