import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders unchecked and checked states, description, stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLLabelElement>();
    const onChange = vi.fn();

    const { rerender } = render(
      <Checkbox
        ref={ref}
        checked={false}
        onChange={onChange}
        label="Enable caustics"
        description="Dispersion glow on crystal edges"
        className="custom-cb"
        style={{ padding: '4px' }}
        xstyle={{ '--prism-blur-px': '12px' }}
        data-testid="cb-root"
      />
    );

    const root = screen.getByTestId('cb-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-checkbox', 'cursor-pointer', 'custom-cb');
    expect(root).toHaveStyle({ padding: '4px' });
    expect(root).not.toHaveAttribute('data-checked');
    expect(screen.getByText('Dispersion glow on crystal edges')).toBeInTheDocument();

    const box = screen.getByRole('checkbox', { name: 'Enable caustics' });
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(box).toHaveClass('prism-crystal', 'prism-focus-ring');

    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <Checkbox
        ref={ref}
        checked
        onChange={onChange}
        label="Enable caustics"
        data-testid="cb-root"
      />
    );

    expect(root).toHaveAttribute('data-checked', 'true');
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(box).toHaveClass('prism-emerald');

    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('supports indeterminate mixed state and theme component overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            Checkbox: { className: 'theme-cb', style: { gap: '14px' } },
          },
        }}
      >
        <Checkbox
          checked={false}
          indeterminate
          onChange={vi.fn()}
          label="Select all tokens"
          className="local-cb"
          data-testid="mixed-cb"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('mixed-cb');
    expect(root).toHaveClass('refractor-checkbox', 'theme-cb', 'local-cb');
    expect(root).toHaveAttribute('data-indeterminate', 'true');
    expect(root).toHaveStyle({ gap: '14px' });

    const box = screen.getByRole('checkbox', { name: 'Select all tokens' });
    expect(box).toHaveAttribute('aria-checked', 'mixed');
    expect(box).toHaveClass('prism-emerald');
  });

  it('blocks toggling when disabled and reflects data-disabled (negative test)', () => {
    const onChange = vi.fn();
    render(
      <Checkbox
        checked={false}
        disabled
        onChange={onChange}
        label="Locked option"
        data-testid="disabled-cb"
      />
    );

    const root = screen.getByTestId('disabled-cb');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveClass('cursor-not-allowed');

    const box = screen.getByRole('checkbox', { name: 'Locked option' });
    expect(box).toBeDisabled();
    fireEvent.click(box);
    fireEvent.click(screen.getByText('Locked option'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS strings in label and description', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <Checkbox
        checked={false}
        onChange={vi.fn()}
        label={payload}
        description={payload}
      />
    );
    expect(screen.getByRole('checkbox', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
