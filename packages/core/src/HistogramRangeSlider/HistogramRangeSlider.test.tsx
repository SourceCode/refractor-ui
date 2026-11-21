import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  HistogramRangeSlider,
  type HistogramBin,
  type HistogramRangeValue,
} from './HistogramRangeSlider';

const SAMPLE_BINS: HistogramBin[] = [
  { min: 0, max: 20, count: 5 },
  { min: 20, max: 40, count: 15 },
  { min: 40, max: 60, count: 30 },
  { min: 60, max: 80, count: 10 },
  { min: 80, max: 100, count: 4 },
];

function mockTrackRect(element: HTMLElement, left = 0, width = 200) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: 0,
    left,
    right: left + width,
    top: 0,
    bottom: 28,
    width,
    height: 28,
    toJSON: () => ({}),
  });
}

describe('HistogramRangeSlider', () => {
  it('renders histogram bars, range/count pills, ref/className/xstyle/theme override, and computes active overlap', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            HistogramRangeSlider: { className: 'theme-hist', style: { maxWidth: '520px' } },
          },
        }}
      >
        <HistogramRangeSlider
          ref={ref}
          bins={SAMPLE_BINS}
          defaultValue={{ min: 20, max: 60 }}
          formatValue={(v) => `$${v}`}
          label="Price Filter"
          className="local-hist"
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="hist-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('hist-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-histogram-range-slider', 'theme-hist', 'local-hist');
    expect(root).toHaveStyle({ maxWidth: '520px' });
    expect(screen.getByText('Price Filter')).toBeInTheDocument();
    expect(screen.getByTestId('histogram-range-pill')).toHaveTextContent('$20 – $60');
    expect(screen.getByTestId('histogram-count-pill')).toHaveTextContent('45 / 64 items');

    const rects = root.querySelectorAll('svg rect');
    expect(rects).toHaveLength(5);
    expect(rects[0]).toHaveAttribute('fill', 'var(--prism-divider)');
    expect(rects[0]).toHaveAttribute('data-active', 'false');
    expect(rects[1]).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(rects[1]).toHaveAttribute('data-active', 'true');
    expect(rects[2]).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(rects[2]).toHaveAttribute('data-active', 'true');
    expect(rects[3]).toHaveAttribute('fill', 'var(--prism-divider)');
    expect(rects[4]).toHaveAttribute('fill', 'var(--prism-divider)');
  });

  it('supports keyboard Arrow/Home/End stepping on both thumbs, prevents crossing, and guards IME composition', () => {
    const onChange = vi.fn();
    render(
      <HistogramRangeSlider
        bins={SAMPLE_BINS}
        defaultValue={{ min: 20, max: 60 }}
        step={10}
        onChange={onChange}
      />
    );

    const minSlider = screen.getByRole('slider', { name: 'Distribution Range minimum' });
    const maxSlider = screen.getByRole('slider', { name: 'Distribution Range maximum' });

    expect(minSlider).toHaveAttribute('aria-valuenow', '20');
    expect(maxSlider).toHaveAttribute('aria-valuenow', '60');

    // IME composition should be ignored
    const composingArrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composingArrow, 'isComposing', { value: true });
    fireEvent(minSlider, composingArrow);
    expect(onChange).not.toHaveBeenCalled();

    // Unrelated key ignored
    fireEvent.keyDown(minSlider, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();

    // Min thumb: ArrowRight (+10 -> 30), ArrowUp (+10 -> 40), ArrowLeft (-10 -> 30), ArrowDown (-10 -> 20)
    fireEvent.keyDown(minSlider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 30, max: 60 });
    fireEvent.keyDown(minSlider, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 40, max: 60 });
    fireEvent.keyDown(minSlider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 30, max: 60 });
    fireEvent.keyDown(minSlider, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 20, max: 60 });

    // Min thumb Home -> 0; pressing Home again does not emit redundant onChange
    fireEvent.keyDown(minSlider, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 0, max: 60 });
    const countAfterHome = onChange.mock.calls.length;
    fireEvent.keyDown(minSlider, { key: 'Home' });
    expect(onChange).toHaveBeenCalledTimes(countAfterHome);

    // Min thumb End -> clamped to current max (60)
    fireEvent.keyDown(minSlider, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 60, max: 60 });
    expect(minSlider).toHaveAttribute('aria-valuenow', '60');

    // Max thumb End -> 100; pressing End again does not emit redundant onChange
    fireEvent.keyDown(maxSlider, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 60, max: 100 });
    const countAfterMaxEnd = onChange.mock.calls.length;
    fireEvent.keyDown(maxSlider, { key: 'End' });
    expect(onChange).toHaveBeenCalledTimes(countAfterMaxEnd);

    // Max thumb ArrowLeft (-10 -> 90), Home -> clamped to min (60)
    fireEvent.keyDown(maxSlider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 60, max: 90 });
    fireEvent.keyDown(maxSlider, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ min: 60, max: 60 });
  });

  it('supports pointer dragging on thumbs and track in controlled mode, plus decimal step and unmount cleanup', () => {
    const onChange = vi.fn();

    function ControlledHarness() {
      const [range, setRange] = useState<HistogramRangeValue>({ min: 20, max: 80 });
      return (
        <HistogramRangeSlider
          bins={SAMPLE_BINS}
          value={range}
          step={0.5}
          onChange={(next) => {
            onChange(next);
            setRange(next);
          }}
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    const track = screen.getByTestId('histogram-track');
    mockTrackRect(track, 0, 200);

    const minSlider = screen.getByRole('slider', { name: 'Distribution Range minimum' });
    const maxSlider = screen.getByRole('slider', { name: 'Distribution Range maximum' });

    // Secondary mouse button is ignored on track and thumbs
    fireEvent.pointerDown(track, { button: 2, clientX: 50 });
    fireEvent.pointerDown(minSlider, { button: 2, clientX: 50 });
    expect(onChange).not.toHaveBeenCalled();

    // Click track closer to min (clientX=20 -> 10%)
    fireEvent.pointerDown(track, { button: 0, clientX: 20 });
    expect(onChange).toHaveBeenLastCalledWith({ min: 10, max: 80 });
    fireEvent.pointerMove(window, { clientX: 61 });
    expect(onChange).toHaveBeenLastCalledWith({ min: 30.5, max: 80 });
    fireEvent.pointerUp(window);

    // Click track closer to max (clientX=180 -> 90%)
    fireEvent.pointerDown(track, { button: 0, clientX: 180 });
    expect(onChange).toHaveBeenLastCalledWith({ min: 30.5, max: 90 });
    fireEvent.pointerCancel(window);

    // Drag directly on max thumb to 70% (clientX=140)
    fireEvent.pointerDown(maxSlider, { button: 0, clientX: 140 });
    expect(maxSlider).toHaveAttribute('data-dragging', 'true');
    expect(onChange).toHaveBeenLastCalledWith({ min: 30.5, max: 70 });
    fireEvent.pointerUp(window);

    // Drag directly on min thumb, then collapse thumbs to test tie-break and unmount mid-drag
    fireEvent.pointerDown(minSlider, { button: 0, clientX: 140 });
    expect(minSlider).toHaveAttribute('data-dragging', 'true');
    expect(onChange).toHaveBeenLastCalledWith({ min: 70, max: 70 });
    fireEvent.pointerUp(window);

    // Track click at exact equidistant point (<= low picks min)
    fireEvent.pointerDown(track, { button: 0, clientX: 140 });
    fireEvent.pointerMove(window, { clientX: 100 });
    expect(onChange).toHaveBeenLastCalledWith({ min: 50, max: 70 });

    // Unmount while dragging cleans up listeners cleanly
    unmount();
    fireEvent.pointerMove(window, { clientX: 10 });
  });

  it('handles empty bins, malformed/inverted/negative bins, zero-span domain, zero-width track, and non-positive step', () => {
    const { rerender } = render(<HistogramRangeSlider bins={[]} data-testid="empty-hist" />);

    expect(screen.getByTestId('empty-hist')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('histogram-empty')).toHaveTextContent(
      'No distribution data available'
    );
    expect(screen.getByTestId('histogram-count-pill')).toHaveTextContent('0 / 0 items');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();

    // Malformed, inverted, negative, NaN, and zero-count bins (including async load from empty)
    const messyBins: HistogramBin[] = [
      { min: Number.NaN, max: 10, count: 5 },
      { min: 20, max: 10, count: -7 },
      { min: 20, max: 30, count: Number.NaN },
      { min: 30, max: 40, count: 8 },
    ];
    rerender(
      <HistogramRangeSlider
        bins={messyBins}
        step={-5}
        data-testid="empty-hist"
      />
    );

    expect(screen.getByTestId('histogram-count-pill')).toHaveTextContent('8 / 8 items');
    expect(screen.getByTestId('histogram-range-pill')).toHaveTextContent('10 – 40');

    // Out-of-bounds inverted defaultValue clamps to [10, 40]
    rerender(
      <HistogramRangeSlider
        key="clamped-default"
        bins={messyBins}
        step={-5}
        defaultValue={{ min: 999, max: -999 }}
        data-testid="empty-hist"
      />
    );
    expect(screen.getByTestId('histogram-range-pill')).toHaveTextContent('10 – 40');

    // Zero-width track ignores pointerdown safely
    const track = screen.getByTestId('histogram-track');
    mockTrackRect(track, 0, 0);
    fireEvent.pointerDown(track, { button: 0, clientX: 50 });

    // Zero-span single-point domain
    const onChange = vi.fn();
    rerender(
      <HistogramRangeSlider
        bins={[{ min: 42, max: 42, count: 3 }]}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('histogram-range-pill')).toHaveTextContent('42 – 42');
    expect(screen.getByTestId('histogram-count-pill')).toHaveTextContent('3 / 3 items');
    const singleMin = screen.getByRole('slider', { name: 'Distribution Range minimum' });
    fireEvent.keyDown(singleMin, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('blocks interactions when disabled and renders adversarial XSS strings safely as text', () => {
    const onChange = vi.fn();
    const xss = '<script>window.__histXss=1</script><img src=x onerror=alert(1)>';

    render(
      <HistogramRangeSlider
        bins={SAMPLE_BINS}
        defaultValue={{ min: 20, max: 80 }}
        label={xss}
        formatValue={(v) => `${xss}-${v}`}
        disabled
        onChange={onChange}
        data-testid="disabled-hist"
      />
    );

    const root = screen.getByTestId('disabled-hist');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText(xss)).toBeInTheDocument();

    const track = screen.getByTestId('histogram-track');
    mockTrackRect(track, 0, 200);

    const minSlider = screen.getByRole('slider', { name: `${xss} minimum` });
    const maxSlider = screen.getByRole('slider', { name: `${xss} maximum` });
    expect(minSlider).toHaveAttribute('tabindex', '-1');
    expect(minSlider).toHaveAttribute('aria-disabled', 'true');

    fireEvent.pointerDown(track, { button: 0, clientX: 100 });
    fireEvent.pointerDown(minSlider, { button: 0, clientX: 100 });
    fireEvent.pointerDown(maxSlider, { button: 0, clientX: 100 });
    fireEvent.keyDown(minSlider, { key: 'ArrowRight' });
    fireEvent.keyDown(maxSlider, { key: 'ArrowLeft' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
