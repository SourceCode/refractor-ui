import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SecondaryButton } from './SecondaryButton';

describe('SecondaryButton', () => {
  it('renders label, icons, size and tone variants, stable class, data attributes, and forwards React 19 ref', () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    render(
      <SecondaryButton
        ref={ref}
        size="lg"
        tone="cobalt"
        leadingIcon={<span data-testid="lead">L</span>}
        trailingIcon={<span data-testid="trail">T</span>}
        className="custom-sec"
        style={{ marginTop: '4px' }}
        xstyle={{ '--prism-blur-px': '12px' }}
        data-testid="sec-cta"
        onClick={onClick}
      >
        Export tokens
      </SecondaryButton>
    );

    const btn = screen.getByTestId('sec-cta');
    expect(ref.current).toBe(btn);
    expect(btn).toHaveClass('refractor-secondary-button', 'prism-btn-cobalt', 'prism-focus-ring', 'custom-sec');
    expect(btn).toHaveAttribute('data-size', 'lg');
    expect(btn).toHaveAttribute('data-tone', 'cobalt');
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveStyle({ marginTop: '4px' });
    expect(screen.getByTestId('lead')).toBeInTheDocument();
    expect(screen.getByTestId('trail')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports default crystal tone, sm/md sizes, and theme component overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            SecondaryButton: { className: 'theme-sec', style: { letterSpacing: '0.5px' } },
          },
        }}
      >
        <SecondaryButton size="sm" className="local-sec">
          Small crystal
        </SecondaryButton>
        <SecondaryButton type="submit">Medium crystal</SecondaryButton>
      </PrismThemeProvider>
    );

    const small = screen.getByRole('button', { name: 'Small crystal' });
    expect(small).toHaveClass('refractor-secondary-button', 'prism-btn-secondary', 'theme-sec', 'local-sec');
    expect(small).toHaveAttribute('data-size', 'sm');
    expect(small).toHaveAttribute('data-tone', 'crystal');
    expect(small).toHaveStyle({ letterSpacing: '0.5px' });

    const medium = screen.getByRole('button', { name: 'Medium crystal' });
    expect(medium).toHaveAttribute('data-size', 'md');
    expect(medium).toHaveAttribute('type', 'submit');
  });

  it('blocks clicks when disabled and reflects data-disabled (negative test)', () => {
    const onClick = vi.fn();
    render(
      <SecondaryButton disabled onClick={onClick}>
        Unavailable
      </SecondaryButton>
    );

    const btn = screen.getByRole('button', { name: 'Unavailable' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('data-disabled', 'true');
    expect(btn).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS label strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<SecondaryButton>{payload}</SecondaryButton>);
    expect(screen.getByRole('button')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
