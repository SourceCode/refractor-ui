import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ConfidenceIndicator } from './index';

describe('ConfidenceIndicator', () => {
  it('renders high confidence crystal secondary pill, opens rationale popover with source count & Mark Verified action, ref, and theme overrides', () => {
    const ref = createRef<HTMLSpanElement>();
    const onMarkVerified = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ConfidenceIndicator: {
              className: 'theme-confidence',
              style: { verticalAlign: 'middle' },
            },
          },
        }}
      >
        <ConfidenceIndicator
          ref={ref}
          score={91.6}
          sourceCount={4}
          rationale="Cross-checked against 4 repository ADRs and passing build metrics."
          onMarkVerified={onMarkVerified}
          className="custom-confidence"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="confidence-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('confidence-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-confidence-indicator',
      'theme-confidence',
      'custom-confidence'
    );
    expect(root).toHaveStyle({ verticalAlign: 'middle' });
    expect(root).toHaveAttribute('data-confidence-level', 'high');
    expect(root).not.toHaveAttribute('data-open');
    expect(root).not.toHaveAttribute('data-verified');

    const trigger = screen.getByRole('button', { name: /High.*92%/ });
    expect(trigger).toHaveClass('prism-btn-secondary', 'prism-focus-ring');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger).toHaveAttribute('data-confidence-level', 'high');
    expect(screen.getByTestId('confidence-score')).toHaveTextContent('92%');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(root).toHaveAttribute('data-open', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', { name: 'High Confidence' });
    expect(dialog).toHaveClass('prism-slab');
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    expect(within(dialog).getByTestId('confidence-popover-score')).toHaveTextContent(
      '92% confidence'
    );
    expect(within(dialog).getByTestId('confidence-source-count')).toHaveTextContent('4 sources');
    expect(within(dialog).getByTestId('confidence-rationale')).toHaveTextContent(
      'Cross-checked against 4 repository ADRs and passing build metrics.'
    );

    const markVerifiedBtn = within(dialog).getByRole('button', { name: 'Mark Verified' });
    expect(markVerifiedBtn).toHaveClass('prism-btn-primary');
    fireEvent.click(markVerifiedBtn);
    expect(onMarkVerified).toHaveBeenCalledTimes(1);

    // Clicking trigger again toggles popover closed
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resolves score thresholds and explicit verified/level overrides with distinct visual styling', () => {
    const onMarkVerified = vi.fn();
    const { rerender } = render(
      <ConfidenceIndicator
        score={72}
        sourceCount={1}
        defaultOpen
        onMarkVerified={onMarkVerified}
        data-testid="level-root"
      />
    );

    // 60..84 -> moderate (warm amber)
    const moderateTrigger = screen.getByRole('button', { name: /Moderate.*72%/ });
    expect(moderateTrigger).toHaveAttribute('data-confidence-level', 'moderate');
    expect(moderateTrigger).toHaveClass('prism-crystal', 'border');
    expect(moderateTrigger.style.color).toContain('--prism-amber-text');
    expect(moderateTrigger.style.borderColor).toContain('--prism-amber-border');
    expect(screen.getByTestId('confidence-source-count')).toHaveTextContent('1 source');
    expect(screen.getByTestId('confidence-rationale')).toHaveTextContent(
      'Partial corroboration detected'
    );

    // <60 -> needs-review (dashed border + --prism-rose-*)
    rerender(
      <ConfidenceIndicator
        score={42}
        defaultOpen
        onMarkVerified={onMarkVerified}
        data-testid="level-root"
      />
    );
    const needsReviewTrigger = screen.getByRole('button', { name: /Needs Review.*42%/ });
    expect(needsReviewTrigger).toHaveAttribute('data-confidence-level', 'needs-review');
    expect(needsReviewTrigger).toHaveClass('prism-crystal', 'border', 'border-dashed');
    expect(needsReviewTrigger.style.color).toContain('--prism-rose-text');
    expect(needsReviewTrigger.style.borderColor).toContain('--prism-rose-border');
    expect(screen.queryByTestId('confidence-source-count')).not.toBeInTheDocument();
    expect(screen.getByTestId('confidence-rationale')).toHaveTextContent(
      'human verification is recommended'
    );

    // Explicit level override takes precedence over score when verified is false
    rerender(
      <ConfidenceIndicator
        score={42}
        level="high"
        defaultOpen
        data-testid="level-root"
      />
    );
    const overrideTrigger = screen.getByRole('button', { name: /High.*42%/ });
    expect(overrideTrigger).toHaveAttribute('data-confidence-level', 'high');
    expect(overrideTrigger).toHaveClass('prism-btn-secondary');
    // No Mark Verified button when onMarkVerified is omitted
    expect(screen.queryByRole('button', { name: 'Mark Verified' })).not.toBeInTheDocument();

    // verified={true} takes precedence over both score and level, uses solid prism-emerald, hides Mark Verified
    rerender(
      <ConfidenceIndicator
        score={42}
        level="needs-review"
        verified
        defaultOpen
        onMarkVerified={onMarkVerified}
        data-testid="level-root"
      />
    );
    const verifiedTrigger = screen.getByRole('button', { name: /Verified.*42%/ });
    expect(verifiedTrigger).toHaveAttribute('data-confidence-level', 'verified');
    expect(verifiedTrigger).toHaveClass('prism-emerald');
    expect(screen.getByTestId('level-root')).toHaveAttribute('data-verified', 'true');
    expect(screen.queryByRole('button', { name: 'Mark Verified' })).not.toBeInTheDocument();
    expect(screen.getByTestId('confidence-rationale')).toHaveTextContent(
      'explicitly verified'
    );
  });

  it('closes popover on Escape (restoring focus), outside click, and close button while ignoring composing Escape and inside clicks', () => {
    render(
      <div>
        <button type="button">Outside Control</button>
        <ConfidenceIndicator
          score={85}
          rationale="Exact boundary score test."
        />
      </div>
    );

    const trigger = screen.getByRole('button', { name: /High.*85%/ });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'High Confidence' })).toBeInTheDocument();

    // Non-Escape key and IME composing Escape keep dialog open
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Mousedown inside dialog keeps it open
    fireEvent.mouseDown(screen.getByTestId('confidence-rationale'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Escape closes dialog and restores focus to trigger
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // Reopen and dismiss via outside mousedown
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside Control' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen and dismiss via close icon button
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close confidence rationale' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clamps non-finite, negative, and >100 scores and hides invalid sourceCount values (negative test)', () => {
    const { rerender } = render(
      <ConfidenceIndicator
        score={Number.NaN}
        sourceCount={0}
        rationale="   "
        defaultOpen
      />
    );

    expect(screen.getByTestId('confidence-score')).toHaveTextContent('0%');
    expect(screen.getByRole('button', { name: /Needs Review.*0%/ })).toHaveAttribute(
      'data-confidence-level',
      'needs-review'
    );
    expect(screen.queryByTestId('confidence-source-count')).not.toBeInTheDocument();
    // Blank rationale falls back to default explanation
    expect(screen.getByTestId('confidence-rationale')).toHaveTextContent(
      'Low confidence or uncorroborated signal'
    );

    rerender(
      <ConfidenceIndicator
        score={-25}
        sourceCount={-4}
        defaultOpen
      />
    );
    expect(screen.getByTestId('confidence-score')).toHaveTextContent('0%');
    expect(screen.queryByTestId('confidence-source-count')).not.toBeInTheDocument();

    rerender(
      <ConfidenceIndicator
        score={145}
        sourceCount={Number.POSITIVE_INFINITY}
        defaultOpen
      />
    );
    expect(screen.getByTestId('confidence-score')).toHaveTextContent('100%');
    expect(screen.getByRole('button', { name: /High.*100%/ })).toHaveAttribute(
      'data-confidence-level',
      'high'
    );
    expect(screen.queryByTestId('confidence-source-count')).not.toBeInTheDocument();

    rerender(
      <ConfidenceIndicator
        score={60}
        sourceCount={Number.NaN}
        defaultOpen
      />
    );
    expect(screen.getByRole('button', { name: /Moderate.*60%/ })).toHaveAttribute(
      'data-confidence-level',
      'moderate'
    );
    expect(screen.queryByTestId('confidence-source-count')).not.toBeInTheDocument();
  });

  it('renders XSS payloads in rationale strictly as literal text (adversarial)', () => {
    const payload = '<script>window.__confidenceXss=1</script><img src=x onerror=alert(1)>';

    render(
      <ConfidenceIndicator
        score={55}
        rationale={payload}
        defaultOpen
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('confidence-rationale')).toHaveTextContent(payload);
  });
});
