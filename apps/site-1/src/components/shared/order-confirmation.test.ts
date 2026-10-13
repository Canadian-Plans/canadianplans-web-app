import { createElement } from 'react';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, describe, expect, it, vi } from 'vitest';
// The site's TSX-preserve test transform uses the classic JSX global; render with real React.
vi.stubGlobal('React', React);
afterAll(() => vi.unstubAllGlobals());
import { OrderConfirmation } from './order-confirmation';
describe('shared order confirmation', () => {
  it('keeps live reference/email presentation', () => {
    const html = renderToStaticMarkup(
      createElement(OrderConfirmation, {
        kind: 'saved',
        reference: 'TEST-REFERENCE',
        email: 'preview@example.test',
      }),
    );
    expect(html).toContain('Order received');
    expect(html).toContain('data-testid="order-reference"');
    expect(html).toContain('TEST-REFERENCE');
    expect(html).toContain('preview@example.test');
  });
  it('does not claim a saved order without a reference', () => {
    const html = renderToStaticMarkup(createElement(OrderConfirmation, { kind: 'missing' }));
    expect(html).toContain('Not saved');
    expect(html).not.toContain('order-reference');
  });
  it('preview explicitly denies order creation and sends, with no order reference', () => {
    const html = renderToStaticMarkup(
      createElement(OrderConfirmation, { kind: 'preview', onBack: () => {} }),
    );
    expect(html).toContain('Preview completed');
    expect(html).toContain('No order was created');
    expect(html).toContain('no confirmation email or message was sent');
    expect(html).not.toContain('order-reference');
    expect(html).not.toContain('Order received');
  });
});
