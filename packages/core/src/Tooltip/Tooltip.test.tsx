import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('shows and hides on hover, focus, blur, and Escape while forwarding ref/className', () => {
    const ref = createRef<HTMLSpanElement>();
    const onMouseEnter = vi.fn();

    render(
      <Tooltip
        ref={ref}
        content="Copy refraction CSS"
        placement="top"
        onMouseEnter={onMouseEnter}
        className="custom-tip"
        data-testid="tip-wrap"
      >
        <button type="button">Copy</button>
      </Tooltip>
    );

    const wrap = screen.getByTestId('tip-wrap');
    expect(ref.current).toBe(wrap);
    expect(wrap).toHaveClass('refractor-tooltip', 'custom-tip');
    expect(wrap).toHaveAttribute('data-placement', 'top');
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Hover reveal + composed external handler
    fireEvent.mouseEnter(wrap);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Copy refraction CSS');
    expect(tip).toHaveClass('bottom-full');
    expect(wrap).toHaveAttribute('aria-describedby', tip.id);
    expect(wrap).toHaveAttribute('data-open', 'true');

    fireEvent.mouseLeave(wrap);
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Focus / Escape / Blur lifecycle
    const btn = screen.getByRole('button', { name: 'Copy' });
    fireEvent.focus(btn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(wrap, { key: 'Tab' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(wrap, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(btn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('supports bottom placement and applies theme component overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { Tooltip: { className: 'theme-tip', style: { margin: '4px' } } },
        }}
      >
        <Tooltip content="Bottom hint" placement="bottom" className="local-tip" data-testid="bottom-tip">
          <button type="button">Hover me</button>
        </Tooltip>
      </PrismThemeProvider>
    );

    const wrap = screen.getByTestId('bottom-tip');
    expect(wrap).toHaveClass('refractor-tooltip', 'theme-tip', 'local-tip');
    expect(wrap).toHaveStyle({ margin: '4px' });

    fireEvent.mouseEnter(wrap);
    expect(screen.getByRole('tooltip')).toHaveClass('top-full');
  });

  it('suppresses empty tooltip content and safely renders adversarial XSS strings', () => {
    const { rerender } = render(
      <Tooltip content="" data-testid="empty-tip">
        <button type="button">No tip</button>
      </Tooltip>
    );

    const wrap = screen.getByTestId('empty-tip');
    fireEvent.mouseEnter(wrap);
    expect(screen.queryByRole('tooltip')).toBeNull();

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <Tooltip content={payload} data-testid="empty-tip">
        <button type="button">XSS tip</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(wrap);
    expect(screen.getByRole('tooltip')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
