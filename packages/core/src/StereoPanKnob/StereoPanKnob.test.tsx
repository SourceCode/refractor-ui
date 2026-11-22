import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { StereoPanKnob } from './index';

describe('StereoPanKnob', () => {
  it('renders prism-slab stereo pan card, 120x120 SVG dial, center detent, size presets, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            StereoPanKnob: {
              className: 'theme-pan-knob',
              style: { minWidth: '180px' },
            },
          },
        }}
      >
        <StereoPanKnob
          ref={ref}
          label="Lead Vocal"
          className="local-pan-knob"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '18px' }}
          data-testid="pan-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('pan-root');
    const slider = screen.getByRole('slider', { name: 'Lead Vocal' });
    const svg = screen.getByTestId('stereo-pan-svg');
    const track = screen.getByTestId('stereo-pan-track');
    const activeArc = screen.getByTestId('stereo-pan-active-arc');
    const detentNotch = screen.getByTestId('stereo-pan-center-detent');
    const centerDot = screen.getByTestId('stereo-pan-center-dot');
    const face = screen.getByTestId('stereo-pan-face');
    const needle = screen.getByTestId('stereo-pan-needle');
    const readout = screen.getByTestId('stereo-pan-readout');

    expect(StereoPanKnob.displayName).toBe('StereoPanKnob');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-stereo-pan-knob',
      'prism-slab',
      'max-w-full',
      'min-w-0',
      'theme-pan-knob',
      'local-pan-knob'
    );
    expect(root).toHaveStyle({ minWidth: '180px', padding: '18px' });
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveAttribute('data-side', 'center');
    expect(root).toHaveAttribute('data-centered', 'true');

    expect(screen.getByTestId('stereo-pan-label')).toHaveTextContent('Lead Vocal');
    expect(readout).toHaveTextContent('C');
    expect(readout).toHaveAttribute('data-pan-side', 'center');
    expect(readout.style.color).toBe('var(--prism-success-main)');

    expect(slider).toHaveAttribute('aria-valuemin', '-100');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('aria-valuetext', 'Center');
    expect(slider).toHaveAttribute('tabindex', '0');
    expect(slider).toHaveStyle({ width: '112px', height: '112px' });

    expect(svg).toHaveAttribute('viewBox', '0 0 120 120');
    expect(track).toHaveAttribute('stroke', 'var(--prism-divider)');
    expect(activeArc).toHaveAttribute('stroke-opacity', '0');
    expect(detentNotch).toHaveAttribute('stroke', 'var(--prism-success-main)');
    expect(centerDot).toHaveAttribute('fill-opacity', '1');
    expect(face).toHaveClass('prism-crystal');
    expect(needle).toHaveAttribute('transform', 'rotate(0 32 32)');

    // Responsive size presets: sm (88px) and lg (140px)
    rerender(<StereoPanKnob label="Compact Pan" size="sm" data-testid="pan-root" />);
    expect(screen.getByTestId('pan-root')).toHaveAttribute('data-size', 'sm');
    expect(screen.getByTestId('stereo-pan-dial')).toHaveStyle({ width: '88px', height: '88px' });
    expect(screen.getByTestId('stereo-pan-face')).toHaveStyle({ width: '54px', height: '54px' });

    rerender(<StereoPanKnob label="Studio Pan" size="lg" data-testid="pan-root" />);
    expect(screen.getByTestId('pan-root')).toHaveAttribute('data-size', 'lg');
    expect(screen.getByTestId('stereo-pan-dial')).toHaveStyle({ width: '140px', height: '140px' });
    expect(screen.getByTestId('stereo-pan-face')).toHaveStyle({ width: '86px', height: '86px' });
  });

  it('supports L/C/R quick detent buttons, bi-directional semantic tokens, and double-click snap to center', () => {
    const onChange = vi.fn<(pan: number, formatted: string) => void>();

    render(
      <StereoPanKnob
        label="Guitar Bus"
        defaultValue={-45}
        onChange={onChange}
        data-testid="detent-root"
      />
    );

    const root = screen.getByTestId('detent-root');
    const slider = screen.getByRole('slider', { name: 'Guitar Bus' });
    const readout = screen.getByTestId('stereo-pan-readout');
    const activeArc = screen.getByTestId('stereo-pan-active-arc');
    const detentNotch = screen.getByTestId('stereo-pan-center-detent');
    const needle = screen.getByTestId('stereo-pan-needle');
    const btnLeft = screen.getByTestId('stereo-pan-detent-left');
    const btnCenter = screen.getByTestId('stereo-pan-detent-center');
    const btnRight = screen.getByTestId('stereo-pan-detent-right');

    // Initial Left state (-45 -> L45)
    expect(root).toHaveAttribute('data-side', 'left');
    expect(readout).toHaveTextContent('L45');
    expect(readout.style.color).toBe('var(--prism-info-main)');
    expect(slider).toHaveAttribute('aria-valuetext', '45% Left');
    expect(activeArc).toHaveAttribute('stroke', 'var(--prism-info-main)');
    expect(activeArc).toHaveAttribute('stroke-opacity', '1');
    expect(activeArc.getAttribute('d')).toContain('0 0 0');
    expect(detentNotch).toHaveAttribute('stroke', 'var(--prism-text-secondary)');

    // Double-click snaps cleanly to Center (0) even though defaultValue was -45
    fireEvent.doubleClick(slider);
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');
    expect(readout).toHaveTextContent('C');
    expect(readout.style.color).toBe('var(--prism-success-main)');
    expect(btnCenter).toHaveAttribute('aria-pressed', 'true');

    // Second double-click at center emits no duplicate onChange
    const countAtCenter = onChange.mock.calls.length;
    fireEvent.doubleClick(slider);
    expect(onChange).toHaveBeenCalledTimes(countAtCenter);

    // Quick L button -> -100 (L100)
    fireEvent.click(btnLeft);
    expect(onChange).toHaveBeenLastCalledWith(-100, 'L100');
    expect(readout).toHaveTextContent('L100');
    expect(slider).toHaveAttribute('aria-valuetext', '100% Left');
    expect(needle).toHaveAttribute('transform', 'rotate(-135 32 32)');
    expect(btnLeft).toHaveAttribute('aria-pressed', 'true');
    expect(btnCenter).toHaveAttribute('aria-pressed', 'false');

    // Clicking L while already at -100 emits no duplicate
    const countAtLeft = onChange.mock.calls.length;
    fireEvent.click(btnLeft);
    expect(onChange).toHaveBeenCalledTimes(countAtLeft);

    // Quick R button -> +100 (R100)
    fireEvent.click(btnRight);
    expect(onChange).toHaveBeenLastCalledWith(100, 'R100');
    expect(root).toHaveAttribute('data-side', 'right');
    expect(readout).toHaveTextContent('R100');
    expect(readout.style.color).toBe('var(--prism-primary-main)');
    expect(slider).toHaveAttribute('aria-valuetext', '100% Right');
    expect(activeArc).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(activeArc.getAttribute('d')).toContain('0 0 1');
    expect(needle).toHaveAttribute('transform', 'rotate(135 32 32)');
    expect(btnRight).toHaveAttribute('aria-pressed', 'true');

    // Quick C button -> 0 (C)
    fireEvent.click(btnCenter);
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(btnCenter).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports IME-safe keyboard stepping (Arrow ±5, Shift+Arrow ±1, Page ±25, Home/End, 0/c/C center snap)', () => {
    const onChange = vi.fn<(pan: number, formatted: string) => void>();

    render(<StereoPanKnob defaultValue={0} onChange={onChange} />);

    const slider = screen.getByRole('slider', { name: 'Stereo Pan' });

    // IME composing, modifier chords, and unrelated keys are ignored
    fireEvent.keyDown(slider, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(slider, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(slider, { key: '0', metaKey: true });
    fireEvent.keyDown(slider, { key: 'ArrowLeft', altKey: true });
    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();

    // ArrowRight (+5 -> R5) and ArrowUp (+5 -> R10)
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(5, 'R5');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(10, 'R10');

    // ArrowLeft (-5 -> R5) and ArrowDown (-5 -> C)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(5, 'R5');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');

    // Shift+Arrow fine stepping (±1) bypasses drag centerDetentWidth cleanly
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(1, 'R1');
    fireEvent.keyDown(slider, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(2, 'R2');
    fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(1, 'R1');
    fireEvent.keyDown(slider, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');

    // PageUp (+25 -> R25) and PageDown (-25 -> C, then -25 -> L25)
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(onChange).toHaveBeenLastCalledWith(25, 'R25');
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith(-25, 'L25');

    // '0' snaps to center
    fireEvent.keyDown(slider, { key: '0' });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');

    // End -> +100, lowercase 'c' snaps back to center
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(100, 'R100');
    const countAtMax = onChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledTimes(countAtMax);

    fireEvent.keyDown(slider, { key: 'c' });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');

    // Home -> -100, uppercase 'C' snaps back to center
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(-100, 'L100');
    fireEvent.keyDown(slider, { key: 'C' });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');
  });

  it('supports vertical/horizontal window pointer drag, magnetic center detent snapping, and cleans up on pointerup/cancel/disable/unmount', () => {
    const onChange = vi.fn<(pan: number, formatted: string) => void>();

    const { rerender, unmount } = render(
      <StereoPanKnob
        label="Overhead Pan"
        defaultValue={30}
        centerDetentWidth={4}
        onChange={onChange}
        data-testid="drag-root"
      />
    );

    const root = screen.getByTestId('drag-root');
    const slider = screen.getByRole('slider', { name: 'Overhead Pan' });

    // Non-primary button ignored
    fireEvent.pointerDown(slider, { button: 2, clientX: 100, clientY: 100, pointerId: 1 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Start primary pointer drag (startPan = 30)
    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 7 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(slider).toHaveAttribute('data-dragging', 'true');
    expect(slider).toHaveClass('cursor-grabbing');

    // Stray pointerId is ignored on move and up
    fireEvent.pointerMove(window, { clientX: 200, clientY: 0, pointerId: 99 });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 0, pointerId: 99 });
    expect(onChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Drag up (-20px) + right (+10px) => dx - dy = +30 => 30 + 30 = +60 (R60)
    fireEvent.pointerMove(window, { clientX: 110, clientY: 80, pointerId: 7 });
    expect(onChange).toHaveBeenLastCalledWith(60, 'R60');
    expect(slider).toHaveAttribute('aria-valuetext', '60% Right');

    // Drag back toward center: dx = -27, dy = 0 => rawNext = 3 <= centerDetentWidth(4) -> snaps magnetically to 0 (C)
    fireEvent.pointerMove(window, { clientX: 73, clientY: 100, pointerId: 7 });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');

    // Drag slightly past 0 inside deadzone: dx = -34 => rawNext = -4 -> stays locked at 0 (no duplicate emit)
    const countInDetent = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 66, clientY: 100, pointerId: 7 });
    expect(onChange).toHaveBeenCalledTimes(countInDetent);

    // Drag past deadzone: dx = -35 => rawNext = -5 -> breaks free to -5 (L5)
    fireEvent.pointerMove(window, { clientX: 65, clientY: 100, pointerId: 7 });
    expect(onChange).toHaveBeenLastCalledWith(-5, 'L5');

    // End drag via window pointerUp -> detaches listeners
    fireEvent.pointerUp(window, { clientX: 65, clientY: 100, pointerId: 7 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(slider).toHaveClass('cursor-grab');

    const countAfterUp = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 250, clientY: 0, pointerId: 7 });
    expect(onChange).toHaveBeenCalledTimes(countAfterUp);

    // Verify centerDetentWidth = 0 disables magnetic deadzone (allows +2 during drag)
    rerender(
      <StereoPanKnob
        label="Overhead Pan"
        defaultValue={0}
        centerDetentWidth={0}
        onChange={onChange}
        data-testid="drag-root"
      />
    );
    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 8 });
    // Current uncontrolled pan is -5, so dx = +7 moves rawNext to +2 without snapping to 0
    fireEvent.pointerMove(window, { clientX: 107, clientY: 100, pointerId: 8 });
    expect(onChange).toHaveBeenLastCalledWith(2, 'R2');

    // End drag via pointerCancel
    fireEvent.pointerCancel(window, { clientX: 107, clientY: 100, pointerId: 8 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Disabling mid-drag cleans up window listeners immediately
    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 9 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    rerender(
      <StereoPanKnob
        label="Overhead Pan"
        defaultValue={0}
        centerDetentWidth={0}
        disabled
        onChange={onChange}
        data-testid="drag-root"
      />
    );
    expect(root).not.toHaveAttribute('data-dragging');
    const countAfterDisable = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 180, clientY: 100, pointerId: 9 });
    expect(onChange).toHaveBeenCalledTimes(countAfterDisable);

    // Re-enable and verify unmount mid-drag cleans up window listeners
    rerender(
      <StereoPanKnob
        label="Overhead Pan"
        defaultValue={0}
        centerDetentWidth={4}
        onChange={onChange}
        data-testid="drag-root"
      />
    );
    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 10 });
    unmount();
    fireEvent.pointerMove(window, { clientX: 250, clientY: 50, pointerId: 10 });
    expect(onChange).toHaveBeenCalledTimes(countAfterDisable);
  });

  it('supports controlled state via keyboard and drag, clamps extreme/NaN inputs, and falls back blank labels', () => {
    const onChange = vi.fn<(pan: number, formatted: string) => void>();

    function ControlledPan() {
      const [pan, setPan] = useState<number>(20);
      return (
        <StereoPanKnob
          label="Controlled Pan"
          value={pan}
          centerDetentWidth={50}
          onChange={(nextPan, formatted) => {
            onChange(nextPan, formatted);
            setPan(nextPan);
          }}
        />
      );
    }

    const { rerender } = render(<ControlledPan />);
    const slider = screen.getByRole('slider', { name: 'Controlled Pan' });
    expect(slider).toHaveAttribute('aria-valuenow', '20');

    // Controlled keyboard adjustment
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(25, 'R25');
    expect(slider).toHaveAttribute('aria-valuenow', '25');

    // Controlled drag snaps to center when within clamped centerDetentWidth (50 -> 15)
    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 3 });
    // dx = -10 => 25 - 10 = 15 <= 15 (clamped max detent) -> snaps to 0
    fireEvent.pointerMove(window, { clientX: 90, clientY: 100, pointerId: 3 });
    expect(onChange).toHaveBeenLastCalledWith(0, 'C');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    fireEvent.pointerUp(window, { clientX: 90, clientY: 100, pointerId: 3 });

    // Sanitization: NaN value, -0 defaultValue, negative detent width, blank label
    rerender(
      <StereoPanKnob
        label="   "
        value={Number.NaN}
        defaultValue={-0}
        centerDetentWidth={-12}
      />
    );
    const fallbackSlider = screen.getByRole('slider', { name: 'Stereo Pan' });
    expect(screen.getByTestId('stereo-pan-label')).toHaveTextContent('Stereo Pan');
    expect(fallbackSlider).toHaveAttribute('aria-valuenow', '0');

    // Out-of-bounds controlled value clamped to [-100..100]
    rerender(<StereoPanKnob label="Clamped" value={999} />);
    expect(screen.getByRole('slider', { name: 'Clamped' })).toHaveAttribute('aria-valuenow', '100');

    rerender(<StereoPanKnob label="Clamped" value={-999} />);
    expect(screen.getByRole('slider', { name: 'Clamped' })).toHaveAttribute('aria-valuenow', '-100');
  });

  it('blocks all interactions when disabled and safely renders XSS label payloads (negative & adversarial)', () => {
    const onChange = vi.fn<(pan: number, formatted: string) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    render(
      <StereoPanKnob
        label={payload}
        defaultValue={-30}
        disabled
        onChange={onChange}
        data-testid="disabled-pan"
      />
    );

    const root = screen.getByTestId('disabled-pan');
    const slider = screen.getByRole('slider', { name: payload });
    const btnLeft = screen.getByTestId('stereo-pan-detent-left');
    const btnCenter = screen.getByTestId('stereo-pan-detent-center');
    const btnRight = screen.getByTestId('stereo-pan-detent-right');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('tabindex', '-1');
    expect(slider).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(btnLeft).toBeDisabled();
    expect(btnCenter).toBeDisabled();
    expect(btnRight).toBeDisabled();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('stereo-pan-label')).toHaveTextContent(payload);

    fireEvent.pointerDown(slider, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 0, pointerId: 1 });
    fireEvent.doubleClick(slider);
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: '0' });
    fireEvent.click(btnLeft);
    fireEvent.click(btnCenter);
    fireEvent.click(btnRight);

    expect(onChange).not.toHaveBeenCalled();
    expect(slider).toHaveAttribute('aria-valuenow', '-30');
  });
});
