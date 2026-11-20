import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ToggleSwitch } from './ToggleSwitch';

describe('ToggleSwitch', () => {
  it('renders checked and unchecked states, stable class, data attrs, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    const { rerender } = render(
      <ToggleSwitch
        ref={ref}
        checked={false}
        onChange={onChange}
        label="Chromatic dispersion"
        className="custom-toggle"
        data-testid="toggle-root"
      />
    );

    const root = screen.getByTestId('toggle-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-toggle-switch', 'inline-flex', 'custom-toggle');
    expect(root).not.toHaveAttribute('data-checked');

    const switchBtn = screen.getByRole('switch', { name: 'Chromatic dispersion' });
    expect(switchBtn).toHaveAttribute('aria-checked', 'false');
    expect(switchBtn).toHaveClass('prism-crystal', 'prism-focus-ring');

    fireEvent.click(switchBtn);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <ToggleSwitch
        ref={ref}
        checked={true}
        onChange={onChange}
        label="Chromatic dispersion"
        data-testid="toggle-root"
      />
    );
    expect(root).toHaveAttribute('data-checked', 'true');
    expect(switchBtn).toHaveAttribute('aria-checked', 'true');
    expect(switchBtn).toHaveClass('prism-emerald');

    fireEvent.click(switchBtn);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('uses ariaLabel override and default accessible label when label is omitted, and respects theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { ToggleSwitch: { className: 'theme-toggle', style: { padding: '4px' } } },
        }}
      >
        <ToggleSwitch checked={false} onChange={vi.fn()} ariaLabel="Custom ARIA" className="local-t" />
        <ToggleSwitch checked={true} onChange={vi.fn()} data-testid="default-aria" />
      </PrismThemeProvider>
    );

    const custom = screen.getByRole('switch', { name: 'Custom ARIA' });
    expect(custom.parentElement).toHaveClass('refractor-toggle-switch', 'theme-toggle', 'local-t');
    expect(custom.parentElement).toHaveStyle({ padding: '4px' });

    const fallback = screen.getByRole('switch', { name: 'Toggle setting' });
    expect(fallback).toHaveAttribute('aria-checked', 'true');
  });

  it('blocks toggling when disabled (negative test)', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} disabled onChange={onChange} label="Locked switch" />);

    const switchBtn = screen.getByRole('switch', { name: 'Locked switch' });
    expect(switchBtn).toBeDisabled();
    expect(switchBtn.parentElement).toHaveAttribute('data-disabled', 'true');

    fireEvent.click(switchBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS label strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><svg onload=alert(1)>';
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label={payload} />);

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
