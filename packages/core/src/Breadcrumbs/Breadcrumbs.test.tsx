import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Breadcrumbs } from './Breadcrumbs';

const trail = [
  { id: 'home', label: 'Home' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'optics', label: 'Optics' },
];

describe('Breadcrumbs', () => {
  it('renders ancestor buttons, current page text, separators, and forwards ref/className', () => {
    const ref = createRef<HTMLElement>();
    const onNavigate = vi.fn();

    render(
      <Breadcrumbs
        ref={ref}
        items={trail}
        onNavigate={onNavigate}
        className="custom-crumbs"
        data-testid="crumbs"
      />
    );

    const nav = screen.getByTestId('crumbs');
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass('refractor-breadcrumbs', 'prism-crystal', 'custom-crumbs');
    expect(nav).toHaveAttribute('data-count', '3');

    const current = screen.getByText('Optics');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).toBe('SPAN');

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledWith('home');

    fireEvent.click(screen.getByRole('button', { name: 'Workspace' }));
    expect(onNavigate).toHaveBeenCalledWith('workspace');
  });

  it('supports single-item trail and theme component overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { Breadcrumbs: { className: 'theme-crumbs', style: { gap: '8px' } } },
        }}
      >
        <Breadcrumbs
          items={[{ id: 'root', label: 'Dashboard' }]}
          onNavigate={vi.fn()}
          className="local-crumbs"
        />
      </PrismThemeProvider>
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveClass('refractor-breadcrumbs', 'theme-crumbs', 'local-crumbs');
    expect(nav).toHaveStyle({ gap: '8px' });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Dashboard')).toHaveAttribute('aria-current', 'page');
  });

  it('handles empty items array and adversarial XSS labels safely', () => {
    const { container } = render(<Breadcrumbs items={[]} onNavigate={vi.fn()} />);
    expect(container.querySelectorAll('li')).toHaveLength(0);

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <Breadcrumbs
        items={[
          { id: 'parent', label: payload },
          { id: 'leaf', label: payload },
        ]}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
