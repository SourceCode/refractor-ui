import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ToastSnackbar, type ToastSnackbarTone } from './ToastSnackbar';

describe('ToastSnackbar', () => {
  it('renders title, description, dismiss button, stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onDismiss = vi.fn();

    render(
      <ToastSnackbar
        ref={ref}
        title="Preset saved"
        description="Optical theme synced to storage"
        tone="emerald"
        onDismiss={onDismiss}
        className="custom-toast"
        data-testid="toast-root"
      />
    );

    const root = screen.getByTestId('toast-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'status');
    expect(root).toHaveAttribute('aria-live', 'polite');
    expect(root).toHaveAttribute('data-tone', 'emerald');
    expect(root).toHaveClass('refractor-toast-snackbar', 'prism-crystal', 'prism-toast', 'custom-toast');
    expect(screen.getByText('Preset saved')).toBeInTheDocument();
    expect(screen.getByText('Optical theme synced to storage')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss Preset saved notification' });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('supports all tones, omits dismiss button when onDismiss is absent, and merges theme overrides', () => {
    const tones: ToastSnackbarTone[] = ['amber', 'emerald', 'info', 'critical'];
    render(
      <PrismThemeProvider
        theme={{
          components: { ToastSnackbar: { className: 'theme-toast', style: { minWidth: '220px' } } },
        }}
      >
        {tones.map((tone) => (
          <ToastSnackbar
            key={tone}
            title={`Toast ${tone}`}
            tone={tone}
            className="local-toast"
            data-testid={`toast-${tone}`}
          />
        ))}
        <ToastSnackbar title="Default tone" data-testid="toast-default" />
      </PrismThemeProvider>
    );

    for (const tone of tones) {
      const el = screen.getByTestId(`toast-${tone}`);
      expect(el).toHaveAttribute('data-tone', tone);
      expect(el).toHaveClass('refractor-toast-snackbar', 'theme-toast', 'local-toast');
      expect(el).toHaveStyle({ minWidth: '220px' });
    }
    expect(screen.getByTestId('toast-default')).toHaveAttribute('data-tone', 'amber');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('safely renders adversarial XSS payloads in title and description as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<ToastSnackbar title={payload} description={payload} onDismiss={vi.fn()} />);

    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(screen.getByRole('button', { name: `Dismiss ${payload} notification` })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
