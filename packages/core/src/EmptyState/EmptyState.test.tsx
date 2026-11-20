import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders emblem, copy, PrimaryButton CTA, stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onAction = vi.fn();

    render(
      <EmptyState
        ref={ref}
        title="No active snapshots"
        description="Create a baseline optical snapshot to begin."
        actionLabel="Create snapshot"
        onAction={onAction}
        className="custom-empty"
        data-testid="empty-root"
      />
    );

    const root = screen.getByTestId('empty-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-empty-state', 'prism-slab', 'custom-empty');
    expect(screen.getByRole('heading', { name: 'No active snapshots' })).toBeInTheDocument();
    expect(screen.getByText('Create a baseline optical snapshot to begin.')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: 'Create snapshot' });
    expect(btn).toHaveClass('refractor-primary-button');
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('supports custom icon, xstyle, and theme component overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { EmptyState: { className: 'theme-empty', style: { padding: '24px' } } },
        }}
      >
        <EmptyState
          title="No assets"
          description="Upload tokens to populate."
          actionLabel="Upload"
          onAction={vi.fn()}
          icon={<span data-testid="custom-icon">ICON</span>}
          className="local-empty"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="themed-empty"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-empty');
    expect(root).toHaveClass('refractor-empty-state', 'theme-empty', 'local-empty');
    expect(root).toHaveStyle({ padding: '24px' });
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('safely renders adversarial XSS payloads in title, description, and actionLabel', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <EmptyState
        title={payload}
        description={payload}
        actionLabel={payload}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: payload })).toBeInTheDocument();
    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();
  });
});
