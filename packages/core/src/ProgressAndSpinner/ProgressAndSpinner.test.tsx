import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ProgressAndSpinner } from './ProgressAndSpinner';

describe('ProgressAndSpinner', () => {
  it('renders clamped progressbar, spinner, stable class, data attrs, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <ProgressAndSpinner
        ref={ref}
        progress={68}
        label="Building refractive bundle"
        spinnerLabel="Syncing cache..."
        className="custom-prog"
        data-testid="prog-root"
      />
    );

    const root = screen.getByTestId('prog-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-progress-and-spinner', 'space-y-4', 'custom-prog');
    expect(root).toHaveAttribute('data-indeterminate', 'true');

    const bar = screen.getByRole('progressbar', { name: 'Building refractive bundle' });
    expect(bar).toHaveAttribute('aria-valuenow', '68');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar.firstElementChild).toHaveStyle({ width: '68%' });
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.getByText('Syncing cache...')).toBeInTheDocument();
  });

  it('hides spinner when indeterminateSpinner is false and respects theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { ProgressAndSpinner: { className: 'theme-prog', style: { maxWidth: '360px' } } },
        }}
      >
        <ProgressAndSpinner
          progress={45}
          indeterminateSpinner={false}
          className="local-prog"
          data-testid="no-spin"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('no-spin');
    expect(root).toHaveClass('refractor-progress-and-spinner', 'theme-prog', 'local-prog');
    expect(root).toHaveStyle({ maxWidth: '360px' });
    expect(root).not.toHaveAttribute('data-indeterminate');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('clamps negative, overflowing, NaN, and Infinity progress safely (adversarial)', () => {
    const { rerender } = render(<ProgressAndSpinner progress={-42} />);
    let bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar.firstElementChild).toHaveStyle({ width: '0%' });
    expect(screen.getByText('0%')).toBeInTheDocument();

    rerender(<ProgressAndSpinner progress={175} />);
    bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar.firstElementChild).toHaveStyle({ width: '100%' });
    expect(screen.getByText('100%')).toBeInTheDocument();

    rerender(<ProgressAndSpinner progress={Number.NaN} />);
    bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar.firstElementChild).toHaveStyle({ width: '0%' });

    rerender(<ProgressAndSpinner progress={Number.POSITIVE_INFINITY} />);
    bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('safely renders adversarial XSS payloads in label and spinnerLabel as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<ProgressAndSpinner progress={50} label={payload} spinnerLabel={payload} />);

    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(document.querySelector('script')).toBeNull();
  });
});
