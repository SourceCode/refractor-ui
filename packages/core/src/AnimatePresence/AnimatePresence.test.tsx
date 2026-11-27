import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnimatePresence, useIsPresent, usePresence } from './AnimatePresence';

function PresenceChild({ label }: { label: string }) {
  const [isPresent, safeToRemove] = usePresence();
  const presentFlag = useIsPresent();
  return (
    <div data-present={String(isPresent && presentFlag)}>
      <span>{label}</span>
      <button type="button" onClick={safeToRemove}>
        Remove Now
      </button>
    </div>
  );
}

describe('AnimatePresence', () => {
  it('keeps unmounting children in the DOM until exit completes and fires onExitComplete', () => {
    vi.useFakeTimers();
    const onExitComplete = vi.fn();

    const { rerender } = render(
      <AnimatePresence exitDurationMs={120} onExitComplete={onExitComplete}>
        <PresenceChild key="toast-1" label="Saved!" />
      </AnimatePresence>
    );

    expect(screen.getByText('Saved!')).toBeInTheDocument();

    rerender(
      <AnimatePresence exitDurationMs={120} onExitComplete={onExitComplete}>
        {null}
      </AnimatePresence>
    );

    // Still mounted in exiting state before timer elapses
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
    expect(onExitComplete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('supports wait and popLayout modes and re-entry cancellation', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <AnimatePresence mode="popLayout" exitDurationMs={100}>
        <div key="a">View A</div>
      </AnimatePresence>
    );

    rerender(
      <AnimatePresence mode="popLayout" exitDurationMs={100}>
        <div key="b">View B</div>
      </AnimatePresence>
    );
    expect(screen.getByText('View A')).toBeInTheDocument();
    expect(screen.getByText('View B')).toBeInTheDocument();

    // Re-entering key "a" cancels its exit
    rerender(
      <AnimatePresence mode="wait" exitDurationMs={100}>
        <div key="a">View A</div>
      </AnimatePresence>
    );
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.getByText('View A')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
