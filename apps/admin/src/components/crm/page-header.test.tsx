import { render, screen } from '@testing-library/react';
import { ClipboardListIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('names the page in a level-one heading with its record count', () => {
    render(<PageHeader icon={ClipboardListIcon} title="Orders" count={1234} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('Orders');
    expect(screen.getByText('1,234')).toBeTruthy();
  });

  it('shows the actions it is given on the right', () => {
    render(
      <PageHeader icon={ClipboardListIcon} title="Orders">
        <button type="button">New view</button>
      </PageHeader>,
    );
    expect(screen.getByRole('button', { name: 'New view' })).toBeTruthy();
  });
});
