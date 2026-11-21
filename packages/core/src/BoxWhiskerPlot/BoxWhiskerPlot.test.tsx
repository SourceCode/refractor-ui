import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BoxWhiskerPlot,
  computeBoxStats,
  type BoxWhiskerSeries,
  type BoxWhiskerStats,
} from './index';

const SAMPLE_SERIES: BoxWhiskerSeries[] = [
  {
    id: 'us-east',
    label: 'US-East',
    tone: 'primary',
    values: [40, 46, 50, 52, 56, 60, 64, 130],
  },
  {
    id: 'eu-west',
    label: 'EU-West',
    tone: 'secondary',
    values: [48, 54, 58, 62, 66, 70, 76],
  },
  {
    id: 'ap-south',
    label: 'AP-South',
    tone: 'emerald',
    values: [10, 55, 58, 60, 62, 64, 66, 120],
  },
];

describe('computeBoxStats', () => {
  it('returns null for empty or non-finite-only inputs', () => {
    expect(computeBoxStats([])).toBeNull();
    expect(
      computeBoxStats([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])
    ).toBeNull();
  });

  it('computes exact statistics for single-value and negative-zero inputs', () => {
    expect(computeBoxStats([42])).toEqual({
      min: 42,
      q1: 42,
      median: 42,
      q3: 42,
      max: 42,
      whiskerLow: 42,
      whiskerHigh: 42,
      outliers: [],
    });

    const zeroStats = computeBoxStats([-0, 0]);
    expect(zeroStats).not.toBeNull();
    expect(Object.is(zeroStats?.min, 0)).toBe(true);
    expect(Object.is(zeroStats?.median, 0)).toBe(true);
    expect(zeroStats?.outliers).toEqual([]);
  });

  it('filters non-finite values, sorts ascending, computes Tukey fences, whiskers, and both low/high outliers', () => {
    const stats = computeBoxStats([
      Number.NaN,
      80,
      14,
      12,
      -40,
      16,
      Number.POSITIVE_INFINITY,
      18,
      15,
      10,
      20,
    ]);

    expect(stats).not.toBeNull();
    expect(stats?.min).toBe(-40);
    expect(stats?.q1).toBe(12);
    expect(stats?.median).toBe(15);
    expect(stats?.q3).toBe(18);
    expect(stats?.max).toBe(80);
    // IQR = 6 => fences [3, 27]
    expect(stats?.whiskerLow).toBe(10);
    expect(stats?.whiskerHigh).toBe(20);
    expect(stats?.outliers).toEqual([-40, 80]);
  });

  it('computes fractional quartiles accurately on even-length distributions', () => {
    const stats = computeBoxStats([1, 2, 3, 4, 5, 50]);
    expect(stats).toEqual({
      min: 1,
      q1: 2.25,
      median: 3.5,
      q3: 4.75,
      max: 50,
      whiskerLow: 1,
      whiskerHigh: 5,
      outliers: [50],
    });
  });
});

describe('BoxWhiskerPlot', () => {
  it('renders vertical optical glyphs, forwards ref, merges theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            BoxWhiskerPlot: { className: 'theme-bw', style: { maxWidth: '760px' } },
          },
        }}
      >
        <BoxWhiskerPlot
          ref={ref}
          series={SAMPLE_SERIES}
          valueUnit="ms"
          className="consumer-bw"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="bw-plot"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('bw-plot');
    expect(ref.current).toBe(root);
    expect(BoxWhiskerPlot.displayName).toBe('BoxWhiskerPlot');
    expect(root).toHaveClass('refractor-box-whisker-plot', 'prism-slab', 'theme-bw', 'consumer-bw');
    expect(root).toHaveStyle({ maxWidth: '760px' });
    expect(root).toHaveAttribute('data-series-count', '3');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByRole('heading', { name: 'Distribution Spread' })).toBeInTheDocument();

    const svg = screen.getByRole('img', {
      name: 'Distribution Spread box and whisker plot across 3 series',
    });
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');

    expect(svg.querySelectorAll('[data-role="whisker-line"]')).toHaveLength(3);
    expect(svg.querySelectorAll('[data-role="whisker-cap-high"]')).toHaveLength(3);
    expect(svg.querySelectorAll('[data-role="whisker-cap-low"]')).toHaveLength(3);
    expect(svg.querySelectorAll('[data-role="iqr-box"]')).toHaveLength(3);
    expect(svg.querySelectorAll('[data-role="median-line"]')).toHaveLength(3);
    // US-East has 1 outlier (130); AP-South has 2 outliers (10, 120)
    expect(svg.querySelectorAll('[data-role="outlier-marker"]')).toHaveLength(3);

    const readout = screen.getByTestId('box-whisker-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent(
      'Select any series to inspect Min · Q1 · Median · Q3 · Max · Outliers.'
    );
  });

  it('highlights selected series on click and keyboard (IME-safe), fires onSelectSeries, and updates five-number summary', () => {
    const received: Array<{ id: string; stats: BoxWhiskerStats }> = [];
    const onSelectSeries = vi.fn((s: BoxWhiskerSeries, stats: BoxWhiskerStats) => {
      received.push({ id: s.id, stats });
    });

    render(
      <BoxWhiskerPlot
        title="Latency Quartiles"
        series={SAMPLE_SERIES}
        valueUnit="ms"
        onSelectSeries={onSelectSeries}
      />
    );

    const usGlyph = screen.getByRole('button', { name: /US-East:.*1 outlier/ });
    const euGlyph = screen.getByRole('button', { name: /EU-West:.*0 outliers/ });
    const apGlyph = screen.getByRole('button', { name: /AP-South:.*2 outliers/ });

    // Click US-East
    fireEvent.click(usGlyph);
    expect(usGlyph).toHaveAttribute('data-selected', 'true');
    expect(usGlyph).toHaveAttribute('aria-pressed', 'true');
    expect(euGlyph).toHaveAttribute('data-selected', 'false');
    expect(onSelectSeries).toHaveBeenCalledTimes(1);
    expect(received[0]?.id).toBe('us-east');
    expect(received[0]?.stats.outliers).toEqual([130]);

    const readout = screen.getByTestId('box-whisker-readout');
    expect(readout).toHaveTextContent('US-East');
    expect(readout).toHaveTextContent('Min 40ms');
    expect(readout).toHaveTextContent('Max 130ms');
    expect(readout).toHaveTextContent('Outliers 1');

    // IME composing Enter must be ignored
    fireEvent.keyDown(euGlyph, { key: 'Enter', isComposing: true });
    expect(onSelectSeries).toHaveBeenCalledTimes(1);

    // Non-activation key must be ignored
    fireEvent.keyDown(euGlyph, { key: 'Escape' });
    expect(onSelectSeries).toHaveBeenCalledTimes(1);

    // Enter activates EU-West
    fireEvent.keyDown(euGlyph, { key: 'Enter' });
    expect(onSelectSeries).toHaveBeenCalledTimes(2);
    expect(euGlyph).toHaveAttribute('data-selected', 'true');
    expect(readout).toHaveTextContent('EU-West');
    expect(readout).toHaveTextContent('Min 48ms · Q1 56ms · Median 62ms · Q3 68ms · Max 76ms · Outliers 0');

    // Space activates AP-South
    fireEvent.keyDown(apGlyph, { key: ' ' });
    expect(onSelectSeries).toHaveBeenCalledTimes(3);
    expect(apGlyph).toHaveAttribute('data-selected', 'true');
    expect(readout).toHaveTextContent('AP-South');
    expect(readout).toHaveTextContent('Outliers 2');
  });

  it('clamps height, auto-cycles all 5 semantic tones, skips invalid series, and handles degenerate constant distributions', () => {
    const autoSeries: BoxWhiskerSeries[] = [
      { id: 's1', label: 'S1', values: [10, 20, 30] },
      { id: 's2', label: 'S2', values: [15, 25, 35] },
      { id: 's3', label: 'S3', values: [12, 22, 32] },
      { id: 's4', label: 'S4', values: [18, 28, 38] },
      { id: 's5', label: 'S5', values: [20, 30, 40] },
      { id: 'empty-ignored', label: 'Empty', values: [Number.NaN] },
    ];

    const { rerender } = render(<BoxWhiskerPlot series={autoSeries} height={80} />);
    const svgLow = screen.getByRole('img');
    expect(svgLow).toHaveAttribute('viewBox', '0 0 580 160');
    expect(svgLow.querySelectorAll('[data-role="iqr-box"]')).toHaveLength(5);
    expect(svgLow.innerHTML).toContain('var(--prism-warning-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-error-main)');
    expect(svgLow.innerHTML).not.toContain('NaN');

    // Select s5, then rerender without s5 -> readout falls back cleanly
    fireEvent.click(screen.getByRole('button', { name: /S5:/ }));
    expect(screen.getByTestId('box-whisker-readout')).toHaveTextContent('S5');

    // Degenerate non-zero constant series & clamped max height
    rerender(
      <BoxWhiskerPlot series={[{ id: 'flat', label: 'Flat', values: [25, 25, 25] }]} height={999} />
    );
    const svgHigh = screen.getByRole('img');
    expect(svgHigh).toHaveAttribute('viewBox', '0 0 580 480');
    expect(svgHigh.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('box-whisker-readout')).toHaveTextContent(
      'Select any series to inspect Min · Q1 · Median · Q3 · Max · Outliers.'
    );

    // Degenerate zero constant series & NaN height fallback to 240
    rerender(
      <BoxWhiskerPlot series={[{ id: 'zero', label: 'Zero', values: [0, 0] }]} height={Number.NaN} />
    );
    const svgZero = screen.getByRole('img');
    expect(svgZero).toHaveAttribute('viewBox', '0 0 580 240');
    expect(svgZero.innerHTML).not.toContain('NaN');
  });

  it('renders clean empty states when no valid series data exists and neutralizes XSS strings', () => {
    const { rerender } = render(<BoxWhiskerPlot series={[]} data-testid="bw-empty-root" />);
    expect(screen.getByTestId('bw-empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('box-whisker-empty')).toHaveTextContent(
      'No distribution data to display.'
    );
    expect(screen.queryByTestId('box-whisker-readout')).toBeNull();

    rerender(
      <BoxWhiskerPlot
        series={[{ id: 'bad', label: 'Invalid', values: [Number.NaN, Number.POSITIVE_INFINITY] }]}
        data-testid="bw-empty-root"
      />
    );
    expect(screen.getByTestId('bw-empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('box-whisker-empty')).toBeInTheDocument();

    const xssPayload = '<script>window.__bwXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <BoxWhiskerPlot
        title={xssPayload}
        series={[{ id: 'xss', label: xssPayload, values: [1, 2, 3, 4, 5] }]}
      />
    );
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
