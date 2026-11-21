import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BrushRangeScrubber,
  type BrushIndexRange,
  type BrushPoint,
  type BrushTone,
} from './BrushRangeScrubber';

const SAMPLE_DATA: BrushPoint[] = [
  { label: 'T1', value: 10 },
  { label: 'T2', value: 22 },
  { label: 'T3', value: 18 },
  { label: 'T4', value: 35 },
  { label: 'T5', value: 42 },
  { label: 'T6', value: 30 },
  { label: 'T7', value: 48 },
  { label: 'T8', value: 55 },
  { label: 'T9', value: 49 },
  { label: 'T10', value: 64 },
];

function mockSvgRect(element: Element, left = 0, width = 600, height = 96) {
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

describe('BrushRangeScrubber', () => {
  it('renders Astryx optical card, ref/className/xstyle/theme override, SVG overview, presets, and live readout', () => {
    const ref = createRef<HTMLDivElement>();
    const onRangeChange = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            BrushRangeScrubber: { className: 'theme-brush', style: { maxWidth: '640px' } },
          },
        }}
      >
        <BrushRangeScrubber
          ref={ref}
          data={SAMPLE_DATA}
          title="Telemetry Scrubber"
          className="local-brush"
          xstyle={{ '--prism-blur-px': '14px' }}
          onRangeChange={onRangeChange}
          data-testid="brush-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('brush-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-brush-range-scrubber',
      'prism-slab',
      'theme-brush',
      'local-brush'
    );
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(root).toHaveAttribute('data-tone', 'primary');

    expect(screen.getByText('Telemetry Scrubber')).toBeInTheDocument();
    expect(screen.getByTestId('brush-scrubber-svg')).toHaveAttribute('viewBox', '0 0 600 96');
    expect(screen.getByTestId('brush-sparkline-line')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('brush-sparkline-area')).toBeInTheDocument();
    expect(screen.getByTestId('brush-scrim-left')).toHaveAttribute('width', '0');
    expect(screen.getByTestId('brush-scrim-right')).toHaveAttribute('width', '0');

    const readout = screen.getByTestId('brush-scrubber-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent('T1 → T10 · 10 / 10 points');

    const allBtn = screen.getByRole('button', { name: 'All' });
    const halfBtn = screen.getByRole('button', { name: 'Last 50%' });
    const quarterBtn = screen.getByRole('button', { name: 'Last 25%' });
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    expect(allBtn).toHaveClass('prism-emerald');

    // Clicking already-active preset is a no-op
    fireEvent.click(allBtn);
    expect(onRangeChange).not.toHaveBeenCalled();

    // Last 50% -> indices [5, 9] (5 points)
    fireEvent.click(halfBtn);
    expect(onRangeChange).toHaveBeenLastCalledWith([5, 9], SAMPLE_DATA.slice(5, 10));
    expect(readout).toHaveTextContent('T6 → T10 · 5 / 10 points');
    expect(halfBtn).toHaveAttribute('aria-pressed', 'true');
    expect(halfBtn).toHaveClass('prism-emerald');

    // Last 25% -> indices [7, 9] (3 points)
    fireEvent.click(quarterBtn);
    expect(onRangeChange).toHaveBeenLastCalledWith([7, 9], SAMPLE_DATA.slice(7, 10));
    expect(readout).toHaveTextContent('T8 → T10 · 3 / 10 points');
    expect(quarterBtn).toHaveAttribute('aria-pressed', 'true');

    // All -> back to [0, 9]
    fireEvent.click(allBtn);
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 9], SAMPLE_DATA);
    expect(readout).toHaveTextContent('T1 → T10 · 10 / 10 points');
  });

  it('applies all 5 semantic tones with --prism-* tokens', () => {
    const expectedTokens: ReadonlyArray<readonly [BrushTone, string]> = [
      ['primary', 'var(--prism-primary-main)'],
      ['secondary', 'var(--prism-secondary-main)'],
      ['emerald', 'var(--prism-success-main)'],
      ['amber', 'var(--prism-warning-main)'],
      ['rose', 'var(--prism-error-main)'],
    ];

    const { rerender } = render(
      <BrushRangeScrubber data={SAMPLE_DATA} tone="primary" data-testid="tone-root" />
    );

    for (const [tone, token] of expectedTokens) {
      rerender(<BrushRangeScrubber data={SAMPLE_DATA} tone={tone} data-testid="tone-root" />);
      expect(screen.getByTestId('tone-root')).toHaveAttribute('data-tone', tone);
      expect(screen.getByTestId('brush-sparkline-line')).toHaveAttribute('stroke', token);
    }
  });

  it('supports keyboard Arrow/Page/Home/End stepping on start & end handles respecting minSpan and IME guard', () => {
    const onRangeChange = vi.fn();

    render(
      <BrushRangeScrubber
        data={SAMPLE_DATA}
        defaultRange={[2, 7]}
        minSpan={2}
        onRangeChange={onRangeChange}
      />
    );

    const startHandle = screen.getByRole('slider', { name: 'Start brush handle' });
    const endHandle = screen.getByRole('slider', { name: 'End brush handle' });

    expect(startHandle).toHaveAttribute('aria-valuemin', '0');
    expect(startHandle).toHaveAttribute('aria-valuemax', '5');
    expect(startHandle).toHaveAttribute('aria-valuenow', '2');
    expect(startHandle).toHaveAttribute('aria-valuetext', 'T3 (18)');
    expect(startHandle).toHaveClass('prism-focus-ring');

    expect(endHandle).toHaveAttribute('aria-valuemin', '4');
    expect(endHandle).toHaveAttribute('aria-valuemax', '9');
    expect(endHandle).toHaveAttribute('aria-valuenow', '7');
    expect(endHandle).toHaveAttribute('aria-valuetext', 'T8 (55)');

    // IME composition is ignored
    const composingEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    fireEvent(startHandle, composingEvent);
    expect(onRangeChange).not.toHaveBeenCalled();

    // Unrelated key ignored
    fireEvent.keyDown(startHandle, { key: 'Tab' });
    expect(onRangeChange).not.toHaveBeenCalled();

    // Start handle stepping: ArrowRight (+1 -> 3), ArrowUp (+1 -> 4), ArrowLeft (-1 -> 3), ArrowDown (-1 -> 2)
    fireEvent.keyDown(startHandle, { key: 'ArrowRight' });
    expect(onRangeChange).toHaveBeenLastCalledWith([3, 7], SAMPLE_DATA.slice(3, 8));
    fireEvent.keyDown(startHandle, { key: 'ArrowUp' });
    expect(onRangeChange).toHaveBeenLastCalledWith([4, 7], SAMPLE_DATA.slice(4, 8));
    fireEvent.keyDown(startHandle, { key: 'ArrowLeft' });
    expect(onRangeChange).toHaveBeenLastCalledWith([3, 7], SAMPLE_DATA.slice(3, 8));
    fireEvent.keyDown(startHandle, { key: 'ArrowDown' });
    expect(onRangeChange).toHaveBeenLastCalledWith([2, 7], SAMPLE_DATA.slice(2, 8));

    // PageUp (+2 -> 4), PageDown (-2 -> 2), End (clamped to end - minSpan = 5), Home (-> 0)
    fireEvent.keyDown(startHandle, { key: 'PageUp' });
    expect(onRangeChange).toHaveBeenLastCalledWith([4, 7], SAMPLE_DATA.slice(4, 8));
    fireEvent.keyDown(startHandle, { key: 'PageDown' });
    expect(onRangeChange).toHaveBeenLastCalledWith([2, 7], SAMPLE_DATA.slice(2, 8));
    fireEvent.keyDown(startHandle, { key: 'End' });
    expect(onRangeChange).toHaveBeenLastCalledWith([5, 7], SAMPLE_DATA.slice(5, 8));

    // Attempting to step past end - minSpan does not emit redundant callback
    const callsAtMax = onRangeChange.mock.calls.length;
    fireEvent.keyDown(startHandle, { key: 'ArrowRight' });
    expect(onRangeChange).toHaveBeenCalledTimes(callsAtMax);

    fireEvent.keyDown(startHandle, { key: 'Home' });
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 7], SAMPLE_DATA.slice(0, 8));

    // End handle stepping: End (-> 9), ArrowLeft (-1 -> 8), PageDown (-2 -> 6), PageUp (+2 -> 8), Home (clamped to start + minSpan = 2)
    fireEvent.keyDown(endHandle, { key: 'End' });
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 9], SAMPLE_DATA);
    fireEvent.keyDown(endHandle, { key: 'ArrowLeft' });
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 8], SAMPLE_DATA.slice(0, 9));
    fireEvent.keyDown(endHandle, { key: 'PageDown' });
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 6], SAMPLE_DATA.slice(0, 7));
    fireEvent.keyDown(endHandle, { key: 'PageUp' });
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 8], SAMPLE_DATA.slice(0, 9));
    fireEvent.keyDown(endHandle, { key: 'Home' });
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 2], SAMPLE_DATA.slice(0, 3));
  });

  it('supports keyboard panning on the middle selection window while preserving span and guarding IME', () => {
    const onRangeChange = vi.fn();

    render(
      <BrushRangeScrubber
        data={SAMPLE_DATA}
        defaultRange={[2, 5]}
        onRangeChange={onRangeChange}
      />
    );

    const panWindow = screen.getByRole('group', { name: 'Pan selected range' });
    expect(panWindow).toHaveClass('prism-focus-ring');

    // IME composition ignored
    const composing = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    fireEvent(panWindow, composing);
    expect(onRangeChange).not.toHaveBeenCalled();

    // Unrelated key ignored
    fireEvent.keyDown(panWindow, { key: 'Enter' });
    expect(onRangeChange).not.toHaveBeenCalled();

    // Pan right by 1 -> [3, 6]
    fireEvent.keyDown(panWindow, { key: 'ArrowRight' });
    expect(onRangeChange).toHaveBeenLastCalledWith([3, 6], SAMPLE_DATA.slice(3, 7));

    // Pan left by 1 -> [2, 5]
    fireEvent.keyDown(panWindow, { key: 'ArrowLeft' });
    expect(onRangeChange).toHaveBeenLastCalledWith([2, 5], SAMPLE_DATA.slice(2, 6));

    // End -> [6, 9] preserving span=3
    fireEvent.keyDown(panWindow, { key: 'End' });
    expect(onRangeChange).toHaveBeenLastCalledWith([6, 9], SAMPLE_DATA.slice(6, 10));

    // Home -> [0, 3] preserving span=3
    fireEvent.keyDown(panWindow, { key: 'Home' });
    expect(onRangeChange).toHaveBeenLastCalledWith([0, 3], SAMPLE_DATA.slice(0, 4));
  });

  it('supports pointer dragging handles and panning window in controlled mode with full window listener cleanup', () => {
    const onRangeChange = vi.fn();

    function ControlledHarness() {
      const [range, setRange] = useState<BrushIndexRange>([2, 7]);
      return (
        <BrushRangeScrubber
          data={SAMPLE_DATA}
          range={range}
          minSpan={1}
          onRangeChange={(next, slice) => {
            onRangeChange(next, slice);
            setRange(next);
          }}
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    const svg = screen.getByTestId('brush-scrubber-svg');
    const rectSpy = mockSvgRect(svg, 0, 600, 96);

    const startHandle = screen.getByRole('slider', { name: 'Start brush handle' });
    const endHandle = screen.getByRole('slider', { name: 'End brush handle' });
    const panWindow = screen.getByRole('group', { name: 'Pan selected range' });

    // Ignore secondary button on handles and pan window
    fireEvent.pointerDown(startHandle, { button: 2, clientX: 140 });
    fireEvent.pointerDown(endHandle, { button: 2, clientX: 460 });
    fireEvent.pointerDown(panWindow, { button: 2, clientX: 300 });
    expect(onRangeChange).not.toHaveBeenCalled();

    // Drag start handle to index 4: x = 12 + (4 / 9) * 576 = 268
    fireEvent.pointerDown(startHandle, { button: 0, clientX: 140 });
    expect(startHandle).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 268 });
    expect(onRangeChange).toHaveBeenLastCalledWith([4, 7], SAMPLE_DATA.slice(4, 8));
    fireEvent.pointerUp(window);
    expect(startHandle).not.toHaveAttribute('data-dragging');

    // Moving pointer after pointerUp does nothing (listener cleaned up)
    const callsAfterStartDrag = onRangeChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 12 });
    expect(onRangeChange).toHaveBeenCalledTimes(callsAfterStartDrag);

    // Drag end handle to index 8: x = 12 + (8 / 9) * 576 = 524, then end via pointerCancel
    fireEvent.pointerDown(endHandle, { button: 0, clientX: 460 });
    expect(endHandle).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 524 });
    expect(onRangeChange).toHaveBeenLastCalledWith([4, 8], SAMPLE_DATA.slice(4, 9));
    fireEvent.pointerCancel(window);
    expect(endHandle).not.toHaveAttribute('data-dragging');

    // Drag pan window left by 2 indices (delta = -(2/9)*576 = -128): [4, 8] -> [2, 6]
    fireEvent.pointerDown(panWindow, { button: 0, clientX: 350 });
    expect(panWindow).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 222 });
    expect(onRangeChange).toHaveBeenLastCalledWith([2, 6], SAMPLE_DATA.slice(2, 7));

    // Drag pan window past right edge: clamps to [5, 9] preserving span=4
    fireEvent.pointerMove(window, { clientX: 900 });
    expect(onRangeChange).toHaveBeenLastCalledWith([5, 9], SAMPLE_DATA.slice(5, 10));
    fireEvent.pointerUp(window);
    expect(panWindow).not.toHaveAttribute('data-dragging');

    // Zero-width SVG mid-drag is handled safely for both handle drag and pan drag
    fireEvent.pointerDown(startHandle, { button: 0, clientX: 300 });
    rectSpy.mockReturnValueOnce({
      x: 0,
      y: 0,
      left: 0,
      right: 0,
      top: 0,
      bottom: 96,
      width: 0,
      height: 96,
      toJSON: () => ({}),
    });
    const callsBeforeCollapsedHandle = onRangeChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 12 });
    expect(onRangeChange).toHaveBeenCalledTimes(callsBeforeCollapsedHandle);
    fireEvent.pointerUp(window);

    fireEvent.pointerDown(panWindow, { button: 0, clientX: 400 });
    rectSpy.mockReturnValueOnce({
      x: 0,
      y: 0,
      left: 0,
      right: 0,
      top: 0,
      bottom: 96,
      width: 0,
      height: 96,
      toJSON: () => ({}),
    });
    const callsBeforeCollapsedPan = onRangeChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 100 });
    expect(onRangeChange).toHaveBeenCalledTimes(callsBeforeCollapsedPan);

    // Unmount mid-drag cleans up window listeners cleanly
    unmount();
    fireEvent.pointerMove(window, { clientX: 12 });
    expect(onRangeChange).toHaveBeenCalledTimes(callsBeforeCollapsedPan);
  });

  it('handles empty/insufficient data, non-finite values, malformed ranges, clamping, flat/extreme series, and dynamic empty transition', () => {
    const onRangeChange = vi.fn();
    const { rerender } = render(
      <BrushRangeScrubber data={[]} data-testid="edge-root" onRangeChange={onRangeChange} />
    );

    expect(screen.getByTestId('edge-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'At least 2 finite data points are required to scrub a range.'
    );
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('brush-scrubber-presets')).not.toBeInTheDocument();

    // Single valid point mixed with NaN / Infinity stays empty
    rerender(
      <BrushRangeScrubber
        data={[
          { label: 'Bad1', value: Number.NaN },
          { label: 'Only', value: 12 },
          { label: 'Bad2', value: Number.POSITIVE_INFINITY },
        ]}
        data-testid="edge-root"
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Non-finite filtered out, -0 normalized, inverted out-of-bounds defaultRange, height & minSpan clamped
    rerender(
      <BrushRangeScrubber
        key="messy"
        data={[
          { label: 'Bad', value: Number.NaN },
          { label: 'A', value: -0 },
          { label: 'B', value: 0 },
          { label: 'C', value: 0 },
          { label: 'D', value: 0 },
        ]}
        defaultRange={[99, -5]}
        height={10}
        minSpan={0}
        data-testid="edge-root"
      />
    );
    expect(screen.getByTestId('brush-scrubber-svg')).toHaveAttribute('viewBox', '0 0 600 64');
    expect(screen.getByTestId('brush-scrubber-readout')).toHaveTextContent('A → D · 4 / 4 points');

    // Narrow range near start expands end to satisfy minSpan; height clamps to 200
    rerender(
      <BrushRangeScrubber
        key="expand-end"
        data={SAMPLE_DATA}
        defaultRange={[1, 1]}
        minSpan={3}
        height={999}
        data-testid="edge-root"
      />
    );
    expect(screen.getByTestId('brush-scrubber-svg')).toHaveAttribute('viewBox', '0 0 600 200');
    expect(screen.getByTestId('brush-scrubber-readout')).toHaveTextContent('T2 → T5 · 4 / 10 points');

    // Narrow range near end pulls start back to satisfy minSpan; NaN height falls back to 96
    rerender(
      <BrushRangeScrubber
        key="pull-start"
        data={SAMPLE_DATA}
        defaultRange={[8, 9]}
        minSpan={4}
        height={Number.NaN}
        data-testid="edge-root"
      />
    );
    expect(screen.getByTestId('brush-scrubber-svg')).toHaveAttribute('viewBox', '0 0 600 96');
    expect(screen.getByTestId('brush-scrubber-readout')).toHaveTextContent(
      'T6 → T10 · 5 / 10 points'
    );

    // Zero-width SVG on initial pointerDown safely ignores drag start for both handle and pan window
    const svg = screen.getByTestId('brush-scrubber-svg');
    mockSvgRect(svg, 0, 0, 96);
    fireEvent.pointerDown(screen.getByRole('slider', { name: 'Start brush handle' }), {
      button: 0,
      clientX: 50,
    });
    fireEvent.pointerDown(screen.getByRole('group', { name: 'Pan selected range' }), {
      button: 0,
      clientX: 100,
    });
    expect(screen.getByTestId('edge-root')).not.toHaveAttribute('data-dragging');

    // Extreme MAX_VALUE range produces valid finite coordinates (no NaN)
    rerender(
      <BrushRangeScrubber
        key="extreme"
        data={[
          { label: 'Low', value: -Number.MAX_VALUE },
          { label: 'Mid', value: 0 },
          { label: 'High', value: Number.MAX_VALUE },
        ]}
        defaultRange={[Number.NaN, Number.NaN]}
        minSpan={99}
        data-testid="edge-root"
      />
    );
    expect(screen.getByTestId('brush-sparkline-line').getAttribute('points')).not.toContain('NaN');
    expect(screen.getByTestId('brush-scrubber-readout')).toHaveTextContent('Low → High · 3 / 3 points');

    // Dynamic shrink to empty while dragging cleans up active drag state
    const extremeSvg = screen.getByTestId('brush-scrubber-svg');
    mockSvgRect(extremeSvg, 0, 600, 96);
    fireEvent.pointerDown(screen.getByRole('slider', { name: 'Start brush handle' }), {
      button: 0,
      clientX: 12,
    });
    expect(screen.getByTestId('edge-root')).toHaveAttribute('data-dragging', 'true');
    rerender(<BrushRangeScrubber key="extreme" data={[]} data-testid="edge-root" />);
    expect(screen.getByTestId('edge-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('edge-root')).not.toHaveAttribute('data-dragging');
  });

  it('renders adversarial XSS strings in title and point labels safely as plain text', () => {
    const xssTitle = '<script>window.__brushXss=1</script>Scrubber';
    const xssLabel = '<img src=x onerror=alert(1)>';

    render(
      <BrushRangeScrubber
        title={xssTitle}
        data={[
          { label: xssLabel, value: 10 },
          { label: 'End', value: 20 },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(xssTitle)).toBeInTheDocument();
    expect(screen.getByTestId('brush-scrubber-readout')).toHaveTextContent(
      `${xssLabel} → End · 2 / 2 points`
    );
    expect(screen.getByRole('slider', { name: 'Start brush handle' })).toHaveAttribute(
      'aria-valuetext',
      `${xssLabel} (10)`
    );
  });
});
