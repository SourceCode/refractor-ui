import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TimelineZoomNavigator,
  type TimelineViewportWindow,
} from './index';

function mockTrackRect(element: Element, left = 0, width = 500, height = 44) {
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

describe('TimelineZoomNavigator', () => {
  it('renders Astryx optical slab, ref/className/xstyle/theme override, default activity peaks, and compact tabular footer', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TimelineZoomNavigator: { className: 'theme-nav', style: { maxWidth: '720px' } },
          },
        }}
      >
        <TimelineZoomNavigator
          ref={ref}
          className="local-nav"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="nav-root"
        />
      </PrismThemeProvider>
    );

    expect(TimelineZoomNavigator.displayName).toBe('TimelineZoomNavigator');

    const root = screen.getByTestId('nav-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-timeline-zoom-navigator',
      'prism-slab',
      'theme-nav',
      'local-nav'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-zoomed', 'true');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-dragging');

    expect(screen.getByTestId('timeline-navigator-label')).toHaveTextContent('Timeline Navigator');
    expect(screen.getByTestId('timeline-zoom-badge')).toHaveTextContent('2.0×');

    const track = screen.getByTestId('timeline-track');
    expect(track).toHaveClass('prism-well', 'h-11', 'relative', 'select-none');

    // Default 32 deterministic activity bars
    const barsContainer = screen.getByTestId('timeline-activity-bars');
    expect(barsContainer.children).toHaveLength(32);
    expect(screen.getByTestId('timeline-peak-0')).toHaveAttribute('data-in-window', 'false');
    expect(screen.getByTestId('timeline-peak-10')).toHaveAttribute('data-in-window', 'true');

    // Playhead omitted by default
    expect(screen.queryByTestId('timeline-playhead')).not.toBeInTheDocument();

    // Tabular footer readout matches exact 00:12.0 → 01:12.0 · 60.0s visible format
    const footer = screen.getByTestId('timeline-footer');
    expect(footer).toHaveAttribute('aria-live', 'polite');
    expect(footer).toHaveClass('prism-well', 'tabular-nums');
    expect(screen.getByTestId('timeline-visible-span')).toHaveTextContent(
      '00:12.0 → 01:12.0 · 60.0s visible'
    );
    expect(screen.getByTestId('timeline-total-duration')).toHaveTextContent('Total 02:00.0');
  });

  it('supports Zoom In (+), Zoom Out (-), and Fit All (1.0×) buttons with edge-anchored clamping and 50× max zoom', () => {
    const onWindowChange = vi.fn();

    render(
      <TimelineZoomNavigator
        defaultWindowRange={{ startPct: 10, endPct: 60 }}
        minWindowPct={2}
        onWindowChange={onWindowChange}
        data-testid="zoom-root"
      />
    );

    const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
    const fitAllBtn = screen.getByRole('button', { name: 'Fit all (1.0×)' });
    const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });

    expect(zoomOutBtn).toBeEnabled();
    expect(fitAllBtn).toHaveAttribute('aria-pressed', 'false');
    expect(zoomInBtn).toBeEnabled();

    // Zoom In: span 50 -> 33.33 around center 35 -> [18.33, 51.67], zoom 3.0×
    fireEvent.click(zoomInBtn);
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 18.33, endPct: 51.67 }, 3);
    expect(screen.getByTestId('timeline-zoom-badge')).toHaveTextContent('3.0×');

    // Zoom Out back toward wider span
    fireEvent.click(zoomOutBtn);
    expect(screen.getByTestId('timeline-zoom-badge')).toHaveTextContent('2.0×');

    // Fit All -> [0, 100], 1.0×, Zoom Out disabled
    fireEvent.click(fitAllBtn);
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 100 }, 1);
    expect(screen.getByTestId('timeline-zoom-badge')).toHaveTextContent('1.0×');
    expect(fitAllBtn).toHaveAttribute('aria-pressed', 'true');
    expect(fitAllBtn).toHaveClass('prism-emerald');
    expect(zoomOutBtn).toBeDisabled();
    expect(screen.getByTestId('zoom-root')).not.toHaveAttribute('data-zoomed');

    // Clicking Fit All while already fitted is a safe no-op
    const callsAtFit = onWindowChange.mock.calls.length;
    fireEvent.click(fitAllBtn);
    expect(onWindowChange).toHaveBeenCalledTimes(callsAtFit);

    // Zoom Out near left edge clamps startPct to 0 and shifts endPct cleanly
    const { rerender } = render(
      <TimelineZoomNavigator
        key="left-edge"
        defaultWindowRange={{ startPct: 0, endPct: 20 }}
        onWindowChange={onWindowChange}
      />
    );
    const leftZoomOut = screen.getAllByRole('button', { name: 'Zoom out' })[1]!;
    fireEvent.click(leftZoomOut);
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 30 }, 3.33);

    // Zoom Out near right edge clamps endPct to 100 and pulls startPct back cleanly
    rerender(
      <TimelineZoomNavigator
        key="right-edge"
        defaultWindowRange={{ startPct: 80, endPct: 100 }}
        onWindowChange={onWindowChange}
      />
    );
    const rightZoomOut = screen.getAllByRole('button', { name: 'Zoom out' })[1]!;
    fireEvent.click(rightZoomOut);
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 70, endPct: 100 }, 3.33);

    // Zoom In at minimum 2% span -> 50.0× zoom disables Zoom In
    rerender(
      <TimelineZoomNavigator
        key="max-zoom"
        defaultWindowRange={{ startPct: 49, endPct: 51 }}
        minWindowPct={2}
        onWindowChange={onWindowChange}
      />
    );
    expect(screen.getAllByTestId('timeline-zoom-badge')[1]).toHaveTextContent('50.0×');
    expect(screen.getAllByRole('button', { name: 'Zoom in' })[1]).toBeDisabled();
  });

  it('supports keyboard stepping on left and right end-cap sliders respecting minWindowPct and IME guard', () => {
    const onWindowChange = vi.fn();

    render(
      <TimelineZoomNavigator
        defaultWindowRange={{ startPct: 20, endPct: 60 }}
        minWindowPct={10}
        onWindowChange={onWindowChange}
      />
    );

    const startHandle = screen.getByRole('slider', { name: 'Zoom timeline start' });
    const endHandle = screen.getByRole('slider', { name: 'Zoom timeline end' });

    expect(startHandle).toHaveAttribute('aria-valuemin', '0');
    expect(startHandle).toHaveAttribute('aria-valuemax', '50');
    expect(startHandle).toHaveAttribute('aria-valuenow', '20');
    expect(startHandle).toHaveAttribute('aria-valuetext', '00:24.0 (20%)');
    expect(startHandle).toHaveClass('prism-focus-ring');

    expect(endHandle).toHaveAttribute('aria-valuemin', '30');
    expect(endHandle).toHaveAttribute('aria-valuemax', '100');
    expect(endHandle).toHaveAttribute('aria-valuenow', '60');
    expect(endHandle).toHaveAttribute('aria-valuetext', '01:12.0 (60%)');
    expect(endHandle).toHaveClass('prism-focus-ring');

    // IME composition is ignored
    const composing = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    fireEvent(startHandle, composing);
    expect(onWindowChange).not.toHaveBeenCalled();

    // Unrelated key ignored
    fireEvent.keyDown(startHandle, { key: 'Tab' });
    expect(onWindowChange).not.toHaveBeenCalled();

    // Start handle stepping: ArrowRight (+1 -> 21), ArrowUp (+1 -> 22), ArrowLeft (-1 -> 21), ArrowDown (-1 -> 20)
    fireEvent.keyDown(startHandle, { key: 'ArrowRight' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 21, endPct: 60 }, 2.56);
    fireEvent.keyDown(startHandle, { key: 'ArrowUp' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 22, endPct: 60 }, 2.63);
    fireEvent.keyDown(startHandle, { key: 'ArrowLeft' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 21, endPct: 60 }, 2.56);
    fireEvent.keyDown(startHandle, { key: 'ArrowDown' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 20, endPct: 60 }, 2.5);

    // Shift+ArrowRight (+5 -> 25), PageUp (+10 -> 35), PageDown (-10 -> 25)
    fireEvent.keyDown(startHandle, { key: 'ArrowRight', shiftKey: true });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 25, endPct: 60 }, 2.86);
    fireEvent.keyDown(startHandle, { key: 'PageUp' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 35, endPct: 60 }, 4);
    fireEvent.keyDown(startHandle, { key: 'PageDown' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 25, endPct: 60 }, 2.86);

    // End clamps to endPct - minWindowPct = 50; extra ArrowRight is no-op; Home jumps to 0
    fireEvent.keyDown(startHandle, { key: 'End' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 50, endPct: 60 }, 10);
    const callsAtMaxStart = onWindowChange.mock.calls.length;
    fireEvent.keyDown(startHandle, { key: 'ArrowRight' });
    expect(onWindowChange).toHaveBeenCalledTimes(callsAtMaxStart);

    fireEvent.keyDown(startHandle, { key: 'Home' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 60 }, 1.67);

    // End handle stepping: End (100), ArrowLeft (99), Shift+ArrowLeft (94), PageDown (84), PageUp (94), Home (clamped to start + minWindowPct = 10)
    fireEvent.keyDown(endHandle, { key: 'End' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 100 }, 1);
    fireEvent.keyDown(endHandle, { key: 'ArrowLeft' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 99 }, 1.01);
    fireEvent.keyDown(endHandle, { key: 'ArrowLeft', shiftKey: true });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 94 }, 1.06);
    fireEvent.keyDown(endHandle, { key: 'PageDown' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 84 }, 1.19);
    fireEvent.keyDown(endHandle, { key: 'PageUp' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 94 }, 1.06);
    fireEvent.keyDown(endHandle, { key: 'Home' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 10 }, 10);
  });

  it('supports keyboard panning on the middle viewport pill preserving zoom span and guarding IME', () => {
    const onWindowChange = vi.fn();

    render(
      <TimelineZoomNavigator
        defaultWindowRange={{ startPct: 20, endPct: 50 }}
        onWindowChange={onWindowChange}
      />
    );

    const panPill = screen.getByRole('group', { name: 'Pan timeline window' });
    expect(panPill).toHaveClass('prism-focus-ring');

    // IME composition ignored
    const composing = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    fireEvent(panPill, composing);
    expect(onWindowChange).not.toHaveBeenCalled();

    // Unrelated key ignored
    fireEvent.keyDown(panPill, { key: 'Enter' });
    expect(onWindowChange).not.toHaveBeenCalled();

    // ArrowRight (+1% -> [21, 51]), ArrowLeft (-1% -> [20, 50]), Shift+ArrowRight (+5% -> [25, 55])
    fireEvent.keyDown(panPill, { key: 'ArrowRight' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 21, endPct: 51 }, 3.33);
    fireEvent.keyDown(panPill, { key: 'ArrowLeft' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 20, endPct: 50 }, 3.33);
    fireEvent.keyDown(panPill, { key: 'ArrowRight', shiftKey: true });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 25, endPct: 55 }, 3.33);

    // PageUp (+10% -> [35, 65]), PageDown (-10% -> [25, 55])
    fireEvent.keyDown(panPill, { key: 'PageUp' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 35, endPct: 65 }, 3.33);
    fireEvent.keyDown(panPill, { key: 'PageDown' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 25, endPct: 55 }, 3.33);

    // End -> [70, 100] preserving 30% span; Home -> [0, 30] preserving 30% span
    fireEvent.keyDown(panPill, { key: 'End' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 70, endPct: 100 }, 3.33);
    fireEvent.keyDown(panPill, { key: 'Home' });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 30 }, 3.33);
  });

  it('supports controlled pointer dragging of end-caps, viewport panning, track backdrop click, and full window listener cleanup', () => {
    const onWindowChange = vi.fn();

    function ControlledHarness() {
      const [win, setWin] = useState<TimelineViewportWindow>({ startPct: 10, endPct: 60 });
      return (
        <TimelineZoomNavigator
          windowRange={win}
          minWindowPct={5}
          onWindowChange={(next, zoom) => {
            onWindowChange(next, zoom);
            setWin(next);
          }}
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    const track = screen.getByTestId('timeline-track');
    const rectSpy = mockTrackRect(track, 0, 500, 44);

    const startHandle = screen.getByRole('slider', { name: 'Zoom timeline start' });
    const endHandle = screen.getByRole('slider', { name: 'Zoom timeline end' });
    const panPill = screen.getByRole('group', { name: 'Pan timeline window' });

    // Ignore secondary mouse button on handles, viewport pill, and track backdrop
    fireEvent.pointerDown(startHandle, { button: 2, clientX: 50 });
    fireEvent.pointerDown(endHandle, { button: 2, clientX: 300 });
    fireEvent.pointerDown(panPill, { button: 2, clientX: 175 });
    fireEvent.pointerDown(track, { button: 2, clientX: 400 });
    expect(onWindowChange).not.toHaveBeenCalled();

    // Drag start handle to 20% (clientX = 100 / 500)
    fireEvent.pointerDown(startHandle, { button: 0, clientX: 50 });
    expect(startHandle).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 100 });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 20, endPct: 60 }, 2.5);
    fireEvent.pointerUp(window);
    expect(startHandle).not.toHaveAttribute('data-dragging');

    // Moving pointer after pointerUp does nothing (window listener removed)
    const callsAfterStartDrag = onWindowChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 10 });
    expect(onWindowChange).toHaveBeenCalledTimes(callsAfterStartDrag);

    // Drag end handle to 80% (clientX = 400 / 500), end via pointerCancel
    fireEvent.pointerDown(endHandle, { button: 0, clientX: 300 });
    expect(endHandle).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 400 });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 20, endPct: 80 }, 1.67);
    fireEvent.pointerCancel(window);
    expect(endHandle).not.toHaveAttribute('data-dragging');

    // Pan viewport pill left by 10% (delta -50px on 500px width): [20, 80] -> [10, 70]
    fireEvent.pointerDown(panPill, { button: 0, clientX: 250 });
    expect(panPill).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 10, endPct: 70 }, 1.67);

    // Pan past right edge clamps cleanly to [40, 100] preserving 60% span
    fireEvent.pointerMove(window, { clientX: 900 });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 40, endPct: 100 }, 1.67);
    fireEvent.pointerUp(window);
    expect(panPill).not.toHaveAttribute('data-dragging');

    // Click recessed track backdrop at 10% (clientX = 50): centers 60% window -> clamps to [0, 60]
    fireEvent.pointerDown(track, { button: 0, clientX: 50 });
    expect(onWindowChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 60 }, 1.67);

    // Zero-width track mid-drag safely skips updates for both edge handle and pan drag
    fireEvent.pointerDown(startHandle, { button: 0, clientX: 0 });
    rectSpy.mockReturnValueOnce({
      x: 0,
      y: 0,
      left: 0,
      right: 0,
      top: 0,
      bottom: 44,
      width: 0,
      height: 44,
      toJSON: () => ({}),
    });
    const callsBeforeZeroEdge = onWindowChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 150 });
    expect(onWindowChange).toHaveBeenCalledTimes(callsBeforeZeroEdge);
    fireEvent.pointerUp(window);

    fireEvent.pointerDown(panPill, { button: 0, clientX: 150 });
    rectSpy.mockReturnValueOnce({
      x: 0,
      y: 0,
      left: 0,
      right: 0,
      top: 0,
      bottom: 44,
      width: 0,
      height: 44,
      toJSON: () => ({}),
    });
    const callsBeforeZeroPan = onWindowChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 300 });
    expect(onWindowChange).toHaveBeenCalledTimes(callsBeforeZeroPan);

    // Unmount mid-drag detaches window listeners cleanly
    unmount();
    fireEvent.pointerMove(window, { clientX: 400 });
    expect(onWindowChange).toHaveBeenCalledTimes(callsBeforeZeroPan);
  });

  it('renders custom sanitized peaks, tangerine playhead hairline, and enforces disabled state including mid-drag disable', () => {
    const onWindowChange = vi.fn();

    const { rerender } = render(
      <TimelineZoomNavigator
        peaks={[0, 0.5, 1.8, Number.NaN, -0.5, 0.85]}
        playheadPct={37.5}
        onWindowChange={onWindowChange}
        data-testid="media-root"
      />
    );

    const barsContainer = screen.getByTestId('timeline-activity-bars');
    expect(barsContainer.children).toHaveLength(6);
    expect(screen.getByTestId('timeline-peak-0')).toHaveStyle({ height: '14%' });
    expect(screen.getByTestId('timeline-peak-2')).toHaveStyle({ height: '100%' });
    expect(screen.getByTestId('timeline-peak-3')).toHaveStyle({ height: '14%' });

    const playhead = screen.getByTestId('timeline-playhead');
    expect(playhead).toHaveAttribute('data-playhead-pct', '37.5');
    expect(playhead).toHaveStyle({ left: '37.5%' });

    // Clamped playhead bounds and NaN playhead omission
    rerender(<TimelineZoomNavigator peaks={[]} playheadPct={-20} data-testid="media-root" />);
    expect(screen.getByTestId('timeline-activity-bars').children).toHaveLength(32);
    expect(screen.getByTestId('timeline-playhead')).toHaveAttribute('data-playhead-pct', '0');

    rerender(<TimelineZoomNavigator playheadPct={150} data-testid="media-root" />);
    expect(screen.getByTestId('timeline-playhead')).toHaveAttribute('data-playhead-pct', '100');

    rerender(<TimelineZoomNavigator playheadPct={Number.NaN} data-testid="media-root" />);
    expect(screen.queryByTestId('timeline-playhead')).not.toBeInTheDocument();

    // Start dragging then dynamically disable mid-drag -> cleans up drag listeners and active state
    rerender(
      <TimelineZoomNavigator
        disabled={false}
        onWindowChange={onWindowChange}
        data-testid="media-root"
      />
    );
    const track = screen.getByTestId('timeline-track');
    mockTrackRect(track, 0, 500, 44);
    const startHandle = screen.getByRole('slider', { name: 'Zoom timeline start' });
    fireEvent.pointerDown(startHandle, { button: 0, clientX: 50 });
    expect(screen.getByTestId('media-root')).toHaveAttribute('data-dragging', 'true');

    rerender(
      <TimelineZoomNavigator
        disabled
        onWindowChange={onWindowChange}
        data-testid="media-root"
      />
    );
    expect(screen.getByTestId('media-root')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('media-root')).not.toHaveAttribute('data-dragging');

    // Verify all interactions are blocked when disabled
    const callsWhileDisabled = onWindowChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 200 });
    fireEvent.pointerDown(startHandle, { button: 0, clientX: 50 });
    fireEvent.pointerDown(screen.getByRole('group', { name: 'Pan timeline window' }), {
      button: 0,
      clientX: 150,
    });
    fireEvent.pointerDown(track, { button: 0, clientX: 400 });
    fireEvent.keyDown(startHandle, { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('group', { name: 'Pan timeline window' }), {
      key: 'ArrowRight',
    });
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fit all (1.0×)' })).toBeDisabled();
    expect(startHandle).toHaveAttribute('tabindex', '-1');
    expect(startHandle).toHaveAttribute('aria-disabled', 'true');
    expect(onWindowChange).toHaveBeenCalledTimes(callsWhileDisabled);
  });

  it('clamps malformed numeric inputs, normalizes edge windows, handles zero-width track start, and neutralizes adversarial XSS labels', () => {
    const xssLabel = '<script>window.__tzXss=1</script><img src=x onerror=alert(1)>Timeline';

    const { rerender } = render(
      <TimelineZoomNavigator
        key="malformed-1"
        label={xssLabel}
        totalDurationSec={0}
        minWindowPct={0.5}
        defaultWindowRange={{ startPct: 75, endPct: 25 }}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('timeline-navigator-label')).toHaveTextContent(xssLabel);
    // totalDurationSec <= 0 clamps to 1s; inverted [75, 25] -> [25, 75]
    expect(screen.getByTestId('timeline-visible-span')).toHaveTextContent(
      '00:00.3 → 00:00.8 · 0.5s visible'
    );
    expect(screen.getByTestId('timeline-total-duration')).toHaveTextContent('Total 00:01.0');

    // Non-finite duration falls back to 120s; narrow near start expands end to satisfy minWindowPct
    rerender(
      <TimelineZoomNavigator
        key="expand-end"
        totalDurationSec={Number.NaN}
        minWindowPct={10}
        defaultWindowRange={{ startPct: 10, endPct: 11 }}
      />
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline start' })).toHaveAttribute(
      'aria-valuenow',
      '10'
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline end' })).toHaveAttribute(
      'aria-valuenow',
      '20'
    );
    expect(screen.getByTestId('timeline-total-duration')).toHaveTextContent('Total 02:00.0');

    // Narrow near right edge pulls start back to satisfy minWindowPct; minWindowPct > 50 clamps to 50
    rerender(
      <TimelineZoomNavigator
        key="pull-start"
        minWindowPct={80}
        defaultWindowRange={{ startPct: 98, endPct: 99 }}
      />
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline start' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline end' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );

    // Non-finite window bounds + -0 normalization + out-of-bounds clamping
    rerender(
      <TimelineZoomNavigator
        key="nan-window"
        minWindowPct={Number.NaN}
        defaultWindowRange={{ startPct: Number.NaN, endPct: Number.NaN }}
      />
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline start' })).toHaveAttribute(
      'aria-valuenow',
      '10'
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline end' })).toHaveAttribute(
      'aria-valuenow',
      '60'
    );

    rerender(
      <TimelineZoomNavigator
        key="neg-zero"
        defaultWindowRange={{ startPct: -0, endPct: 150 }}
      />
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline start' })).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByRole('slider', { name: 'Zoom timeline end' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );

    // Zero-width track on initial pointerDown safely ignores drag start for handles, viewport, and track
    const track = screen.getByTestId('timeline-track');
    mockTrackRect(track, 0, 0, 44);
    fireEvent.pointerDown(screen.getByRole('slider', { name: 'Zoom timeline start' }), {
      button: 0,
      clientX: 10,
    });
    fireEvent.pointerDown(screen.getByRole('group', { name: 'Pan timeline window' }), {
      button: 0,
      clientX: 20,
    });
    fireEvent.pointerDown(track, { button: 0, clientX: 30 });
    expect(screen.getByRole('slider', { name: 'Zoom timeline start' })).not.toHaveAttribute(
      'data-dragging'
    );
  });

  it('formats minute-boundary tenths without 00:60.0 overflow and synchronizes external controlled windowRange updates', () => {
    const onWindowChange = vi.fn();

    const { rerender } = render(
      <TimelineZoomNavigator
        totalDurationSec={59.96}
        windowRange={{ startPct: 0, endPct: 100 }}
        onWindowChange={onWindowChange}
      />
    );

    expect(screen.getByTestId('timeline-visible-span')).toHaveTextContent(
      '00:00.0 → 01:00.0 · 60.0s visible'
    );
    expect(screen.getByTestId('timeline-total-duration')).toHaveTextContent('Total 01:00.0');
    expect(onWindowChange).not.toHaveBeenCalled();

    rerender(
      <TimelineZoomNavigator
        totalDurationSec={600}
        windowRange={{ startPct: 25, endPct: 50 }}
        onWindowChange={onWindowChange}
      />
    );

    expect(screen.getByTestId('timeline-zoom-badge')).toHaveTextContent('4.0×');
    expect(screen.getByTestId('timeline-visible-span')).toHaveTextContent(
      '02:30.0 → 05:00.0 · 150.0s visible'
    );
    expect(screen.getByTestId('timeline-total-duration')).toHaveTextContent('Total 10:00.0');
    expect(onWindowChange).not.toHaveBeenCalled();
  });
});
