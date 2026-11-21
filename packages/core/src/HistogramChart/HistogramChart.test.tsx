import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  HistogramChart,
  computeHistogramBins,
  type ComputedHistogramBin,
} from './index';

const SAMPLE_VALUES = [10, 12, 15, 18, 22, 25, 28, 30, 35, 90];

describe('computeHistogramBins', () => {
  it('bins finite values into equal-width buckets and clamps binCount to [2, 24]', () => {
    const bins = computeHistogramBins([0, 10, 20, 30, 40], 4);
    expect(bins).toHaveLength(4);
    expect(bins[0]).toEqual({ index: 0, min: 0, max: 10, count: 1 });
    expect(bins[1]).toEqual({ index: 1, min: 10, max: 20, count: 1 });
    expect(bins[2]).toEqual({ index: 2, min: 20, max: 30, count: 1 });
    expect(bins[3]).toEqual({ index: 3, min: 30, max: 40, count: 2 });

    // Lower clamp to 2, upper clamp to 24, NaN fallback to 8
    expect(computeHistogramBins([1, 2, 3, 4], 1)).toHaveLength(2);
    expect(computeHistogramBins([1, 2, 3, 4], 50)).toHaveLength(24);
    expect(computeHistogramBins([1, 2, 3, 4], Number.NaN)).toHaveLength(8);
  });

  it('handles empty arrays, non-finite values, and identical/flat distributions safely without NaN', () => {
    expect(computeHistogramBins([], 8)).toEqual([]);
    expect(
      computeHistogramBins([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY], 6)
    ).toEqual([]);

    // Identical non-zero values
    const flat50 = computeHistogramBins([50, 50, 50], 4);
    expect(flat50).toHaveLength(4);
    const total50 = flat50.reduce((sum, bin) => sum + bin.count, 0);
    expect(total50).toBe(3);
    for (const bin of flat50) {
      expect(Number.isFinite(bin.min)).toBe(true);
      expect(Number.isFinite(bin.max)).toBe(true);
      expect(bin.max).toBeGreaterThan(bin.min);
    }

    // Identical zeros
    const flat0 = computeHistogramBins([0, 0], 4);
    expect(flat0).toHaveLength(4);
    expect(flat0.reduce((sum, bin) => sum + bin.count, 0)).toBe(2);
    expect(flat0[0]!.min).toBe(-1);
    expect(flat0[3]!.max).toBe(1);
  });
});

describe('HistogramChart', () => {
  it('renders frequency histogram with ref, theme override, summary pills, Mean/Median markers, --prism-* tokens, and readout', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            HistogramChart: {
              className: 'theme-histogram',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <HistogramChart
          ref={ref}
          title="API Latency Distribution"
          values={SAMPLE_VALUES}
          binCount={4}
          valueUnit="ms"
          className="local-histogram"
          xstyle={{ '--prism-blur-px': '18px' }}
          style={{ marginTop: '8px' }}
          data-testid="hist-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('hist-root');
    expect(ref.current).toBe(root);
    expect(HistogramChart.displayName).toBe('HistogramChart');
    expect(root).toHaveClass(
      'refractor-histogram-chart',
      'prism-slab',
      'theme-histogram',
      'local-histogram'
    );
    expect(root).toHaveStyle({ maxWidth: '680px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-show-mean', 'true');
    expect(root).toHaveAttribute('data-show-median', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    // Summary pills: n = 10, Mean = 28.5 ms, Median = 23.5 ms
    expect(screen.getByTestId('histogram-stat-n')).toHaveTextContent('n = 10');
    expect(screen.getByTestId('histogram-stat-mean')).toHaveTextContent('Mean: 28.5 ms');
    expect(screen.getByTestId('histogram-stat-median')).toHaveTextContent('Median: 23.5 ms');

    const svg = screen.getByRole('img', { name: 'API Latency Distribution' });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 240');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');

    expect(screen.getAllByTestId('histogram-gridline')).toHaveLength(4);
    expect(screen.getByTestId('histogram-bin-0')).toHaveAttribute(
      'fill',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('histogram-mean-line')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('histogram-median-line')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );

    // Peak bin (bin 0: [10 - 30], 7 samples) selected by default in readout
    expect(screen.getByTestId('histogram-readout-text')).toHaveTextContent(
      'Range [10 ms – 30 ms]: 7 samples'
    );
  });

  it('invokes onSelectBin via click and IME-safe keyboard Enter/Space and updates recessed bin readout', () => {
    const onSelectBin = vi.fn<(bin: ComputedHistogramBin) => void>();

    render(
      <HistogramChart
        values={[10, 20, 30, 40, 50]}
        binCount={4}
        onSelectBin={onSelectBin}
      />
    );

    // Odd count median (30) and mean (30) -> close markers path exercised
    expect(screen.getByTestId('histogram-stat-n')).toHaveTextContent('n = 5');
    expect(screen.getByTestId('histogram-stat-mean')).toHaveTextContent('Mean: 30');
    expect(screen.getByTestId('histogram-stat-median')).toHaveTextContent('Median: 30');

    const bin3 = screen.getByTestId('histogram-bin-3');
    fireEvent.click(bin3);
    expect(onSelectBin).toHaveBeenCalledWith({ index: 3, min: 40, max: 50, count: 2 });
    expect(bin3).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('histogram-readout-text')).toHaveTextContent(
      'Range [40 – 50]: 2 samples'
    );

    // Keyboard Enter on bin 1
    const bin1 = screen.getByTestId('histogram-bin-1');
    fireEvent.keyDown(bin1, { key: 'Enter' });
    expect(onSelectBin).toHaveBeenLastCalledWith({ index: 1, min: 20, max: 30, count: 1 });
    expect(screen.getByTestId('histogram-readout-text')).toHaveTextContent(
      'Range [20 – 30]: 1 samples'
    );

    // Keyboard Space on bin 2
    const bin2 = screen.getByTestId('histogram-bin-2');
    fireEvent.keyDown(bin2, { key: ' ' });
    expect(onSelectBin).toHaveBeenLastCalledWith({ index: 2, min: 30, max: 40, count: 1 });

    // Unrelated key ignored
    const callsBefore = onSelectBin.mock.calls.length;
    fireEvent.keyDown(bin2, { key: 'Tab' });
    expect(onSelectBin).toHaveBeenCalledTimes(callsBefore);

    // IME composing keydown ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    bin2.dispatchEvent(imeEvent);
    expect(onSelectBin).toHaveBeenCalledTimes(callsBefore);
  });

  it('supports toggling showMean/showMedian, clamping height 140..480, high binCount tick thinning, and shrinking binCount recovery', () => {
    const skewedValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100];
    const { rerender } = render(
      <HistogramChart
        values={skewedValues}
        binCount={24}
        showMean={false}
        showMedian={false}
        height={60}
      />
    );

    expect(screen.getByTestId('histogram-svg')).toHaveAttribute('viewBox', '0 0 640 140');
    expect(screen.queryByTestId('histogram-mean-line')).not.toBeInTheDocument();
    expect(screen.queryByTestId('histogram-median-line')).not.toBeInTheDocument();
    expect(screen.getByTestId('histogram-bin-23')).toBeInTheDocument();
    // High bin count thins X ticks cleanly (fewer than 25 boundary labels)
    expect(screen.getAllByTestId('histogram-x-tick').length).toBeLessThan(15);

    // Select bin 23, then shrink binCount to 2 -> selection recovers cleanly to peak bin
    fireEvent.click(screen.getByTestId('histogram-bin-23'));
    rerender(
      <HistogramChart
        values={skewedValues}
        binCount={2}
        showMean
        showMedian
        height={999}
      />
    );
    expect(screen.getByTestId('histogram-svg')).toHaveAttribute('viewBox', '0 0 640 480');
    expect(screen.getByTestId('histogram-mean-line')).toBeInTheDocument();
    expect(screen.getByTestId('histogram-median-line')).toBeInTheDocument();
    expect(screen.getByTestId('histogram-readout-text')).toHaveTextContent('10 samples');

    // NaN height fallback to 240
    rerender(<HistogramChart values={skewedValues} height={Number.NaN} />);
    expect(screen.getByTestId('histogram-svg')).toHaveAttribute('viewBox', '0 0 640 240');
  });

  it('handles non-finite filtering, flat values, empty datasets, and XSS safely', () => {
    const xssTitle = '<script>window.__histXss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(
      <HistogramChart
        title={xssTitle}
        values={[Number.NaN, 42, Number.POSITIVE_INFINITY, 42, Number.NEGATIVE_INFINITY]}
        binCount={4}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByTestId('histogram-stat-n')).toHaveTextContent('n = 2');
    expect(screen.getByTestId('histogram-svg').innerHTML).not.toContain('NaN');

    // Empty / all non-finite values -> clean empty state
    rerender(
      <HistogramChart
        values={[Number.NaN, Number.POSITIVE_INFINITY]}
        data-testid="empty-hist"
      />
    );
    expect(screen.getByTestId('empty-hist')).toHaveAttribute('data-empty', 'true');
    expect(screen.queryByTestId('histogram-summary-pills')).not.toBeInTheDocument();
    expect(screen.getByTestId('histogram-empty')).toHaveTextContent(
      'No finite numeric values available.'
    );

    rerender(<HistogramChart values={[]} data-testid="empty-hist" />);
    expect(screen.getByTestId('empty-hist')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('histogram-empty')).toBeInTheDocument();
  });
});
