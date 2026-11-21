import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { HoldToConfirmButton } from './HoldToConfirmButton';

describe('HoldToConfirmButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('completes full pointer hold lifecycle (0% -> 100% -> confirmed -> reset), forwards ref, and announces via polite live region', () => {
    const ref = createRef<HTMLButtonElement>();
    const onConfirm = vi.fn();

    render(
      <HoldToConfirmButton
        ref={ref}
        label="Delete Cluster"
        onConfirm={onConfirm}
        className="custom-hold"
        style={{ letterSpacing: '0.02em' }}
        xstyle={{ '--prism-blur-px': '16px' }}
        data-testid="hold-btn"
      />
    );

    const button = screen.getByTestId('hold-btn');
    const liveRegion = screen.getByRole('status');
    const fillBar = button.querySelector('[data-part="fill"]') as HTMLSpanElement;

    expect(ref.current).toBe(button);
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('refractor-hold-to-confirm-button', 'prism-crystal', 'custom-hold');
    expect(button).toHaveAttribute('data-tone', 'destructive');
    expect(button).toHaveAttribute('data-progress', '0');
    expect(button).not.toHaveAttribute('data-holding');
    expect(button).not.toHaveAttribute('data-confirmed');
    expect(button).toHaveTextContent('Delete Cluster');
    expect(fillBar.style.width).toBe('0%');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveClass('sr-only');

    // Start pointer hold
    fireEvent.pointerDown(button, { button: 0 });
    expect(button).toHaveAttribute('data-holding', 'true');
    expect(button).toHaveAttribute('data-progress', '0');
    expect(button).toHaveTextContent('Hold to confirm...');
    expect(liveRegion).toHaveTextContent('Hold to confirm...');

    // Advance halfway (600ms of default 1200ms = 15 ticks of 40ms -> 50%)
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(button).toHaveAttribute('data-holding', 'true');
    expect(button).toHaveAttribute('data-progress', '50');
    expect(fillBar.style.width).toBe('50%');
    expect(onConfirm).not.toHaveBeenCalled();

    // Advance remaining 600ms -> hits 100%, confirms immediately
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveAttribute('data-holding');
    expect(button).toHaveAttribute('data-confirmed', 'true');
    expect(button).toHaveAttribute('data-progress', '100');
    expect(button).toHaveClass('prism-emerald');
    expect(button).toHaveTextContent('Confirmed');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(fillBar.style.width).toBe('100%');
    expect(liveRegion).toHaveTextContent('Confirmed');

    // Releasing pointer after confirmation does not reset prematurely
    fireEvent.pointerUp(button);
    expect(button).toHaveAttribute('data-confirmed', 'true');

    // Pressing again while confirmed does not double-fire
    fireEvent.pointerDown(button, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Remaining 600ms of default 1800ms resetAfterMs resets cleanly to idle
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(button).not.toHaveAttribute('data-confirmed');
    expect(button).toHaveAttribute('data-progress', '0');
    expect(button).toHaveTextContent('Delete Cluster');
    expect(fillBar.style.width).toBe('0%');
    expect(liveRegion).toHaveTextContent('');
  });

  it('cancels and resets to 0% on pointerUp, pointerLeave, pointerCancel, keyUp, and blur when < 100%', () => {
    const onConfirm = vi.fn();

    render(
      <HoldToConfirmButton
        label="Purge Cache"
        holdDurationMs={1000}
        onConfirm={onConfirm}
      />
    );

    const button = screen.getByRole('button', { name: 'Purge Cache' });
    const liveRegion = screen.getByRole('status');

    // Simple click never triggers confirmation
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();

    // Cancel via pointerUp
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(button).toHaveAttribute('data-progress', '40');
    fireEvent.pointerUp(button);
    expect(button).not.toHaveAttribute('data-holding');
    expect(button).toHaveAttribute('data-progress', '0');
    expect(liveRegion).toHaveTextContent('Hold cancelled');

    // Cancel via pointerLeave
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(240);
    });
    expect(button).toHaveAttribute('data-progress', '24');
    fireEvent.pointerLeave(button);
    expect(button).toHaveAttribute('data-progress', '0');

    // Cancel via pointerCancel
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(button).toHaveAttribute('data-progress', '20');
    fireEvent.pointerCancel(button);
    expect(button).toHaveAttribute('data-progress', '0');

    // Cancel via Space keyUp
    fireEvent.keyDown(button, { key: ' ' });
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(button).toHaveAttribute('data-progress', '32');
    fireEvent.keyUp(button, { key: ' ' });
    expect(button).toHaveAttribute('data-progress', '0');

    // Cancel via blur during Enter hold
    fireEvent.keyDown(button, { key: 'Enter' });
    act(() => {
      vi.advanceTimersByTime(360);
    });
    expect(button).toHaveAttribute('data-progress', '36');
    fireEvent.blur(button);
    expect(button).toHaveAttribute('data-progress', '0');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('supports keyboard Space and Enter hold completion, ignores repeat/IME/non-hold keys and right-click', () => {
    const onConfirm = vi.fn();

    render(
      <HoldToConfirmButton
        label="Revoke Token"
        holdingLabel="Revoking..."
        confirmedLabel="Token Revoked"
        holdDurationMs={400}
        resetAfterMs={500}
        onConfirm={onConfirm}
      />
    );

    const button = screen.getByRole('button', { name: 'Revoke Token' });

    // Non-primary mouse button (right-click) does not start hold
    fireEvent.pointerDown(button, { button: 2 });
    expect(button).not.toHaveAttribute('data-holding');

    // Non-hold keys do not start hold
    fireEvent.keyDown(button, { key: 'Escape' });
    fireEvent.keyDown(button, { key: 'a' });
    expect(button).not.toHaveAttribute('data-holding');

    // IME composing Enter does not start hold
    const composingDown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingDown, 'isComposing', { value: true });
    button.dispatchEvent(composingDown);
    expect(button).not.toHaveAttribute('data-holding');

    // Space hold with repeated keyDown events and unrelated keyUp completes cleanly
    fireEvent.keyDown(button, { key: ' ', repeat: false });
    expect(button).toHaveAttribute('data-holding', 'true');
    expect(button).toHaveTextContent('Revoking...');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Repeat keydown and unrelated keyup must not restart or cancel
    fireEvent.keyDown(button, { key: ' ', repeat: true });
    fireEvent.keyUp(button, { key: 'Shift' });
    // IME composing keyup must not cancel
    const composingUp = new KeyboardEvent('keyup', { key: ' ', bubbles: true });
    Object.defineProperty(composingUp, 'isComposing', { value: true });
    button.dispatchEvent(composingUp);
    expect(button).toHaveAttribute('data-holding', 'true');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('data-confirmed', 'true');
    expect(button).toHaveTextContent('Token Revoked');

    // Wait for reset, then test Enter hold completion
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(button).not.toHaveAttribute('data-confirmed');

    fireEvent.keyDown(button, { key: 'Enter', repeat: false });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(button).toHaveAttribute('data-confirmed', 'true');
  });

  it('clamps holdDurationMs to 200..5000, supports primary/amber tones, theme overrides, and composed event handlers', () => {
    const onConfirmFast = vi.fn();
    const onConfirmSlow = vi.fn();
    const onConfirmNan = vi.fn();
    const onPointerDownSpy = vi.fn();
    const onPointerUpSpy = vi.fn();
    const onKeyDownSpy = vi.fn();
    const onKeyUpSpy = vi.fn();
    const onBlurSpy = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            HoldToConfirmButton: { className: 'theme-hold', style: { minWidth: '180px' } },
          },
        }}
      >
        <HoldToConfirmButton
          label="Fast Clamped"
          tone="primary"
          holdDurationMs={50}
          onConfirm={onConfirmFast}
          onPointerDown={onPointerDownSpy}
          onPointerUp={onPointerUpSpy}
          onKeyDown={onKeyDownSpy}
          onKeyUp={onKeyUpSpy}
          onBlur={onBlurSpy}
          data-testid="fast-hold"
        />
        <HoldToConfirmButton
          label="Slow Clamped"
          tone="amber"
          holdDurationMs={99999}
          onConfirm={onConfirmSlow}
          data-testid="slow-hold"
        />
        <HoldToConfirmButton
          label="NaN Fallback"
          holdDurationMs={Number.NaN}
          onConfirm={onConfirmNan}
          data-testid="nan-hold"
        />
      </PrismThemeProvider>
    );

    const fastBtn = screen.getByTestId('fast-hold');
    const slowBtn = screen.getByTestId('slow-hold');
    const nanBtn = screen.getByTestId('nan-hold');

    expect(fastBtn).toHaveClass('refractor-hold-to-confirm-button', 'theme-hold');
    expect(fastBtn).toHaveAttribute('data-tone', 'primary');
    expect(fastBtn).toHaveStyle({ minWidth: '180px' });
    expect(fastBtn.style.color).toContain('--prism-primary-main');

    expect(slowBtn).toHaveAttribute('data-tone', 'amber');
    expect(slowBtn.style.color).toContain('--prism-amber-text');

    // Fast clamped to 200ms (does not fire at 160ms, fires at 200ms)
    fireEvent.pointerDown(fastBtn);
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(onConfirmFast).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(onConfirmFast).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(fastBtn);
    fireEvent.keyDown(fastBtn, { key: 'a' });
    fireEvent.keyUp(fastBtn, { key: 'a' });
    fireEvent.blur(fastBtn);
    expect(onPointerDownSpy).toHaveBeenCalledTimes(1);
    expect(onPointerUpSpy).toHaveBeenCalledTimes(1);
    expect(onKeyDownSpy).toHaveBeenCalledTimes(1);
    expect(onKeyUpSpy).toHaveBeenCalledTimes(1);
    expect(onBlurSpy).toHaveBeenCalledTimes(1);

    // Slow clamped to 5000ms
    fireEvent.pointerDown(slowBtn);
    act(() => {
      vi.advanceTimersByTime(4960);
    });
    expect(onConfirmSlow).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(onConfirmSlow).toHaveBeenCalledTimes(1);

    // NaN falls back to 1200ms
    fireEvent.pointerDown(nanBtn);
    act(() => {
      vi.advanceTimersByTime(1160);
    });
    expect(onConfirmNan).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(onConfirmNan).toHaveBeenCalledTimes(1);
  });

  it('blocks disabled interactions, cancels if disabled mid-hold, and cleans up all timers on unmount', () => {
    const onConfirm = vi.fn();

    const { rerender, unmount } = render(
      <HoldToConfirmButton
        label="Terminate"
        holdDurationMs={800}
        resetAfterMs={1000}
        disabled
        onConfirm={onConfirm}
      />
    );

    const button = screen.getByRole('button', { name: 'Terminate' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-disabled', 'true');
    fireEvent.pointerDown(button);
    fireEvent.keyDown(button, { key: ' ' });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onConfirm).not.toHaveBeenCalled();

    // Re-enable, start holding, then disable mid-hold -> cancels cleanly
    rerender(
      <HoldToConfirmButton
        label="Terminate"
        holdDurationMs={800}
        resetAfterMs={1000}
        disabled={false}
        onConfirm={onConfirm}
      />
    );
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(button).toHaveAttribute('data-holding', 'true');

    rerender(
      <HoldToConfirmButton
        label="Terminate"
        holdDurationMs={800}
        resetAfterMs={1000}
        disabled
        onConfirm={onConfirm}
      />
    );
    expect(button).not.toHaveAttribute('data-holding');
    expect(button).toHaveAttribute('data-progress', '0');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onConfirm).not.toHaveBeenCalled();

    // Start holding again, then unmount mid-hold -> interval cleared, onConfirm never fires
    rerender(
      <HoldToConfirmButton
        label="Terminate"
        holdDurationMs={800}
        resetAfterMs={1000}
        disabled={false}
        onConfirm={onConfirm}
      />
    );
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cleans up reset timeout on unmount after confirmation and renders adversarial XSS strings safely', () => {
    const onConfirm = vi.fn();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { unmount } = render(
      <HoldToConfirmButton
        label={payload}
        holdingLabel={payload}
        confirmedLabel={payload}
        holdDurationMs={200}
        resetAfterMs={2000}
        onConfirm={onConfirm}
      />
    );

    const button = screen.getByRole('button', { name: payload });
    expect(button).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('data-confirmed', 'true');

    // Unmount during active reset cooldown timer
    unmount();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(document.querySelector('script')).toBeNull();
  });
});
