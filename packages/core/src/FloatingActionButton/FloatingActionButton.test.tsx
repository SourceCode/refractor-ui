import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { FloatingActionButton } from './FloatingActionButton';

describe('FloatingActionButton', () => {
  it('renders extended FAB with custom icon, tone, ref, and click handler', () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    render(
      <FloatingActionButton
        ref={ref}
        label="New note"
        tone="cobalt"
        icon={<span data-testid="fab-icon">+</span>}
        className="custom-fab"
        xstyle={{ '--prism-caustic-opacity': 1.2 }}
        data-testid="fab"
        onClick={onClick}
      />
    );

    const btn = screen.getByTestId('fab');
    expect(ref.current).toBe(btn);
    expect(btn).toHaveClass('refractor-floating-action-button', 'prism-btn-cobalt', 'prism-focus-ring', 'h-14', 'px-6', 'custom-fab');
    expect(btn).toHaveAttribute('aria-label', 'New note');
    expect(btn).toHaveAttribute('data-tone', 'cobalt');
    expect(btn).toHaveAttribute('data-extended', 'true');
    expect(screen.getByTestId('fab-icon')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports compact circular default primary and crystal tones with theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            FloatingActionButton: { className: 'theme-fab', style: { bottom: '24px' } },
          },
        }}
      >
        <FloatingActionButton className="local-fab" />
        <FloatingActionButton tone="crystal" aria-label="Create preset" />
      </PrismThemeProvider>
    );

    const defaultFab = screen.getByRole('button', { name: 'Quick create action' });
    expect(defaultFab).toHaveClass('refractor-floating-action-button', 'prism-btn-primary', 'w-14', 'h-14', 'theme-fab', 'local-fab');
    expect(defaultFab).toHaveAttribute('data-tone', 'primary');
    expect(defaultFab).not.toHaveAttribute('data-extended');
    expect(defaultFab).toHaveStyle({ bottom: '24px' });

    const crystalFab = screen.getByRole('button', { name: 'Create preset' });
    expect(crystalFab).toHaveClass('prism-crystal');
    expect(crystalFab).toHaveAttribute('data-tone', 'crystal');
  });

  it('blocks clicks when disabled (negative test)', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton label="Locked" disabled onClick={onClick} />);

    const btn = screen.getByRole('button', { name: 'Locked' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('data-disabled', 'true');
    expect(btn).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS label strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<FloatingActionButton label={payload} />);
    expect(screen.getByRole('button', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
