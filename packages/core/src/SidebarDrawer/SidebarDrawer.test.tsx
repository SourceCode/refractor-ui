import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SidebarDrawer } from './SidebarDrawer';

const items = [
  { id: 'inbox', label: 'Inbox', count: 12, icon: <span data-testid="icon-inbox">I</span> },
  { id: 'drafts', label: 'Drafts', count: 0 },
  { id: 'archive', label: 'Archive' },
];

describe('SidebarDrawer', () => {
  it('renders items, icons, counts, active state, collapse/expand toggle, and forwards ref/className', () => {
    const ref = createRef<HTMLElement>();
    const onSelect = vi.fn();

    render(
      <SidebarDrawer
        ref={ref}
        title="Workspace"
        items={items}
        activeId="inbox"
        onSelect={onSelect}
        className="custom-drawer"
        data-testid="drawer"
      />
    );

    const aside = screen.getByTestId('drawer');
    expect(ref.current).toBe(aside);
    expect(aside).toHaveClass('refractor-sidebar-drawer', 'prism-slab', 'w-64', 'custom-drawer');
    expect(aside).toHaveAttribute('data-collapsible', 'true');
    expect(aside).not.toHaveAttribute('data-collapsed');
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByTestId('icon-inbox')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();

    const inboxBtn = screen.getByRole('button', { name: /Inbox/ });
    expect(inboxBtn).toHaveAttribute('aria-current', 'page');
    expect(inboxBtn).toHaveClass('prism-btn-primary');

    fireEvent.click(screen.getByRole('button', { name: /Drafts/ }));
    expect(onSelect).toHaveBeenCalledWith('drafts');

    const collapseBtn = screen.getByRole('button', { name: 'Collapse navigation drawer' });
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapseBtn);

    expect(aside).toHaveClass('w-16');
    expect(aside).toHaveAttribute('data-collapsed', 'true');
    expect(screen.queryByText('Workspace')).toBeNull();
    expect(screen.queryByText('12')).toBeNull();

    const collapsedInbox = screen.getByRole('button', { name: 'Inbox' });
    expect(collapsedInbox).toHaveAttribute('title', 'Inbox');

    const expandBtn = screen.getByRole('button', { name: 'Expand navigation drawer' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expandBtn);
    expect(aside).toHaveClass('w-64');
  });

  it('hides collapse toggle when collapsible is false and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { SidebarDrawer: { className: 'theme-drawer', style: { minHeight: '240px' } } },
        }}
      >
        <SidebarDrawer
          title="Fixed Rail"
          items={items}
          activeId="archive"
          onSelect={vi.fn()}
          collapsible={false}
          className="local-drawer"
        />
      </PrismThemeProvider>
    );

    const aside = screen.getByRole('complementary', { name: 'Fixed Rail' });
    expect(aside).toHaveClass('refractor-sidebar-drawer', 'theme-drawer', 'local-drawer');
    expect(aside).toHaveStyle({ minHeight: '240px' });
    expect(screen.queryByRole('button', { name: /navigation drawer/i })).toBeNull();
  });

  it('handles empty items and renders adversarial XSS titles/labels safely', () => {
    const payload = '<script>window.__xss=1</script><b>Evil</b>';
    render(
      <SidebarDrawer
        title={payload}
        items={[{ id: 'bad', label: payload }]}
        activeId="missing"
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();

    const { container } = render(
      <SidebarDrawer title="Empty" items={[]} activeId="" onSelect={vi.fn()} />
    );
    expect(container.querySelectorAll('aside button')).toHaveLength(1);
  });
});
