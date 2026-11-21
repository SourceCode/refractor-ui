import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  SwipeableActionRow,
  type SwipeActionItem,
  type SwipeRevealSide,
} from './index';

describe('SwipeableActionRow', () => {
  it('renders foreground content, ref, theme override, xstyle, and all 5 semantic action tones with icons', () => {
    const ref = createRef<HTMLDivElement>();
    const onPin = vi.fn<() => void>();
    const onShare = vi.fn<() => void>();
    const onDone = vi.fn<() => void>();
    const onSnooze = vi.fn<() => void>();
    const onDelete = vi.fn<() => void>();

    const leftActions: SwipeActionItem[] = [
      { id: 'pin', label: 'Pin', tone: 'primary', icon: <span data-testid="pin-icon">*</span>, onTrigger: onPin },
      { id: 'share', label: 'Share', onTrigger: onShare },
      { id: 'done', label: 'Done', tone: 'emerald', onTrigger: onDone },
    ];
    const rightActions: SwipeActionItem[] = [
      { id: 'snooze', label: 'Snooze', tone: 'amber', onTrigger: onSnooze },
      { id: 'delete', label: 'Delete', tone: 'rose', onTrigger: onDelete },
    ];

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SwipeableActionRow: { className: 'theme-swipe-row', style: { zIndex: 12 } },
          },
        }}
      >
        <SwipeableActionRow
          ref={ref}
          leftActions={leftActions}
          rightActions={rightActions}
          className="local-swipe-row"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="swipe-row"
        >
          <span>Refractor Optical Message</span>
        </SwipeableActionRow>
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('swipe-row');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-swipeable-action-row',
      'prism-slab',
      'theme-swipe-row',
      'local-swipe-row'
    );
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(root).not.toHaveAttribute('data-dragging');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ zIndex: 12 });
    expect(screen.getByText('Refractor Optical Message')).toBeInTheDocument();
    expect(screen.getByTestId('pin-icon')).toBeInTheDocument();

    expect(screen.getByTestId('swipeable-left-tray')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('swipeable-right-tray')).toHaveAttribute('aria-hidden', 'true');

    const pinBtn = root.querySelector('[data-action-id="pin"]');
    const shareBtn = root.querySelector('[data-action-id="share"]');
    const doneBtn = root.querySelector('[data-action-id="done"]');
    const snoozeBtn = root.querySelector('[data-action-id="snooze"]');
    const deleteBtn = root.querySelector('[data-action-id="delete"]');

    expect(pinBtn).toHaveAttribute('data-tone', 'primary');
    expect(pinBtn).toHaveClass('prism-btn-primary');
    expect(shareBtn).toHaveAttribute('data-tone', 'secondary');
    expect(shareBtn).toHaveClass('prism-btn-secondary');
    expect(doneBtn).toHaveAttribute('data-tone', 'emerald');
    expect(doneBtn).toHaveClass('prism-emerald');
    expect(snoozeBtn).toHaveAttribute('data-tone', 'amber');
    expect((snoozeBtn as HTMLElement).style.backgroundColor).toBe('var(--prism-warning-main)');
    expect((snoozeBtn as HTMLElement).style.color).toBe('var(--prism-warning-contrast)');
    expect(deleteBtn).toHaveAttribute('data-tone', 'rose');
    expect((deleteBtn as HTMLElement).style.backgroundColor).toBe('var(--prism-error-main)');
    expect((deleteBtn as HTMLElement).style.color).toBe('var(--prism-error-contrast)');
  });

  it('tracks pointer drag, clamps travel, snaps past threshold, and snaps back below threshold or on cancel', () => {
    const onRevealChange = vi.fn<(side: SwipeRevealSide) => void>();

    render(
      <SwipeableActionRow
        leftActions={[{ id: 'approve', label: 'Approve', tone: 'emerald' }]}
        rightActions={[{ id: 'remove', label: 'Remove', tone: 'rose' }]}
        threshold={56}
        onRevealChange={onRevealChange}
        data-testid="drag-row"
      >
        <span>Draggable Item</span>
      </SwipeableActionRow>
    );

    const root = screen.getByTestId('drag-row');
    const foreground = screen.getByTestId('swipeable-foreground');

    // Moving or releasing before pointerDown does nothing
    fireEvent.pointerMove(foreground, { clientX: 200 });
    fireEvent.pointerUp(foreground, { clientX: 200 });
    fireEvent.pointerCancel(foreground);
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(onRevealChange).not.toHaveBeenCalled();

    // Right-click (button=2) is ignored
    fireEvent.pointerDown(foreground, { clientX: 100, button: 2 });
    fireEvent.pointerMove(foreground, { clientX: 200 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Drag right below threshold (+30 < 56) snaps back to 'none'
    fireEvent.pointerDown(foreground, { clientX: 100, button: 0 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(foreground, { clientX: 130 });
    expect(foreground).toHaveAttribute('data-offset', '30');
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(foreground).toHaveAttribute('data-offset', '0');
    expect(onRevealChange).not.toHaveBeenCalled();

    // Drag right far past max travel clamps to leftMaxTravel (104) and snaps to 'left'
    fireEvent.pointerDown(foreground, { clientX: 100, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 500 });
    expect(foreground).toHaveAttribute('data-offset', '104');
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'left');
    expect(onRevealChange).toHaveBeenNthCalledWith(1, 'left');
    expect(screen.getByTestId('swipeable-left-tray')).toHaveAttribute('aria-hidden', 'false');

    // Pointer cancel restores resting 'left' state without emitting a change
    fireEvent.pointerDown(foreground, { clientX: 200, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 150 });
    fireEvent.pointerCancel(foreground);
    expect(root).toHaveAttribute('data-revealed', 'left');
    expect(root).not.toHaveAttribute('data-dragging');
    expect(onRevealChange).toHaveBeenCalledTimes(1);

    // Small jitter while revealed 'left' stays 'left'
    fireEvent.pointerDown(foreground, { clientX: 200, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 195 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'left');
    expect(onRevealChange).toHaveBeenCalledTimes(1);

    // Drag all the way across from 'left' to 'right'
    fireEvent.pointerDown(foreground, { clientX: 300, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 0 });
    expect(foreground).toHaveAttribute('data-offset', '-104');
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'right');
    expect(onRevealChange).toHaveBeenNthCalledWith(2, 'right');

    // Small jitter while revealed 'right' stays 'right'
    fireEvent.pointerDown(foreground, { clientX: 100, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 105 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'right');

    // Drag right moderately from 'right' dismisses to 'none'
    fireEvent.pointerDown(foreground, { clientX: 100, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 150 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(onRevealChange).toHaveBeenNthCalledWith(3, 'none');

    // Drag left past threshold from 'none' snaps to 'right', then across to 'left', then dismisses from 'left'
    fireEvent.pointerDown(foreground, { clientX: 200, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 120 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'right');
    expect(onRevealChange).toHaveBeenNthCalledWith(4, 'right');

    fireEvent.pointerDown(foreground, { clientX: 0, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 300 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'left');
    expect(onRevealChange).toHaveBeenNthCalledWith(5, 'left');

    fireEvent.pointerDown(foreground, { clientX: 200, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 140 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(onRevealChange).toHaveBeenNthCalledWith(6, 'none');
  });

  it('prevents dragging into missing trays and handles empty action lists gracefully', () => {
    const onRevealChange = vi.fn<(side: SwipeRevealSide) => void>();

    const { rerender } = render(
      <SwipeableActionRow
        leftActions={[{ id: 'left-only', label: 'Archive', tone: 'primary' }]}
        onRevealChange={onRevealChange}
        data-testid="one-sided-row"
      >
        <span>Left Only</span>
      </SwipeableActionRow>
    );

    const root = screen.getByTestId('one-sided-row');
    const foreground = screen.getByTestId('swipeable-foreground');

    expect(screen.getByTestId('swipeable-left-tray')).toBeInTheDocument();
    expect(screen.queryByTestId('swipeable-right-tray')).not.toBeInTheDocument();
    expect(screen.queryByTestId('swipeable-toggle-right')).not.toBeInTheDocument();

    // Dragging left when no rightActions exist clamps to 0; ArrowLeft does nothing
    fireEvent.pointerDown(foreground, { clientX: 200, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 50 });
    expect(foreground).toHaveAttribute('data-offset', '0');
    fireEvent.pointerUp(foreground);
    fireEvent.keyDown(foreground, { key: 'ArrowLeft' });
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Reveal left tray, then remove leftActions dynamically -> resets to 'none'
    fireEvent.click(screen.getByTestId('swipeable-toggle-left'));
    expect(root).toHaveAttribute('data-revealed', 'left');

    rerender(
      <SwipeableActionRow
        rightActions={[{ id: 'right-only', label: 'Delete', tone: 'rose' }]}
        onRevealChange={onRevealChange}
        data-testid="one-sided-row"
      >
        <span>Right Only</span>
      </SwipeableActionRow>
    );
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Dragging right when no leftActions exist clamps to 0; ArrowRight does nothing
    fireEvent.pointerDown(foreground, { clientX: 100, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 250 });
    expect(foreground).toHaveAttribute('data-offset', '0');
    fireEvent.pointerUp(foreground);
    fireEvent.keyDown(foreground, { key: 'ArrowRight' });
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Reveal right tray, then rerender with no actions at all -> resets to 'none'
    fireEvent.click(screen.getByTestId('swipeable-toggle-right'));
    expect(root).toHaveAttribute('data-revealed', 'right');

    rerender(
      <SwipeableActionRow onRevealChange={onRevealChange} data-testid="one-sided-row">
        <span>No Actions</span>
      </SwipeableActionRow>
    );
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Dragging with no actions does not start drag
    fireEvent.pointerDown(foreground, { clientX: 100, button: 0 });
    expect(root).not.toHaveAttribute('data-dragging');
  });

  it('supports keyboard ArrowRight/ArrowLeft/Escape (IME-safe), compact reveal toggles, and action trigger reset', () => {
    const onRevealChange = vi.fn<(side: SwipeRevealSide) => void>();
    const onPin = vi.fn<() => void>();
    const onDelete = vi.fn<() => void>();

    render(
      <SwipeableActionRow
        leftActions={[{ id: 'pin', label: 'Pin', tone: 'primary', onTrigger: onPin }]}
        rightActions={[{ id: 'del', label: 'Delete', tone: 'rose', onTrigger: onDelete }]}
        onRevealChange={onRevealChange}
        data-testid="kbd-row"
      >
        <span>Keyboard Accessible Row</span>
      </SwipeableActionRow>
    );

    const root = screen.getByTestId('kbd-row');
    const foreground = screen.getByTestId('swipeable-foreground');

    // IME composing keydown is ignored
    fireEvent.keyDown(foreground, { key: 'ArrowRight', isComposing: true });
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Unrelated key does nothing
    fireEvent.keyDown(foreground, { key: 'Enter' });
    expect(root).toHaveAttribute('data-revealed', 'none');

    // ArrowRight reveals left tray; ArrowLeft closes it back to none; ArrowLeft again reveals right tray
    fireEvent.keyDown(foreground, { key: 'ArrowRight' });
    expect(root).toHaveAttribute('data-revealed', 'left');
    expect(onRevealChange).toHaveBeenNthCalledWith(1, 'left');

    fireEvent.keyDown(foreground, { key: 'ArrowLeft' });
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(onRevealChange).toHaveBeenNthCalledWith(2, 'none');

    fireEvent.keyDown(foreground, { key: 'ArrowLeft' });
    expect(root).toHaveAttribute('data-revealed', 'right');
    expect(onRevealChange).toHaveBeenNthCalledWith(3, 'right');

    // ArrowRight closes right tray back to none
    fireEvent.keyDown(foreground, { key: 'ArrowRight' });
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(onRevealChange).toHaveBeenNthCalledWith(4, 'none');

    // Compact toggle buttons stop pointerDown propagation and toggle reveal
    const leftToggle = screen.getByRole('button', { name: 'Reveal left actions' });
    fireEvent.pointerDown(leftToggle, { clientX: 50 });
    expect(root).not.toHaveAttribute('data-dragging');
    fireEvent.click(leftToggle);
    expect(root).toHaveAttribute('data-revealed', 'left');
    expect(screen.getByRole('button', { name: 'Hide left actions' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    // Escape closes open tray
    fireEvent.keyDown(foreground, { key: 'Escape' });
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Escape when already none does nothing
    const callsBeforeEscape = onRevealChange.mock.calls.length;
    fireEvent.keyDown(foreground, { key: 'Escape' });
    expect(onRevealChange).toHaveBeenCalledTimes(callsBeforeEscape);

    // Reveal right tray via compact toggle, then click Delete action
    const rightToggle = screen.getByRole('button', { name: 'Reveal right actions' });
    fireEvent.pointerDown(rightToggle, { clientX: 50 });
    fireEvent.click(rightToggle);
    expect(root).toHaveAttribute('data-revealed', 'right');
    expect(screen.getByRole('button', { name: 'Hide right actions' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteBtn).toHaveAttribute('tabindex', '0');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-revealed', 'none');
    expect(onRevealChange).toHaveBeenLastCalledWith('none');

    // Reveal left tray via toggle and hide via toggle
    fireEvent.click(screen.getByTestId('swipeable-toggle-left'));
    expect(root).toHaveAttribute('data-revealed', 'left');
    fireEvent.click(screen.getByTestId('swipeable-toggle-left'));
    expect(root).toHaveAttribute('data-revealed', 'none');

    // Reveal right tray via toggle and hide via toggle
    fireEvent.click(screen.getByTestId('swipeable-toggle-right'));
    expect(root).toHaveAttribute('data-revealed', 'right');
    fireEvent.click(screen.getByTestId('swipeable-toggle-right'));
    expect(root).toHaveAttribute('data-revealed', 'none');
  });

  it('ignores dragging, keyboard, and action triggers when disabled (negative test)', () => {
    const onTrigger = vi.fn<() => void>();
    const onRevealChange = vi.fn<(side: SwipeRevealSide) => void>();

    render(
      <SwipeableActionRow
        disabled
        leftActions={[{ id: 'a1', label: 'Archive', onTrigger }]}
        rightActions={[{ id: 'a2', label: 'Delete', tone: 'rose', onTrigger }]}
        onRevealChange={onRevealChange}
        data-testid="disabled-row"
      >
        <span>Locked Row</span>
      </SwipeableActionRow>
    );

    const root = screen.getByTestId('disabled-row');
    const foreground = screen.getByTestId('swipeable-foreground');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(foreground).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('swipeable-toggle-left')).toBeDisabled();
    expect(screen.getByTestId('swipeable-toggle-right')).toBeDisabled();

    fireEvent.pointerDown(foreground, { clientX: 100, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 250 });
    fireEvent.pointerUp(foreground);
    fireEvent.keyDown(foreground, { key: 'ArrowRight' });
    fireEvent.keyDown(foreground, { key: 'ArrowLeft' });

    const archiveBtn = root.querySelector('[data-action-id="a1"]') as HTMLButtonElement;
    expect(archiveBtn).toBeDisabled();
    fireEvent.click(archiveBtn);

    expect(onTrigger).not.toHaveBeenCalled();
    expect(onRevealChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-revealed', 'none');
  });

  it('clamps NaN/out-of-range thresholds and renders adversarial XSS payloads and prototype keys safely', () => {
    const payload = '<script>window.__swipeXss=1</script><img src=x onerror=alert(1)>';
    const onProtoTrigger = vi.fn<() => void>();

    const { rerender } = render(
      <SwipeableActionRow
        threshold={Number.NaN}
        leftActions={[{ id: '__proto__', label: payload, tone: 'amber', onTrigger: onProtoTrigger }]}
        rightActions={[{ id: 'constructor', label: 'Safe Action', tone: 'secondary' }]}
        data-testid="adversarial-row"
      >
        <span>{payload}</span>
      </SwipeableActionRow>
    );

    const root = screen.getByTestId('adversarial-row');
    const foreground = screen.getByTestId('swipeable-foreground');

    // NaN threshold falls back to 56: drag +60 reveals left
    fireEvent.pointerDown(foreground, { clientX: 0, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 60 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'left');

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(payload);

    fireEvent.click(screen.getByRole('button', { name: payload }));
    expect(onProtoTrigger).toHaveBeenCalledTimes(1);

    // Threshold clamped to max 160 when given 9999
    rerender(
      <SwipeableActionRow
        threshold={9999}
        leftActions={[{ id: 'high', label: 'High Threshold' }]}
        data-testid="adversarial-row"
      >
        <span>High Threshold Row</span>
      </SwipeableActionRow>
    );
    fireEvent.pointerDown(foreground, { clientX: 0, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 120 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'none');

    fireEvent.pointerDown(foreground, { clientX: 0, button: 0 });
    fireEvent.pointerMove(foreground, { clientX: 170 });
    fireEvent.pointerUp(foreground);
    expect(root).toHaveAttribute('data-revealed', 'left');
  });
});
