import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CpFaqAccordion } from './elements';

const items = [
  { id: 'first', question: 'First question', answer: 'First answer' },
  { id: 'second', question: 'Second question', answer: 'Second answer' },
];
const symbols = { expand: '+', collapse: '−' };
describe('CpFaqAccordion disclosure modes', () => {
  it('does not put multiple initially open answers in an exclusive HTML group', () => {
    const { container } = render(
      <CpFaqAccordion
        items={items}
        name="faq"
        defaultOpenIds={['first', 'second']}
        symbols={symbols}
      />,
    );
    const answers = [...container.querySelectorAll('details')];
    expect(answers.every((answer) => answer.open)).toBe(true);
    expect(answers.every((answer) => !answer.hasAttribute('name'))).toBe(true);
  });
  it('retains an exclusive group when only one answer starts open', () => {
    const { container } = render(
      <CpFaqAccordion items={items} name="faq" defaultOpenId="first" symbols={symbols} />,
    );
    expect(container.querySelectorAll('details[open]')).toHaveLength(1);
    expect(
      [...container.querySelectorAll('details')].every(
        (answer) => answer.getAttribute('name') === 'faq',
      ),
    ).toBe(true);
  });
});
