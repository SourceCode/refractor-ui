import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiquidRippleTrigger } from './LiquidRippleTrigger';

describe('LiquidRippleTrigger', () => {
  it('spawns bounded shockwave ripples on pointerDown and cleans them up after durationMs', () => {
    vi.useFakeTimers();
    const ref = createRef<HTMLDivElement>();
    const onRipple = vi.fn();

    try {
      render(
        <LiquidRippleTrigger
          ref={ref}
          durationMs={400}
          maxRipples={2}
          onRipple={onRipple}
          data-testid="ripple-root"
        >
          <button type="button">Send Shockwave</button>
        </LiquidRippleTrigger>
      );

      const root = screen.getByTestId('ripple-root');
      expect(ref.current).toBe(root);

      fireEvent.pointerDown(root, { clientX: 60, clientY: 30 });
      fireEvent.pointerDown(root, { clientX: 90, clientY: 50 });
      fireEvent.pointerDown(root, { clientX: 110, clientY: 70 });

      // Bounded to maxRipples=2
      expect(screen.getAllByTestId('liquid-ripple-wave')).toHaveLength(2);
      expect(onRipple).toHaveBeenCalledTimes(3);

      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(screen.queryAllByTestId('liquid-ripple-wave')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports IME-safe keyboard trigger and suppresses ripples when disabled', () => {
    const onRipple = vi.fn();
    const { rerender } = render(
      <LiquidRippleTrigger onRipple={onRipple} data-testid="ripple-kb">
        <button type="button">Trigger</button>
      </LiquidRippleTrigger>
    );

    const root = screen.getByTestId('ripple-kb');
    const composing = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    root.dispatchEvent(composing);
    expect(onRipple).not.toHaveBeenCalled();

    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onRipple).toHaveBeenCalledTimes(1);

    rerender(
      <LiquidRippleTrigger disabled onRipple={onRipple} data-testid="ripple-kb">
        <button type="button">Locked</button>
      </LiquidRippleTrigger>
    );
    fireEvent.pointerDown(root, { clientX: 10, clientY: 10 });
    fireEvent.keyDown(root, { key: ' ' });
    expect(onRipple).toHaveBeenCalledTimes(1);
  });
});
