import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SkeletonLoader } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders busy placeholder when loading, switches to children when loaded, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    const { rerender } = render(
      <SkeletonLoader
        ref={ref}
        loading={true}
        className="custom-skel"
        data-testid="skel-root"
      >
        <p>Resolved profile</p>
      </SkeletonLoader>
    );

    const root = screen.getByTestId('skel-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-skeleton-loader', 'prism-slab', 'custom-skel');
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(root).toHaveAttribute('aria-label', 'Loading content placeholder');
    expect(root).toHaveAttribute('data-loading', 'true');
    expect(screen.queryByText('Resolved profile')).toBeNull();

    rerender(
      <SkeletonLoader
        ref={ref}
        loading={false}
        className="custom-skel"
        data-testid="skel-root"
      >
        <p>Resolved profile</p>
      </SkeletonLoader>
    );

    const loadedRoot = screen.getByTestId('skel-root');
    expect(ref.current).toBe(loadedRoot);
    expect(loadedRoot).toHaveClass('refractor-skeleton-loader', 'custom-skel');
    expect(loadedRoot).not.toHaveAttribute('aria-busy');
    expect(loadedRoot).not.toHaveAttribute('data-loading');
    expect(screen.getByText('Resolved profile')).toBeInTheDocument();
  });

  it('falls back to placeholder when loading is false but children are omitted (negative test)', () => {
    render(<SkeletonLoader loading={false} data-testid="empty-skel" />);

    const root = screen.getByTestId('empty-skel');
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(root).toHaveAttribute('data-loading', 'true');
    expect(root).toHaveClass('prism-slab');
  });

  it('applies theme overrides and xstyle without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { SkeletonLoader: { className: 'theme-skel', style: { minHeight: '120px' } } },
        }}
      >
        <SkeletonLoader
          loading={true}
          className="local-skel"
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          data-testid="themed-skel"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-skel');
    expect(root).toHaveClass('refractor-skeleton-loader', 'theme-skel', 'local-skel');
    expect(root).toHaveStyle({ minHeight: '120px' });
  });

  it('safely renders adversarial XSS text children as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<SkeletonLoader loading={false}>{payload}</SkeletonLoader>);

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
