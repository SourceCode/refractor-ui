import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_VIOLIN_SERIES,
  ViolinPlot,
  computeGaussianKde,
  computeViolinStats,
  type ViolinSeries,
  type ViolinStatsSummary,
} from './index';

const CUSTOM_SERIES: ReadonlyArray<ViolinSeries> = [
  {
    id: 'alpha',
    label: 'Alpha',
    tone: 'primary',
    values: [10, 12, 14, 16, 18, 20],
  },
  {
    id: 'beta',
    label: 'Beta Bimodal',
    tone: 'secondary',
    values: [10, 11, 12, 13, 14, 56, 57, 58, 59, 60],
  },
  {
    id: 'gamma',
    label: 'Gamma',
    tone: 'info',
    values: [28, 32, 34, 36, 40, 44],
  },
];

describe('computeViolinStats', () => {
  it('returns null for empty or non-finite-only observations', () => {
    expect(computeViolinStats({ id: 'e1', label: 'Empty', values: [] })).toBeNull();
    expect(
      computeViolinStats({
        id: 'e2',
        label: 'Invalid',
        values: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
      })
    ).toBeNull();
  });

  it('handles single observations and normalizes negative zero', () => {
    expect(computeViolinStats({ id: 's1', label: 'Single', values: [42] })).toEqual({
      id: 's1',
      label: 'Single',
      count: 1,
      min: 42,
      q1: 42,
      median: 42,
      q3: 42,
      max: 42,
      mean: 42,
    });

    const zeroSummary = computeViolinStats({ id: 'z1', label: 'Zero', values: [-0, 0] });
    expect(zeroSummary).not.toBeNull();
    expect(Object.is(zeroSummary?.min, 0)).toBe(true);
    expect(Object.is(zeroSummary?.mean, 0)).toBe(true);
  });

  it('filters non-finite values and computes exact count, min, Q1, median, Q3, max, and mean', () => {
    const summary = computeViolinStats({
      id: 'lat',
      label: 'Latency',
      values: [Number.NaN, 50, 10, 20, Number.POSITIVE_INFINITY, 30, 40, Number.NEGATIVE_INFINITY],
    });

    expect(summary).toEqual({
      id: 'lat',
      label: 'Latency',
      count: 5,
      min: 10,
      q1: 20,
      median: 30,
      q3: 40,
      max: 50,
      mean: 30,
    });
  });
});

describe('computeGaussianKde', () => {
  it('returns empty density result when no finite observations exist', () => {
    expect(computeGaussianKde([])).toEqual({ bandwidth: 0, bins: [], maxDensity: 0 });
    expect(computeGaussianKde([Number.NaN, Number.POSITIVE_INFINITY])).toEqual({
      bandwidth: 0,
      bins: [],
      maxDensity: 0,
    });
  });

  it('evaluates exact Gaussian KDE across 24 vertical bins and resolves bimodal peaks', () => {
    const bimodalValues = [18, 20, 22, 24, 25, 26, 28, 72, 74, 75, 76, 78, 80, 82];
    const kde = computeGaussianKde(bimodalValues);

    expect(kde.bins).toHaveLength(24);
    expect(kde.bandwidth).toBeGreaterThan(0);
    expect(kde.maxDensity).toBeGreaterThan(0);

    // Lower mode (~24) and upper mode (~76) must both exceed the central valley (~50)
    const lowerPeak = kde.bins[2]!.density;
    const midValley = kde.bins[12]!.density;
    const upperPeak = kde.bins[21]!.density;
    expect(lowerPeak).toBeGreaterThan(midValley * 1.8);
    expect(upperPeak).toBeGreaterThan(midValley * 1.8);

    // Verify exact analytical Gaussian KDE formula on a known bin
    const targetBin = kde.bins[5]!;
    const expected =
      bimodalValues.reduce((acc, sample) => {
        const z = (targetBin.value - sample) / kde.bandwidth;
        return acc + Math.exp(-0.5 * z * z);
      }, 0) /
      (bimodalValues.length * kde.bandwidth * Math.sqrt(2 * Math.PI));
    expect(targetBin.density).toBeCloseTo(expected, 10);
  });

  it('uses Silverman fallback bandwidth for zero-variance, zero-IQR, and zero-value series', () => {
    const constantNonZero = computeGaussianKde([42, 42, 42]);
    expect(constantNonZero.bins).toHaveLength(24);
    expect(constantNonZero.bandwidth).toBeGreaterThan(0);
    expect(constantNonZero.maxDensity).toBeGreaterThan(0);
    // Symmetric bell around 42: outer tails lower than center
    expect(constantNonZero.bins[11]!.density).toBeGreaterThan(constantNonZero.bins[0]!.density * 10);
    expect(constantNonZero.bins[0]!.density).toBeCloseTo(constantNonZero.bins[23]!.density, 8);

    const constantZero = computeGaussianKde([0, 0]);
    expect(constantZero.bins).toHaveLength(24);
    expect(constantZero.bandwidth).toBeCloseTo(0.1, 6);

    const explicitSpan = computeGaussianKde([50], 24, 100);
    expect(explicitSpan.bandwidth).toBeCloseTo(5, 6);

    // Zero IQR with non-zero variance falls back to stdDev cleanly
    const zeroIqr = computeGaussianKde([10, 10, 10, 10, 50]);
    expect(zeroIqr.bins).toHaveLength(24);
    expect(zeroIqr.bandwidth).toBeGreaterThan(0);
    expect(zeroIqr.maxDensity).toBeGreaterThan(0);

    // Clamps binCount safely
    expect(computeGaussianKde([1, 2, 3], 1).bins).toHaveLength(2);
    expect(computeGaussianKde([1, 2, 3], 999).bins).toHaveLength(128);
    expect(computeGaussianKde([1, 2, 3], Number.NaN).bins).toHaveLength(24);
  });
});

describe('ViolinPlot', () => {
  it('renders 4 realistic default groups (including bimodal), forwards ref, merges theme overrides, and enforces strict --prism-* tokens', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            ViolinPlot: { className: 'theme-violin', style: { maxWidth: '720px' } },
          },
        }}
      >
        <ViolinPlot
          ref={ref}
          className="consumer-violin"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="vp-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('vp-root');
    expect(ref.current).toBe(root);
    expect(ViolinPlot.displayName).toBe('ViolinPlot');
    expect(root).toHaveClass('refractor-violin-plot', 'prism-slab', 'theme-violin', 'consumer-violin');
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-series-count', '4');
    expect(root).toHaveAttribute('data-box-overlay', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByRole('heading', { name: 'Violin Distribution Plot' })).toBeInTheDocument();
    const expectedTotal = DEFAULT_VIOLIN_SERIES.reduce((sum, s) => sum + s.values.length, 0);
    expect(screen.getByTestId('violin-sample-count')).toHaveTextContent(`N = ${expectedTotal}`);

    const svg = screen.getByTestId('violin-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 460 220');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');

    // Strictly zero raw color literals
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-info-main)');
    expect(svg.innerHTML).toContain('var(--prism-primary-contrast)');
    expect(svg.innerHTML).not.toContain('NaN');

    const paths = svg.querySelectorAll<SVGPathElement>('[data-role="violin-density-path"]');
    expect(paths).toHaveLength(4);
    expect(svg.querySelectorAll('[data-role="violin-whisker"]')).toHaveLength(4);
    expect(svg.querySelectorAll('[data-role="violin-iqr-box"]')).toHaveLength(4);
    expect(svg.querySelectorAll('[data-role="violin-median-dot"]')).toHaveLength(4);

    // Verify exact mirror symmetry of the 24 vertical bins around each series center axis
    const firstPathD = paths[0]!.getAttribute('d') ?? '';
    const moveMatch = /^M ([\d.-]+) ([\d.-]+) /.exec(firstPathD);
    expect(moveMatch).not.toBeNull();
    const axisX = Number(moveMatch![1]);
    const coords = [...firstPathD.matchAll(/L ([\d.-]+) ([\d.-]+)/g)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }));
    // 24 right points + 1 bottom center point + 24 left points = 49 L segments
    expect(coords).toHaveLength(49);
    const rightPoints = coords.slice(0, 24);
    const leftPoints = coords.slice(25).reverse();
    for (let i = 0; i < 24; i += 1) {
      expect(rightPoints[i]!.y).toBeCloseTo(leftPoints[i]!.y, 2);
      expect(rightPoints[i]!.x - axisX).toBeCloseTo(axisX - leftPoints[i]!.x, 2);
    }

    // Live inspector shows Group · N · Min · Q1 · Median · Q3 · Max · Mean
    const inspector = screen.getByTestId('violin-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveTextContent(/Baseline\s*·\s*N 24 · Min 34ms · Q1 .* · Median .* · Q3 .* · Max 58ms · Mean/);
  });

  it('toggles embedded Tukey box overlay via header button and syncs showBoxOverlay prop updates', () => {
    const { rerender } = render(
      <ViolinPlot series={CUSTOM_SERIES} showBoxOverlay={true} data-testid="vp-box" />
    );

    const toggleBtn = screen.getByTestId('violin-box-overlay-toggle');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('violin-svg').querySelectorAll('[data-role="violin-iqr-box"]')).toHaveLength(3);

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('vp-box')).not.toHaveAttribute('data-box-overlay');
    expect(screen.getByTestId('violin-svg').querySelectorAll('[data-role="violin-box-overlay"]')).toHaveLength(0);

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('violin-svg').querySelectorAll('[data-role="violin-median-dot"]')).toHaveLength(3);

    // Prop update overrides local toggle cleanly
    rerender(<ViolinPlot series={CUSTOM_SERIES} showBoxOverlay={false} data-testid="vp-box" />);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('violin-svg').querySelectorAll('[data-role="violin-box-overlay"]')).toHaveLength(0);
  });

  it('supports click selection, IME-safe Enter/Space activation, and ArrowLeft/ArrowRight roving wrap-around navigation', () => {
    const received: ViolinStatsSummary[] = [];
    const onSelectSeries = vi.fn((summary: ViolinStatsSummary) => {
      received.push(summary);
    });

    render(
      <ViolinPlot
        title="Experiment Groups"
        series={CUSTOM_SERIES}
        unit="s"
        onSelectSeries={onSelectSeries}
      />
    );

    const alphaGroup = screen.getByTestId('violin-series-alpha');
    const betaGroup = screen.getByTestId('violin-series-beta');
    const gammaGroup = screen.getByTestId('violin-series-gamma');
    const inspector = screen.getByTestId('violin-inspector');

    expect(alphaGroup).toHaveAttribute('data-selected', 'true');
    expect(alphaGroup).toHaveAttribute('aria-pressed', 'true');
    expect(betaGroup).toHaveAttribute('data-selected', 'false');

    // Click Beta
    fireEvent.click(betaGroup);
    expect(betaGroup).toHaveAttribute('data-selected', 'true');
    expect(betaGroup).toHaveAttribute('aria-pressed', 'true');
    expect(onSelectSeries).toHaveBeenCalledTimes(1);
    expect(received[0]?.id).toBe('beta');
    expect(received[0]?.count).toBe(10);
    expect(inspector).toHaveTextContent(
      'Beta Bimodal · N 10 · Min 10s · Q1 12.25s · Median 35s · Q3 57.75s · Max 60s · Mean 35s'
    );

    // IME composing keydowns must be ignored
    fireEvent.keyDown(gammaGroup, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(gammaGroup, { key: 'ArrowRight', isComposing: true });
    expect(onSelectSeries).toHaveBeenCalledTimes(1);

    // Unhandled key must be ignored
    fireEvent.keyDown(gammaGroup, { key: 'Escape' });
    expect(onSelectSeries).toHaveBeenCalledTimes(1);

    // Enter activates Gamma
    fireEvent.keyDown(gammaGroup, { key: 'Enter' });
    expect(onSelectSeries).toHaveBeenCalledTimes(2);
    expect(gammaGroup).toHaveAttribute('data-selected', 'true');
    expect(received[1]?.id).toBe('gamma');

    // Space activates Alpha
    fireEvent.keyDown(alphaGroup, { key: ' ' });
    expect(onSelectSeries).toHaveBeenCalledTimes(3);
    expect(alphaGroup).toHaveAttribute('data-selected', 'true');
    expect(received[2]?.id).toBe('alpha');

    // ArrowRight from Alpha -> Beta (and focuses Beta)
    fireEvent.keyDown(alphaGroup, { key: 'ArrowRight' });
    expect(onSelectSeries).toHaveBeenCalledTimes(4);
    expect(betaGroup).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(betaGroup);

    // ArrowRight from Gamma wraps to Alpha
    fireEvent.keyDown(gammaGroup, { key: 'ArrowRight' });
    expect(onSelectSeries).toHaveBeenCalledTimes(5);
    expect(alphaGroup).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(alphaGroup);

    // ArrowLeft from Alpha wraps backward to Gamma
    fireEvent.keyDown(alphaGroup, { key: 'ArrowLeft' });
    expect(onSelectSeries).toHaveBeenCalledTimes(6);
    expect(gammaGroup).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(gammaGroup);
  });

  it('auto-cycles all 5 semantic tones, handles zero-variance distributions, empty units, and rerender selection fallback', () => {
    const autoToneSeries: ReadonlyArray<ViolinSeries> = [
      { id: 't1', label: 'T1', values: [5, 10, 15] },
      { id: 't2', label: 'T2', values: [8, 12, 16] },
      { id: 't3', label: 'T3', values: [6, 11, 14] },
      { id: 't4', label: 'T4', values: [7, 13, 18] },
      { id: 't5', label: 'T5', values: [9, 14, 20] },
      { id: 'skip-empty', label: 'Skipped', values: [Number.NaN, Number.POSITIVE_INFINITY] },
    ];

    const { rerender } = render(<ViolinPlot series={autoToneSeries} unit="   " />);
    expect(screen.getByTestId('violin-series-t1')).toHaveAttribute('data-tone', 'primary');
    expect(screen.getByTestId('violin-series-t2')).toHaveAttribute('data-tone', 'secondary');
    expect(screen.getByTestId('violin-series-t3')).toHaveAttribute('data-tone', 'emerald');
    expect(screen.getByTestId('violin-series-t4')).toHaveAttribute('data-tone', 'amber');
    expect(screen.getByTestId('violin-series-t5')).toHaveAttribute('data-tone', 'info');
    expect(screen.queryByTestId('violin-series-skip-empty')).toBeNull();

    // Select T5, then rerender with a degenerate constant non-zero series -> falls back cleanly
    fireEvent.click(screen.getByTestId('violin-series-t5'));
    expect(screen.getByTestId('violin-inspector')).toHaveTextContent(
      'T5 · N 3 · Min 9 · Q1 11.5 · Median 14 · Q3 17 · Max 20 · Mean 14.33'
    );

    rerender(
      <ViolinPlot
        series={[{ id: 'flat', label: 'Constant 25', values: [25, 25, 25] }]}
        unit="ms"
      />
    );
    const svgFlat = screen.getByTestId('violin-svg');
    expect(svgFlat.innerHTML).not.toContain('NaN');
    expect(svgFlat.querySelector('[data-role="violin-iqr-box"]')).toHaveAttribute('height', '2');
    expect(screen.getByTestId('violin-inspector')).toHaveTextContent(
      'Constant 25 · N 3 · Min 25ms · Q1 25ms · Median 25ms · Q3 25ms · Max 25ms · Mean 25ms'
    );

    // Degenerate zero-constant series
    rerender(
      <ViolinPlot series={[{ id: 'zero', label: 'All Zero', values: [0, 0] }]} unit="ms" />
    );
    const svgZero = screen.getByTestId('violin-svg');
    expect(svgZero.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('violin-inspector')).toHaveTextContent('All Zero · N 2 · Min 0ms');
  });

  it('renders a clean role="status" empty state for empty/non-finite datasets and neutralizes XSS strings', () => {
    const { rerender } = render(<ViolinPlot series={[]} data-testid="vp-empty-root" />);

    expect(screen.getByTestId('vp-empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('violin-sample-count')).toHaveTextContent('N = 0');
    expect(screen.getByTestId('violin-box-overlay-toggle')).toBeDisabled();

    const emptyNotice = screen.getByRole('status');
    expect(emptyNotice).toBe(screen.getByTestId('violin-empty'));
    expect(emptyNotice).toHaveTextContent('No distribution data available');
    expect(screen.queryByTestId('violin-svg')).toBeNull();
    expect(screen.queryByTestId('violin-inspector')).toBeNull();

    // Series containing only empty / non-finite arrays
    rerender(
      <ViolinPlot
        series={[
          { id: 'bad-1', label: 'Bad 1', values: [] },
          { id: 'bad-2', label: 'Bad 2', values: [Number.NaN, Number.NEGATIVE_INFINITY] },
        ]}
        data-testid="vp-empty-root"
      />
    );
    expect(screen.getByTestId('vp-empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // XSS payload in title and series label renders strictly as safe text
    const xssPayload = '<script>window.__vpXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <ViolinPlot
        title={xssPayload}
        series={[{ id: 'xss', label: xssPayload, values: [1, 2, 3, 4, 5] }]}
      />
    );
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(screen.getByTestId('violin-inspector')).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
