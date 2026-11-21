import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { AlertBanner, type AlertBannerSeverity } from './AlertBanner';

describe('AlertBanner', () => {
  it('renders severity, title, message, action/dismiss handlers, stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onAction = vi.fn();
    const onDismiss = vi.fn();

    render(
      <AlertBanner
        ref={ref}
        severity="warning"
        title="Token migration"
        message="Update shadow references to prism optics."
        actionLabel="Inspect"
        onAction={onAction}
        onDismiss={onDismiss}
        className="custom-alert"
        data-testid="alert-root"
      />
    );

    const root = screen.getByTestId('alert-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'alert');
    expect(root).toHaveAttribute('data-severity', 'warning');
    expect(root).toHaveClass('refractor-alert-banner', 'prism-slab', 'ring-amber-400/60', 'custom-alert');
    expect(screen.getByText('Token migration')).toBeInTheDocument();
    expect(screen.getByText('Update shadow references to prism optics.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(onAction).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('supports all severities, omits controls when callbacks are absent, and respects theme overrides', () => {
    const severities: AlertBannerSeverity[] = ['info', 'success', 'warning', 'error'];
    render(
      <PrismThemeProvider
        theme={{
          components: { AlertBanner: { className: 'theme-alert', style: { marginBottom: '8px' } } },
        }}
      >
        {severities.map((sev) => (
          <AlertBanner
            key={sev}
            severity={sev}
            title={`Alert ${sev}`}
            message={`Body ${sev}`}
            actionLabel="Orphan label"
            className="local-alert"
            data-testid={`alert-${sev}`}
          />
        ))}
        <AlertBanner title="Default info" message="Fallback" data-testid="alert-default" />
        <AlertBanner
          title="Dismiss only"
          message="No primary action"
          onDismiss={vi.fn()}
          data-testid="alert-dismiss-only"
        />
      </PrismThemeProvider>
    );

    for (const sev of severities) {
      const el = screen.getByTestId(`alert-${sev}`);
      expect(el).toHaveAttribute('data-severity', sev);
      expect(el).toHaveClass('refractor-alert-banner', 'theme-alert', 'local-alert');
      expect(el).toHaveStyle({ marginBottom: '8px' });
    }
    expect(screen.getByTestId('alert-default')).toHaveAttribute('data-severity', 'info');
    expect(screen.getByTestId('alert-dismiss-only')).toBeInTheDocument();
    // actionLabel without onAction does not render an action button (negative check)
    expect(screen.queryByRole('button', { name: 'Orphan label' })).toBeNull();
  });

  it('safely renders adversarial XSS payloads in title, message, and actionLabel', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <AlertBanner
        severity="error"
        title={payload}
        message={payload}
        actionLabel={payload}
        onAction={vi.fn()}
      />
    );

    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();
  });
});
