import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TONE_CURVE_CHANNELS,
  TONE_CURVE_PRESETS,
  ToneCurveEditor,
  type ToneChannelMap,
  type ToneCurveChannel,
  type ToneCurveChannelMap,
  type ToneCurvePoint,
} from './index';

function mockSvgRect(svg: Element, width = 260, height = 260, left = 0, top = 0): void {
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  });
}

function levelToClient(x: number, y: number): { clientX: number; clientY: number } {
  return {
    clientX: 16 + (x / 255) * 228,
    clientY: 244 - (y / 255) * 228,
  };
}

describe('ToneCurveEditor', () => {
  it('renders default diagonal curve, 4 channels, presets, 260x260 SVG, histogram, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const channelMapCheck: ToneChannelMap = {
      luma: true,
      red: true,
      green: true,
      blue: true,
    };
    expect(Object.keys(channelMapCheck)).toHaveLength(4);
    expect(TONE_CURVE_CHANNELS).toHaveLength(4);
    expect(TONE_CURVE_PRESETS).toHaveLength(3);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ToneCurveEditor: {
              className: 'theme-tone-curve',
              style: { maxWidth: '520px' },
            },
          },
        }}
      >
        <ToneCurveEditor
          ref={ref}
          className="local-tone-curve"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="tone-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tone-root');
    expect(ref.current).toBe(root);
    expect(ToneCurveEditor.displayName).toBe('ToneCurveEditor');
    expect(root).toHaveClass(
      'refractor-tone-curve-editor',
      'prism-slab',
      'theme-tone-curve',
      'local-tone-curve'
    );
    expect(root).toHaveStyle({ maxWidth: '520px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-channel', 'luma');
    expect(root).toHaveAttribute('data-preset', 'linear');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-dragging');

    expect(screen.getByTestId('tone-curve-title')).toHaveTextContent('Tone Curve');

    // Channel pills
    expect(screen.getByTestId('tone-curve-channel-luma')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tone-curve-channel-red')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('tone-curve-channel-green')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('tone-curve-channel-blue')).toHaveAttribute('aria-pressed', 'false');

    // Presets and Reset
    expect(screen.getByTestId('tone-curve-preset-linear')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tone-curve-preset-s-curve')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('tone-curve-preset-matte-lift')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('tone-curve-reset-button')).toBeEnabled();

    // Responsive 260x260 SVG with zero raw colors or NaN
    const svg = screen.getByTestId('tone-curve-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 260 260');
    expect(svg).toHaveClass('w-full', 'h-auto', 'max-w-[300px]');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\brgba?\s*\(/i);
    expect(svg.innerHTML).not.toContain('NaN');

    expect(screen.getAllByTestId('tone-curve-gridline')).toHaveLength(5);
    expect(screen.getByTestId('tone-curve-diagonal')).toBeInTheDocument();
    expect(screen.getAllByTestId('tone-curve-histogram-bar')).toHaveLength(32);

    const path = screen.getByTestId('tone-curve-path');
    expect(path).toHaveAttribute('stroke', 'var(--prism-text-primary)');
    expect(path.getAttribute('d')).toMatch(/^M 16,244 C /);

    // 4 default points: (0,0), (64,64), (192,192), (255,255)
    expect(screen.getByTestId('tone-curve-point-luma-p0')).toHaveAttribute('data-endpoint', 'true');
    expect(screen.getByTestId('tone-curve-point-luma-p1')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('tone-curve-point-luma-p2')).toHaveAttribute('data-x', '192');
    expect(screen.getByTestId('tone-curve-point-luma-p3')).toHaveAttribute('data-endpoint', 'true');

    // aria-live recessed readout
    const readout = screen.getByTestId('tone-curve-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 64 · Out: 64');
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('4 / 12 points · Luma');
  });

  it('switches across Luma, Red, Green, and Blue channels with semantic --prism-* strokes', () => {
    const onChannelChange = vi.fn<(channel: ToneCurveChannel) => void>();
    render(<ToneCurveEditor title="Primary Grade" onChannelChange={onChannelChange} />);

    expect(screen.getByTestId('tone-curve-title')).toHaveTextContent('Primary Grade');

    // Clicking already-active luma does not emit redundant callback
    fireEvent.click(screen.getByTestId('tone-curve-channel-luma'));
    expect(onChannelChange).not.toHaveBeenCalled();

    // Red
    fireEvent.click(screen.getByTestId('tone-curve-channel-red'));
    expect(onChannelChange).toHaveBeenLastCalledWith('red');
    expect(screen.getByTestId('tone-curve-path')).toHaveAttribute('stroke', 'var(--prism-error-main)');
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('4 / 12 points · Red');

    // Green
    fireEvent.click(screen.getByTestId('tone-curve-channel-green'));
    expect(onChannelChange).toHaveBeenLastCalledWith('green');
    expect(screen.getByTestId('tone-curve-path')).toHaveAttribute('stroke', 'var(--prism-success-main)');

    // Blue
    fireEvent.click(screen.getByTestId('tone-curve-channel-blue'));
    expect(onChannelChange).toHaveBeenLastCalledWith('blue');
    expect(screen.getByTestId('tone-curve-path')).toHaveAttribute('stroke', 'var(--prism-info-main)');
    expect(onChannelChange).toHaveBeenCalledTimes(3);
  });

  it('supports controlled activeChannel and applies Linear, S-Curve, Matte Lift presets and Reset Channel', () => {
    const onChannelChange = vi.fn<(channel: ToneCurveChannel) => void>();
    const onChange =
      vi.fn<(ch: ToneCurveChannel, pts: ToneCurvePoint[], all: ToneCurveChannelMap) => void>();

    const { rerender } = render(
      <ToneCurveEditor
        activeChannel="red"
        onChannelChange={onChannelChange}
        onChange={onChange}
        data-testid="tone-root"
      />
    );

    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-channel', 'red');

    // Controlled channel emits callback without mutating until prop changes
    fireEvent.click(screen.getByTestId('tone-curve-channel-blue'));
    expect(onChannelChange).toHaveBeenCalledWith('blue');
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-channel', 'red');

    // S-Curve preset on Red
    fireEvent.click(screen.getByTestId('tone-curve-preset-s-curve'));
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-preset', 's-curve');
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 64 · Out: 44');
    expect(onChange).toHaveBeenLastCalledWith(
      'red',
      [
        { id: 'red-p0', x: 0, y: 0 },
        { id: 'red-p1', x: 64, y: 44 },
        { id: 'red-p2', x: 192, y: 212 },
        { id: 'red-p3', x: 255, y: 255 },
      ],
      expect.objectContaining({
        luma: expect.arrayContaining([expect.objectContaining({ x: 64, y: 64 })]),
      })
    );

    // Matte Lift preset
    fireEvent.click(screen.getByTestId('tone-curve-preset-matte-lift'));
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-preset', 'matte-lift');
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 64 · Out: 72');

    // Reset Channel restores diagonal on active channel only
    fireEvent.click(screen.getByTestId('tone-curve-reset-button'));
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-preset', 'linear');
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 64 · Out: 64');

    // Apply S-Curve then Linear preset explicitly
    fireEvent.click(screen.getByTestId('tone-curve-preset-s-curve'));
    fireEvent.click(screen.getByTestId('tone-curve-preset-linear'));
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-preset', 'linear');

    // Rerender controlled activeChannel to green
    rerender(
      <ToneCurveEditor
        activeChannel="green"
        onChannelChange={onChannelChange}
        onChange={onChange}
        data-testid="tone-root"
      />
    );
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-channel', 'green');
  });

  it('adds control points via SVG background click up to 12 points with collision avoidance', () => {
    const onChange =
      vi.fn<(ch: ToneCurveChannel, pts: ToneCurvePoint[], all: ToneCurveChannelMap) => void>();
    render(
      <ToneCurveEditor
        defaultCurves={{
          luma: [
            { id: 'luma-p0', x: 0, y: 0 },
            { id: 'luma-pt-1', x: 64, y: 64 },
            { id: 'luma-p2', x: 254, y: 254 },
            { id: 'luma-p3', x: 255, y: 255 },
          ],
        }}
        onChange={onChange}
      />
    );

    const svg = screen.getByTestId('tone-curve-svg');

    // Zero-sized rect click is ignored safely
    mockSvgRect(svg, 0, 0);
    fireEvent.click(svg, levelToClient(128, 160));
    expect(onChange).not.toHaveBeenCalled();

    // Valid rect
    mockSvgRect(svg, 260, 260);

    // Click at free coordinate (128, 160) -> skips existing ID 'luma-pt-1' and creates 'luma-pt-2'
    fireEvent.click(svg, levelToClient(128, 160));
    expect(screen.getByTestId('tone-curve-point-luma-pt-2')).toBeInTheDocument();
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 128 · Out: 160');
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('5 / 12 points · Luma');

    // Click at already-occupied x=64 -> nudges right to x=65
    fireEvent.click(svg, levelToClient(64, 90));
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 65 · Out: 90');

    // Click at already-occupied x=254 (right edge!) -> nudges left to x=253
    fireEvent.click(svg, levelToClient(254, 220));
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 253 · Out: 220');

    // Click at x=254 again when both 254 and 253 are occupied -> nudges left to x=252
    fireEvent.click(svg, levelToClient(254, 210));
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 252 · Out: 210');

    // Click an existing control point directly -> selects it without adding a new point
    const countBeforePointClick = onChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('tone-curve-point-luma-p0'));
    expect(onChange).toHaveBeenCalledTimes(countBeforePointClick);
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 0 · Out: 0');

    // Add 4 more points to hit MAX_POINTS = 12 (currently 8 points)
    for (const x of [30, 50, 90, 150]) {
      fireEvent.click(svg, levelToClient(x, x));
    }
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('12 / 12 points · Luma');

    // Clicking a 13th time is blocked
    const callsAtMax = onChange.mock.calls.length;
    fireEvent.click(svg, levelToClient(110, 110));
    expect(onChange).toHaveBeenCalledTimes(callsAtMax);
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('12 / 12 points · Luma');
  });

  it('nudges control points via keyboard (+/-4 and Shift +/-16), pins endpoints on X, deletes interior points, and guards IME', () => {
    const onChange =
      vi.fn<(ch: ToneCurveChannel, pts: ToneCurvePoint[], all: ToneCurveChannelMap) => void>();
    render(<ToneCurveEditor onChange={onChange} data-testid="tone-root" />);

    const p1 = screen.getByTestId('tone-curve-point-luma-p1');

    // Fine step +/-4
    fireEvent.keyDown(p1, { key: 'ArrowRight' });
    expect(p1).toHaveAttribute('data-x', '68');
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-preset', 'custom');

    fireEvent.keyDown(p1, { key: 'ArrowLeft' });
    expect(p1).toHaveAttribute('data-x', '64');

    fireEvent.keyDown(p1, { key: 'ArrowUp' });
    expect(p1).toHaveAttribute('data-y', '68');

    fireEvent.keyDown(p1, { key: 'ArrowDown' });
    expect(p1).toHaveAttribute('data-y', '64');

    // Shift coarse step +/-16
    fireEvent.keyDown(p1, { key: 'ArrowRight', shiftKey: true });
    expect(p1).toHaveAttribute('data-x', '80');

    fireEvent.keyDown(p1, { key: 'ArrowLeft', shiftKey: true });
    expect(p1).toHaveAttribute('data-x', '64');

    fireEvent.keyDown(p1, { key: 'ArrowUp', shiftKey: true });
    expect(p1).toHaveAttribute('data-y', '80');

    fireEvent.keyDown(p1, { key: 'ArrowDown', shiftKey: true });
    expect(p1).toHaveAttribute('data-y', '64');

    // Unrelated key and IME composing event are safely ignored
    const callsBeforeIgnored = onChange.mock.calls.length;
    fireEvent.keyDown(p1, { key: 'Escape' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    p1.dispatchEvent(imeEvent);
    expect(onChange).toHaveBeenCalledTimes(callsBeforeIgnored);

    // Endpoints x=0 and x=255 stay pinned on X, move on Y, and cannot be deleted
    const p0 = screen.getByTestId('tone-curve-point-luma-p0');
    const callsBeforePin = onChange.mock.calls.length;
    fireEvent.keyDown(p0, { key: 'ArrowRight' });
    fireEvent.keyDown(p0, { key: 'ArrowLeft' });
    fireEvent.keyDown(p0, { key: 'Delete' });
    fireEvent.keyDown(p0, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledTimes(callsBeforePin);
    expect(p0).toHaveAttribute('data-x', '0');

    fireEvent.keyDown(p0, { key: 'ArrowUp' });
    expect(p0).toHaveAttribute('data-x', '0');
    expect(p0).toHaveAttribute('data-y', '4');

    const p3 = screen.getByTestId('tone-curve-point-luma-p3');
    const callsBeforeWhitePin = onChange.mock.calls.length;
    fireEvent.keyDown(p3, { key: 'ArrowLeft' });
    fireEvent.keyDown(p3, { key: 'Delete' });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeWhitePin);
    expect(p3).toHaveAttribute('data-x', '255');

    fireEvent.keyDown(p3, { key: 'ArrowDown' });
    expect(p3).toHaveAttribute('data-x', '255');
    expect(p3).toHaveAttribute('data-y', '251');

    // Delete & Backspace remove interior points down to 2 endpoints (triggers straight L spline path)
    fireEvent.keyDown(p1, { key: 'Delete' });
    expect(screen.queryByTestId('tone-curve-point-luma-p1')).not.toBeInTheDocument();
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('3 / 12 points · Luma');

    const p2 = screen.getByTestId('tone-curve-point-luma-p2');
    fireEvent.keyDown(p2, { key: 'Backspace' });
    expect(screen.queryByTestId('tone-curve-point-luma-p2')).not.toBeInTheDocument();
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('2 / 12 points · Luma');
    expect(screen.getByTestId('tone-curve-path').getAttribute('d')).toMatch(/^M .+ L .+$/);
  });

  it('drags control points smoothly via pointer events and cleans up window listeners on pointerup, pointercancel, disable, and unmount', () => {
    const onChange =
      vi.fn<(ch: ToneCurveChannel, pts: ToneCurvePoint[], all: ToneCurveChannelMap) => void>();
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = render(
      <ToneCurveEditor onChange={onChange} data-testid="tone-root" />
    );

    const svg = screen.getByTestId('tone-curve-svg');
    const p1 = screen.getByTestId('tone-curve-point-luma-p1');

    // Secondary button & zero-sized rect are ignored
    fireEvent.pointerDown(p1, { button: 2, pointerId: 1 });
    mockSvgRect(svg, 0, 0);
    fireEvent.pointerDown(p1, { button: 0, pointerId: 1 });
    expect(screen.getByTestId('tone-root')).not.toHaveAttribute('data-dragging');

    // Valid drag on interior point p1
    mockSvgRect(svg, 260, 260);
    fireEvent.pointerDown(p1, { button: 0, pointerId: 7 });
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-dragging', 'true');
    expect(p1).toHaveAttribute('data-dragging', 'true');

    // Clicking SVG while actively dragging does not add a point
    const countBeforeClick = screen.getAllByRole('slider').length;
    fireEvent.click(svg, levelToClient(140, 140));
    expect(screen.getAllByRole('slider')).toHaveLength(countBeforeClick);

    // Different pointerId move/up are ignored
    fireEvent.pointerMove(window, { ...levelToClient(100, 120), pointerId: 99 });
    fireEvent.pointerUp(window, { pointerId: 99 });
    expect(p1).toHaveAttribute('data-x', '64');

    // Matching pointerId moves p1 to (100, 140)
    fireEvent.pointerMove(window, { ...levelToClient(100, 140), pointerId: 7 });
    expect(p1).toHaveAttribute('data-x', '100');
    expect(p1).toHaveAttribute('data-y', '140');
    expect(screen.getByTestId('tone-curve-selected-coords')).toHaveTextContent('In: 100 · Out: 140');

    // Move when rect momentarily collapses to 0 is safely ignored
    mockSvgRect(svg, 0, 0);
    fireEvent.pointerMove(window, { ...levelToClient(120, 150), pointerId: 7 });
    expect(p1).toHaveAttribute('data-x', '100');

    // Restore rect & finish drag via pointerup
    mockSvgRect(svg, 260, 260);
    fireEvent.pointerUp(window, { pointerId: 7 });
    expect(screen.getByTestId('tone-root')).not.toHaveAttribute('data-dragging');

    // Drag endpoint p0: X remains pinned at 0 while Y changes; cancel via pointercancel
    const p0 = screen.getByTestId('tone-curve-point-luma-p0');
    fireEvent.pointerDown(p0, { button: 0, pointerId: 11 });
    fireEvent.pointerMove(window, { ...levelToClient(90, 32), pointerId: 11 });
    expect(p0).toHaveAttribute('data-x', '0');
    expect(p0).toHaveAttribute('data-y', '32');
    fireEvent.pointerCancel(window, { pointerId: 11 });
    expect(screen.getByTestId('tone-root')).not.toHaveAttribute('data-dragging');

    // Start drag then toggle disabled=true -> cleans up listeners immediately
    fireEvent.pointerDown(p1, { button: 0, pointerId: 12 });
    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-dragging', 'true');
    rerender(<ToneCurveEditor disabled onChange={onChange} data-testid="tone-root" />);
    expect(screen.getByTestId('tone-root')).not.toHaveAttribute('data-dragging');

    // Re-enable, start drag, then unmount -> cleans up window listeners
    rerender(<ToneCurveEditor onChange={onChange} data-testid="tone-root" />);
    mockSvgRect(screen.getByTestId('tone-curve-svg'), 260, 260);
    fireEvent.pointerDown(screen.getByTestId('tone-curve-point-luma-p1'), {
      button: 0,
      pointerId: 15,
    });
    removeListenerSpy.mockClear();
    unmount();

    const removedEvents = removeListenerSpy.mock.calls.map((call) => call[0]);
    expect(removedEvents).toContain('pointermove');
    expect(removedEvents).toContain('pointerup');
    expect(removedEvents).toContain('pointercancel');
    removeListenerSpy.mockRestore();
  });

  it('supports controlled and partially controlled curves without mutating controlled channels', () => {
    const controlledLuma: ToneCurvePoint[] = [
      { id: 'c0', x: 0, y: 10 },
      { id: 'c1', x: 128, y: 150 },
      { id: 'c2', x: 255, y: 245 },
    ];
    const onChange =
      vi.fn<(ch: ToneCurveChannel, pts: ToneCurvePoint[], all: ToneCurveChannelMap) => void>();

    const { rerender } = render(
      <ToneCurveEditor curves={{ luma: controlledLuma }} onChange={onChange} />
    );

    // Controlled luma emits onChange but stays at (128, 150) until parent updates curves prop
    const c1 = screen.getByTestId('tone-curve-point-c1');
    fireEvent.keyDown(c1, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith(
      'luma',
      expect.arrayContaining([expect.objectContaining({ id: 'c1', x: 128, y: 154 })]),
      expect.objectContaining({ luma: expect.any(Array) })
    );
    expect(c1).toHaveAttribute('data-y', '150');

    // Drag c1 and remove it from controlled curves mid-drag -> subsequent move is a safe no-op
    const svg = screen.getByTestId('tone-curve-svg');
    mockSvgRect(svg, 260, 260);
    fireEvent.pointerDown(c1, { button: 0, pointerId: 33 });
    rerender(
      <ToneCurveEditor
        curves={{
          luma: [
            { id: 'c0', x: 0, y: 10 },
            { id: 'c2', x: 255, y: 245 },
          ],
          red: [
            { id: 'r0', x: 0, y: 0 },
            { id: 'r1', x: 255, y: 255 },
          ],
          green: [
            { id: 'g0', x: 0, y: 0 },
            { id: 'g1', x: 255, y: 255 },
          ],
          blue: [
            { id: 'b0', x: 0, y: 0 },
            { id: 'b1', x: 255, y: 255 },
          ],
        }}
        onChange={onChange}
      />
    );
    const callsBeforeRemovedMove = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { ...levelToClient(140, 180), pointerId: 33 });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeRemovedMove);
    fireEvent.pointerUp(window, { pointerId: 33 });

    // Switch to uncontrolled red channel (after removing red from curves) and edit -> updates local state
    rerender(<ToneCurveEditor curves={{ luma: controlledLuma }} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('tone-curve-channel-red'));
    const redP1 = screen.getByTestId('tone-curve-point-red-p1');
    fireEvent.keyDown(redP1, { key: 'ArrowUp' });
    expect(redP1).toHaveAttribute('data-y', '68');
  });

  it('sanitizes adversarial curves, custom/empty/invalid histograms, and monotone spline edge cases', () => {
    // 1. Adversarial unsorted, blank-ID, duplicate-ID, out-of-range, NaN, missing endpoints, local peak, flat segment, cliff
    const adversarialPoints: ToneCurvePoint[] = [
      { id: '   ', x: 200, y: 200 },
      { id: 'dup', x: 100, y: 200 },
      { id: 'dup', x: 10, y: 10 },
      { id: 'steep', x: 12, y: 240 },
      { id: 'weird', x: Number.NaN, y: Number.POSITIVE_INFINITY },
      { id: 'over', x: 400, y: -50 },
    ];

    const { rerender } = render(
      <ToneCurveEditor
        defaultCurves={{
          luma: adversarialPoints,
          red: [],
          green: [
            { id: 'g1', x: 30, y: 40 },
            { id: 'g2', x: 180, y: 210 },
          ],
          blue: Array.from({ length: 14 }, (_, i) => ({
            id: `b-${i}`,
            x: 10 + i * 15,
            y: 10 + i * 15,
          })),
        }}
        histogram={[-10, Number.NaN, Number.POSITIVE_INFINITY, 0, 50, 100]}
      />
    );

    const svg = screen.getByTestId('tone-curve-svg');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('tone-curve-histogram-bar')).toHaveLength(6);

    // Switch to red (empty array -> default 4 diagonal points)
    fireEvent.click(screen.getByTestId('tone-curve-channel-red'));
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('4 / 12 points · Red');

    // Switch to green (missing x=0 and x=255 with <12 pts -> prepends x=0 and appends x=255)
    fireEvent.click(screen.getByTestId('tone-curve-channel-green'));
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('4 / 12 points · Green');
    expect(screen.getByTestId('tone-curve-point-green-start')).toHaveAttribute('data-x', '0');
    expect(screen.getByTestId('tone-curve-point-green-end')).toHaveAttribute('data-x', '255');

    // Switch to blue (>12 pts with missing endpoints -> capped at 12, first pinned x=0, last pinned x=255)
    fireEvent.click(screen.getByTestId('tone-curve-channel-blue'));
    expect(screen.getByTestId('tone-curve-point-count')).toHaveTextContent('12 / 12 points · Blue');
    expect(screen.getByTestId('tone-curve-point-b-0')).toHaveAttribute('data-x', '0');
    expect(screen.getByTestId('tone-curve-point-b-11')).toHaveAttribute('data-x', '255');

    // Empty histogram & tightly packed duplicate-X interior points (minX > maxX branch)
    rerender(
      <ToneCurveEditor
        curves={{
          luma: [
            { id: 't0', x: 0, y: 0 },
            { id: 't1', x: 100, y: 80 },
            { id: 't2', x: 100, y: 120 },
            { id: 't3', x: 100, y: 160 },
            { id: 't4', x: 255, y: 255 },
          ],
        }}
        activeChannel="luma"
        histogram={[]}
      />
    );
    expect(screen.queryAllByTestId('tone-curve-histogram-bar')).toHaveLength(0);
    // Nudge tightly packed middle point t2
    fireEvent.keyDown(screen.getByTestId('tone-curve-point-t2'), { key: 'ArrowRight' });
    expect(screen.getByTestId('tone-curve-svg').innerHTML).not.toContain('NaN');
  });

  it('blocks all interactive mutations when disabled', () => {
    const onChange =
      vi.fn<(ch: ToneCurveChannel, pts: ToneCurvePoint[], all: ToneCurveChannelMap) => void>();
    const onChannelChange = vi.fn<(channel: ToneCurveChannel) => void>();

    render(
      <ToneCurveEditor
        disabled
        onChange={onChange}
        onChannelChange={onChannelChange}
        data-testid="tone-root"
      />
    );

    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('tone-curve-channel-red')).toBeDisabled();
    expect(screen.getByTestId('tone-curve-preset-s-curve')).toBeDisabled();
    expect(screen.getByTestId('tone-curve-reset-button')).toBeDisabled();

    const svg = screen.getByTestId('tone-curve-svg');
    mockSvgRect(svg, 260, 260);
    fireEvent.click(svg, levelToClient(128, 128));

    const p1 = screen.getByTestId('tone-curve-point-luma-p1');
    expect(p1).toHaveAttribute('tabindex', '-1');
    expect(p1).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(p1);
    fireEvent.pointerDown(p1, { button: 0, pointerId: 1 });
    fireEvent.keyDown(p1, { key: 'ArrowUp' });
    fireEvent.keyDown(p1, { key: 'Delete' });

    expect(onChange).not.toHaveBeenCalled();
    expect(onChannelChange).not.toHaveBeenCalled();
  });
});
