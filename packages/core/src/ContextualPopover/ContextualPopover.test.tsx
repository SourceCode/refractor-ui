import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ContextualPopover } from './ContextualPopover';

describe('ContextualPopover', () => {
  it('toggles popover from trigger button, fires CTA/close handlers, closes on Escape, and forwards ref/className', () => {
    const ref = createRef<HTMLDivElement>();
    const onCtaClick = vi.fn();
    const onClose = vi.fn();

    render(
      <ContextualPopover
        ref={ref}
        onCtaClick={onCtaClick}
        onClose={onClose}
        className="custom-popover"
        data-testid="popover"
      />
    );

    const root = screen.getByTestId('popover');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-contextual-popover', 'custom-popover');

    const trigger = screen.getByRole('button', { name: 'Open Contextual Card' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Find files...')).toBeNull();

    // Open popover
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Find files...')).toBeInTheDocument();

    // Subtitle and CTA click
    fireEvent.click(screen.getByRole('button', { name: 'Add collaborator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pro plan' }));
    expect(onCtaClick).toHaveBeenCalledTimes(2);

    // Close via close button
    fireEvent.click(screen.getByRole('button', { name: 'Close contextual card' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Find files...')).toBeNull();

    // Reopen and verify non-Escape key keeps open, then Escape closes
    fireEvent.click(trigger);
    expect(screen.getByText('Find files...')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('Find files...')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Find files...')).toBeNull();
  });

  it('renders inline specimen directly with theme overrides and preserves card on close click', () => {
    const ref = createRef<HTMLDivElement>();
    const onClose = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ContextualPopover: { className: 'theme-popover', style: { maxWidth: '300px' } },
          },
        }}
      >
        <ContextualPopover
          ref={ref}
          inlineSpecimen
          title="Quick Invite"
          subtitle="Share link"
          ctaLabel="Upgrade"
          onClose={onClose}
          className="local-popover"
          data-testid="inline-card"
        />
      </PrismThemeProvider>
    );

    const card = screen.getByTestId('inline-card');
    expect(ref.current).toBe(card);
    expect(card).toHaveClass('refractor-contextual-popover', 'prism-slab', 'theme-popover', 'local-popover');
    expect(card).toHaveAttribute('data-inline', 'true');
    expect(card).toHaveStyle({ maxWidth: '300px' });

    fireEvent.click(screen.getByRole('button', { name: 'Close contextual card' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Quick Invite')).toBeInTheDocument();
  });

  it('safely renders adversarial XSS content as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <ContextualPopover
        inlineSpecimen
        title={payload}
        subtitle={payload}
        ctaLabel={payload}
      />
    );
    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();
  });
});
