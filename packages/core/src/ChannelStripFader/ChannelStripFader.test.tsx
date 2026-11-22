import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ChannelStripFader } from './index';

function mockVerticalRect(el: HTMLElement, top: number, height: number, width = 48) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top,
      right: width,
      bottom: top + height,
      width,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }),
  });
}

describe('ChannelStripFader', () => {
  it('renders vertical optical prism-slab strip, calibrated dB markings, tactile cap, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ChannelStripFader: {
              className: 'theme-fader',
              style: { minHeight: '300px' },
            },
          },
        }}
      >
        <ChannelStripFader
          ref={ref}
          className="local-fader"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '14px' }}
          data-testid="fader-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('fader-root');
    const slider = screen.getByRole('slider', { name: 'CH 1 · Vocals fader level' });
    const readout = screen.getByTestId('channel-strip-fader-readout');
    const cap = screen.getByTestId('channel-strip-fader-cap');
    const groove = screen.getByTestId('channel-strip-fader-groove');
    const fill = screen.getByTestId('channel-strip-fader-fill');
    const unityBtn = screen.getByTestId('channel-strip-fader-unity');
    const muteBtn = screen.getByTestId('channel-strip-fader-mute');

    expect(ChannelStripFader.displayName).toBe('ChannelStripFader');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-channel-strip-fader',
      'prism-slab',
      'w-full',
      'max-w-[160px]',
      'min-w-0',
      'theme-fader',
      'local-fader'
    );
    expect(root).toHaveStyle({ minHeight: '300px', padding: '14px' });
    expect(root).toHaveAttribute('role', 'group');
    expect(root).toHaveAttribute('aria-label', 'CH 1 · Vocals');
    expect(root).toHaveAttribute('data-scale-mode', 'studio-db');
    expect(root).toHaveAttribute('data-unity', 'true');

    expect(screen.getByTestId('channel-strip-fader-label')).toHaveTextContent('CH 1 · Vocals');
    expect(readout).toHaveTextContent('0.0 dB');

    expect(slider).toHaveClass('prism-well', 'prism-focus-ring');
    expect(slider).toHaveAttribute('aria-orientation', 'vertical');
    expect(slider).toHaveAttribute('aria-valuemin', '-60');
    expect(slider).toHaveAttribute('aria-valuemax', '12');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('aria-valuetext', '0.0 dB');
    expect(slider).toHaveAttribute('tabindex', '0');
    expect(slider).toHaveStyle({ height: '220px' });

    // All 8 calibrated studio dB markings
    expect(screen.getByTestId('channel-strip-fader-tick-12')).toHaveTextContent('+12');
    expect(screen.getByTestId('channel-strip-fader-tick-6')).toHaveTextContent('+6');
    const unityTick = screen.getByTestId('channel-strip-fader-tick-0');
    expect(unityTick).toHaveTextContent('0');
    expect(unityTick).toHaveAttribute('data-unity', 'true');
    expect(screen.getByTestId('channel-strip-fader-tick--6')).toHaveTextContent('-6');
    expect(screen.getByTestId('channel-strip-fader-tick--12')).toHaveTextContent('-12');
    expect(screen.getByTestId('channel-strip-fader-tick--24')).toHaveTextContent('-24');
    expect(screen.getByTestId('channel-strip-fader-tick--48')).toHaveTextContent('-48');
    expect(screen.getByTestId('channel-strip-fader-tick--60')).toHaveTextContent('-∞');

    // Tactile cap, center groove, fill, and strip buttons
    expect(cap).toHaveClass('prism-crystal');
    expect(groove.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(fill).toHaveStyle({ opacity: '1' });
    expect(unityBtn).toHaveTextContent('Unity 0 dB');
    expect(unityBtn).toHaveAttribute('data-active', 'true');
    expect(muteBtn).toHaveTextContent('Mute');
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports IME-safe keyboard stepping (±1dB, Shift ±0.5dB, Page ±6dB, Home, End, 0 unity), double-click snap, and Unity button', () => {
    const onChange = vi.fn<(db: number) => void>();

    render(
      <ChannelStripFader
        label="CH 2 · Bass"
        defaultValueDb={0}
        onChange={onChange}
        data-testid="kbd-fader"
      />
    );

    const root = screen.getByTestId('kbd-fader');
    const slider = screen.getByRole('slider', { name: 'CH 2 · Bass fader level' });
    const readout = screen.getByTestId('channel-strip-fader-readout');
    const cap = screen.getByTestId('channel-strip-fader-cap');
    const unityBtn = screen.getByTestId('channel-strip-fader-unity');

    // IME composing and unrelated keys ignored
    fireEvent.keyDown(slider, { key: 'ArrowUp', isComposing: true });
    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();

    // ArrowUp (+1 -> +1.0 dB) and ArrowRight (+1 -> +2.0 dB)
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(readout).toHaveTextContent('+1.0 dB');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(readout).toHaveTextContent('+2.0 dB');

    // ArrowDown (-1 -> +1.0 dB) and ArrowLeft (-1 -> 0.0 dB)
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(readout).toHaveTextContent('0.0 dB');

    // Shift+Arrow fine ±0.5 dB steps
    fireEvent.keyDown(slider, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(0.5);
    expect(readout).toHaveTextContent('+0.5 dB');

    fireEvent.keyDown(slider, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(readout).toHaveTextContent('0.0 dB');

    fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(-0.5);
    expect(readout).toHaveTextContent('-0.5 dB');

    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(0);

    // PageUp (+6 dB -> +6.0 dB) and PageDown (-6 dB -> 0.0 dB -> -6.0 dB)
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(onChange).toHaveBeenLastCalledWith(6);
    expect(readout).toHaveTextContent('+6.0 dB');

    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith(-6);
    expect(readout).toHaveTextContent('-6.0 dB');

    // Home -> minDb (-60 -> -∞ dB)
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(-60);
    expect(readout).toHaveTextContent('-∞ dB');
    expect(root).toHaveAttribute('data-at-floor', 'true');
    expect(screen.getByTestId('channel-strip-fader-fill')).toHaveStyle({ opacity: '0' });

    // Stepping below floor does not emit duplicate callback
    const callsAtFloor = onChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledTimes(callsAtFloor);

    // End -> maxDb (+12 -> +12.0 dB)
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(12);
    expect(readout).toHaveTextContent('+12.0 dB');

    // '0' key snaps cleanly to unityDb (0 dB)
    fireEvent.keyDown(slider, { key: '0' });
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(readout).toHaveTextContent('0.0 dB');

    // Move away, then double-click the track -> snaps to unityDb (0 dB)
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(readout).toHaveTextContent('-6.0 dB');
    fireEvent.doubleClick(slider);
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(readout).toHaveTextContent('0.0 dB');

    // Double-click when already at unity does not emit duplicate callback
    const callsAtUnity = onChange.mock.calls.length;
    fireEvent.doubleClick(slider);
    expect(onChange).toHaveBeenCalledTimes(callsAtUnity);

    // Move away, then double-click the fader cap -> snaps to unityDb (0 dB)
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(readout).toHaveTextContent('+6.0 dB');
    fireEvent.doubleClick(cap);
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(readout).toHaveTextContent('0.0 dB');

    // Move away, then click Unity 0 dB button -> snaps to unityDb (0 dB)
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(unityBtn).not.toHaveAttribute('data-active');
    fireEvent.click(unityBtn);
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(unityBtn).toHaveAttribute('data-active', 'true');
  });

  it('supports vertical window pointer drag and cleans up listeners on pointerup, pointercancel, disable, and unmount', () => {
    const onChange = vi.fn<(db: number) => void>();

    const { rerender, unmount } = render(
      <ChannelStripFader
        label="CH 3 · Synth"
        defaultValueDb={0}
        onChange={onChange}
        data-testid="drag-fader"
      />
    );

    const root = screen.getByTestId('drag-fader');
    const slider = screen.getByRole('slider', { name: 'CH 3 · Synth fader level' });
    const readout = screen.getByTestId('channel-strip-fader-readout');

    // Zero-height rect (unmocked layout) safely exits without throwing or emitting
    mockVerticalRect(slider, 0, 0);
    fireEvent.pointerDown(slider, { button: 0, clientY: 50 });
    fireEvent.pointerUp(window);
    expect(onChange).not.toHaveBeenCalled();

    // Non-primary mouse button is ignored
    mockVerticalRect(slider, 100, 220);
    fireEvent.pointerDown(slider, { button: 2, clientY: 210 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(onChange).not.toHaveBeenCalled();

    // Primary pointerDown at midpoint (y = 210 -> ratio = 0.5 -> -24.0 dB)
    fireEvent.pointerDown(slider, { button: 0, clientY: 210 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(slider).toHaveAttribute('data-dragging', 'true');
    expect(slider).toHaveClass('cursor-grabbing');
    expect(onChange).toHaveBeenLastCalledWith(-24);
    expect(readout).toHaveTextContent('-24.0 dB');

    // Duplicate pointerMove at identical position emits no redundant onChange
    const countAfterDown = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientY: 210 });
    expect(onChange).toHaveBeenCalledTimes(countAfterDown);

    // Drag up past top edge -> clamps to +12.0 dB
    fireEvent.pointerMove(window, { clientY: 80 });
    expect(onChange).toHaveBeenLastCalledWith(12);
    expect(readout).toHaveTextContent('+12.0 dB');

    // Drag down past bottom edge -> clamps to -60 (-∞ dB)
    fireEvent.pointerMove(window, { clientY: 360 });
    expect(onChange).toHaveBeenLastCalledWith(-60);
    expect(readout).toHaveTextContent('-∞ dB');

    // pointerUp ends drag and cleans up window listeners
    fireEvent.pointerUp(window);
    expect(root).not.toHaveAttribute('data-dragging');
    expect(slider).toHaveClass('cursor-ns-resize');

    const countAfterUp = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientY: 150 });
    expect(onChange).toHaveBeenCalledTimes(countAfterUp);

    // Drag and cancel via pointercancel
    fireEvent.pointerDown(slider, { button: 0, clientY: 210 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerCancel(window);
    expect(root).not.toHaveAttribute('data-dragging');

    // Tiny track rect (height <= 36) uses zero-inset calculation cleanly
    mockVerticalRect(slider, 0, 20);
    fireEvent.pointerDown(slider, { button: 0, clientY: 0 });
    expect(onChange).toHaveBeenLastCalledWith(12);
    fireEvent.pointerUp(window);

    // Mid-drag disabled transition cleans up listeners & clears dragging state
    mockVerticalRect(slider, 100, 220);
    fireEvent.pointerDown(slider, { button: 0, clientY: 210 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    rerender(
      <ChannelStripFader
        label="CH 3 · Synth"
        defaultValueDb={0}
        onChange={onChange}
        disabled
        data-testid="drag-fader"
      />
    );
    expect(root).not.toHaveAttribute('data-dragging');
    const countAfterDisable = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientY: 100 });
    expect(onChange).toHaveBeenCalledTimes(countAfterDisable);

    // Re-enable, start drag, then unmount mid-drag -> window listeners cleaned up
    rerender(
      <ChannelStripFader
        label="CH 3 · Synth"
        defaultValueDb={0}
        onChange={onChange}
        disabled={false}
        data-testid="drag-fader"
      />
    );
    mockVerticalRect(slider, 100, 220);
    fireEvent.pointerDown(slider, { button: 0, clientY: 160 });
    const countBeforeUnmount = onChange.mock.calls.length;
    unmount();
    fireEvent.pointerMove(window, { clientY: 320 });
    expect(onChange).toHaveBeenCalledTimes(countBeforeUnmount);
  });

  it('supports linear-pct scaleMode, controlled valueDb & muted state, positive unityDb, and trackHeight clamping [140..340]', () => {
    const onChange = vi.fn<(db: number) => void>();
    const onMutedChange = vi.fn<(muted: boolean) => void>();

    function ControlledStrip() {
      const [db, setDb] = useState<number>(12);
      const [isMuted, setIsMuted] = useState<boolean>(false);
      return (
        <ChannelStripFader
          label="BUS A · Master"
          valueDb={db}
          onChange={(next) => {
            onChange(next);
            setDb(next);
          }}
          unityDb={3}
          scaleMode="linear-pct"
          muted={isMuted}
          onMutedChange={(next) => {
            onMutedChange(next);
            setIsMuted(next);
          }}
          trackHeight={80}
          data-testid="controlled-fader"
        />
      );
    }

    const { rerender } = render(<ControlledStrip />);
    const root = screen.getByTestId('controlled-fader');
    const slider = screen.getByRole('slider', { name: 'BUS A · Master fader level' });
    const readout = screen.getByTestId('channel-strip-fader-readout');
    const fill = screen.getByTestId('channel-strip-fader-fill');
    const unityBtn = screen.getByTestId('channel-strip-fader-unity');
    const muteBtn = screen.getByTestId('channel-strip-fader-mute');

    // Track height clamped to min 140px
    expect(slider).toHaveStyle({ height: '140px' });

    // linear-pct readout at maxDb (+12) is 100%
    expect(readout).toHaveTextContent('100%');
    expect(slider).toHaveAttribute('aria-valuetext', '100%');
    expect(unityBtn).toHaveTextContent('Unity +3 dB');

    // Toggle Mute on
    fireEvent.click(muteBtn);
    expect(onMutedChange).toHaveBeenLastCalledWith(true);
    expect(root).toHaveAttribute('data-muted', 'true');
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(muteBtn).toHaveAttribute('data-active', 'true');
    expect(fill).toHaveAttribute('data-muted', 'true');
    expect(fill).toHaveStyle({ opacity: '0.45' });
    expect(slider).toHaveAttribute('aria-valuetext', '100% (muted)');

    // Drag in controlled mode updates through onChange
    mockVerticalRect(slider, 0, 140);
    fireEvent.pointerDown(slider, { button: 0, clientY: 140 });
    expect(onChange).toHaveBeenLastCalledWith(-60);
    expect(readout).toHaveTextContent('0%');
    fireEvent.pointerUp(window);

    // Snap to custom positive unityDb (+3 dB)
    fireEvent.click(unityBtn);
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(readout).toHaveTextContent('88%');

    // Unmute
    fireEvent.click(muteBtn);
    expect(onMutedChange).toHaveBeenLastCalledWith(false);
    expect(slider).toHaveAttribute('aria-valuetext', '88%');

    // Oversized trackHeight (> 340) clamps to 340px
    rerender(
      <ChannelStripFader
        label="Tall Strip"
        defaultValueDb={-24}
        scaleMode="linear-pct"
        trackHeight={500}
      />
    );
    const tallSlider = screen.getByRole('slider', { name: 'Tall Strip fader level' });
    expect(tallSlider).toHaveStyle({ height: '340px' });
    expect(screen.getByTestId('channel-strip-fader-readout')).toHaveTextContent('50%');
  });

  it('sanitizes NaN, Infinity, inverted bounds, degenerate zero-span, blank labels, disabled state, and XSS payloads', () => {
    const onChange = vi.fn<(db: number) => void>();
    const onMutedChange = vi.fn<(muted: boolean) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <ChannelStripFader
        label="   "
        valueDb={Number.NaN}
        defaultValueDb={-0}
        minDb={Number.NaN}
        maxDb={Number.POSITIVE_INFINITY}
        unityDb={Number.NaN}
        trackHeight={Number.NaN}
      />
    );

    // Blank label falls back safely
    expect(screen.getByTestId('channel-strip-fader-label')).toHaveTextContent('CH 1 · Vocals');
    const sanitizedSlider = screen.getByRole('slider', { name: 'Channel Strip fader level' });
    expect(sanitizedSlider).toHaveAttribute('aria-valuemin', '-60');
    expect(sanitizedSlider).toHaveAttribute('aria-valuemax', '12');
    expect(sanitizedSlider).toHaveAttribute('aria-valuenow', '0');
    expect(sanitizedSlider).toHaveStyle({ height: '220px' });

    // Degenerate zero-span range (minDb === maxDb) renders safely without NaN
    rerender(
      <ChannelStripFader
        label="Locked Bus"
        minDb={-12}
        maxDb={-12}
        defaultValueDb={-12}
        onChange={onChange}
      />
    );
    const degSlider = screen.getByRole('slider', { name: 'Locked Bus fader level' });
    expect(degSlider).toHaveAttribute('aria-valuenow', '-12');
    expect(screen.getByTestId('channel-strip-fader-tick--12')).toHaveTextContent('-∞');
    mockVerticalRect(degSlider, 0, 220);
    fireEvent.pointerDown(degSlider, { button: 0, clientY: 110 });
    fireEvent.pointerMove(window, { clientY: 50 });
    fireEvent.pointerUp(window);
    expect(onChange).not.toHaveBeenCalled();

    // Disabled state + XSS payload safely escaped and all interactions blocked
    rerender(
      <ChannelStripFader
        label={payload}
        defaultValueDb={-12}
        disabled
        onChange={onChange}
        onMutedChange={onMutedChange}
        data-testid="disabled-fader"
      />
    );

    const disabledRoot = screen.getByTestId('disabled-fader');
    const disabledSlider = screen.getByRole('slider', { name: `${payload} fader level` });
    const disabledUnity = screen.getByTestId('channel-strip-fader-unity');
    const disabledMute = screen.getByTestId('channel-strip-fader-mute');

    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');
    expect(disabledRoot).toHaveAttribute('aria-disabled', 'true');
    expect(disabledSlider).toHaveAttribute('aria-disabled', 'true');
    expect(disabledSlider).toHaveAttribute('tabindex', '-1');
    expect(disabledSlider).toHaveClass('cursor-not-allowed');
    expect(disabledUnity).toBeDisabled();
    expect(disabledMute).toBeDisabled();
    expect(document.querySelector('script')).toBeNull();

    mockVerticalRect(disabledSlider, 0, 220);
    fireEvent.pointerDown(disabledSlider, { button: 0, clientY: 50 });
    fireEvent.pointerMove(window, { clientY: 10 });
    fireEvent.pointerUp(window);
    fireEvent.doubleClick(disabledSlider);
    fireEvent.keyDown(disabledSlider, { key: 'ArrowUp' });
    fireEvent.click(disabledUnity);
    fireEvent.click(disabledMute);

    expect(onChange).not.toHaveBeenCalled();
    expect(onMutedChange).not.toHaveBeenCalled();
  });
});
