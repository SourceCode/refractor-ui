import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PrismList, type PrismListItem } from './PrismList';

const ITEMS: PrismListItem[] = [
  {
    id: 'l1',
    title: 'Refraction Token Audit',
    subtitle: 'Verified contrast across Alabaster and Obsidian',
    meta: '2m ago',
    leading: <span data-testid="lead-icon">*</span>,
    actionLabel: 'View',
  },
  {
    id: 'l2',
    title: 'Minimal Entry',
    subtitle: 'No leading icon, meta, or action',
  },
];

describe('PrismList', () => {
  it('renders rows with leading icon, meta, action button, ref forwarding, and fires onItemAction', () => {
    const ref = createRef<HTMLUListElement>();
    const onItemAction = vi.fn();

    render(
      <PrismList
        ref={ref}
        items={ITEMS}
        onItemAction={onItemAction}
        className="custom-list"
        data-testid="prism-list"
      />
    );

    const list = screen.getByTestId('prism-list');
    expect(ref.current).toBe(list);
    expect(list.tagName).toBe('UL');
    expect(list).toHaveClass('refractor-prism-list', 'prism-slab', 'custom-list');
    expect(screen.getByTestId('lead-icon')).toBeInTheDocument();
    expect(screen.getByText('2m ago')).toBeInTheDocument();
    expect(screen.getByText('Minimal Entry')).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: 'View' });
    fireEvent.click(actionBtn);
    expect(onItemAction).toHaveBeenCalledTimes(1);
    expect(onItemAction).toHaveBeenCalledWith(ITEMS[0]);
  });

  it('omits action buttons when onItemAction is omitted and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { PrismList: { className: 'theme-list', style: { maxWidth: '500px' } } },
        }}
      >
        <PrismList items={ITEMS} className="local-list" data-testid="themed-list" />
      </PrismThemeProvider>
    );

    const list = screen.getByTestId('themed-list');
    expect(list).toHaveClass('refractor-prism-list', 'theme-list', 'local-list');
    expect(list).toHaveStyle({ maxWidth: '500px' });
    expect(screen.queryByRole('button', { name: 'View' })).toBeNull();
  });

  it('handles empty items array cleanly (negative test)', () => {
    render(<PrismList items={[]} data-testid="empty-list" />);
    const list = screen.getByTestId('empty-list');
    expect(list).toHaveAttribute('data-empty', 'true');
    expect(list.children).toHaveLength(0);
  });

  it('safely renders adversarial XSS content as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <PrismList
        items={[{ id: 'xss', title: payload, subtitle: payload, meta: payload }]}
      />
    );
    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();
  });
});
