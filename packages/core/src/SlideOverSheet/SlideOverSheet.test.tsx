import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SlideOverSheet } from './SlideOverSheet';

describe('SlideOverSheet', () => {
  it('returns null when closed and ignores Escape key (negative test)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SlideOverSheet open={false} title="Hidden Sheet" onClose={onClose}>
        Hidden
      </SlideOverSheet>
    );

    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders right mode sheet with title, subtitle, dismissal pathways, and forwards ref/className', () => {
    const ref = createRef<HTMLDivElement>();
    const onClose = vi.fn();

    render(
      <SlideOverSheet
        ref={ref}
        open
        mode="right"
        title="Inspector"
        subtitle="Surface physics"
        onClose={onClose}
        className="custom-sheet"
        data-testid="sheet"
      >
        <p>Sheet content body</p>
      </SlideOverSheet>
    );

    const dialog = screen.getByTestId('sheet');
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveClass('refractor-slide-over-sheet', 'custom-sheet');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-mode', 'right');
    expect(screen.getByRole('dialog', { name: 'Inspector' })).toBe(dialog);
    expect(screen.getByText('Surface physics')).toBeInTheDocument();

    // Inner sheet click does not dismiss
    fireEvent.click(screen.getByText('Sheet content body'));
    expect(onClose).not.toHaveBeenCalled();

    // Close icon, Done button, Escape, Backdrop all dismiss
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('supports bottom mode without subtitle and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { SlideOverSheet: { className: 'theme-sheet', style: { zIndex: 80 } } },
        }}
      >
        <SlideOverSheet
          open
          mode="bottom"
          title="Quick Sheet"
          onClose={vi.fn()}
          className="local-sheet"
          data-testid="bottom-sheet"
        >
          Bottom body
        </SlideOverSheet>
      </PrismThemeProvider>
    );

    const dialog = screen.getByTestId('bottom-sheet');
    expect(dialog).toHaveClass('refractor-slide-over-sheet', 'theme-sheet', 'local-sheet');
    expect(dialog).toHaveAttribute('data-mode', 'bottom');
    expect(dialog).toHaveStyle({ zIndex: 80 });
    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(dialog.querySelector('.prism-slab')).toHaveClass('mt-auto');
  });

  it('safely renders adversarial XSS title and subtitle strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <SlideOverSheet open title={payload} subtitle={payload} onClose={vi.fn()}>
        {payload}
      </SlideOverSheet>
    );

    expect(screen.getByRole('heading', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
