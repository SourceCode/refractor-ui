import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RotaryDial } from './index';

describe('RotaryDial', () => {
  it('renders 270-degree SVG arcs, central prism-crystal face, indicator rotation, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RotaryDial: {
              className: 'theme-rotary',
              style: { minWidth: '140px' },
            },
          },
        }}
      >
        <RotaryDial
          ref={ref}
          label="Dispersion"
          unit="%"
          size={112}
          className="local-rotary"
          xstyle={{ '--prism-blur-px': '18px' }}
          style={{ padding: '16px' }}
          data-testid="dial-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('dial-root');
    const slider = screen.getByRole('slider', { name: 'Dispersion' });
    const track = screen.getByTestId('rotary-dial-track');
    const progress = screen.getByTestId('rotary-dial-progress');
    const face = screen.getByTestId('rotary-dial-face');
    const indicator = screen.getByTestId('rotary-dial-indicator');

    expect(RotaryDial.displayName).toBe('RotaryDial');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-rotary-dial',
      'prism-slab',
      'theme-rotary',
      'local-rotary'
    );
    expect(root).toHaveStyle({ minWidth: '140px', padding: '16px' });

    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuetext', '50%');
    expect(slider).toHaveAttribute('tabindex', '0');
    expect(slider).toHaveStyle({ width: '112px', height: '112px' });

    expect(track).toHaveAttribute('stroke', 'var(--prism-divider)');
    expect(progress).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(progress).toHaveAttribute('stroke-opacity', '1');
    expect(face).toHaveClass('prism-crystal');
    expect(indicator).toHaveAttribute('transform', 'rotate(0 32 32)');

    expect(screen.getByTestId('rotary-dial-label')).toHaveTextContent('Dispersion');
    expect(screen.getByTestId('rotary-dial-value')).toHaveTextContent('50%');
  });

  it('supports keyboard navigation (ArrowUp/Right/Down/Left, PageUp/Down, Home, End), IME guard, and double-click reset', () => {
    const onChange = vi.fn<(next: number) => void>();

    render(
      <RotaryDial
        defaultValue={50}
        min={0}
        max={100}
        step={2}
        onChange={onChange}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Dial' });
    const valueEl = screen.getByTestId('rotary-dial-value');
    const indicator = screen.getByTestId('rotary-dial-indicator');

    expect(valueEl).toHaveTextContent('50°');

    // IME composing and unrelated keys are ignored
    fireEvent.keyDown(slider, { key: 'ArrowUp', isComposing: true });
    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();

    // ArrowUp (+2 -> 52) and ArrowRight (+2 -> 54)
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(52);
    expect(valueEl).toHaveTextContent('52°');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(54);

    // ArrowDown (-2 -> 52) and ArrowLeft (-2 -> 50)
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(52);

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(50);

    // PageUp (+20 -> 70) and PageDown (-20 -> 50)
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(onChange).toHaveBeenLastCalledWith(70);
    expect(slider).toHaveAttribute('aria-valuenow', '70');

    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith(50);

    // Home -> min (0, angle -135, progress strokeOpacity 0)
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(indicator).toHaveAttribute('transform', 'rotate(-135 32 32)');
    expect(screen.getByTestId('rotary-dial-progress')).toHaveAttribute('stroke-opacity', '0');

    // Pressing ArrowDown at min does not emit duplicate onChange
    const countAtMin = onChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledTimes(countAtMin);

    // End -> max (100, angle +135)
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(indicator).toHaveAttribute('transform', 'rotate(135 32 32)');

    // Double-click resets back to defaultValue (50)
    fireEvent.doubleClick(slider);
    expect(onChange).toHaveBeenLastCalledWith(50);
    expect(valueEl).toHaveTextContent('50°');

    // Double-click when already at defaultValue does not emit duplicate call
    const countAtDefault = onChange.mock.calls.length;
    fireEvent.doubleClick(slider);
    expect(onChange).toHaveBeenCalledTimes(countAtDefault);
  });

  it('supports smooth vertical/horizontal pointer drag, pointer capture, and pointerup/pointercancel cleanup', () => {
    const onChange = vi.fn<(next: number) => void>();

    render(
      <RotaryDial
        label="Gain"
        defaultValue={50}
        min={0}
        max={100}
        step={1}
        unit="dB"
        onChange={onChange}
        data-testid="drag-dial"
      />
    );

    const root = screen.getByTestId('drag-dial');
    const slider = screen.getByRole('slider', { name: 'Gain' });

    // Non-primary button (right click) is ignored; stray moves/ups outside session are ignored
    fireEvent.pointerDown(slider, { button: 2, clientX: 100, clientY: 100, pointerId: 1 });
    expect(root).not.toHaveAttribute('data-dragging');
    fireEvent.pointerMove(slider, { clientX: 150, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 150, clientY: 50, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();

    // Drag up (-36px -> +20) and right (+18px -> +10 => total +30 -> 80)
    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 2 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(slider).toHaveAttribute('data-dragging', 'true');
    expect(slider).toHaveClass('cursor-grabbing');

    // Unchanged pointer move (dx=0, dy=0) does not emit
    fireEvent.pointerMove(slider, { clientX: 100, clientY: 100, pointerId: 2 });
    expect(onChange).not.toHaveBeenCalled();

    // Stray pointerId is ignored on move and up
    fireEvent.pointerMove(slider, { clientX: 250, clientY: 0, pointerId: 99 });
    fireEvent.pointerUp(slider, { clientX: 250, clientY: 0, pointerId: 99 });
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Valid drag move: dx = +18, dy = -36 => (dx - dy) = +54 => +54 * (100/180) = +30 => 80
    fireEvent.pointerMove(slider, { clientX: 118, clientY: 64, pointerId: 2 });
    expect(onChange).toHaveBeenLastCalledWith(80);
    expect(screen.getByTestId('rotary-dial-value')).toHaveTextContent('80dB');

    // End drag via pointerUp
    fireEvent.pointerUp(slider, { clientX: 118, clientY: 64, pointerId: 2 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(slider).toHaveClass('cursor-grab');

    // Verify browser pointer capture & release on pointerCancel
    const setPointerCapture = vi.fn<(id: number) => void>();
    const hasPointerCapture = vi.fn<(id: number) => boolean>(() => true);
    const releasePointerCapture = vi.fn<(id: number) => void>();
    Object.defineProperty(slider, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    Object.defineProperty(slider, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCapture,
    });
    Object.defineProperty(slider, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCapture,
    });

    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 5 });
    expect(setPointerCapture).toHaveBeenCalledWith(5);

    // Drag down (+36px -> -20 => 80 - 20 = 60)
    fireEvent.pointerMove(slider, { clientX: 100, clientY: 136, pointerId: 5 });
    expect(onChange).toHaveBeenLastCalledWith(60);

    fireEvent.pointerCancel(slider, { clientX: 100, clientY: 136, pointerId: 5 });
    expect(hasPointerCapture).toHaveBeenCalledWith(5);
    expect(releasePointerCapture).toHaveBeenCalledWith(5);
    expect(root).not.toHaveAttribute('data-dragging');
  });

  it('supports controlled values, fractional step snapping, size clamping [64..160], and inverted/NaN/degenerate bounds', () => {
    const onChange = vi.fn<(next: number) => void>();

    function ControlledDial() {
      const [val, setVal] = useState<number>(0.5);
      return (
        <RotaryDial
          label="Blend"
          value={val}
          min={0}
          max={1}
          step={0.25}
          unit=""
          size={30}
          onChange={(next) => {
            onChange(next);
            setVal(next);
          }}
        />
      );
    }

    const { rerender } = render(<ControlledDial />);
    const slider = screen.getByRole('slider', { name: 'Blend' });
    expect(slider).toHaveStyle({ width: '64px', height: '64px' });
    expect(slider).toHaveAttribute('aria-valuenow', '0.5');

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(0.75);
    expect(slider).toHaveAttribute('aria-valuenow', '0.75');

    // Inverted bounds, invalid step, NaN value/min/max, oversized diameter (> 160)
    rerender(
      <RotaryDial
        label="Sanitized"
        value={Number.NaN}
        defaultValue={-0}
        min={Number.NaN}
        max={Number.POSITIVE_INFINITY}
        step={-5}
        size={320}
      />
    );
    const sanitized = screen.getByRole('slider', { name: 'Sanitized' });
    expect(sanitized).toHaveStyle({ width: '160px', height: '160px' });
    expect(sanitized).toHaveAttribute('aria-valuemin', '0');
    expect(sanitized).toHaveAttribute('aria-valuemax', '100');
    expect(sanitized).toHaveAttribute('aria-valuenow', '0');

    // Degenerate zero-span range (min === max) handles drag safely without NaN
    const degChange = vi.fn<(next: number) => void>();
    rerender(
      <RotaryDial
        label="LockedSpan"
        defaultValue={42}
        min={42}
        max={42}
        step={1}
        onChange={degChange}
      />
    );
    const degSlider = screen.getByRole('slider', { name: 'LockedSpan' });
    expect(degSlider).toHaveAttribute('aria-valuenow', '42');
    fireEvent.pointerDown(degSlider, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(degSlider, { clientX: 120, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(degSlider, { clientX: 120, clientY: 10, pointerId: 1 });
    expect(degChange).not.toHaveBeenCalled();
  });

  it('blocks pointer drag, keyboard, and double-click when disabled and safely renders XSS payloads (negative & adversarial)', () => {
    const onChange = vi.fn<(next: number) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    render(
      <RotaryDial
        label={payload}
        unit={payload}
        defaultValue={30}
        disabled
        onChange={onChange}
        data-testid="disabled-dial"
      />
    );

    const root = screen.getByTestId('disabled-dial');
    const slider = screen.getByRole('slider', { name: payload });

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('tabindex', '-1');
    expect(slider).toHaveClass('cursor-not-allowed', 'opacity-50');
    expect(document.querySelector('script')).toBeNull();

    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 200, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 200, clientY: 0, pointerId: 1 });
    fireEvent.doubleClick(slider);
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
