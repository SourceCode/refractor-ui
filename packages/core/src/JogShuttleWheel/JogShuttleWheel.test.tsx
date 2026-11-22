import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { JogShuttleWheel } from './index';

function mockRect(el: HTMLElement, left: number, width: number, height = 44) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top: 0,
      right: left + width,
      bottom: height,
      width,
      height,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }),
  });
}

describe('JogShuttleWheel', () => {
  it('renders optical prism-slab deck, 140x140 SVG jog wheel, shuttle strip, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            JogShuttleWheel: {
              className: 'theme-jog-deck',
              style: { maxWidth: '520px' },
            },
          },
        }}
      >
        <JogShuttleWheel
          ref={ref}
          title="Master Edit Deck"
          defaultFrame={42}
          minFrame={0}
          maxFrame={1800}
          className="local-jog-deck"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="jog-deck-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('jog-deck-root');
    const jogSlider = screen.getByRole('slider', { name: 'Jog wheel' });
    const shuttleSlider = screen.getByRole('slider', { name: 'Shuttle speed' });
    const svg = screen.getByTestId('jog-wheel-svg');
    const rotor = screen.getByTestId('jog-wheel-rotor');
    const notch = screen.getByTestId('jog-wheel-notch');
    const dimple = screen.getByTestId('jog-wheel-dimple');

    expect(JogShuttleWheel.displayName).toBe('JogShuttleWheel');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-jog-shuttle-wheel',
      'prism-slab',
      'theme-jog-deck',
      'local-jog-deck'
    );
    expect(root).toHaveStyle({ maxWidth: '520px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Master Edit Deck');
    expect(root).toHaveAttribute('data-shuttle-direction', 'idle');
    expect(root).toHaveAttribute('data-spring-return', 'true');

    expect(screen.getByTestId('jog-shuttle-title')).toHaveTextContent('Master Edit Deck');
    expect(screen.getByTestId('jog-frame-readout')).toHaveTextContent('F 0042');
    expect(screen.getByTestId('shuttle-rate-badge')).toHaveTextContent('IDLE');

    // SVG jog wheel contract
    expect(svg).toHaveAttribute('viewBox', '0 0 140 140');
    expect(jogSlider).toHaveAttribute('aria-valuenow', '42');
    expect(jogSlider).toHaveAttribute('aria-valuemin', '0');
    expect(jogSlider).toHaveAttribute('aria-valuemax', '1800');
    expect(jogSlider).toHaveAttribute('aria-valuetext', 'F 0042');
    expect(jogSlider).toHaveAttribute('tabindex', '0');
    expect(rotor).toHaveAttribute('transform', 'rotate(630 70 70)');
    expect(notch).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(dimple).toHaveAttribute('fill', 'var(--prism-well-start)');

    // Shuttle slider contract & default notches
    expect(shuttleSlider).toHaveAttribute('aria-valuemin', '-8');
    expect(shuttleSlider).toHaveAttribute('aria-valuemax', '8');
    expect(shuttleSlider).toHaveAttribute('aria-valuenow', '0');
    expect(shuttleSlider).toHaveAttribute('aria-valuetext', 'IDLE');
    expect(screen.getByTestId('shuttle-center-detent')).toBeInTheDocument();
    expect(screen.getByTestId('shuttle-notch-0')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('shuttle-notch--8')).toHaveTextContent('-8×');
    expect(screen.getByTestId('shuttle-notch-8')).toHaveTextContent('+8×');
    expect(screen.getByTestId('shuttle-spring-toggle')).toHaveTextContent('Spring');
  });

  it('supports jog wheel keyboard navigation (Arrow ±1F, PageUp/PageDown ±10F, Home/End, negative frames) and guards IME', () => {
    const onJogStep = vi.fn<(deltaFrames: number, nextFrame: number) => void>();

    render(
      <JogShuttleWheel
        defaultFrame={5}
        minFrame={-10}
        maxFrame={25}
        onJogStep={onJogStep}
      />
    );

    const jogSlider = screen.getByRole('slider', { name: 'Jog wheel' });
    const readout = screen.getByTestId('jog-frame-readout');

    expect(readout).toHaveTextContent('F 0005');

    // IME composition and unrelated keys ignored
    fireEvent.keyDown(jogSlider, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(jogSlider, { key: 'Tab' });
    expect(onJogStep).not.toHaveBeenCalled();

    // ArrowRight (+1 -> 6) and ArrowUp (+1 -> 7)
    fireEvent.keyDown(jogSlider, { key: 'ArrowRight' });
    expect(onJogStep).toHaveBeenLastCalledWith(1, 6);
    expect(readout).toHaveTextContent('F 0006');

    fireEvent.keyDown(jogSlider, { key: 'ArrowUp' });
    expect(onJogStep).toHaveBeenLastCalledWith(1, 7);

    // ArrowLeft (-1 -> 6) and ArrowDown (-1 -> 5)
    fireEvent.keyDown(jogSlider, { key: 'ArrowLeft' });
    expect(onJogStep).toHaveBeenLastCalledWith(-1, 6);

    fireEvent.keyDown(jogSlider, { key: 'ArrowDown' });
    expect(onJogStep).toHaveBeenLastCalledWith(-1, 5);

    // PageUp (+10 -> 15) and PageDown (-10 -> 5, then -10 -> -5)
    fireEvent.keyDown(jogSlider, { key: 'PageUp' });
    expect(onJogStep).toHaveBeenLastCalledWith(10, 15);
    expect(readout).toHaveTextContent('F 0015');

    fireEvent.keyDown(jogSlider, { key: 'PageDown' });
    expect(onJogStep).toHaveBeenLastCalledWith(-10, 5);

    fireEvent.keyDown(jogSlider, { key: 'PageDown' });
    expect(onJogStep).toHaveBeenLastCalledWith(-10, -5);
    expect(readout).toHaveTextContent('F -0005');

    // Home -> minFrame (-10)
    fireEvent.keyDown(jogSlider, { key: 'Home' });
    expect(onJogStep).toHaveBeenLastCalledWith(-5, -10);
    expect(readout).toHaveTextContent('F -0010');

    // Pressing ArrowLeft at minFrame emits no duplicate callback
    const countAtMin = onJogStep.mock.calls.length;
    fireEvent.keyDown(jogSlider, { key: 'ArrowLeft' });
    expect(onJogStep).toHaveBeenCalledTimes(countAtMin);

    // End -> maxFrame (25)
    fireEvent.keyDown(jogSlider, { key: 'End' });
    expect(onJogStep).toHaveBeenLastCalledWith(35, 25);
    expect(readout).toHaveTextContent('F 0025');

    // Pressing ArrowRight at maxFrame emits no duplicate callback
    const countAtMax = onJogStep.mock.calls.length;
    fireEvent.keyDown(jogSlider, { key: 'ArrowRight' });
    expect(onJogStep).toHaveBeenCalledTimes(countAtMax);
  });

  it('emits discrete ±1F per 12px horizontal pointer drag, rotates rotor smoothly, clamps boundaries, and cleans up window listeners', () => {
    const onJogStep = vi.fn<(deltaFrames: number, nextFrame: number) => void>();

    const { unmount } = render(
      <JogShuttleWheel
        defaultFrame={1}
        minFrame={0}
        maxFrame={3}
        onJogStep={onJogStep}
        data-testid="jog-drag-root"
      />
    );

    const root = screen.getByTestId('jog-drag-root');
    const jogSlider = screen.getByRole('slider', { name: 'Jog wheel' });
    const rotor = screen.getByTestId('jog-wheel-rotor');

    // Right-click ignored
    fireEvent.pointerDown(jogSlider, { button: 2, clientX: 100 });
    expect(root).not.toHaveAttribute('data-jogging');

    // Primary drag start
    fireEvent.pointerDown(jogSlider, { button: 0, clientX: 100 });
    expect(root).toHaveAttribute('data-jogging', 'true');
    expect(jogSlider).toHaveAttribute('data-dragging', 'true');
    expect(jogSlider).toHaveClass('cursor-grabbing');
    expect(rotor).toHaveAttribute('transform', 'rotate(15 70 70)');

    // Sub-step drag (+6px) smoothly rotates rotor by +7.5deg without emitting frame step
    fireEvent.pointerMove(window, { clientX: 106 });
    expect(onJogStep).not.toHaveBeenCalled();
    expect(rotor).toHaveAttribute('transform', 'rotate(22.5 70 70)');

    // Reaching +12px total emits +1 frame (1 -> 2)
    fireEvent.pointerMove(window, { clientX: 112 });
    expect(onJogStep).toHaveBeenLastCalledWith(1, 2);
    expect(screen.getByTestId('jog-frame-readout')).toHaveTextContent('F 0002');
    expect(rotor).toHaveAttribute('transform', 'rotate(30 70 70)');

    // Dragging +30px hits upper stop (2 -> 3, delta +1) and zeros excess sub-angle
    fireEvent.pointerMove(window, { clientX: 142 });
    expect(onJogStep).toHaveBeenLastCalledWith(1, 3);
    expect(rotor).toHaveAttribute('transform', 'rotate(45 70 70)');

    // Dragging further past maxFrame emits nothing
    const callsAtMax = onJogStep.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 180 });
    expect(onJogStep).toHaveBeenCalledTimes(callsAtMax);

    // Dragging left -48px drops 3 -> 0 (delta -3) and clamps at lower stop
    fireEvent.pointerMove(window, { clientX: 132 });
    expect(onJogStep).toHaveBeenLastCalledWith(-3, 0);
    expect(screen.getByTestId('jog-frame-readout')).toHaveTextContent('F 0000');

    // Dragging further left -6px at lower stop keeps sub-angle 0
    fireEvent.pointerMove(window, { clientX: 126 });
    expect(rotor).toHaveAttribute('transform', 'rotate(0 70 70)');

    // Pointerup ends drag and detaches window listeners
    fireEvent.pointerUp(window);
    expect(root).not.toHaveAttribute('data-jogging');
    expect(jogSlider).toHaveClass('cursor-grab');

    const countAfterUp = onJogStep.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 300 });
    expect(onJogStep).toHaveBeenCalledTimes(countAfterUp);

    // Verify pointercancel and mid-drag unmount cleanup
    fireEvent.pointerDown(jogSlider, { button: 0, clientX: 100 });
    fireEvent.pointerCancel(window);
    expect(root).not.toHaveAttribute('data-jogging');

    fireEvent.pointerDown(jogSlider, { button: 0, clientX: 100 });
    unmount();
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(onJogStep).toHaveBeenCalledTimes(countAfterUp);
  });

  it('supports spring-loaded shuttle drag, Hold/Spring toggle, direct detents, zero-width guard, and window cleanup', () => {
    const onShuttleChange = vi.fn<(speed: number) => void>();

    const { rerender, unmount } = render(
      <JogShuttleWheel
        onShuttleChange={onShuttleChange}
        data-testid="shuttle-deck"
      />
    );

    const root = screen.getByTestId('shuttle-deck');
    const shuttleSlider = screen.getByRole('slider', { name: 'Shuttle speed' });
    const badge = screen.getByTestId('shuttle-rate-badge');
    const springToggle = screen.getByTestId('shuttle-spring-toggle');

    // Zero-width bounding box safely no-ops
    mockRect(shuttleSlider, 0, 0);
    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 120 });
    fireEvent.pointerMove(window, { clientX: 200 });
    fireEvent.pointerUp(window);
    expect(onShuttleChange).not.toHaveBeenCalled();

    // Mock 400px shuttle track [100..500]
    mockRect(shuttleSlider, 100, 400);

    // Secondary button ignored
    fireEvent.pointerDown(shuttleSlider, { button: 2, clientX: 500 });
    expect(root).not.toHaveAttribute('data-shuttling');

    // Press at center 0x (clientX = 300 -> ratio 0.5 -> index 4 -> 0) and release -> no redundant callback
    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 300 });
    expect(root).toHaveAttribute('data-shuttling', 'true');
    fireEvent.pointerUp(window);
    expect(onShuttleChange).not.toHaveBeenCalled();

    // Drag to +8x (right edge) -> drag to +4x -> drag to -2x -> release springs back to 0x
    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 500 });
    expect(onShuttleChange).toHaveBeenLastCalledWith(8);
    expect(badge).toHaveTextContent('+8× FWD');
    expect(root).toHaveAttribute('data-shuttle-direction', 'fwd');

    // Moving within same +8x zone does not emit duplicate
    const callsAtEight = onShuttleChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 498 });
    expect(onShuttleChange).toHaveBeenCalledTimes(callsAtEight);

    // Drag left to index 2 (-2x: ratio 2/8 = 0.25 -> clientX = 200)
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(onShuttleChange).toHaveBeenLastCalledWith(-2);
    expect(badge).toHaveTextContent('-2× REV');
    expect(root).toHaveAttribute('data-shuttle-direction', 'rev');

    // Release with springReturn=true returns speed to 0 and emits onShuttleChange(0)
    fireEvent.pointerUp(window);
    expect(onShuttleChange).toHaveBeenLastCalledWith(0);
    expect(badge).toHaveTextContent('IDLE');
    expect(root).not.toHaveAttribute('data-shuttling');
    expect(root).toHaveAttribute('data-shuttle-direction', 'idle');

    // Verify pointercancel also springs back to 0
    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 100 });
    expect(onShuttleChange).toHaveBeenLastCalledWith(-8);
    fireEvent.pointerCancel(window);
    expect(onShuttleChange).toHaveBeenLastCalledWith(0);

    // Toggle to Hold mode: releasing pointer preserves speed
    fireEvent.click(springToggle);
    expect(springToggle).toHaveTextContent('Hold');
    expect(springToggle).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-spring-return');

    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 450 }); // ratio 0.875 -> index 7 (+4x)
    expect(onShuttleChange).toHaveBeenLastCalledWith(4);
    expect(badge).toHaveTextContent('+4× FWD');
    fireEvent.pointerUp(window);
    expect(badge).toHaveTextContent('+4× FWD');
    expect(shuttleSlider).toHaveAttribute('aria-valuenow', '4');

    // Direct detent buttons select speed and avoid duplicate emits on already-selected detent
    fireEvent.click(screen.getByTestId('shuttle-notch--4'));
    expect(onShuttleChange).toHaveBeenLastCalledWith(-4);
    expect(badge).toHaveTextContent('-4× REV');

    const countBeforeRepeat = onShuttleChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('shuttle-notch--4'));
    expect(onShuttleChange).toHaveBeenCalledTimes(countBeforeRepeat);

    fireEvent.click(screen.getByTestId('shuttle-notch-0'));
    expect(onShuttleChange).toHaveBeenLastCalledWith(0);
    expect(badge).toHaveTextContent('IDLE');

    // Rerendering springReturn prop syncs mode back to Spring
    rerender(
      <JogShuttleWheel
        springReturn={false}
        onShuttleChange={onShuttleChange}
        data-testid="shuttle-deck"
      />
    );
    expect(springToggle).toHaveTextContent('Hold');

    rerender(
      <JogShuttleWheel
        springReturn={true}
        onShuttleChange={onShuttleChange}
        data-testid="shuttle-deck"
      />
    );
    expect(springToggle).toHaveTextContent('Spring');

    // Unmount mid-drag detaches window listeners safely
    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 500 });
    const countBeforeUnmount = onShuttleChange.mock.calls.length;
    unmount();
    fireEvent.pointerMove(window, { clientX: 100 });
    fireEvent.pointerUp(window);
    expect(onShuttleChange).toHaveBeenCalledTimes(countBeforeUnmount);
  });

  it('supports shuttle keyboard stepping (ArrowLeft/Right/Up/Down, 0 and Home reset) and IME guard', () => {
    const onShuttleChange = vi.fn<(speed: number) => void>();

    render(<JogShuttleWheel onShuttleChange={onShuttleChange} />);

    const shuttleSlider = screen.getByRole('slider', { name: 'Shuttle speed' });
    const badge = screen.getByTestId('shuttle-rate-badge');

    // IME composing & unrelated keys ignored
    fireEvent.keyDown(shuttleSlider, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(shuttleSlider, { key: 'Escape' });
    expect(onShuttleChange).not.toHaveBeenCalled();

    // ArrowRight (0 -> 1) and ArrowUp (1 -> 2)
    fireEvent.keyDown(shuttleSlider, { key: 'ArrowRight' });
    expect(onShuttleChange).toHaveBeenLastCalledWith(1);
    expect(badge).toHaveTextContent('+1× FWD');

    fireEvent.keyDown(shuttleSlider, { key: 'ArrowUp' });
    expect(onShuttleChange).toHaveBeenLastCalledWith(2);

    // '0' resets to 0x
    fireEvent.keyDown(shuttleSlider, { key: '0' });
    expect(onShuttleChange).toHaveBeenLastCalledWith(0);
    expect(badge).toHaveTextContent('IDLE');

    // ArrowLeft (0 -> -1) and ArrowDown (-1 -> -2)
    fireEvent.keyDown(shuttleSlider, { key: 'ArrowLeft' });
    expect(onShuttleChange).toHaveBeenLastCalledWith(-1);

    fireEvent.keyDown(shuttleSlider, { key: 'ArrowDown' });
    expect(onShuttleChange).toHaveBeenLastCalledWith(-2);
    expect(badge).toHaveTextContent('-2× REV');

    // 'Home' resets to 0x
    fireEvent.keyDown(shuttleSlider, { key: 'Home' });
    expect(onShuttleChange).toHaveBeenLastCalledWith(0);
    expect(badge).toHaveTextContent('IDLE');
  });

  it('supports controlled frame mode, sanitized/custom shuttleSpeeds, inverted/NaN bounds, and single-speed scale', () => {
    const onJogStep = vi.fn<(deltaFrames: number, nextFrame: number) => void>();
    const onShuttleChange = vi.fn<(speed: number) => void>();

    function ControlledDeck() {
      const [frame, setFrame] = useState<number>(20);
      return (
        <JogShuttleWheel
          frame={frame}
          minFrame={0}
          maxFrame={100}
          shuttleSpeeds={[4, -2, Number.NaN, 4, Number.POSITIVE_INFINITY, -0]}
          onJogStep={(delta, next) => {
            onJogStep(delta, next);
            setFrame(next);
          }}
          onShuttleChange={onShuttleChange}
        />
      );
    }

    const { rerender } = render(<ControlledDeck />);

    const jogSlider = screen.getByRole('slider', { name: 'Jog wheel' });
    const shuttleSlider = screen.getByRole('slider', { name: 'Shuttle speed' });

    expect(screen.getByTestId('jog-frame-readout')).toHaveTextContent('F 0020');
    // Custom speeds normalized to [-2, 0, 4]
    expect(shuttleSlider).toHaveAttribute('aria-valuemin', '-2');
    expect(shuttleSlider).toHaveAttribute('aria-valuemax', '4');

    // Controlled keyboard + pointer drag both update parent frame
    fireEvent.keyDown(jogSlider, { key: 'ArrowRight' });
    expect(onJogStep).toHaveBeenLastCalledWith(1, 21);
    expect(screen.getByTestId('jog-frame-readout')).toHaveTextContent('F 0021');

    fireEvent.pointerDown(jogSlider, { button: 0, clientX: 50 });
    fireEvent.pointerMove(window, { clientX: 74 });
    fireEvent.pointerUp(window);
    expect(onJogStep).toHaveBeenLastCalledWith(2, 23);
    expect(screen.getByTestId('jog-frame-readout')).toHaveTextContent('F 0023');

    // Rerender with inverted/NaN bounds, empty/non-finite shuttleSpeeds, and shrinking speeds
    const staticJogSpy = vi.fn<(deltaFrames: number, nextFrame: number) => void>();
    rerender(
      <JogShuttleWheel
        frame={Number.NaN}
        defaultFrame={-0}
        minFrame={Number.NaN}
        maxFrame={Number.POSITIVE_INFINITY}
        shuttleSpeeds={[Number.NaN]}
        onJogStep={staticJogSpy}
      />
    );
    const sanitizedJog = screen.getByRole('slider', { name: 'Jog wheel' });
    expect(sanitizedJog).toHaveAttribute('aria-valuemin', '0');
    expect(sanitizedJog).toHaveAttribute('aria-valuemax', '1800');
    expect(sanitizedJog).toHaveAttribute('aria-valuenow', '0');

    // Select +4x on default fallback scale, then shrink shuttleSpeeds so +4x is removed -> falls back to 0 (IDLE)
    fireEvent.click(screen.getByTestId('shuttle-notch-4'));
    expect(screen.getByTestId('shuttle-rate-badge')).toHaveTextContent('+4× FWD');

    rerender(
      <JogShuttleWheel
        defaultFrame={10}
        minFrame={50}
        maxFrame={10}
        shuttleSpeeds={[0]}
      />
    );
    const singleShuttle = screen.getByRole('slider', { name: 'Shuttle speed' });
    expect(screen.getByTestId('shuttle-rate-badge')).toHaveTextContent('IDLE');
    expect(screen.getByTestId('shuttle-thumb')).toHaveStyle({ left: '50%' });
    expect(screen.getByRole('slider', { name: 'Jog wheel' })).toHaveAttribute('aria-valuemin', '10');
    expect(screen.getByRole('slider', { name: 'Jog wheel' })).toHaveAttribute('aria-valuemax', '50');

    // Single-speed scale drag stays cleanly at 0 without NaN
    mockRect(singleShuttle, 0, 200);
    fireEvent.pointerDown(singleShuttle, { button: 0, clientX: 150 });
    fireEvent.pointerUp(window);
    expect(screen.getByTestId('shuttle-rate-badge')).toHaveTextContent('IDLE');
  });

  it('blocks interactions when disabled, aborts active drag on disable transition, and safely renders XSS payloads (negative & adversarial)', () => {
    const onJogStep = vi.fn<(deltaFrames: number, nextFrame: number) => void>();
    const onShuttleChange = vi.fn<(speed: number) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <JogShuttleWheel
        title={payload}
        defaultFrame={12}
        onJogStep={onJogStep}
        onShuttleChange={onShuttleChange}
        data-testid="adversarial-deck"
      />
    );

    const root = screen.getByTestId('adversarial-deck');
    const jogSlider = screen.getByRole('slider', { name: 'Jog wheel' });
    const shuttleSlider = screen.getByRole('slider', { name: 'Shuttle speed' });
    mockRect(shuttleSlider, 0, 400);

    // Start drags then flip disabled -> true mid-drag
    fireEvent.pointerDown(jogSlider, { button: 0, clientX: 100 });
    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 300 });
    expect(root).toHaveAttribute('data-jogging', 'true');
    expect(root).toHaveAttribute('data-shuttling', 'true');

    rerender(
      <JogShuttleWheel
        title={payload}
        defaultFrame={12}
        disabled
        onJogStep={onJogStep}
        onShuttleChange={onShuttleChange}
        data-testid="adversarial-deck"
      />
    );

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).not.toHaveAttribute('data-jogging');
    expect(root).not.toHaveAttribute('data-shuttling');
    expect(jogSlider).toHaveAttribute('aria-disabled', 'true');
    expect(jogSlider).toHaveAttribute('tabindex', '-1');
    expect(shuttleSlider).toHaveAttribute('aria-disabled', 'true');
    expect(shuttleSlider).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('shuttle-spring-toggle')).toBeDisabled();
    expect(screen.getByTestId('shuttle-notch-0')).toBeDisabled();

    // XSS rendered as literal text only
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('jog-shuttle-title')).toHaveTextContent(payload);

    // Subsequent window drag events and new interactions are blocked
    const jogCalls = onJogStep.mock.calls.length;
    const shuttleCalls = onShuttleChange.mock.calls.length;

    fireEvent.pointerMove(window, { clientX: 350 });
    fireEvent.pointerDown(jogSlider, { button: 0, clientX: 100 });
    fireEvent.keyDown(jogSlider, { key: 'ArrowRight' });
    fireEvent.pointerDown(shuttleSlider, { button: 0, clientX: 400 });
    fireEvent.keyDown(shuttleSlider, { key: 'ArrowRight' });

    expect(onJogStep).toHaveBeenCalledTimes(jogCalls);
    expect(onShuttleChange).toHaveBeenCalledTimes(shuttleCalls);
  });
});
