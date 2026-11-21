import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PrimaryButton } from './PrimaryButton';

describe('PrimaryButton', () => {
  it('renders label, icons, size variants, stable class, data attributes, and forwards React 19 ref', () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    render(
      <PrimaryButton
        ref={ref}
        size="lg"
        leadingIcon={<span data-testid="lead">L</span>}
        trailingIcon={<span data-testid="trail">T</span>}
        className="custom-btn"
        data-testid="cta"
        onClick={onClick}
      >
        Start project
      </PrimaryButton>
    );

    const btn = screen.getByTestId('cta');
    expect(ref.current).toBe(btn);
    expect(btn).toHaveClass('refractor-primary-button', 'prism-btn-primary', 'custom-btn');
    expect(btn).toHaveAttribute('data-size', 'lg');
    expect(screen.getByTestId('lead')).toBeInTheDocument();
    expect(screen.getByTestId('trail')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports sm/md sizes and applies theme component overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { PrimaryButton: { className: 'theme-cta', style: { letterSpacing: '1px' } } },
        }}
      >
        <PrimaryButton size="sm" className="local-cta">
          Small
        </PrimaryButton>
        <PrimaryButton>Medium</PrimaryButton>
      </PrismThemeProvider>
    );

    const small = screen.getByRole('button', { name: 'Small' });
    expect(small).toHaveClass('refractor-primary-button', 'theme-cta', 'local-cta');
    expect(small).toHaveStyle({ letterSpacing: '1px' });
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute('data-size', 'md');
  });

  it('blocks clicks when disabled (negative test)', () => {
    const onClick = vi.fn();
    render(
      <PrimaryButton disabled onClick={onClick}>
        Locked
      </PrimaryButton>
    );
    const btn = screen.getByRole('button', { name: 'Locked' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('data-disabled', 'true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS label strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<PrimaryButton>{payload}</PrimaryButton>);
    expect(screen.getByRole('button')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
