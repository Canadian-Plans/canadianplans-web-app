import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CpCtaBand, CpStepTimeline } from './redesign';

describe('redesign primitives', () => {
  it('renders steps as an ordered list with the done marker flagged', () => {
    const { container } = render(
      <CpStepTimeline
        tone="amber"
        label="How it works"
        steps={[
          { id: 'a', marker: '1', title: 'One', body: 'First' },
          { id: 'b', marker: '✓', title: 'Two', body: 'Done', done: true },
        ]}
      />,
    );
    expect(container.querySelector('ol[aria-label="How it works"]')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('li[data-done="true"]')).not.toBeNull();
  });
  it('renders the CTA band links from content', () => {
    const { getByRole } = render(
      <CpCtaBand
        tone="navy"
        content={{
          title: 'Title',
          subtitle: 'Sub',
          primary: { label: 'Go', href: '/go' },
          secondary: { label: 'Help', href: '/help' },
        }}
      />,
    );
    expect(getByRole('link', { name: 'Go' }).getAttribute('href')).toBe('/go');
    expect(getByRole('link', { name: 'Help' }).getAttribute('href')).toBe('/help');
  });
});
