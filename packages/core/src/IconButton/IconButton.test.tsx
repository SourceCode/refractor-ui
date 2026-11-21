import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('renders accessible icon button, active state, size variants, and forwards React 19 ref', () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    render(
      <IconButton
        ref={ref}
        aria-label="Pin workspace"
        size="lg"
        active
        className="custom-icon"
        xstyle={{ '--prism-specular-opacity': 0.8 }}
        data-testid="icon-btn"
        onClick={onClick}
      >
        <span aria-hidden="true">*</span>
      </IconButton>
    );

    const btn = screen.getByTestId('icon-btn');
    expect(ref.current).toBe(btn);
    expect(btn).toHaveClass(
      'refractor-icon-button',
      'prism-crystal',
      'prism-focus-ring',
      'ring-2',
      'enabled:hover:-translate-y-0.5',
      'custom-icon'
    );
    expect(btn).toHaveAttribute('aria-label', 'Pin workspace');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('data-size', 'lg');
    expect(btn).toHaveAttribute('data-active', 'true');

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports sm/md sizes, inactive state, and theme component overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            IconButton: { className: 'theme-icon', style: { opacity: 0.95 } },
          },
        }}
      >
        <IconButton aria-label="Small action" size="sm" className="local-icon">
          S
        </IconButton>
        <IconButton aria-label="Medium action">M</IconButton>
      </PrismThemeProvider>
    );

    const small = screen.getByRole('button', { name: 'Small action' });
    expect(small).toHaveClass('refractor-icon-button', 'theme-icon', 'local-icon');
    expect(small).toHaveAttribute('aria-pressed', 'false');
    expect(small).toHaveAttribute('data-size', 'sm');
    expect(small).not.toHaveAttribute('data-active');
    expect(small).toHaveStyle({ opacity: '0.95' });

    const medium = screen.getByRole('button', { name: 'Medium action' });
    expect(medium).toHaveAttribute('data-size', 'md');
  });

  it('blocks clicks when disabled (negative test)', () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Locked action" disabled onClick={onClick}>
        X
      </IconButton>
    );

    const btn = screen.getByRole('button', { name: 'Locked action' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('data-disabled', 'true');
    expect(btn).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS content as literal text and attribute value', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<IconButton aria-label={payload}>{payload}</IconButton>);
    const btn = screen.getByRole('button', { name: payload });
    expect(btn).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
