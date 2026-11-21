import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DualThumbSlider, type DualThumbRange } from './index';

function mockTrackRect(track: HTMLElement, left: number, width: number) {
  Object.defineProperty(track, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      right: left + width,
      top: 0,
      bottom: 12,
      width,
      height: 12,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }),
  });
}

describe('DualThumbSlider', () => {
  it('renders recessed prism-well track, glowing fill bar, formatted readout, two ARIA slider thumbs, theme overrides, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DualThumbSlider: { className: 'theme-dual', style: { maxWidth: '420px' } },
          },
        }}
      >
        <DualThumbSlider
          ref={ref}
          label="Price Filter"
          min={0}
          max={200}
          step={5}
          minDistance={10}
          defaultValue={{ min: 40, max: 160 }}
          formatValue={(v) => `$${v}`}
          className="local-dual"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="dual-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('dual-root');
    const track = screen.getByTestId('dual-thumb-track');
    const fill = screen.getByTestId('dual-thumb-fill');
    const readout = screen.getByTestId('dual-thumb-readout');
    const minThumb = screen.getByRole('slider', { name: 'Minimum value' });
    const maxThumb = screen.getByRole('slider', { name: 'Maximum value' });

    expect(DualThumbSlider.displayName).toBe('DualThumbSlider');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-dual-thumb-slider', 'theme-dual', 'local-dual');
    expect(root).toHaveStyle({ maxWidth: '420px' });
    expect(track).toHaveClass('prism-well');
    expect(fill).toHaveStyle({ left: '20%', width: '60%' });
    expect(fill.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(readout).toHaveTextContent('$40 – $160');

    expect(minThumb).toHaveAttribute('aria-valuenow', '40');
    expect(minThumb).toHaveAttribute('aria-valuemin', '0');
    expect(minThumb).toHaveAttribute('aria-valuemax', '150');
    expect(minThumb).toHaveAttribute('aria-valuetext', '$40');
    expect(minThumb).toHaveAttribute('tabindex', '0');

    expect(maxThumb).toHaveAttribute('aria-valuenow', '160');
    expect(maxThumb).toHaveAttribute('aria-valuemin', '50');
    expect(maxThumb).toHaveAttribute('aria-valuemax', '200');
    expect(maxThumb).toHaveAttribute('aria-valuetext', '$160');
    expect(maxThumb).toHaveAttribute('tabindex', '0');
  });

  it('supports keyboard stepping (Arrows, PageUp/PageDown, Home, End) with minDistance enforcement and IME composition guard', () => {
    const onChange = vi.fn<(next: DualThumbRange) => void>();

    render(
      <DualThumbSlider
        min={0}
        max={100}
        step={2}
        minDistance={10}
        defaultValue={{ min: 20, max: 80 }}
        onChange={onChange}
        data-testid="kbd-dual"
      />
    );

    const minThumb = screen.getByRole('slider', { name: 'Minimum value' });
    const maxThumb = screen.getByRole('slider', { name: 'Maximum value' });
    const readout = screen.getByTestId('dual-thumb-readout');

    expect(readout).toHaveTextContent('20 – 80');

    // ArrowRight / ArrowUp (+step) and ArrowLeft / ArrowDown (-step)
    fireEvent.keyDown(minThumb, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 22, max: 80 });
    fireEvent.keyDown(minThumb, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 24, max: 80 });
    fireEvent.keyDown(minThumb, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 22, max: 80 });
    fireEvent.keyDown(minThumb, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 20, max: 80 });

    // PageUp (+10*step = +20) and PageDown (-10*step = -20)
    fireEvent.keyDown(minThumb, { key: 'PageUp' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 40, max: 80 });
    fireEvent.keyDown(maxThumb, { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 40, max: 60 });

    // End on minThumb stops at max - minDistance (50); Home on minThumb jumps to min (0)
    fireEvent.keyDown(minThumb, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 50, max: 60 });
    // Pushing further right does not emit duplicate change
    const callCountAtLimit = onChange.mock.calls.length;
    fireEvent.keyDown(minThumb, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledTimes(callCountAtLimit);

    fireEvent.keyDown(minThumb, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 0, max: 60 });

    // Home on maxThumb stops at min + minDistance (10); End jumps to max (100)
    fireEvent.keyDown(maxThumb, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 0, max: 10 });
    fireEvent.keyDown(maxThumb, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 0, max: 100 });

    // Unrelated key and IME composing event are ignored
    const callsBeforeIgnore = onChange.mock.calls.length;
    fireEvent.keyDown(minThumb, { key: 'Enter' });
    fireEvent.keyDown(minThumb, { key: 'ArrowRight', isComposing: true });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeIgnore);
  });

  it('supports pointer drag on both thumbs, track click selection, pointer capture/cancel cleanup, and zero-width fallback', () => {
    const onChange = vi.fn<(next: DualThumbRange) => void>();

    render(
      <DualThumbSlider
        min={0}
        max={100}
        step={1}
        minDistance={10}
        defaultValue={{ min: 20, max: 80 }}
        onChange={onChange}
        data-testid="ptr-dual"
      />
    );

    const root = screen.getByTestId('ptr-dual');
    const track = screen.getByTestId('dual-thumb-track');
    const minThumb = screen.getByRole('slider', { name: 'Minimum value' });
    const maxThumb = screen.getByRole('slider', { name: 'Maximum value' });

    // Zero-width track falls back cleanly without NaN or emitting changes
    mockTrackRect(track, 0, 0);
    fireEvent.pointerDown(track, { clientX: 50, pointerId: 1 });
    fireEvent.pointerDown(minThumb, { clientX: 50, pointerId: 1 });
    fireEvent.pointerMove(minThumb, { clientX: 80, pointerId: 1 });
    fireEvent.pointerUp(minThumb, { clientX: 80, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();

    // Now provide a 200px wide track starting at x=100 (100..300 => 0..100)
    mockTrackRect(track, 100, 200);

    // Non-primary button (right click) and stray pointerMove/Up outside drag session are ignored
    fireEvent.pointerDown(minThumb, { clientX: 160, button: 2, pointerId: 2 });
    fireEvent.pointerDown(track, { clientX: 160, button: 2, pointerId: 2 });
    fireEvent.pointerMove(minThumb, { clientX: 180, pointerId: 2 });
    fireEvent.pointerUp(minThumb, { clientX: 180, pointerId: 2 });
    expect(onChange).not.toHaveBeenCalled();

    // Drag minThumb without explicit pointerId (fallback 0)
    fireEvent.pointerDown(minThumb, { clientX: 140 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(minThumb, { clientX: 170 }); // ratio 0.35 -> 35
    expect(onChange).toHaveBeenLastCalledWith({ min: 35, max: 80 });

    // Stray second pointerId is ignored during active drag
    fireEvent.pointerMove(minThumb, { clientX: 290, pointerId: 9 });
    fireEvent.pointerUp(minThumb, { clientX: 290, pointerId: 9 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(minThumb).toHaveAttribute('aria-valuenow', '35');

    // Dragging minThumb past max - minDistance clamps to 70
    fireEvent.pointerMove(minThumb, { clientX: 290 }); // 95 -> clamped to 70
    expect(onChange).toHaveBeenLastCalledWith({ min: 70, max: 80 });
    fireEvent.pointerUp(minThumb, { clientX: 290 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Pointer capture + pointerCancel cleanup on maxThumb
    const setPointerCapture = vi.fn<(id: number) => void>();
    const hasPointerCapture = vi.fn<(id: number) => boolean>(() => true);
    const releasePointerCapture = vi.fn<(id: number) => void>();
    Object.defineProperty(maxThumb, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    Object.defineProperty(maxThumb, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCapture,
    });
    Object.defineProperty(maxThumb, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCapture,
    });

    fireEvent.pointerDown(maxThumb, { clientX: 280, pointerId: 5 }); // 90
    expect(setPointerCapture).toHaveBeenCalledWith(5);
    expect(onChange).toHaveBeenLastCalledWith({ min: 70, max: 90 });

    fireEvent.pointerMove(maxThumb, { clientX: 120, pointerId: 5 }); // 10 -> clamped to min+10=80
    expect(onChange).toHaveBeenLastCalledWith({ min: 70, max: 80 });

    fireEvent.pointerCancel(maxThumb, { clientX: 120, pointerId: 5 });
    expect(hasPointerCapture).toHaveBeenCalledWith(5);
    expect(releasePointerCapture).toHaveBeenCalledWith(5);
    expect(root).not.toHaveAttribute('data-dragging');

    // Track pointerDown selects nearest thumb: x=120 -> 10 (nearer to min=70), x=290 -> 95 (nearer to max=80)
    fireEvent.pointerDown(track, { clientX: 120, pointerId: 6 });
    expect(onChange).toHaveBeenLastCalledWith({ min: 10, max: 80 });
    fireEvent.pointerDown(track, { clientX: 290, pointerId: 6 });
    expect(onChange).toHaveBeenLastCalledWith({ min: 10, max: 95 });
  });

  it('supports controlled mode, fractional/scientific steps, stacked thumb z-index, and adversarial bound sanitization', () => {
    function ControlledHarness() {
      const [range, setRange] = useState<DualThumbRange>({ min: 0.2, max: 0.8 });
      return (
        <DualThumbSlider
          label="Alpha"
          min={0}
          max={1}
          step={0.1}
          minDistance={0.1}
          value={range}
          onChange={setRange}
          data-testid="ctrl-dual"
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    const minThumb = screen.getByRole('slider', { name: 'Minimum value' });
    expect(screen.getByTestId('dual-thumb-readout')).toHaveTextContent('0.2 – 0.8');

    fireEvent.keyDown(minThumb, { key: 'ArrowRight' });
    expect(screen.getByTestId('dual-thumb-readout')).toHaveTextContent('0.3 – 0.8');
    unmount();

    // Adversarial: inverted min/max, equal bounds, NaN/Infinity, negative step, huge minDistance, stacked overlap, scientific step
    const { rerender } = render(
      <DualThumbSlider
        min={50}
        max={50}
        step={0}
        minDistance={500}
        value={{ min: Number.NaN, max: Number.POSITIVE_INFINITY }}
        data-testid="adv-dual"
      />
    );
    expect(screen.getByRole('slider', { name: 'Minimum value' })).toHaveAttribute('aria-valuemin', '50');
    expect(screen.getByRole('slider', { name: 'Maximum value' })).toHaveAttribute('aria-valuemax', '51');
    expect(screen.getByTestId('dual-thumb-readout')).toHaveTextContent('50 – 51');

    rerender(
      <DualThumbSlider
        min={Number.NaN}
        max={Number.POSITIVE_INFINITY}
        step={1e-7}
        minDistance={-10}
        value={{ min: 100, max: 100 }}
        data-testid="adv-dual"
      />
    );
    // Stacked at 100%: min thumb elevates to z-30 so it remains grab-accessible
    expect(screen.getByRole('slider', { name: 'Minimum value' })).toHaveClass('z-30');

    // High-end minDistance pushback when low + minDistance > max
    rerender(
      <DualThumbSlider
        min={100}
        max={0}
        step={1}
        minDistance={20}
        value={{ min: 95, max: 98 }}
        data-testid="adv-dual"
      />
    );
    expect(screen.getByTestId('dual-thumb-readout')).toHaveTextContent('80 – 100');
  });

  it('blocks all interactions when disabled and safely renders XSS label payloads (negative & security tests)', () => {
    const onChange = vi.fn<(next: DualThumbRange) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    render(
      <DualThumbSlider
        label={payload}
        disabled
        defaultValue={{ min: 30, max: 70 }}
        onChange={onChange}
        data-testid="disabled-dual"
      />
    );

    const root = screen.getByTestId('disabled-dual');
    const track = screen.getByTestId('dual-thumb-track');
    const minThumb = screen.getByRole('slider', { name: 'Minimum value' });
    const maxThumb = screen.getByRole('slider', { name: 'Maximum value' });
    mockTrackRect(track, 0, 200);

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(minThumb).toHaveAttribute('tabindex', '-1');
    expect(minThumb).toHaveAttribute('aria-disabled', 'true');
    expect(maxThumb).toHaveAttribute('tabindex', '-1');
    expect(maxThumb).toHaveAttribute('aria-disabled', 'true');

    fireEvent.pointerDown(track, { clientX: 10, pointerId: 1 });
    fireEvent.pointerDown(minThumb, { clientX: 10, pointerId: 1 });
    fireEvent.pointerMove(minThumb, { clientX: 20, pointerId: 1 });
    fireEvent.pointerUp(minThumb, { clientX: 20, pointerId: 1 });
    fireEvent.keyDown(minThumb, { key: 'ArrowRight' });
    fireEvent.keyDown(maxThumb, { key: 'ArrowLeft' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('dual-thumb-readout')).toHaveTextContent('30 – 70');
  });
});
