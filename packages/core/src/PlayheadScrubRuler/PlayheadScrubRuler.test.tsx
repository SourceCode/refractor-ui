import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  PlayheadScrubRuler,
  type RulerMarker,
  type RulerMarkerTone,
} from './index';

function mockTrackRect(element: Element, left = 0, width = 600, height = 48) {
  return vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: 0,
    left,
    right: left + width,
    top: 0,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  });
}

describe('PlayheadScrubRuler', () => {
  it('renders Astryx optical slab, ref/className/xstyle/theme override, timecode header, calibrated ticks, and children stage', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PlayheadScrubRuler: { className: 'theme-ruler', style: { maxWidth: '720px' } },
          },
        }}
      >
        <PlayheadScrubRuler
          ref={ref}
          durationSec={60}
          defaultTimeSec={12.5}
          fps={30}
          className="local-ruler"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="ruler-root"
        >
          <div data-testid="custom-lane">Video Track A</div>
        </PlayheadScrubRuler>
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('ruler-root');
    expect(ref.current).toBe(root);
    expect(PlayheadScrubRuler.displayName).toBe('PlayheadScrubRuler');
    expect(root).toHaveClass(
      'refractor-playhead-scrub-ruler',
      'prism-slab',
      'theme-ruler',
      'local-ruler'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-snap', 'true');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-dragging');

    const timecode = screen.getByTestId('playhead-timecode');
    expect(timecode).toHaveAttribute('role', 'status');
    expect(timecode).toHaveAttribute('aria-live', 'polite');
    expect(timecode).toHaveTextContent('00:12:15');

    const snapBadge = screen.getByTestId('playhead-snap-badge');
    expect(snapBadge).toHaveAttribute('data-snap', 'true');
    expect(snapBadge).toHaveClass('prism-emerald');
    expect(snapBadge).toHaveTextContent('Snap · 30fps');

    expect(screen.getByTestId('playhead-duration')).toHaveTextContent('01:00:00');

    const slider = screen.getByRole('slider', { name: 'Timeline playhead' });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '60');
    expect(slider).toHaveAttribute('aria-valuenow', '12.5');
    expect(slider).toHaveAttribute('aria-valuetext', '00:12:15');
    expect(slider).toHaveClass('prism-focus-ring');

    const majorLabels = screen.getAllByTestId('playhead-major-label').map((el) => el.textContent);
    expect(majorLabels).toEqual(['00:00', '00:10', '00:20', '00:30', '00:40', '00:50', '01:00']);

    const ticksSvg = screen.getByTestId('playhead-ruler-ticks');
    expect(ticksSvg.querySelectorAll('line[data-tick-kind="major"]').length).toBe(7);
    expect(ticksSvg.querySelectorAll('line[data-tick-kind="minor"]').length).toBe(24);

    expect(screen.getByTestId('playhead-cap')).toHaveStyle({ left: '20.8333%' });
    const needle = screen.getByTestId('playhead-needle');
    expect(needle).toHaveStyle({ left: '20.8333%' });
    expect(needle.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(screen.getByTestId('playhead-track-stage')).toHaveStyle({ minHeight: '96px' });
    expect(screen.getByTestId('custom-lane')).toHaveTextContent('Video Track A');
    expect(screen.queryByTestId('playhead-markers-rail')).not.toBeInTheDocument();
  });

  it('scrubs via click and pointer drag in controlled mode with frame snapping, boundary clamping, and window listener cleanup', () => {
    const onTimeChange = vi.fn();

    function ControlledHarness() {
      const [timeSec, setTimeSec] = useState(0);
      return (
        <PlayheadScrubRuler
          durationSec={60}
          timeSec={timeSec}
          fps={30}
          snapToFrame
          onTimeChange={(next) => {
            onTimeChange(next);
            setTimeSec(next);
          }}
          data-testid="ctrl-root"
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    const slider = screen.getByRole('slider', { name: 'Timeline playhead' });
    const cap = screen.getByTestId('playhead-cap');
    const rectSpy = mockTrackRect(slider, 100, 600, 48);

    // Ignore secondary button clicks
    fireEvent.pointerDown(slider, { button: 2, clientX: 400 });
    expect(onTimeChange).not.toHaveBeenCalled();

    // Click at midpoint (100 + 300 = 400 -> 30s)
    fireEvent.pointerDown(slider, { button: 0, clientX: 400 });
    expect(slider).toHaveAttribute('data-dragging', 'true');
    expect(screen.getByTestId('ctrl-root')).toHaveAttribute('data-dragging', 'true');
    expect(onTimeChange).toHaveBeenLastCalledWith(30);
    expect(screen.getByTestId('playhead-timecode')).toHaveTextContent('00:30:00');

    // Drag smoothly to 45s (100 + 450 = 550)
    fireEvent.pointerMove(window, { clientX: 550 });
    expect(onTimeChange).toHaveBeenLastCalledWith(45);
    expect(screen.getByTestId('playhead-timecode')).toHaveTextContent('00:45:00');

    // Drag past right edge clamps to duration (60s)
    fireEvent.pointerMove(window, { clientX: 1200 });
    expect(onTimeChange).toHaveBeenLastCalledWith(60);

    // Release pointerUp cleans up window listeners
    fireEvent.pointerUp(window);
    expect(slider).not.toHaveAttribute('data-dragging');
    const callsAfterUp = onTimeChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(onTimeChange).toHaveBeenCalledTimes(callsAfterUp);

    // Drag directly via sculpted playhead cap & end with pointerCancel
    fireEvent.pointerDown(cap, { button: 0, clientX: 400 });
    expect(onTimeChange).toHaveBeenLastCalledWith(30);
    fireEvent.pointerMove(window, { clientX: 101 });
    // (1/600)*60 = 0.1s -> 3 frames at 30fps = 0.1s
    expect(onTimeChange).toHaveBeenLastCalledWith(0.1);
    // Drag past left edge clamps to 0
    fireEvent.pointerMove(window, { clientX: -50 });
    expect(onTimeChange).toHaveBeenLastCalledWith(0);
    fireEvent.pointerCancel(window);
    expect(slider).not.toHaveAttribute('data-dragging');

    // Mid-drag zero-width rect safely skips update without throwing
    fireEvent.pointerDown(slider, { button: 0, clientX: 250 });
    expect(onTimeChange).toHaveBeenLastCalledWith(15);
    rectSpy.mockReturnValueOnce({
      x: 0,
      y: 0,
      left: 0,
      right: 0,
      top: 0,
      bottom: 48,
      width: 0,
      height: 48,
      toJSON: () => ({}),
    });
    const callsBeforeCollapsed = onTimeChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 500 });
    expect(onTimeChange).toHaveBeenCalledTimes(callsBeforeCollapsed);

    // Unmount mid-drag removes active window listeners cleanly
    unmount();
    fireEvent.pointerMove(window, { clientX: 400 });
    expect(onTimeChange).toHaveBeenCalledTimes(callsBeforeCollapsed);
  });

  it('supports keyboard stepping in frame-snapped and free modes with Shift, PageUp/PageDown, Home/End, IME and modifier guards', () => {
    const onTimeChange = vi.fn();

    const { rerender } = render(
      <PlayheadScrubRuler
        durationSec={60}
        defaultTimeSec={0}
        fps={30}
        snapToFrame
        onTimeChange={onTimeChange}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Timeline playhead' });

    // IME composition ignored
    const composing = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    fireEvent(slider, composing);
    expect(onTimeChange).not.toHaveBeenCalled();

    // Modifier chords & unrelated keys ignored
    fireEvent.keyDown(slider, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(slider, { key: 'ArrowRight', metaKey: true });
    fireEvent.keyDown(slider, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(onTimeChange).not.toHaveBeenCalled();

    // At 0s, ArrowLeft/Home does not emit redundant callback
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onTimeChange).not.toHaveBeenCalled();

    // Frame-snapped ArrowRight (+1 frame = 1/30 -> 0.033333) and ArrowUp (+1 frame -> 0.066667)
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0.033333);
    expect(screen.getByTestId('playhead-timecode')).toHaveTextContent('00:00:01');

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0.066667);
    expect(screen.getByTestId('playhead-timecode')).toHaveTextContent('00:00:02');

    // ArrowDown (-1 frame -> 0.033333) and ArrowLeft (-1 frame -> 0)
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0.033333);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0);

    // Shift+ArrowRight (+1s), PageUp (+5s -> 6s), Shift+ArrowLeft (-1s -> 5s), PageDown (-5s -> 0s)
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(onTimeChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(onTimeChange).toHaveBeenLastCalledWith(6);
    fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });
    expect(onTimeChange).toHaveBeenLastCalledWith(5);
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0);

    // End -> 60s; redundant End does not re-emit; Home -> 0s
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onTimeChange).toHaveBeenLastCalledWith(60);
    const callsAtEnd = onTimeChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onTimeChange).toHaveBeenCalledTimes(callsAtEnd);
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0);

    // Free mode (snapToFrame={false}): ArrowRight steps ±0.1s and badge switches to Free
    rerender(
      <PlayheadScrubRuler
        durationSec={60}
        defaultTimeSec={0}
        fps={30}
        snapToFrame={false}
        onTimeChange={onTimeChange}
      />
    );

    const snapBadge = screen.getByTestId('playhead-snap-badge');
    expect(snapBadge).toHaveAttribute('data-snap', 'false');
    expect(snapBadge).toHaveClass('prism-crystal');
    expect(snapBadge).toHaveTextContent('Free · 30fps');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0.1);
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0.2);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0.1);
  });

  it('renders clickable cue markers across all 5 tones, jumps playhead directly, and filters invalid markers', () => {
    const onTimeChange = vi.fn();
    const onSelectMarker = vi.fn();

    const markers: ReadonlyArray<RulerMarker> = [
      { id: 'm-start', timeSec: 1, label: 'Start Cue', tone: 'primary' },
      { id: 'm-default', timeSec: 15, label: 'Default Tone' },
      { id: 'm-sec', timeSec: 22.5, label: 'Verse', tone: 'secondary' },
      { id: 'm-em', timeSec: 34, label: 'Chorus', tone: 'emerald' },
      { id: 'm-amb', timeSec: 45, label: 'Bridge', tone: 'amber' },
      { id: 'm-end', timeSec: 59, label: 'Outro', tone: 'rose' },
      { id: 'm-start', timeSec: 20, label: 'Duplicate Ignored' },
      { id: '', timeSec: 10, label: 'Empty Id Ignored' },
      { id: 'm-nan', timeSec: Number.NaN, label: 'NaN Ignored' },
      { id: 'm-clamp', timeSec: 120, label: 'Clamped End', tone: 'emerald' },
    ];

    render(
      <PlayheadScrubRuler
        durationSec={60}
        defaultTimeSec={0}
        fps={30}
        snapToFrame={false}
        markers={markers}
        onTimeChange={onTimeChange}
        onSelectMarker={onSelectMarker}
      />
    );

    const rail = screen.getByTestId('playhead-markers-rail');
    expect(rail).toHaveAttribute('role', 'group');
    expect(rail).toHaveAttribute('aria-label', 'Timeline cue markers');

    const expectedToneLines: ReadonlyArray<readonly [string, RulerMarkerTone, string]> = [
      ['m-start', 'primary', 'var(--prism-primary-main)'],
      ['m-default', 'secondary', 'var(--prism-secondary-main)'],
      ['m-sec', 'secondary', 'var(--prism-secondary-main)'],
      ['m-em', 'emerald', 'var(--prism-success-main)'],
      ['m-amb', 'amber', 'var(--prism-warning-main)'],
      ['m-end', 'rose', 'var(--prism-error-main)'],
    ];

    for (const [id, tone, token] of expectedToneLines) {
      expect(screen.getByTestId(`playhead-marker-${id}`)).toHaveAttribute('data-tone', tone);
      expect(screen.getByTestId(`playhead-marker-line-${id}`).style.backgroundColor).toBe(token);
    }

    expect(screen.queryByTestId('playhead-marker-m-nan')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate Ignored')).not.toBeInTheDocument();
    expect(screen.queryByText('Empty Id Ignored')).not.toBeInTheDocument();

    // Clicking marker jumps directly to marker.timeSec and fires onSelectMarker
    const chorusBtn = screen.getByTestId('playhead-marker-m-em');
    fireEvent.click(chorusBtn);
    expect(onTimeChange).toHaveBeenLastCalledWith(34);
    expect(onSelectMarker).toHaveBeenLastCalledWith(markers[3]);
    expect(chorusBtn).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('playhead-timecode')).toHaveTextContent('00:34:00');

    // Clicking the already-active marker still triggers onSelectMarker without redundant onTimeChange
    const timeCalls = onTimeChange.mock.calls.length;
    fireEvent.click(chorusBtn);
    expect(onTimeChange).toHaveBeenCalledTimes(timeCalls);
    expect(onSelectMarker).toHaveBeenCalledTimes(2);

    // Out-of-bounds marker clamps playhead target to durationSec (60)
    const clampedBtn = screen.getByTestId('playhead-marker-m-clamp');
    fireEvent.click(clampedBtn);
    expect(onTimeChange).toHaveBeenLastCalledWith(60);
    expect(onSelectMarker).toHaveBeenLastCalledWith(markers[9]);
  });

  it('enforces disabled state across pointer, keyboard, markers, and aborts active drag on dynamic disable', () => {
    const onTimeChange = vi.fn();
    const onSelectMarker = vi.fn();

    const { rerender } = render(
      <PlayheadScrubRuler
        durationSec={60}
        defaultTimeSec={10}
        markers={[{ id: 'cue-1', timeSec: 25, label: 'Cue 1' }]}
        onTimeChange={onTimeChange}
        onSelectMarker={onSelectMarker}
        data-testid="dis-root"
      />
    );

    const slider = screen.getByRole('slider', { name: 'Timeline playhead' });
    mockTrackRect(slider, 0, 600, 48);

    // Start dragging while enabled
    fireEvent.pointerDown(slider, { button: 0, clientX: 200 });
    expect(slider).toHaveAttribute('data-dragging', 'true');
    expect(onTimeChange).toHaveBeenLastCalledWith(20);

    // Dynamically disable mid-drag -> cleans up listeners and resets dragging
    rerender(
      <PlayheadScrubRuler
        durationSec={60}
        defaultTimeSec={10}
        markers={[{ id: 'cue-1', timeSec: 25, label: 'Cue 1' }]}
        disabled
        onTimeChange={onTimeChange}
        onSelectMarker={onSelectMarker}
        data-testid="dis-root"
      />
    );

    expect(screen.getByTestId('dis-root')).toHaveAttribute('data-disabled', 'true');
    expect(slider).not.toHaveAttribute('data-dragging');
    expect(slider).toHaveAttribute('tabindex', '-1');
    expect(slider).toHaveAttribute('aria-disabled', 'true');

    const callsWhenDisabled = onTimeChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 500 });
    fireEvent.pointerDown(slider, { button: 0, clientX: 400 });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onTimeChange).toHaveBeenCalledTimes(callsWhenDisabled);

    const markerBtn = screen.getByTestId('playhead-marker-cue-1');
    expect(markerBtn).toBeDisabled();
    fireEvent.click(markerBtn);
    expect(onSelectMarker).not.toHaveBeenCalled();
  });

  it('clamps extreme/invalid durationSec, fps, trackStageHeight, timeSec, zero-width track, and empty markers safely', () => {
    const onTimeChange = vi.fn();

    // durationSec < 1 clamps to 1 (rendering fractional tick labels), fps & stage height clamp to min
    const { rerender } = render(
      <PlayheadScrubRuler
        durationSec={0}
        defaultTimeSec={-0}
        fps={0}
        trackStageHeight={10}
        markers={[]}
        onTimeChange={onTimeChange}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Timeline playhead' });
    expect(slider).toHaveAttribute('aria-valuemax', '1');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('playhead-snap-badge')).toHaveTextContent('Snap · 1fps');
    expect(screen.getByTestId('playhead-track-stage')).toHaveStyle({ minHeight: '48px' });
    expect(screen.queryByTestId('playhead-markers-rail')).not.toBeInTheDocument();

    const shortLabels = screen.getAllByTestId('playhead-major-label').map((el) => el.textContent);
    expect(shortLabels).toEqual(['00:00', '00:00.25', '00:00.5', '00:00.75', '00:01']);

    // Zero-width track on initial pointerDown is ignored safely
    mockTrackRect(slider, 0, 0, 48);
    fireEvent.pointerDown(slider, { button: 0, clientX: 50 });
    expect(slider).not.toHaveAttribute('data-dragging');
    expect(onTimeChange).not.toHaveBeenCalled();

    // Very large duration hits selectMajorStep fallback; fps clamps to 120; stage height clamps to 280; non-finite time falls back to 0
    rerender(
      <PlayheadScrubRuler
        durationSec={100000}
        timeSec={Number.NaN}
        fps={999}
        trackStageHeight={999}
      />
    );
    expect(slider).toHaveAttribute('aria-valuemax', '100000');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('playhead-snap-badge')).toHaveTextContent('Snap · 120fps');
    expect(screen.getByTestId('playhead-track-stage')).toHaveStyle({ minHeight: '280px' });
    expect(screen.getAllByTestId('playhead-major-label').length).toBeGreaterThanOrEqual(5);

    // Non-finite duration, fps, and stage height fall back cleanly to defaults (60, 30, 96)
    rerender(
      <PlayheadScrubRuler
        durationSec={Number.NaN}
        timeSec={9999}
        fps={Number.POSITIVE_INFINITY}
        trackStageHeight={Number.NaN}
      />
    );
    expect(slider).toHaveAttribute('aria-valuemax', '60');
    expect(slider).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByTestId('playhead-snap-badge')).toHaveTextContent('Snap · 30fps');
    expect(screen.getByTestId('playhead-track-stage')).toHaveStyle({ minHeight: '96px' });
  });

  it('renders adversarial XSS payloads in cue marker labels safely as plain text', () => {
    const xssLabel = '<script>window.__playheadXss=1</script><img src=x onerror=alert(1)>';

    render(
      <PlayheadScrubRuler
        durationSec={60}
        markers={[{ id: 'xss', timeSec: 12, label: xssLabel, tone: 'rose' }]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    const markerBtn = screen.getByTestId('playhead-marker-xss');
    expect(markerBtn).toHaveTextContent(xssLabel);
    expect(markerBtn).toHaveAttribute(
      'aria-label',
      `Jump to marker ${xssLabel} at 00:12:00`
    );
  });
});
